import React, { useState } from 'react';
import { X, Monitor, Zap, Tv, Volume2, Sparkles } from 'lucide-react';
import { ScreenShareQuality } from '../types';

interface ScreenShareModalProps {
  onClose: () => void;
  onStartShare: (quality: ScreenShareQuality) => void;
}

export const ScreenShareModal: React.FC<ScreenShareModalProps> = ({
  onClose,
  onStartShare,
}) => {
  const [resolution, setResolution] = useState<'1080p' | '720p' | 'source'>('1080p');
  const [fps, setFps] = useState<60 | 30 | 15>(60);
  const [audio, setAudio] = useState(true);

  const handleStart = () => {
    onStartShare({
      resolution,
      fps,
      audio,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#313338] rounded-xl shadow-2xl overflow-hidden border border-[#232428]">
        {/* Header */}
        <div className="p-4 bg-[#2b2d31] flex items-center justify-between border-b border-[#1f2023]">
          <div className="flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-[#5865f2]" />
            <h3 className="font-bold text-white text-base">Compartilhar sua Tela</h3>
          </div>
          <button onClick={onClose} className="text-[#949ba4] hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Seletor de Resolução */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2">
              Resolução de Transmissão
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setResolution('1080p')}
                className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1 ${
                  resolution === '1080p'
                    ? 'bg-[#5865f2] border-[#5865f2] text-white shadow-md'
                    : 'bg-[#2b2d31] border-transparent text-[#dbdee1] hover:bg-[#35373c]'
                }`}
              >
                <span className="text-sm font-bold">1080P</span>
                <span className="text-[10px] opacity-80">Full HD</span>
              </button>

              <button
                type="button"
                onClick={() => setResolution('720p')}
                className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1 ${
                  resolution === '720p'
                    ? 'bg-[#5865f2] border-[#5865f2] text-white shadow-md'
                    : 'bg-[#2b2d31] border-transparent text-[#dbdee1] hover:bg-[#35373c]'
                }`}
              >
                <span className="text-sm font-bold">720P</span>
                <span className="text-[10px] opacity-80">HD</span>
              </button>

              <button
                type="button"
                onClick={() => setResolution('source')}
                className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1 ${
                  resolution === 'source'
                    ? 'bg-[#5865f2] border-[#5865f2] text-white shadow-md'
                    : 'bg-[#2b2d31] border-transparent text-[#dbdee1] hover:bg-[#35373c]'
                }`}
              >
                <span className="text-sm font-bold">Fonte</span>
                <span className="text-[10px] opacity-80">Original</span>
              </button>
            </div>
          </div>

          {/* Seletor de Taxa de Quadros (FPS) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#b5bac1] mb-2 flex items-center justify-between">
              <span>Taxa de Quadros (FPS)</span>
              {fps === 60 && (
                <span className="text-[#23a55a] text-[10px] flex items-center space-x-1 font-semibold">
                  <Zap className="w-3 h-3" />
                  <span>Ultra Fluido</span>
                </span>
              )}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFps(60)}
                className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1 ${
                  fps === 60
                    ? 'bg-[#23a55a] border-[#23a55a] text-white shadow-md'
                    : 'bg-[#2b2d31] border-transparent text-[#dbdee1] hover:bg-[#35373c]'
                }`}
              >
                <span className="text-sm font-bold">60 FPS</span>
                <span className="text-[10px] opacity-80">Jogos & Vídeos</span>
              </button>

              <button
                type="button"
                onClick={() => setFps(30)}
                className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1 ${
                  fps === 30
                    ? 'bg-[#5865f2] border-[#5865f2] text-white shadow-md'
                    : 'bg-[#2b2d31] border-transparent text-[#dbdee1] hover:bg-[#35373c]'
                }`}
              >
                <span className="text-sm font-bold">30 FPS</span>
                <span className="text-[10px] opacity-80">Padrão</span>
              </button>

              <button
                type="button"
                onClick={() => setFps(15)}
                className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1 ${
                  fps === 15
                    ? 'bg-[#5865f2] border-[#5865f2] text-white shadow-md'
                    : 'bg-[#2b2d31] border-transparent text-[#dbdee1] hover:bg-[#35373c]'
                }`}
              >
                <span className="text-sm font-bold">15 FPS</span>
                <span className="text-[10px] opacity-80">Slides / Texto</span>
              </button>
            </div>
          </div>

          {/* Toggle de Áudio */}
          <div
            onClick={() => setAudio(!audio)}
            className="p-3 bg-[#2b2d31] rounded-lg flex items-center justify-between cursor-pointer hover:bg-[#35373c] transition border border-[#1f2023]"
          >
            <div className="flex items-center space-x-3">
              <Volume2 className="w-5 h-5 text-[#949ba4]" />
              <div>
                <div className="text-xs font-semibold text-white">Transmitir Áudio do Sistema</div>
                <div className="text-[10px] text-[#949ba4]">Compartilha sons do jogo ou janela</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={audio}
              onChange={() => {}}
              className="w-4 h-4 accent-[#5865f2] cursor-pointer"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-white hover:underline py-2"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleStart}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition shadow-lg flex items-center space-x-2"
            >
              <span>Transmitir ao Vivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
