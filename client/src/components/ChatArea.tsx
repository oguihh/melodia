import React, { useState, useEffect, useRef } from 'react';
import { Hash, Send, Sparkles } from 'lucide-react';
import { Channel, Message, User } from '../types';
import { apiRequest } from '../lib/api';
import { Socket } from 'socket.io-client';

interface ChatAreaProps {
  channel: Channel;
  currentUser: User;
  socket: Socket | null;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  channel,
  currentUser,
  socket,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchMessages = async () => {
      try {
        const data = await apiRequest<{ messages: Message[] }>(
          `/channels/${channel.id}/messages`
        );
        if (isMounted) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Erro ao carregar mensagens:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();

    socket?.emit('join-channel', channel.id);

    return () => {
      isMounted = false;
      socket?.emit('leave-channel', channel.id);
    };
  }, [channel.id, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      if (msg.channelId === channel.id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleUserTyping = (data: { userId: string; username: string; channelId: string }) => {
      if (data.channelId === channel.id && data.userId !== currentUser.id) {
        setTypingUsers((prev) => Array.from(new Set([...prev, data.username])));
      }
    };

    const handleUserStopTyping = (data: { userId: string; channelId: string }) => {
      if (data.channelId === channel.id) {
        setTypingUsers((prev) => prev.filter((name) => name !== currentUser.username));
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stop-typing', handleUserStopTyping);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stop-typing', handleUserStopTyping);
    };
  }, [socket, channel.id, currentUser.id, currentUser.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    socket?.emit('typing-start', channel.id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing-stop', channel.id);
    }, 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    socket.emit('send-message', {
      channelId: channel.id,
      content: inputText.trim(),
      isEncrypted: true,
    });

    socket.emit('typing-stop', channel.id);
    setInputText('');
  };

  return (
    <div className="flex-1 bg-[#313338] flex flex-col justify-between overflow-hidden select-none">
      {/* 1. Header do Canal */}
      <div className="h-12 border-b border-[#1f2023] px-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center space-x-2">
          <Hash className="w-6 h-6 text-[#80848e]" />
          <span className="font-bold text-white text-base">{channel.name}</span>
          <div className="h-4 w-[1px] bg-[#3f4147] mx-2" />
          <span className="text-xs text-[#949ba4] hidden md:inline">
            Início do canal #{channel.name}
          </span>
        </div>
      </div>

      {/* 2. Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="pt-4 pb-6 space-y-2">
          <div className="w-16 h-16 rounded-full bg-[#404249] flex items-center justify-center text-white mb-3">
            <Hash className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-white">
            Boas-vindas a #{channel.name}!
          </h3>
          <p className="text-sm text-[#949ba4]">
            Este é o início do canal #{channel.name}.
          </p>
        </div>

        <div className="h-[1px] bg-[#3f4147] my-4" />

        {loading ? (
          <div className="text-center py-8 text-xs text-[#949ba4]">
            Carregando mensagens...
          </div>
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
                    msg.user.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                      msg.user.username
                    )}`
                  }
                  alt={msg.user.username}
                  className="w-10 h-10 rounded-full bg-[#1e1f22] shrink-0 mt-0.5"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline space-x-2">
                    <span className="font-semibold text-sm text-white">
                      {msg.user.username}
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
          {typingUsers.length > 0 && (
            <span className="animate-pulse">
              <strong>{typingUsers.join(', ')}</strong> {typingUsers.length > 1 ? 'estão' : 'está'} digitando...
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
            placeholder={`Conversar em #${channel.name}`}
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
