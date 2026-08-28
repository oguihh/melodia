import React, { useState } from 'react';
import {
  Hash,
  Volume2,
  Plus,
  ChevronDown,
  UserPlus,
  Settings,
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  VolumeX,
  Radio,
  Users,
  MessageSquare,
} from 'lucide-react';
import { Server, Channel, User, VoiceParticipant, DMChannelSummary } from '../types';

interface ChannelSidebarProps {
  server: Server | null;
  activeChannel: Channel | null;
  currentUser: User;
  voiceParticipants: VoiceParticipant[];
  connectedVoiceChannelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  dmChannels: DMChannelSummary[];
  activeDMChannelId: string | null;
  showFriendsTab: boolean;
  onSelectChannel: (channel: Channel) => void;
  onSelectDM: (dmChannelId: string) => void;
  onSelectFriendsTab: () => void;
  onOpenCreateChannel: (type: 'TEXT' | 'VOICE') => void;
  onOpenInvite: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onDisconnectVoice: () => void;
  onOpenSettings: () => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  server,
  activeChannel,
  currentUser,
  voiceParticipants,
  connectedVoiceChannelId,
  isMuted,
  isDeafened,
  isSpeaking,
  dmChannels,
  activeDMChannelId,
  showFriendsTab,
  onSelectChannel,
  onSelectDM,
  onSelectFriendsTab,
  onOpenCreateChannel,
  onOpenInvite,
  onToggleMute,
  onToggleDeafen,
  onDisconnectVoice,
  onOpenSettings,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const textChannels = server?.channels.filter((c) => c.type === 'TEXT') || [];
  const voiceChannels = server?.channels.filter((c) => c.type === 'VOICE') || [];

  return (
    <aside className="w-60 bg-[#2b2d31] flex flex-col justify-between select-none z-20 shrink-0 border-r border-[#1f2023]">
      {/* 1. Header Superior */}
      <div>
        {server ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full h-12 px-4 border-b border-[#1f2023] flex items-center justify-between font-bold text-white shadow-sm hover:bg-[#35373c] transition"
            >
              <span className="truncate">{server.name}</span>
              <ChevronDown className="w-4 h-4 text-[#949ba4]" />
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-14 left-2 right-2 bg-[#111214] p-1.5 rounded-md shadow-2xl border border-[#232428] z-50 animate-fadeIn"
                onClick={() => setDropdownOpen(false)}
              >
                <button
                  onClick={onOpenInvite}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded text-xs text-[#5865f2] font-semibold hover:bg-[#5865f2] hover:text-white transition"
                >
                  <span>Convidar Pessoas</span>
                  <UserPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onOpenCreateChannel('TEXT')}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded text-xs text-[#dbdee1] hover:bg-[#35373c] hover:text-white transition"
                >
                  <span>Criar Canal</span>
                  <Plus className="w-4 h-4" />
                </button>
                <div className="h-[1px] bg-[#232428] my-1" />
                <button
                  onClick={onOpenSettings}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded text-xs text-[#dbdee1] hover:bg-[#35373c] hover:text-white transition"
                >
                  <span>Configurações</span>
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 border-b border-[#1f2023]">
            <button
              onClick={onSelectFriendsTab}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md font-medium text-sm transition ${
                showFriendsTab
                  ? 'bg-[#404249] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Amigos</span>
            </button>
          </div>
        )}

        {/* 2. Lista de Canais (Se em Servidor) ou DMs (Se em Direct Messages) */}
        <div className="px-2 py-3 space-y-4 overflow-y-auto max-h-[calc(100vh-170px)]">
          {server ? (
            <>
              {/* Canais de Texto */}
              {textChannels.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 text-[11px] font-bold tracking-wider text-[#949ba4] uppercase mb-1">
                    <span>Canais de Texto</span>
                    <button
                      onClick={() => onOpenCreateChannel('TEXT')}
                      className="hover:text-white transition"
                      title="Criar canal de texto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    {textChannels.map((channel) => {
                      const isActive = activeChannel?.id === channel.id;
                      return (
                        <button
                          key={channel.id}
                          onClick={() => onSelectChannel(channel)}
                          className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm font-medium transition ${
                            isActive
                              ? 'bg-[#404249] text-white'
                              : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                          }`}
                        >
                          <Hash className="w-4 h-4 text-[#80848e]" />
                          <span className="truncate">{channel.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Canais de Voz */}
              {voiceChannels.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 text-[11px] font-bold tracking-wider text-[#949ba4] uppercase mb-1">
                    <span>Canais de Voz</span>
                    <button
                      onClick={() => onOpenCreateChannel('VOICE')}
                      className="hover:text-white transition"
                      title="Criar canal de voz"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {voiceChannels.map((channel) => {
                      const isConnected = connectedVoiceChannelId === channel.id;
                      const channelParticipants = voiceParticipants.filter(
                        (p) => p.channelId === channel.id
                      );

                      return (
                        <div key={channel.id} className="space-y-0.5">
                          <button
                            onClick={() => onSelectChannel(channel)}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm font-medium transition ${
                              isConnected
                                ? 'bg-[#404249] text-white'
                                : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <Volume2 className="w-4 h-4 text-[#80848e]" />
                              <span className="truncate">{channel.name}</span>
                            </div>
                            {isConnected && (
                              <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-ping" />
                            )}
                          </button>

                          {/* Lista Aninhada de Membros em Voz */}
                          {channelParticipants.length > 0 && (
                            <div className="pl-6 pr-2 py-1 space-y-1">
                              {channelParticipants.map((p) => {
                                const isLocalUser = p.userId === currentUser.id;
                                const speaking = isLocalUser ? isSpeaking : p.isSpeaking;

                                return (
                                  <div
                                    key={p.userId}
                                    className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#35373c] text-xs text-[#dbdee1]"
                                  >
                                    <div className="flex items-center space-x-2 truncate">
                                      <img
                                        src={
                                          p.avatarUrl ||
                                          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                            p.username
                                          )}`
                                        }
                                        alt={p.username}
                                        className={`w-5 h-5 rounded-full object-cover transition-all ${
                                          speaking ? 'ring-2 ring-[#23a55a] scale-105' : ''
                                        }`}
                                      />
                                      <span className="truncate">{p.username}</span>
                                    </div>

                                    <div className="flex items-center space-x-1 text-[#949ba4]">
                                      {p.isMuted && <MicOff className="w-3 h-3 text-[#f23f43]" />}
                                      {p.isDeafened && <VolumeX className="w-3 h-3 text-[#f23f43]" />}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Modo Mensagens Diretas (DMs) */
            <div>
              <div className="px-2 text-[11px] font-bold tracking-wider text-[#949ba4] uppercase mb-2">
                Mensagens Diretas
              </div>

              {dmChannels.length === 0 ? (
                <div className="px-2 text-xs text-[#949ba4]">
                  Nenhuma conversa aberta. Adicione amigos para começar a conversar!
                </div>
              ) : (
                <div className="space-y-1">
                  {dmChannels.map((dm) => {
                    const isActive = !showFriendsTab && activeDMChannelId === dm.id;
                    return (
                      <button
                        key={dm.id}
                        onClick={() => onSelectDM(dm.id)}
                        className={`w-full flex items-center space-x-3 px-2 py-1.5 rounded-md text-sm transition ${
                          isActive
                            ? 'bg-[#404249] text-white'
                            : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={
                              dm.recipient.avatarUrl ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                dm.recipient.username
                              )}`
                            }
                            alt={dm.recipient.username}
                            className="w-7 h-7 rounded-full bg-[#1e1f22]"
                          />
                          <span className="w-2 h-2 rounded-full bg-[#23a55a] absolute bottom-0 right-0 ring-1 ring-[#2b2d31]" />
                        </div>

                        <div className="truncate text-left min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {dm.recipient.username}
                          </div>
                          <div className="text-[10px] text-[#949ba4] truncate">
                            {dm.lastMessage?.content || 'Clique para conversar'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Rodapé com Painel de Voz e Usuário */}
      <div className="bg-[#232428] border-t border-[#1f2023]">
        {/* Painel: Voz Conectada */}
        {connectedVoiceChannelId && (
          <div className="px-3 py-2 border-b border-[#1f2023] flex items-center justify-between bg-[#1e1f22]">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-[#23a55a] animate-pulse" />
              <div>
                <div className="text-xs font-bold text-[#23a55a]">Voz Conectada</div>
                <div className="text-[10px] text-[#949ba4]">MELODIA RTC</div>
              </div>
            </div>

            <button
              onClick={onDisconnectVoice}
              className="p-1.5 rounded hover:bg-[#35373c] text-[#949ba4] hover:text-[#f23f43] transition"
              title="Desconectar da chamada"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Perfil do Usuário */}
        <div className="h-14 px-2 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0 pr-1">
            <div className="relative shrink-0">
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
              <div className="w-2.5 h-2.5 rounded-full bg-[#23a55a] absolute bottom-0 right-0 ring-2 ring-[#232428]" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser.username}
              </div>
              <div className="text-[10px] text-[#949ba4] truncate">
                {currentUser.customStatus || 'Online'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-0.5 text-[#b5bac1]">
            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded hover:bg-[#35373c] transition ${
                isMuted ? 'text-[#f23f43]' : 'hover:text-white'
              }`}
              title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleDeafen}
              className={`p-1.5 rounded hover:bg-[#35373c] transition ${
                isDeafened ? 'text-[#f23f43]' : 'hover:text-white'
              }`}
              title={isDeafened ? 'Desensurdecer' : 'Desativar Áudio'}
            >
              {isDeafened ? <VolumeX className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded hover:bg-[#35373c] hover:text-white transition"
              title="Configurações de Usuário"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
