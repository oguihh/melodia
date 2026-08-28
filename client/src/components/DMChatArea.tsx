import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, ScreenShare, Sparkles, Smile } from 'lucide-react';
import { User, DirectMessageItem } from '../types';
import { apiRequest } from '../lib/api';
import { Socket } from 'socket.io-client';

interface DMChatAreaProps {
  dmChannelId: string;
  recipient: User;
  currentUser: User;
  socket: Socket | null;
  onStartCall: () => void;
}

export const DMChatArea: React.FC<DMChatAreaProps> = ({
  dmChannelId,
  recipient,
  currentUser,
  socket,
  onStartCall,
}) => {
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Carregar histórico de mensagens da DM
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchMessages = async () => {
      try {
        const data = await apiRequest<{ messages: DirectMessageItem[] }>(
          `/dms/${dmChannelId}/messages`
        );
        if (isMounted) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Erro ao carregar mensagens da DM:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();

    // Entrar na sala de socket da DM
    socket?.emit('join-dm', dmChannelId);

    return () => {
      isMounted = false;
      socket?.emit('leave-dm', dmChannelId);
    };
  }, [dmChannelId, socket]);

  // Escutar novas mensagens de DM e digitação
  useEffect(() => {
    if (!socket) return;

    const handleNewDmMessage = (msg: DirectMessageItem) => {
      if (msg.dmChannelId === dmChannelId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleUserDmTyping = (data: { userId: string; dmChannelId: string }) => {
      if (data.dmChannelId === dmChannelId && data.userId !== currentUser.id) {
        setIsRecipientTyping(true);
      }
    };

    const handleUserDmStopTyping = (data: { userId: string; dmChannelId: string }) => {
      if (data.dmChannelId === dmChannelId) {
        setIsRecipientTyping(false);
      }
    };

    socket.on('new-dm-message', handleNewDmMessage);
    socket.on('user-dm-typing', handleUserDmTyping);
    socket.on('user-dm-stop-typing', handleUserDmStopTyping);

    return () => {
      socket.off('new-dm-message', handleNewDmMessage);
      socket.off('user-dm-typing', handleUserDmTyping);
      socket.off('user-dm-stop-typing', handleUserDmStopTyping);
    };
  }, [socket, dmChannelId, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    socket?.emit('dm-typing-start', dmChannelId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('dm-typing-stop', dmChannelId);
    }, 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    socket.emit('send-dm-message', {
      dmChannelId,
      content: inputText.trim(),
      isEncrypted: true,
    });

    socket.emit('dm-typing-stop', dmChannelId);
    setInputText('');
  };

  return (
    <div className="flex-1 bg-[#313338] flex flex-col justify-between overflow-hidden select-none">
      {/* 1. Header da DM */}
      <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={
                recipient.avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                  recipient.username
                )}`
              }
              alt={recipient.username}
              className="w-7 h-7 rounded-full bg-[#1e1f22]"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-[#23a55a] ring-2 ring-[#313338] absolute bottom-0 right-0" />
          </div>

          <div>
            <div className="font-bold text-white text-sm">{recipient.username}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onStartCall}
            className="p-2 rounded hover:bg-[#35373c] text-[#dbdee1] hover:text-white transition flex items-center space-x-1 text-xs font-semibold"
            title="Iniciar Chamada com este amigo"
          >
            <Phone className="w-4 h-4 text-[#23a55a]" />
            <span>Iniciar Chamada</span>
          </button>
        </div>
      </div>

      {/* 2. Lista de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="pt-4 pb-6 space-y-2">
          <img
            src={
              recipient.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                recipient.username
              )}`
            }
            alt={recipient.username}
            className="w-16 h-16 rounded-full bg-[#1e1f22] mb-3"
          />
          <h3 className="text-2xl font-bold text-white">{recipient.username}</h3>
          <p className="text-sm text-[#949ba4]">
            Este é o início do histórico de mensagens diretas com{' '}
            <strong>{recipient.username}</strong>.
          </p>
        </div>

        <div className="h-[1px] bg-[#3f4147] my-4" />

        {loading ? (
          <div className="text-center py-8 text-xs text-[#949ba4]">Carregando conversa...</div>
        ) : (
          messages.map((msg) => {
            const time = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className="flex items-start space-x-3 group hover:bg-[#2e3035] -mx-4 px-4 py-1.5 rounded transition duration-75"
              >
                <img
                  src={
                    msg.sender.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                      msg.sender.username
                    )}`
                  }
                  alt={msg.sender.username}
                  className="w-10 h-10 rounded-full bg-[#1e1f22] shrink-0 mt-0.5"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline space-x-2">
                    <span className="font-semibold text-sm text-white">
                      {msg.sender.username}
                    </span>
                    <span className="text-[10px] text-[#949ba4]">{time}</span>
                  </div>

                  <p className="text-sm text-[#dbdee1] break-words whitespace-pre-wrap leading-relaxed mt-0.5">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Indicador de Digitação e Caixa de Envio */}
      <div className="p-4 pt-0 shrink-0">
        <div className="h-5 px-1 text-[11px] text-[#dbdee1] flex items-center space-x-1">
          {isRecipientTyping && (
            <span className="animate-pulse">
              <strong>{recipient.username}</strong> está digitando...
            </span>
          )}
        </div>

        <form
          onSubmit={handleSendMessage}
          className="bg-[#383a40] rounded-lg flex items-center px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#5865f2] transition"
        >
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Conversar com @${recipient.username}`}
            className="w-full bg-transparent text-sm text-[#dbdee1] placeholder-[#80848e] focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="ml-2 text-[#949ba4] hover:text-[#5865f2] disabled:opacity-40 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
