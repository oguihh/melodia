import React, { useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  VolumeX,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Radio,
  Tv,
  StopCircle,
} from 'lucide-react';
import { Channel, User, PeerConnectionInfo } from '../types';

interface VoiceAreaProps {
  channel: Channel;
  currentUser: User;
  peers: Map<string, PeerConnectionInfo>;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleCamera: () => void;
  onOpenScreenShareModal: () => void;
  onStopScreenShare: () => void;
  onDisconnect: () => void;
}

export const VoiceArea: React.FC<VoiceAreaProps> = ({
  channel,
  currentUser,
  peers,
  localStream,
  screenStream,
  isMuted,
  isDeafened,
  isCameraOn,
  isScreenSharing,
  isSpeaking,
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onOpenScreenShareModal,
  onStopScreenShare,
  onDisconnect,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenRef = useRef<HTMLVideoElement>(null);

  // Vincular vídeo da câmera local
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isCameraOn]);

  // Vincular vídeo da tela local
  useEffect(() => {
    if (localScreenRef.current && screenStream) {
      localScreenRef.current.srcObject = screenStream;
      localScreenRef.current.play().catch((err) => {
        console.warn('Erro ao reproduzir preview da tela:', err);
      });
    }
  }, [screenStream, isScreenSharing]);

  const peerList = Array.from(peers.values());

  return (
    <div className="flex-1 bg-[#111214] flex flex-col justify-between overflow-hidden relative select-none">
      {/* 1. Header do Canal de Voz */}
      <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between bg-[#1e1f22] shrink-0 z-10">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-[#23a55a] animate-pulse" />
          <span className="font-bold text-white text-base">{channel.name}</span>
          <span className="text-xs text-[#949ba4] bg-[#2b2d31] px-2 py-0.5 rounded-full ml-2">
            {peerList.length + 1} conectado{peerList.length > 0 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* 2. Grid Principal / Palco de Transmissão */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center space-y-4">
        {/* Se você estiver compartilhando a tela */}
        {isScreenSharing && screenStream ? (
          <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center space-y-3">
            {/* Palco Principal da Tela */}
            <div className="w-full h-[65vh] bg-black rounded-xl overflow-hidden shadow-2xl relative border border-[#2b2d31] flex items-center justify-center group">
              <video
                ref={localScreenRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />

              {/* Banner Superior da Transmissão */}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-white flex items-center space-x-2 border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f23f43] animate-pulse" />
                <span className="font-bold">AO VIVO (1080p 60 FPS)</span>
                <span className="text-[#949ba4]">• Você está transmitindo</span>
              </div>

              <button
                onClick={onStopScreenShare}
                className="absolute top-3 right-3 bg-[#f23f43] hover:bg-[#da373b] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition shadow-lg opacity-90 hover:opacity-100"
              >
                <StopCircle className="w-4 h-4" />
                <span>Parar Transmissão</span>
              </button>
            </div>

            {/* Faixa de Participantes Abaixo da Transmissão */}
            <div className="flex items-center justify-center space-x-3 overflow-x-auto w-full py-1">
              <div
                className={`bg-[#2b2d31] rounded-xl px-4 py-2 flex items-center space-x-2 border ${
                  isSpeaking ? 'border-[#23a55a] ring-2 ring-[#23a55a]/30' : 'border-transparent'
                }`}
              >
                <img
                  src={
                    currentUser.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                      currentUser.username
                    )}`
                  }
                  alt={currentUser.username}
                  className="w-8 h-8 rounded-full bg-[#1e1f22]"
                />
                <span className="text-xs font-semibold text-white truncate">
                  {currentUser.username} (Você)
                </span>
                {isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
              </div>

              {peerList.map((peer) => (
                <div
                  key={peer.socketId}
                  className={`bg-[#2b2d31] rounded-xl px-4 py-2 flex items-center space-x-2 border ${
                    peer.isSpeaking ? 'border-[#23a55a] ring-2 ring-[#23a55a]/30' : 'border-transparent'
                  }`}
                >
                  <img
                    src={
                      peer.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        peer.username
                      )}`
                    }
                    alt={peer.username}
                    className="w-8 h-8 rounded-full bg-[#1e1f22]"
                  />
                  <span className="text-xs font-semibold text-white truncate">
                    {peer.username}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Grid Normal de Participantes */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-6xl">
            {/* Card Local */}
            <div
              className={`bg-[#2b2d31] rounded-2xl p-6 flex flex-col items-center justify-center relative min-h-[220px] border-2 transition-all duration-200 shadow-lg ${
                isSpeaking
                  ? 'border-[#23a55a] ring-4 ring-[#23a55a]/20 scale-[1.02]'
                  : 'border-transparent'
              }`}
            >
              {isCameraOn && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="relative">
                  <img
                    src={
                      currentUser.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        currentUser.username
                      )}`
                    }
                    alt={currentUser.username}
                    className={`w-24 h-24 rounded-full bg-[#1e1f22] transition-transform ${
                      isSpeaking ? 'scale-105 ring-4 ring-[#23a55a]' : ''
                    }`}
                  />
                  {isMuted && (
                    <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#f23f43] text-white shadow">
                      <MicOff className="w-4 h-4" />
                    </div>
                  )}
                </div>
              )}

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-white">
                <span className="font-semibold truncate">{currentUser.username} (Você)</span>
                <div className="flex items-center space-x-1">
                  {isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
                  {isDeafened && <VolumeX className="w-3.5 h-3.5 text-[#f23f43]" />}
                </div>
              </div>
            </div>

            {/* Cards Remotos */}
            {peerList.map((peer) => (
              <RemotePeerCard key={peer.socketId} peer={peer} />
            ))}
          </div>
        )}
      </div>

      {/* 3. Barra Flutuante de Controles */}
      <div className="h-20 bg-[#1e1f22]/90 backdrop-blur-md border-t border-[#2b2d31] px-6 flex items-center justify-center space-x-4 shrink-0 z-20">
        <button
          onClick={onToggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-[#f23f43] text-white hover:bg-[#da373b]'
              : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
          }`}
          title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={onToggleDeafen}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isDeafened
              ? 'bg-[#f23f43] text-white hover:bg-[#da373b]'
              : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
          }`}
          title={isDeafened ? 'Desensurdecer' : 'Desativar Áudio'}
        >
          {isDeafened ? <VolumeX className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
        </button>

        <button
          onClick={onToggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isCameraOn
              ? 'bg-[#23a55a] text-white hover:bg-[#209451]'
              : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
          }`}
          title={isCameraOn ? 'Desligar Câmera' : 'Ligar Câmera'}
        >
          {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={isScreenSharing ? onStopScreenShare : onOpenScreenShareModal}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isScreenSharing
              ? 'bg-[#5865f2] text-white hover:bg-[#4752c4] ring-2 ring-[#5865f2]/50'
              : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c] hover:text-white'
          }`}
          title={isScreenSharing ? 'Parar Transmissão' : 'Compartilhar sua Tela (1080p 60FPS)'}
        >
          <ScreenShare className="w-5 h-5" />
        </button>

        <button
          onClick={onDisconnect}
          className="w-12 h-12 rounded-full bg-[#f23f43] hover:bg-[#da373b] text-white flex items-center justify-center transition-all shadow-lg hover:scale-105"
          title="Desconectar da chamada"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const RemotePeerCard: React.FC<{ peer: PeerConnectionInfo }> = ({ peer }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const hasVideo =
    peer.stream &&
    peer.stream.getVideoTracks().length > 0 &&
    peer.stream.getVideoTracks()[0].enabled;

  useEffect(() => {
    if (audioRef.current && peer.stream) {
      audioRef.current.srcObject = peer.stream;
      audioRef.current.play().catch(() => {});
    }
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [peer.stream]);

  return (
    <div
      className={`bg-[#2b2d31] rounded-2xl p-6 flex flex-col items-center justify-center relative min-h-[220px] border-2 transition-all duration-200 shadow-lg ${
        peer.isSpeaking
          ? 'border-[#23a55a] ring-4 ring-[#23a55a]/20 scale-[1.02]'
          : 'border-transparent'
      }`}
    >
      <audio ref={audioRef} autoPlay playsInline />

      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        />
      ) : (
        <div className="relative">
          <img
            src={
              peer.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                peer.username
              )}`
            }
            alt={peer.username}
            className={`w-24 h-24 rounded-full bg-[#1e1f22] transition-transform ${
              peer.isSpeaking ? 'scale-105 ring-4 ring-[#23a55a]' : ''
            }`}
          />
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-white">
        <span className="font-semibold truncate">{peer.username}</span>
      </div>
    </div>
  );
};
