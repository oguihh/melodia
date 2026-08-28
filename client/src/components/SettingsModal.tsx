import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  LogOut,
  Upload,
  Sparkles,
  Check,
  RotateCcw,
  Mic,
  Volume2,
  Play,
  Square,
  ShieldCheck,
} from 'lucide-react';
import { User as UserType } from '../types';
import { apiRequest } from '../lib/api';
import { createKrispNoiseProcessor, NoiseProcessor } from '../lib/noiseSuppression';

interface SettingsModalProps {
  currentUser: UserType;
  onClose: () => void;
  onUpdateUser: (user: UserType) => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  onClose,
  onUpdateUser,
  onLogout,
}) => {
  const [username, setUsername] = useState(currentUser.username);
  const [customStatus, setCustomStatus] = useState(currentUser.customStatus || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados do Teste de Microfone
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const [isRecordingPlayback, setIsRecordingPlayback] = useState(false);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [playbackCountdown, setPlaybackCountdown] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const testStreamRef = useRef<MediaStream | null>(null);
  const testProcessorRef = useRef<NoiseProcessor | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Limpeza ao fechar modal
  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  const stopMicTest = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (testProcessorRef.current) {
      testProcessorRef.current.cleanup();
      testProcessorRef.current = null;
    }
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
    }
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    setIsTestingMic(false);
    setIsRecordingPlayback(false);
    setIsPlayingBack(false);
    setMicVolumeLevel(0);
  };

  // Iniciar Medidor de Volume do Microfone em Tempo Real
  const startMicTest = async () => {
    try {
      stopMicTest();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      });

      testStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 48000 });
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsTestingMic(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Escalar para porcentagem (0% a 100%)
        const percentage = Math.min(100, Math.round((avg / 128) * 100));
        setMicVolumeLevel(percentage);

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      animFrameRef.current = requestAnimationFrame(updateMeter);
    } catch (e) {
      console.error('Erro ao iniciar teste de microfone:', e);
      alert('Não foi possível acessar seu microfone para o teste.');
    }
  };

  // Gravar 4 segundos com filtro Krisp e ouvir de volta
  const recordAndListenBack = async () => {
    try {
      stopMicTest();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      });

      testStreamRef.current = stream;
      const processor = createKrispNoiseProcessor(stream);
      testProcessorRef.current = processor;

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(processor.processedStream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        playbackAudioRef.current = audio;

        setIsRecordingPlayback(false);
        setIsPlayingBack(true);

        audio.play().catch(() => {});
        audio.onended = () => {
          setIsPlayingBack(false);
          startMicTest();
        };
      };

      recorder.start();
      setIsRecordingPlayback(true);
      setPlaybackCountdown(4);

      let timeLeft = 4;
      const interval = setInterval(() => {
        timeLeft--;
        setPlaybackCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(interval);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 1000);
    } catch (e) {
      console.error('Erro ao gravar áudio de teste:', e);
    }
  };

  // Upload de foto do computador (PNG, JPG, WEBP, etc.)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Gerar novo avatar padrão do MELODIA (Dicebear Bottts)
  const handleGenerateRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 10);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${randomSeed}`);
    setError(null);
  };

  // Restaurar avatar padrão baseado no username
  const handleResetToDefault = () => {
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);

    try {
      const data = await apiRequest<{ user: UserType }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          username: username.trim(),
          customStatus: customStatus.trim(),
          avatarUrl: avatarUrl,
        }),
      });

      onUpdateUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      <div className="w-full max-w-xl bg-[#313338] rounded-xl shadow-2xl overflow-hidden border border-[#232428]">
        {/* Header */}
        <div className="p-4 bg-[#2b2d31] flex items-center justify-between border-b border-[#1f2023]">
          <h3 className="font-bold text-white text-base">Meu Perfil e Configurações</h3>
          <button
            onClick={() => {
              stopMicTest();
              onClose();
            }}
            className="text-[#949ba4] hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="bg-[#f23f43]/15 border border-[#f23f43]/40 text-[#f23f43] text-xs p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Card de Visualização do Perfil */}
          <div className="bg-[#1e1f22] p-4 rounded-xl flex items-center space-x-4 border border-[#2b2d31]">
            <div className="relative group">
              <img
                src={
                  avatarUrl ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`
                }
                alt="Avatar Preview"
                className="w-20 h-20 rounded-full bg-[#2b2d31] object-cover ring-2 ring-[#5865f2] shadow-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-semibold"
                title="Trocar Foto"
              >
                <Upload className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold text-white truncate">{username}</h4>
              <p className="text-xs text-[#949ba4] truncate">{currentUser.email}</p>

              {/* Botões de Ação do Avatar */}
              <div className="flex flex-wrap gap-2 mt-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-[#35373c] hover:bg-[#404249] text-[#dbdee1] hover:text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Foto do PC</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateRandomAvatar}
                  className="px-2.5 py-1 bg-[#35373c] hover:bg-[#404249] text-[#dbdee1] hover:text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#5865f2]" />
                  <span>Sortear Avatar</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-2.5 py-1 bg-[#35373c] hover:bg-[#404249] text-[#949ba4] hover:text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
                  title="Restaurar avatar padrão"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Padrão</span>
                </button>
              </div>
            </div>
          </div>

          {/* Seção: Teste de Microfone e Supressão de Ruído Krisp */}
          <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#2b2d31] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <Mic className="w-4 h-4 text-[#5865f2]" />
                <span>Teste de Microfone e Qualidade</span>
              </div>
              <div className="flex items-center space-x-1 bg-[#23a55a]/15 text-[#23a55a] px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#23a55a]/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Krisp DSP Ativo (48kHz)</span>
              </div>
            </div>

            <p className="text-xs text-[#949ba4]">
              Fale no seu microfone para ver a barra responder ou grave um teste com a supressão
              Krisp para ouvir como sua voz chega para os seus amigos.
            </p>

            {/* Barra de Volume em Tempo Real */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#949ba4]">
                <span>Sensibilidade de Entrada</span>
                <span className="font-mono text-white">{micVolumeLevel}%</span>
              </div>
              <div className="w-full h-3 bg-[#313338] rounded-full overflow-hidden p-0.5 border border-[#3f4147]">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    micVolumeLevel > 70
                      ? 'bg-[#f23f43]'
                      : micVolumeLevel > 30
                      ? 'bg-[#23a55a]'
                      : 'bg-[#5865f2]'
                  }`}
                  style={{ width: `${micVolumeLevel}%` }}
                />
              </div>
            </div>

            {/* Botões do Teste de Voz */}
            <div className="flex flex-wrap gap-2 pt-1">
              {!isTestingMic ? (
                <button
                  type="button"
                  onClick={startMicTest}
                  className="px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Ver Nível do Microfone</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopMicTest}
                  className="px-3 py-1.5 bg-[#35373c] hover:bg-[#404249] text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Parar Teste</span>
                </button>
              )}

              <button
                type="button"
                onClick={recordAndListenBack}
                disabled={isRecordingPlayback || isPlayingBack}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
                  isRecordingPlayback
                    ? 'bg-[#f23f43] text-white animate-pulse'
                    : isPlayingBack
                    ? 'bg-[#23a55a] text-white'
                    : 'bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] hover:text-white border border-[#3f4147]'
                }`}
              >
                {isRecordingPlayback ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>Gravando Teste... ({playbackCountdown}s)</span>
                  </>
                ) : isPlayingBack ? (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Ouvindo seu Retorno Krisp...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#23a55a]" />
                    <span>Gravar e Ouvir Minha Voz</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Nome de Usuário */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Nome de Usuário
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu nome de usuário"
              className="w-full bg-[#1e1f22] text-[#dbdee1] px-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
          </div>

          {/* Status Personalizado */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Status Personalizado
            </label>
            <input
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="O que você está ouvindo ou jogando?"
              className="w-full bg-[#1e1f22] text-[#dbdee1] px-3 py-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
          </div>

          {/* Rodapé com Logout e Salvar */}
          <div className="flex items-center justify-between pt-4 border-t border-[#2b2d31]">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center space-x-2 text-xs text-[#f23f43] hover:underline font-semibold py-2 px-3 rounded hover:bg-[#f23f43]/10 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta (Logout)</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  stopMicTest();
                  onClose();
                }}
                className="text-xs text-white hover:underline py-2 px-4"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#23a55a] hover:bg-[#209451] text-white font-semibold py-2 px-5 rounded text-sm transition shadow flex items-center space-x-1.5 disabled:opacity-50"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvo com Sucesso!</span>
                  </>
                ) : (
                  <span>Salvar Alterações</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
