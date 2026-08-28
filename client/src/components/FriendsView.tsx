import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Check, X, MessageSquare, Search, Trash2, Clock } from 'lucide-react';
import { Friend, PendingFriendship, User } from '../types';
import { apiRequest } from '../lib/api';
import { Socket } from 'socket.io-client';
import { sounds } from '../lib/sounds';

interface FriendsViewProps {
  currentUser: User;
  socket: Socket | null;
  onOpenDM: (friendUserId: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  socket,
  onOpenDM,
}) => {
  const [tab, setTab] = useState<'ONLINE' | 'ALL' | 'PENDING' | 'ADD'>('ONLINE');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PendingFriendship[]>([]);
  const [pendingSent, setPendingSent] = useState<PendingFriendship[]>([]);
  const [addUsername, setAddUsername] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFriends = async () => {
    try {
      const data = await apiRequest<{
        friends: Friend[];
        pendingReceived: PendingFriendship[];
        pendingSent: PendingFriendship[];
      }>('/friends');

      setFriends(data.friends);
      setPendingReceived(data.pendingReceived);
      setPendingSent(data.pendingSent);
    } catch (e) {
      console.error('Erro ao carregar amigos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  // Escutar eventos de amigos em tempo real via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleFriendRequestReceived = (friendship: PendingFriendship) => {
      sounds.playFriendRequestSound();
      sounds.showNotification(
        'Novo Pedido de Amizade no MELODIA!',
        `${friendship.sender?.username || 'Alguém'} enviou um pedido de amizade para você.`
      );
      fetchFriends();
    };

    const handleFriendRequestAccepted = () => {
      sounds.playFriendRequestSound();
      sounds.showNotification('Pedido Aceito!', 'Você agora tem um novo amigo no MELODIA.');
      fetchFriends();
    };

    const handleFriendRequestRejected = () => {
      fetchFriends();
    };

    const handleFriendRemoved = () => {
      fetchFriends();
    };

    socket.on('friend-request-received', handleFriendRequestReceived);
    socket.on('friend-request-accepted', handleFriendRequestAccepted);
    socket.on('friend-request-rejected', handleFriendRequestRejected);
    socket.on('friend-removed', handleFriendRemoved);

    return () => {
      socket.off('friend-request-received', handleFriendRequestReceived);
      socket.off('friend-request-accepted', handleFriendRequestAccepted);
      socket.off('friend-request-rejected', handleFriendRequestRejected);
      socket.off('friend-removed', handleFriendRemoved);
    };
  }, [socket]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;

    setMessage(null);
    try {
      const data = await apiRequest<{ message: string }>('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ username: addUsername.trim() }),
      });
      setMessage({ type: 'success', text: data.message });
      setAddUsername('');
      fetchFriends();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao enviar pedido' });
    }
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      await apiRequest(`/friends/accept/${friendshipId}`, { method: 'POST' });
      fetchFriends();
    } catch (e) {
      console.error('Erro ao aceitar pedido:', e);
    }
  };

  const handleReject = async (friendshipId: string) => {
    try {
      await apiRequest(`/friends/reject/${friendshipId}`, { method: 'POST' });
      fetchFriends();
    } catch (e) {
      console.error('Erro ao rejeitar pedido:', e);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Deseja realmente remover este amigo?')) return;
    try {
      await apiRequest(`/friends/${friendshipId}`, { method: 'DELETE' });
      fetchFriends();
    } catch (e) {
      console.error('Erro ao remover amigo:', e);
    }
  };

  const filteredFriends = friends.filter((f) =>
    f.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-[#313338] flex flex-col overflow-hidden select-none">
      {/* 1. Header com Abas */}
      <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-[#80848e] pr-2 border-r border-[#3f4147]">
            <Users className="w-5 h-5 text-[#80848e]" />
            <span className="font-bold text-white text-sm">Amigos</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setTab('ONLINE');
                setMessage(null);
              }}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                tab === 'ONLINE'
                  ? 'bg-[#3f4147] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              Disponível ({friends.length})
            </button>

            <button
              onClick={() => {
                setTab('ALL');
                setMessage(null);
              }}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                tab === 'ALL'
                  ? 'bg-[#3f4147] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              Todos ({friends.length})
            </button>

            <button
              onClick={() => {
                setTab('PENDING');
                setMessage(null);
              }}
              className={`px-2 py-1 rounded text-xs font-semibold transition flex items-center space-x-1.5 ${
                tab === 'PENDING'
                  ? 'bg-[#3f4147] text-white'
                  : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
              }`}
            >
              <span>Pendentes</span>
              {pendingReceived.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#f23f43] text-white text-[10px] font-bold animate-pulse">
                  {pendingReceived.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setTab('ADD');
                setMessage(null);
              }}
              className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                tab === 'ADD'
                  ? 'bg-[#23a55a]/20 text-[#23a55a]'
                  : 'bg-[#23a55a] text-white hover:bg-[#209451]'
              }`}
            >
              Adicionar Amigo
            </button>
          </div>
        </div>
      </div>

      {/* 2. Conteúdo */}
      <div className="flex-1 p-6 overflow-y-auto">
        {tab === 'ADD' ? (
          <div className="max-w-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide">
                Adicionar Amigo
              </h3>
              <p className="text-xs text-[#949ba4] mt-1">
                Você pode adicionar amigos com o nome de usuário deles no MELODIA.
              </p>
            </div>

            <form
              onSubmit={handleSendRequest}
              className="bg-[#1e1f22] p-3 rounded-lg flex items-center border border-[#111214] focus-within:border-[#5865f2] transition"
            >
              <input
                type="text"
                required
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                placeholder="Insira o nome de usuário (ex: guilherme)"
                className="w-full bg-transparent text-sm text-[#dbdee1] placeholder-[#80848e] focus:outline-none px-2"
              />
              <button
                type="submit"
                disabled={!addUsername.trim()}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold text-xs py-2 px-4 rounded-md transition disabled:opacity-50 shrink-0"
              >
                Enviar pedido de amizade
              </button>
            </form>

            {message && (
              <div
                className={`p-3 rounded-md text-xs border ${
                  message.type === 'success'
                    ? 'bg-[#23a55a]/15 border-[#23a55a]/30 text-[#23a55a]'
                    : 'bg-[#f23f43]/15 border-[#f23f43]/30 text-[#f23f43]'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        ) : tab === 'PENDING' ? (
          <div className="max-w-2xl space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase text-[#b5bac1] tracking-wider mb-2">
                Solicitações Recebidas — {pendingReceived.length}
              </h4>

              {pendingReceived.length === 0 ? (
                <div className="text-xs text-[#949ba4] py-2">
                  Nenhuma solicitação de amizade pendente no momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingReceived.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] transition border border-[#1f2023]"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            req.sender?.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                              req.sender?.username || ''
                            )}`
                          }
                          alt={req.sender?.username}
                          className="w-10 h-10 rounded-full bg-[#1e1f22]"
                        />
                        <div>
                          <div className="text-sm font-bold text-white">
                            {req.sender?.username}
                          </div>
                          <div className="text-[11px] text-[#949ba4]">
                            Solicitação de amizade recebida
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAccept(req.id)}
                          className="w-9 h-9 rounded-full bg-[#2b2d31] hover:bg-[#23a55a] text-[#23a55a] hover:text-white flex items-center justify-center transition border border-[#3f4147]"
                          title="Aceitar Pedido"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="w-9 h-9 rounded-full bg-[#2b2d31] hover:bg-[#f23f43] text-[#f23f43] hover:text-white flex items-center justify-center transition border border-[#3f4147]"
                          title="Rejeitar Pedido"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-[#b5bac1] tracking-wider mb-2">
                Solicitações Enviadas — {pendingSent.length}
              </h4>

              {pendingSent.length === 0 ? (
                <div className="text-xs text-[#949ba4] py-2">
                  Você não tem pedidos enviados pendentes.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingSent.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] transition border border-[#1f2023]"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            req.receiver?.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                              req.receiver?.username || ''
                            )}`
                          }
                          alt={req.receiver?.username}
                          className="w-10 h-10 rounded-full bg-[#1e1f22]"
                        />
                        <div>
                          <div className="text-sm font-bold text-white">
                            {req.receiver?.username}
                          </div>
                          <div className="text-[11px] text-[#949ba4] flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-[#949ba4]" />
                            <span>Aguardando resposta...</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleReject(req.id)}
                        className="w-9 h-9 rounded-full bg-[#2b2d31] hover:bg-[#f23f43] text-[#949ba4] hover:text-white flex items-center justify-center transition border border-[#3f4147]"
                        title="Cancelar pedido"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-[#80848e] absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar amigos..."
                className="w-full bg-[#1e1f22] text-sm text-[#dbdee1] pl-9 pr-3 py-2 rounded-md focus:outline-none"
              />
            </div>

            <h4 className="text-xs font-bold uppercase text-[#b5bac1] tracking-wider pt-2">
              {tab === 'ONLINE' ? 'Disponível' : 'Todos os Amigos'} — {filteredFriends.length}
            </h4>

            {filteredFriends.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#5865f2] mx-auto">
                  <Users className="w-8 h-8" />
                </div>
                <p className="text-xs text-[#949ba4]">
                  {friends.length === 0
                    ? 'Você ainda não tem amigos no MELODIA. Clique na aba "Adicionar Amigo" acima!'
                    : 'Nenhum amigo encontrado na busca.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredFriends.map((f) => (
                  <div
                    key={f.friendshipId}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#35373c] transition group border-t border-[#1f2023]"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={
                            f.user.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                              f.user.username
                            )}`
                          }
                          alt={f.user.username}
                          className="w-10 h-10 rounded-full bg-[#1e1f22]"
                        />
                        <span className="w-3 h-3 rounded-full bg-[#23a55a] ring-2 ring-[#313338] absolute bottom-0 right-0" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {f.user.username}
                        </div>
                        <div className="text-xs text-[#949ba4] truncate">
                          {f.user.customStatus || 'Disponível'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onOpenDM(f.user.id)}
                        className="p-2 rounded-full bg-[#2b2d31] hover:bg-[#5865f2] text-[#dbdee1] hover:text-white transition shadow"
                        title="Enviar Mensagem (DM)"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRemoveFriend(f.friendshipId)}
                        className="p-2 rounded-full bg-[#2b2d31] hover:bg-[#f23f43] text-[#949ba4] hover:text-white transition shadow"
                        title="Remover Amigo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
