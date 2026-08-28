import React from 'react';
import { Plus } from 'lucide-react';
import { Server } from '../types';

interface ServerSidebarProps {
  servers: Server[];
  activeServerId: string | null;
  onSelectServer: (serverId: string | null) => void;
  onOpenCreateServer: () => void;
}

export const ServerSidebar: React.FC<ServerSidebarProps> = ({
  servers,
  activeServerId,
  onSelectServer,
  onOpenCreateServer,
}) => {
  return (
    <nav className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-2 select-none z-30 shrink-0">
      {/* Botão MELODIA Oficial / Direct Messages (Home) */}
      <div className="relative group flex items-center justify-center w-full">
        <div
          className={`absolute left-0 bg-white rounded-r-full transition-all duration-200 ${
            activeServerId === null
              ? 'h-10 w-1'
              : 'h-2 w-1 scale-0 group-hover:scale-100 group-hover:h-5'
          }`}
        />
        <button
          onClick={() => onSelectServer(null)}
          className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] flex items-center justify-center transition-all duration-200 overflow-hidden shadow-md group-hover:scale-105 ${
            activeServerId === null
              ? 'bg-[#5865f2] rounded-[16px] ring-2 ring-[#5865f2]'
              : 'bg-[#313338] hover:bg-[#5865f2]'
          }`}
          title="Mensagens Diretas e Amigos"
        >
          <img
            src="/logo.png"
            alt="MELODIA"
            className="w-full h-full object-cover"
          />
        </button>
      </div>

      {/* Divisor */}
      <div className="w-8 h-[2px] bg-[#35363c] rounded my-1" />

      {/* Lista de Servidores */}
      <div className="flex-1 w-full space-y-2 overflow-y-auto no-scrollbar flex flex-col items-center">
        {servers.map((server) => {
          const isActive = activeServerId === server.id;
          const initials = server.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 3)
            .toUpperCase();

          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              <div
                className={`absolute left-0 bg-white rounded-r-full transition-all duration-200 ${
                  isActive
                    ? 'h-10 w-1'
                    : 'h-2 w-1 scale-0 group-hover:scale-100 group-hover:h-5'
                }`}
              />
              <button
                onClick={() => onSelectServer(server.id)}
                className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] flex items-center justify-center transition-all duration-200 overflow-hidden font-semibold text-sm ${
                  isActive
                    ? 'bg-[#5865f2] rounded-[16px] text-white shadow-lg'
                    : 'bg-[#313338] text-[#dbdee1] hover:bg-[#5865f2] hover:text-white'
                }`}
                title={server.name}
              >
                {server.iconUrl && !server.iconUrl.includes('dicebear') ? (
                  <img
                    src={server.iconUrl}
                    alt={server.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </button>
            </div>
          );
        })}

        {/* Botão Adicionar Servidor */}
        <div className="relative group flex items-center justify-center w-full pt-1">
          <button
            onClick={onOpenCreateServer}
            className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#23a55a] text-[#23a55a] hover:text-white flex items-center justify-center transition-all duration-200"
            title="Adicionar um servidor"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
};
