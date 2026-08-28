import React from 'react';
import { Minus, Square, X, Radio, Music } from 'lucide-react';

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
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  const handleMinimize = () => {
    (window as any).electronAPI?.minimize();
  };

  const handleMaximize = () => {
    (window as any).electronAPI?.maximize();
  };

  const handleClose = () => {
    (window as any).electronAPI?.close();
  };

  return (
    <div className="h-7 bg-[#1e1f22] select-none flex items-center justify-between px-3 text-xs text-[#949ba4] border-b border-[#111214] titlebar-drag z-50">
      {/* Lado Esquerdo: Logo & Nome MELODIA */}
      <div className="flex items-center space-x-2 titlebar-no-drag">
        <div className="flex items-center space-x-1.5 font-black text-white tracking-wider text-[11px]">
          <div className="w-4 h-4 rounded-md bg-[#5865f2] flex items-center justify-center text-white shadow-sm">
            <Music className="w-2.5 h-2.5" />
          </div>
          <span>MELODIA</span>
        </div>

        {isVoiceConnected && (
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#23a55a]/15 text-[#23a55a] text-[11px] font-semibold border border-[#23a55a]/30">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Voz Conectada</span>
          </div>
        )}
      </div>

      {/* Centro: Título da Sessão */}
      <div className="text-center font-medium text-[#dbdee1] truncate max-w-xs text-xs">
        {serverName ? `${serverName} ${channelName ? `• #${channelName}` : ''}` : 'Mensagens Diretas'}
      </div>

      {/* Lado Direito: Controles de Janela (para Electron) */}
      <div className="flex items-center space-x-1 titlebar-no-drag">
        {isElectron ? (
          <>
            <button
              onClick={handleMinimize}
              className="w-7 h-6 flex items-center justify-center hover:bg-[#35373c] text-[#dbdee1] transition"
              title="Minimizar"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-7 h-6 flex items-center justify-center hover:bg-[#35373c] text-[#dbdee1] transition"
              title="Maximizar"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleClose}
              className="w-7 h-6 flex items-center justify-center hover:bg-[#f23f43] hover:text-white text-[#dbdee1] transition"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="w-2 h-2 rounded-full bg-[#23a55a]" title="Online" />
        )}
      </div>
    </div>
  );
};
