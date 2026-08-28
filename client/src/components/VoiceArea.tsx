import React, { useRef, useEffect, useState } from 'react';
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
  StopCircle,
  Eye,
  EyeOff,
  Maximize2,
  Tv,
} from 'lucide-react';
import { Channel, User, PeerConnectionInfo } from '../types';
import { UserContextMenu } from './UserContextMenu';

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
  const [watchingPeerId, setWatchingPeerId] = useState<string | null>(null);
  const [isWatchingLocalScreen, setIsWatchingLocalScreen] = useState<boolean>(true);

  // Volumes individuais por usuário (0 a 200%) e mudo local
  const [peerVolumes, setPeerVolumes] = useState<Record<string, number>>({});
  const [locallyMutedPeers, setLocallyMutedPeers] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    peer: PeerConnectionInfo;
  } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenRef = useRef<HTMLVideoElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);

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
      localScreenRef.current.play().catch(() => {});
    }
  }, [screenStream, isScreenSharing]);

  const peerList = Array.from(peers.values());

  // Detectar qual peer está transmitindo vídeo/tela
  const activeStreamers = peerList.filter(
    (p) =>
      p.stream &&
      p.stream.getVideoTracks().length > 0 &&
      p.stream.getVideoTracks().some((t) => t.enabled)
  );

  // Auto-selecionar streamer se houver
  useEffect(() => {
    if (activeStreamers.length > 0 && !watchingPeerId && watchingPeerId !== '') {
      setWatchingPeerId(activeStreamers[0].socketId);
    } else if (activeStreamers.length === 0 && watchingPeerId) {
      setWatchingPeerId(null);
    }
  }, [activeStreamers.length]);

  const currentlyWatchedPeer = peerList.find((p) => p.socketId === watchingPeerId && p.stream);

  const handleToggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="flex-1 bg-[#111214] flex flex-col justify-between overflow-hidden relative select-none">
      {/* Gerenciador Único e Invisível de Áudio dos Peers (Garante 1 único canal por peer sem eco nem duplicação) */}
      {peerList.map((peer) => {
        const isLocallyMuted = !!locallyMutedPeers[peer.socketId];
        const userVol = peerVolumes[peer.socketId] ?? 100;
        const finalVolume = isLocallyMuted ? 0 : userVol / 100;
        return (
          <PeerAudioPlayer
            key={peer.socketId}
            stream={peer.stream}
            volume={finalVolume}
          />
        );
      })}

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

      {/* 2. Área Central / Palco de Transmissão ou Grid */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center space-y-4">
        {/* Caso 1: VOCÊ está compartilhando tela */}
        {isScreenSharing && screenStream && isWatchingLocalScreen ? (
          <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center space-y-3">
            <div
              ref={stageContainerRef}
              className="w-full h-[65vh] bg-black rounded-xl overflow-hidden shadow-2xl relative border border-[#2b2d31] flex items-center justify-center group"
            >
              <video
                ref={localScreenRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />

              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-white flex items-center space-x-2 border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f23f43] animate-pulse" />
                <span className="font-bold">AO VIVO (1080p 60 FPS)</span>
                <span className="text-[#949ba4]">• Você está transmitindo</span>
              </div>

              <div className="absolute top-3 right-3 flex items-center space-x-2 opacity-90 hover:opacity-100 transition">
                <button
                  onClick={() => setIsWatchingLocalScreen(false)}
                  className="bg-[#2b2d31]/80 hover:bg-[#35373c] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 backdrop-blur-md transition shadow border border-white/10"
                  title="Minimizar para o grid de avatares"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>Minimizar Preview</span>
                </button>

                <button
                  onClick={handleToggleFullscreen}
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition border border-white/10"
                  title="Tela Cheia"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                <button
                  onClick={onStopScreenShare}
                  className="bg-[#f23f43] hover:bg-[#da373b] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition shadow"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Parar Transmissão</span>
                </button>
              </div>
            </div>

            <ParticipantStrip
              currentUser={currentUser}
              isSpeaking={isSpeaking}
              isMuted={isMuted}
              peerList={peerList}
              peerVolumes={peerVolumes}
              locallyMutedPeers={locallyMutedPeers}
              onContextMenu={(e, peer) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, peer });
              }}
            />
          </div>
        ) : currentlyWatchedPeer ? (
          /* Caso 2: VOCÊ ESTÁ ASSISTINDO A TRANSMISSÃO DE UM AMIGO */
          <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center space-y-3">
            <div
              ref={stageContainerRef}
              className="w-full h-[65vh] bg-black rounded-xl overflow-hidden shadow-2xl relative border border-[#2b2d31] flex items-center justify-center group"
            >
              <RemoteVideoView stream={currentlyWatchedPeer.stream!} />

              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-white flex items-center space-x-2 border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f23f43] animate-pulse" />
                <span className="font-bold">AO VIVO (1080p 60 FPS)</span>
                <span className="text-[#949ba4]">• Transmitido por {currentlyWatchedPeer.username}</span>
              </div>

              <div className="absolute top-3 right-3 flex items-center space-x-2 opacity-90 hover:opacity-100 transition">
                <button
                  onClick={() => setWatchingPeerId('')}
                  className="bg-[#f23f43]/90 hover:bg-[#f23f43] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 backdrop-blur-md transition shadow-lg"
                  title="Parar de assistir e voltar para os avatares"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>Parar de Assistir</span>
                </button>

                <button
                  onClick={handleToggleFullscreen}
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition border border-white/10"
                  title="Tela Cheia"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <ParticipantStrip
              currentUser={currentUser}
              isSpeaking={isSpeaking}
              isMuted={isMuted}
              peerList={peerList}
              peerVolumes={peerVolumes}
              locallyMutedPeers={locallyMutedPeers}
              onContextMenu={(e, peer) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, peer });
              }}
            />
          </div>
        ) : (
          /* Caso 3: GRID NORMAL DE CARDS */
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
                    className={`w-24 h-24 rounded-full bg-[#1e1f22] object-cover transition-transform ${
                      isSpeaking ? 'scale-105 ring-4 ring-[#23a55a]' : ''
                    }`}
                  />
                  {isMuted && (
                    <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#f23f43] text-white shadow-lg ring-2 ring-[#2b2d31]">
                      <MicOff className="w-4 h-4" />
                    </div>
                  )}
                </div>
              )}

              {isScreenSharing && (
                <button
                  onClick={() => setIsWatchingLocalScreen(true)}
                  className="mt-3 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center space-x-1.5 shadow transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Minha Tela</span>
                </button>
              )}

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-white">
                <span className="font-semibold truncate">{currentUser.username} (Você)</span>
                <div className="flex items-center space-x-1">
                  {isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
                  {isDeafened && <VolumeX className="w-3.5 h-3.5 text-[#f23f43]" />}
                </div>
              </div>
            </div>

            {/* Cards Remotos com Exibição Visual de Mudo em Tempo Real */}
            {peerList.map((peer) => {
              const isPeerStreaming =
                peer.stream &&
                peer.stream.getVideoTracks().length > 0 &&
                peer.stream.getVideoTracks().some((t) => t.enabled);

              const userVolume = peerVolumes[peer.socketId] ?? 100;
              const isLocallyMuted = !!locallyMutedPeers[peer.socketId];

              return (
                <RemotePeerCard
                  key={peer.socketId}
                  peer={peer}
                  isStreaming={isPeerStreaming}
                  volume={isLocallyMuted ? 0 : userVolume / 100}
                  onWatchStream={() => setWatchingPeerId(peer.socketId)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, peer });
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Menu de Contexto ao Clicar com Botão Direito */}
      {contextMenu && (
        <UserContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          username={contextMenu.peer.username}
          avatarUrl={contextMenu.peer.avatarUrl}
          volume={peerVolumes[contextMenu.peer.socketId] ?? 100}
          isLocallyMuted={!!locallyMutedPeers[contextMenu.peer.socketId]}
          onVolumeChange={(newVol) => {
            setPeerVolumes((prev) => ({
              ...prev,
              [contextMenu.peer.socketId]: newVol,
            }));
          }}
          onToggleLocalMute={() => {
            setLocallyMutedPeers((prev) => ({
              ...prev,
              [contextMenu.peer.socketId]: !prev[contextMenu.peer.socketId],
            }));
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 4. Barra Flutuante de Controles */}
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

// Player de Áudio Único por Participante (Invisível, previne duplicações de som)
const PeerAudioPlayer: React.FC<{ stream?: MediaStream; volume: number }> = ({
  stream,
  volume,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.volume = Math.min(1, Math.max(0, volume));
      audioRef.current.play().catch(() => {});
    }
  }, [stream, volume]);

  return <audio ref={audioRef} autoPlay playsInline />;
};

// Renderizador do Vídeo Remoto no Palco
const RemoteVideoView: React.FC<{ stream: MediaStream }> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain"
    />
  );
};

// Faixa de Participantes abaixo do Palco
const ParticipantStrip: React.FC<{
  currentUser: User;
  isSpeaking: boolean;
  isMuted: boolean;
  peerList: PeerConnectionInfo[];
  peerVolumes: Record<string, number>;
  locallyMutedPeers: Record<string, boolean>;
  onContextMenu: (e: React.MouseEvent, peer: PeerConnectionInfo) => void;
}> = ({ currentUser, isSpeaking, isMuted, peerList, locallyMutedPeers, onContextMenu }) => {
  return (
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
          className="w-8 h-8 rounded-full bg-[#1e1f22] object-cover"
        />
        <span className="text-xs font-semibold text-white truncate">
          {currentUser.username} (Você)
        </span>
        {isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
      </div>

      {peerList.map((peer) => {
        const isLocallyMuted = !!locallyMutedPeers[peer.socketId];
        return (
          <div
            key={peer.socketId}
            onContextMenu={(e) => onContextMenu(e, peer)}
            className={`bg-[#2b2d31] hover:bg-[#35373c] cursor-pointer rounded-xl px-4 py-2 flex items-center space-x-2 border transition ${
              peer.isSpeaking ? 'border-[#23a55a] ring-2 ring-[#23a55a]/30' : 'border-transparent'
            }`}
            title="Clique com botão direito para ajustar volume"
          >
            <img
              src={
                peer.avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                  peer.username
                )}`
              }
              alt={peer.username}
              className="w-8 h-8 rounded-full bg-[#1e1f22] object-cover"
            />
            <span className="text-xs font-semibold text-white truncate">{peer.username}</span>
            {peer.isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
            {isLocallyMuted && !peer.isMuted && <VolumeX className="w-3.5 h-3.5 text-[#f23f43]" />}
          </div>
        );
      })}
    </div>
  );
};

// Card de Participante Remoto no Grid
const RemotePeerCard: React.FC<{
  peer: PeerConnectionInfo;
  isStreaming?: boolean;
  volume: number;
  onWatchStream: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}> = ({ peer, isStreaming, volume, onWatchStream, onContextMenu }) => {
  return (
    <div
      onContextMenu={onContextMenu}
      className={`bg-[#2b2d31] hover:bg-[#32353b] cursor-pointer rounded-2xl p-6 flex flex-col items-center justify-center relative min-h-[220px] border-2 transition-all duration-200 shadow-lg ${
        peer.isSpeaking
          ? 'border-[#23a55a] ring-4 ring-[#23a55a]/20 scale-[1.02]'
          : 'border-transparent'
      }`}
      title="Clique com botão direito para ajustar volume deste usuário"
    >
      <div className="relative">
        <img
          src={
            peer.avatarUrl ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
              peer.username
            )}`
          }
          alt={peer.username}
          className={`w-24 h-24 rounded-full bg-[#1e1f22] object-cover transition-transform ${
            peer.isSpeaking ? 'scale-105 ring-4 ring-[#23a55a]' : ''
          }`}
        />

        {/* Badge vermelho de microfone mutado no avatar */}
        {peer.isMuted && (
          <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#f23f43] text-white shadow-lg ring-2 ring-[#2b2d31]">
            <MicOff className="w-4 h-4" />
          </div>
        )}

        {isStreaming && (
          <span className="absolute -top-2 -right-2 bg-[#f23f43] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow animate-pulse">
            AO VIVO
          </span>
        )}
      </div>

      {/* Botão de Assistir Transmissão */}
      {isStreaming && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onWatchStream();
          }}
          className="mt-3 bg-[#23a55a] hover:bg-[#209451] text-white text-xs font-bold px-3.5 py-1.5 rounded-md flex items-center space-x-1.5 shadow-md hover:scale-105 transition duration-150 z-10"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Assistir Transmissão</span>
        </button>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-white z-10">
        <span className="font-semibold truncate">{peer.username}</span>
        <div className="flex items-center space-x-1">
          {peer.isMuted && <MicOff className="w-3.5 h-3.5 text-[#f23f43]" />}
          {peer.isDeafened && <VolumeX className="w-3.5 h-3.5 text-[#f23f43]" />}
          {volume === 0 && !peer.isMuted && <VolumeX className="w-3.5 h-3.5 text-[#f23f43]" />}
        </div>
      </div>
    </div>
  );
};
