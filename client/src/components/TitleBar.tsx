import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy, Radio } from 'lucide-react';

interface TitleBarProps {
  serverName?: string;
  channelName?: string;
  isVoiceConnected?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  serverName,
  channelName,
  isVoiceConnected,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const getElectronAPI = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).electronAPI || (window as any).electron || null;
  };

  const isElectron = Boolean(getElectronAPI());

  const handleMinimize = () => {
    const api = getElectronAPI();
    if (api?.minimize) {
      api.minimize();
    }
  };

  const handleMaximize = () => {
    const api = getElectronAPI();
    if (api?.maximize) {
      api.maximize();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    const api = getElectronAPI();
    if (api?.close) {
      api.close();
    }
  };

  return (
    <header
      onDoubleClick={isElectron ? handleMaximize : undefined}
      className="h-8 bg-[#1e1f22] text-[#949ba4] flex items-center justify-between px-2 select-none border-b border-[#111214] z-50 shrink-0 text-xs font-semibold app-drag-region"
    >
      {/* Esquerda: Logo Oficial da MELODIA e Status de Voz */}
      <div className="flex items-center space-x-2 no-drag">
        <div className="flex items-center space-x-2 font-bold text-white tracking-wide">
          <img
            src="/logo.png"
            alt="MELODIA Logo"
            className="w-5 h-5 rounded-full object-cover shadow"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="bg-gradient-to-r from-[#5865f2] to-[#00a8fc] bg-clip-text text-transparent font-black tracking-wider">
            MELODIA
          </span>
        </div>

        {isVoiceConnected && (
          <div className="flex items-center space-x-1.5 bg-[#23a55a]/15 text-[#23a55a] px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#23a55a]/30 ml-2">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Voz Conectada</span>
          </div>
        )}
      </div>

      {/* Centro: Nome do Servidor e Canal */}
      <div className="text-center font-medium text-[#dbdee1] truncate px-4">
        {serverName ? `${serverName} • #${channelName || 'geral'}` : 'MELODIA'}
      </div>

      {/* Direita: Controles de Janela do Windows */}
      <div className="flex items-center space-x-1 no-drag">
        {isElectron && (
          <>
            <button
              onClick={handleMinimize}
              className="w-7 h-6 flex items-center justify-center hover:bg-[#35373c] hover:text-white rounded transition"
              title="Minimizar"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-7 h-6 flex items-center justify-center hover:bg-[#35373c] hover:text-white rounded transition"
              title={isMaximized ? 'Restaurar' : 'Maximizar'}
            >
              {isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
            </button>
            <button
              onClick={handleClose}
              className="w-7 h-6 flex items-center justify-center hover:bg-[#f23f43] hover:text-white rounded transition"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </header>
  );
};
