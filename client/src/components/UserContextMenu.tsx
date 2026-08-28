import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX, MessageSquare, User, Shield } from 'lucide-react';

interface UserContextMenuProps {
  x: number;
  y: number;
  username: string;
  avatarUrl?: string;
  volume: number; // 0 to 200
  isLocallyMuted: boolean;
  onVolumeChange: (newVolume: number) => void;
  onToggleLocalMute: () => void;
  onOpenDM?: () => void;
  onClose: () => void;
}

export const UserContextMenu: React.FC<UserContextMenuProps> = ({
  x,
  y,
  username,
  avatarUrl,
  volume,
  isLocallyMuted,
  onVolumeChange,
  onToggleLocalMute,
  onOpenDM,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Ajustar posição para caber na tela
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-56 bg-[#111214] border border-[#232428] rounded-lg shadow-2xl p-2 select-none animate-fadeIn text-[#dbdee1]"
    >
      {/* Header do Usuário */}
      <div className="flex items-center space-x-2.5 px-2 py-1.5 border-b border-[#1f2023] mb-1.5">
        <img
          src={
            avatarUrl ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`
          }
          alt={username}
          className="w-7 h-7 rounded-full bg-[#2b2d31] object-cover"
        />
        <div className="truncate min-w-0 font-bold text-white text-xs">{username}</div>
      </div>

      {/* Slider de Volume Individual (0% a 200%) */}
      <div className="px-2 py-2 bg-[#1e1f22] rounded-md mb-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#b5bac1] uppercase tracking-wider mb-1.5">
          <span className="flex items-center space-x-1">
            <Volume2 className="w-3.5 h-3.5 text-[#5865f2]" />
            <span>Volume do Usuário</span>
          </span>
          <span className="text-[#5865f2] font-mono">{volume}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="200"
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-full h-1.5 bg-[#313338] rounded-lg appearance-none cursor-pointer accent-[#5865f2]"
        />
      </div>

      {/* Toggle Mudo para Mim */}
      <button
        onClick={onToggleLocalMute}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition ${
          isLocallyMuted
            ? 'bg-[#f23f43]/15 text-[#f23f43]'
            : 'hover:bg-[#35373c] hover:text-white'
        }`}
      >
        <div className="flex items-center space-x-2">
          {isLocallyMuted ? <VolumeX className="w-4 h-4 text-[#f23f43]" /> : <Volume2 className="w-4 h-4" />}
          <span>Mutar para Mim</span>
        </div>
        <input
          type="checkbox"
          checked={isLocallyMuted}
          onChange={() => {}}
          className="accent-[#f23f43]"
        />
      </button>

      {/* Ação de Mensagem Direta */}
      {onOpenDM && (
        <button
          onClick={() => {
            onOpenDM();
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-xs hover:bg-[#5865f2] hover:text-white transition mt-1"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Enviar Mensagem</span>
        </button>
      )}
    </div>
  );
};
