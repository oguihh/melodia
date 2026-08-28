import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { ServerSidebar } from './components/ServerSidebar';
import { ChannelSidebar } from './components/ChannelSidebar';
import { ChatArea } from './components/ChatArea';
import { VoiceArea } from './components/VoiceArea';
import { FriendsView } from './components/FriendsView';
import { DMChatArea } from './components/DMChatArea';
import { AuthModal } from './components/AuthModal';
import { CreateServerModal } from './components/CreateServerModal';
import { CreateChannelModal } from './components/CreateChannelModal';
import { InviteModal } from './components/InviteModal';
import { SettingsModal } from './components/SettingsModal';
import { ScreenShareModal } from './components/ScreenShareModal';
import { User, Server, Channel, VoiceParticipant, DMChannelSummary, ScreenShareQuality } from './types';
import { apiRequest, getStoredToken, removeStoredToken } from './lib/api';
import { reconnectSocketWithToken, disconnectSocket } from './lib/socket';
import { useWebRTC } from './hooks/useWebRTC';
import { sounds } from './lib/sounds';
import { Sparkles } from 'lucide-react';
import { Socket } from 'socket.io-client';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([]);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  // Estados de Amigos e DMs
  const [showFriendsTab, setShowFriendsTab] = useState(true);
  const [dmChannels, setDmChannels] = useState<DMChannelSummary[]>([]);
  const [activeDMChannelId, setActiveDMChannelId] = useState<string | null>(null);

  // Modais
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [createChannelModalType, setCreateChannelModalType] = useState<'TEXT' | 'VOICE' | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);

  // WebRTC Hook com Username e Avatar sincronizados
  const {
    connectedChannelId,
    connectedServerId,
    isMuted,
    isDeafened,
    isCameraOn,
    isScreenSharing,
    isSpeaking,
    peers,
    localStream,
    screenStream,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(
    socketInstance,
    currentUser?.id,
    currentUser?.username,
    currentUser?.avatarUrl
  );

  // Carregar dados de autenticação
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setShowAuthModal(true);
        return;
      }

      try {
        const data = await apiRequest<{ user: User }>('/auth/me');
        setCurrentUser(data.user);
        const socket = reconnectSocketWithToken(token);
        setSocketInstance(socket);
      } catch (err) {
        console.error('Erro na autenticação inicial:', err);
        removeStoredToken();
        setShowAuthModal(true);
      }
    };

    initAuth();
  }, []);

  // Carregar servidores
  const loadServers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await apiRequest<{ servers: Server[] }>('/servers');
      setServers(data.servers);
    } catch (err) {
      console.error('Erro ao carregar servidores:', err);
    }
  }, [currentUser]);

  // Carregar DMs
  const loadDMs = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await apiRequest<{ dmChannels: DMChannelSummary[] }>('/dms');
      setDmChannels(data.dmChannels);
    } catch (err) {
      console.error('Erro ao carregar DMs:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadServers();
      loadDMs();
    }
  }, [currentUser, loadServers, loadDMs]);

  // Escutar eventos de voz e notificações em tempo real
  useEffect(() => {
    if (!socketInstance) return;

    const handleVoiceChannelUpdated = (data: {
      channelId: string;
      participants: VoiceParticipant[];
    }) => {
      setVoiceParticipants((prev) => {
        const filtered = prev.filter((p) => p.channelId !== data.channelId);
        return [...filtered, ...data.participants];
      });
    };

    // Notificação de nova mensagem recebida de amigo
    const handleDmNotification = (data: {
      dmChannelId: string;
      message: any;
    }) => {
      sounds.playMessageNotification();
      sounds.showNotification(
        `MELODIA - @${data.message.sender.username}`,
        data.message.content
      );
      loadDMs();
    };

    const handleFriendAccepted = () => {
      loadDMs();
    };

    socketInstance.on('voice-state-channel-updated', handleVoiceChannelUpdated);
    socketInstance.on('dm-notification', handleDmNotification);
    socketInstance.on('friend-request-accepted', handleFriendAccepted);

    return () => {
      socketInstance.off('voice-state-channel-updated', handleVoiceChannelUpdated);
      socketInstance.off('dm-notification', handleDmNotification);
      socketInstance.off('friend-request-accepted', handleFriendAccepted);
    };
  }, [socketInstance, loadDMs]);

  const activeServer = servers.find((s) => s.id === activeServerId) || null;
  const activeDM = dmChannels.find((dm) => dm.id === activeDMChannelId) || null;

  // Selecionar canal
  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel(channel);

    if (channel.type === 'VOICE' && connectedChannelId !== channel.id) {
      sounds.playJoinCallSound();
      joinVoiceChannel(channel.id, channel.serverId, currentUser?.avatarUrl);
    }
  };

  // Abrir DM
  const handleOpenDM = async (friendUserId: string) => {
    try {
      const data = await apiRequest<{ dmChannel: { id: string; recipient: User } }>(
        `/dms/open/${friendUserId}`,
        { method: 'POST' }
      );

      await loadDMs();
      setActiveServerId(null);
      setActiveChannel(null);
      setShowFriendsTab(false);
      setActiveDMChannelId(data.dmChannel.id);
    } catch (e) {
      console.error('Erro ao abrir DM:', e);
    }
  };

  // Desconectar da chamada
  const handleDisconnectVoice = () => {
    sounds.playLeaveCallSound();
    const previousChannelId = connectedChannelId;
    leaveVoiceChannel();

    if (previousChannelId && currentUser) {
      setVoiceParticipants((prev) =>
        prev.filter(
          (p) => !(p.channelId === previousChannelId && p.userId === currentUser.id)
        )
      );
    }

    if (activeServer && activeServer.channels.length > 0) {
      const textChannel =
        activeServer.channels.find((c) => c.type === 'TEXT') || activeServer.channels[0];
      setActiveChannel(textChannel);
    } else {
      setActiveChannel(null);
    }
  };

  // Sucesso de autenticação
  const handleAuthSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    const socket = reconnectSocketWithToken(token);
    setSocketInstance(socket);
  };

  // Logout
  const handleLogout = () => {
    handleDisconnectVoice();
    disconnectSocket();
    removeStoredToken();
    setCurrentUser(null);
    setServers([]);
    setActiveServerId(null);
    setActiveChannel(null);
    setDmChannels([]);
    setActiveDMChannelId(null);
    setShowSettingsModal(false);
    setShowAuthModal(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1f22] overflow-hidden text-white font-sans">
      {/* 1. Barra de Título Superior MELODIA */}
      <TitleBar
        serverName={activeServer?.name}
        channelName={activeChannel?.name || (activeDM ? activeDM.recipient.username : undefined)}
        isVoiceConnected={!!connectedChannelId}
      />

      {/* 2. Conteúdo Principal */}
      <div className="flex flex-1 overflow-hidden">
        {currentUser ? (
          <>
            {/* Barra Lateral de Servidores */}
            <ServerSidebar
              servers={servers}
              activeServerId={activeServerId}
              onSelectServer={(serverId) => {
                setActiveServerId(serverId);
                if (serverId === null) {
                  setShowFriendsTab(true);
                  setActiveChannel(null);
                  loadDMs();
                } else {
                  const s = servers.find((srv) => srv.id === serverId);
                  if (s && s.channels.length > 0) {
                    setActiveChannel(s.channels[0]);
                  } else {
                    setActiveChannel(null);
                  }
                  setShowFriendsTab(false);
                }
              }}
              onOpenCreateServer={() => setShowCreateServerModal(true)}
            />

            {/* Barra Lateral de Canais / DMs */}
            <ChannelSidebar
              server={activeServer}
              activeChannel={activeChannel}
              currentUser={currentUser}
              voiceParticipants={voiceParticipants}
              connectedVoiceChannelId={connectedChannelId}
              isMuted={isMuted}
              isDeafened={isDeafened}
              isSpeaking={isSpeaking}
              dmChannels={dmChannels}
              activeDMChannelId={activeDMChannelId}
              showFriendsTab={showFriendsTab}
              onSelectChannel={handleSelectChannel}
              onSelectDM={(dmId) => {
                setActiveDMChannelId(dmId);
                setShowFriendsTab(false);
                setActiveChannel(null);
              }}
              onSelectFriendsTab={() => {
                setShowFriendsTab(true);
                setActiveDMChannelId(null);
              }}
              onOpenCreateChannel={(type) => setCreateChannelModalType(type)}
              onOpenInvite={() => setShowInviteModal(true)}
              onToggleMute={toggleMute}
              onToggleDeafen={toggleDeafen}
              onDisconnectVoice={handleDisconnectVoice}
              onOpenSettings={() => setShowSettingsModal(true)}
            />

            {/* Área Central */}
            {activeServerId === null ? (
              /* MODO HOME / DIRECT MESSAGES */
              showFriendsTab ? (
                <FriendsView
                  currentUser={currentUser}
                  socket={socketInstance}
                  onOpenDM={handleOpenDM}
                />
              ) : activeDM ? (
                <DMChatArea
                  dmChannelId={activeDM.id}
                  recipient={activeDM.recipient}
                  currentUser={currentUser}
                  socket={socketInstance}
                  onStartCall={() => {
                    setShowScreenShareModal(true);
                  }}
                />
              ) : (
                <FriendsView
                  currentUser={currentUser}
                  socket={socketInstance}
                  onOpenDM={handleOpenDM}
                />
              )
            ) : activeChannel?.type === 'VOICE' && connectedChannelId ? (
              /* MODO CANAL DE VOZ / VÍDEO */
              <VoiceArea
                channel={activeChannel}
                currentUser={currentUser}
                peers={peers}
                localStream={localStream}
                screenStream={screenStream}
                isMuted={isMuted}
                isDeafened={isDeafened}
                isCameraOn={isCameraOn}
                isScreenSharing={isScreenSharing}
                isSpeaking={isSpeaking}
                onToggleMute={toggleMute}
                onToggleDeafen={toggleDeafen}
                onToggleCamera={toggleCamera}
                onOpenScreenShareModal={() => setShowScreenShareModal(true)}
                onStopScreenShare={stopScreenShare}
                onDisconnect={handleDisconnectVoice}
              />
            ) : activeChannel?.type === 'TEXT' ? (
              /* MODO CANAL DE TEXTO DO SERVIDOR */
              <ChatArea
                channel={activeChannel}
                currentUser={currentUser}
                socket={socketInstance}
              />
            ) : (
              <div className="flex-1 bg-[#313338] flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-20 h-20 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#5865f2] shadow-inner">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white">Nenhum canal selecionado</h3>
                <p className="text-xs text-[#949ba4] max-w-sm">
                  Crie ou selecione um canal de texto ou de voz para começar.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#111214]">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-[#5865f2] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-[#949ba4]">Iniciando MELODIA...</p>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAIS --- */}
      {showAuthModal && <AuthModal onSuccess={handleAuthSuccess} />}

      {showCreateServerModal && (
        <CreateServerModal
          onClose={() => setShowCreateServerModal(false)}
          onServerCreated={(newServer) => {
            setServers((prev) => [...prev, newServer]);
            setActiveServerId(newServer.id);
            if (newServer.channels.length > 0) {
              setActiveChannel(newServer.channels[0]);
            }
          }}
          onServerJoined={async (joinedServerId) => {
            await loadServers();
            setActiveServerId(joinedServerId);
          }}
        />
      )}

      {createChannelModalType && activeServerId && (
        <CreateChannelModal
          serverId={activeServerId}
          defaultType={createChannelModalType}
          onClose={() => setCreateChannelModalType(null)}
          onChannelCreated={(newChannel) => {
            setServers((prev) =>
              prev.map((s) =>
                s.id === activeServerId
                  ? { ...s, channels: [...s.channels, newChannel] }
                  : s
              )
            );
            setActiveChannel(newChannel);
          }}
        />
      )}

      {showInviteModal && activeServer && (
        <InviteModal
          server={activeServer}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showSettingsModal && currentUser && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setShowSettingsModal(false)}
          onUpdateUser={(updated) => setCurrentUser(updated)}
          onLogout={handleLogout}
        />
      )}

      {/* Modal de Qualidade de Compartilhamento de Tela (60 FPS / 1080P) */}
      {showScreenShareModal && (
        <ScreenShareModal
          onClose={() => setShowScreenShareModal(false)}
          onStartShare={(quality: ScreenShareQuality) => {
            startScreenShare(quality);
          }}
        />
      )}
    </div>
  );
}

export default App;
