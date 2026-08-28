import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

interface UserPayload {
  id: string;
  username: string;
  email: string;
}

interface VoiceParticipant {
  userId: string;
  socketId: string;
  username: string;
  avatarUrl?: string;
  channelId: string;
  serverId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
}

const voiceRooms = new Map<string, Map<string, VoiceParticipant>>();
const socketUserMap = new Map<string, string>();

export const setupSocketHandlers = (io: Server) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'discord-clone-super-secret-jwt-key-2026';

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token de autenticação não fornecido'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
      socket.data.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as UserPayload;
    socketUserMap.set(socket.id, user.id);

    // Cada usuário entra na sua sala pessoal para notificações e amizades em tempo real
    socket.join(`user-${user.id}`);

    console.log(`[MELODIA Socket] Conectado: ${user.username} (${socket.id})`);

    // Entrar em salas de texto
    socket.on('join-channel', (channelId: string) => {
      socket.join(`channel-${channelId}`);
    });

    socket.on('leave-channel', (channelId: string) => {
      socket.leave(`channel-${channelId}`);
    });

    // Entrar em sala de DM
    socket.on('join-dm', (dmChannelId: string) => {
      socket.join(`dm-${dmChannelId}`);
    });

    socket.on('leave-dm', (dmChannelId: string) => {
      socket.leave(`dm-${dmChannelId}`);
    });

    // Enviar mensagem em canal de servidor
    socket.on('send-message', async (data: { channelId: string; content: string; isEncrypted?: boolean }) => {
      try {
        const { channelId, content, isEncrypted } = data;

        const message = await prisma.message.create({
          data: {
            content,
            channelId,
            userId: user.id,
            isEncrypted: isEncrypted || false,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        });

        io.to(`channel-${channelId}`).emit('new-message', message);
      } catch (error) {
        console.error('Erro ao enviar mensagem no canal:', error);
      }
    });

    // Enviar mensagem em DM
    socket.on('send-dm-message', async (data: { dmChannelId: string; content: string; isEncrypted?: boolean }) => {
      try {
        const { dmChannelId, content, isEncrypted } = data;

        const directMessage = await prisma.directMessage.create({
          data: {
            dmChannelId,
            senderId: user.id,
            content,
            isEncrypted: isEncrypted || false,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        });

        const dmChannel = await prisma.dMChannel.update({
          where: { id: dmChannelId },
          data: { updatedAt: new Date() },
          select: { user1Id: true, user2Id: true },
        });

        // Transmitir para a sala da conversa
        io.to(`dm-${dmChannelId}`).emit('new-dm-message', directMessage);

        // Notificar individualmente o destinatário para som e badge
        const recipientId = dmChannel.user1Id === user.id ? dmChannel.user2Id : dmChannel.user1Id;
        io.to(`user-${recipientId}`).emit('dm-notification', {
          dmChannelId,
          message: directMessage,
        });
      } catch (error) {
        console.error('Erro ao enviar DM:', error);
      }
    });

    // Digitação em Canal de Servidor
    socket.on('typing-start', (channelId: string) => {
      socket.to(`channel-${channelId}`).emit('user-typing', {
        userId: user.id,
        username: user.username,
        channelId,
      });
    });

    socket.on('typing-stop', (channelId: string) => {
      socket.to(`channel-${channelId}`).emit('user-stop-typing', {
        userId: user.id,
        channelId,
      });
    });

    // Digitação em DM
    socket.on('dm-typing-start', (dmChannelId: string) => {
      socket.to(`dm-${dmChannelId}`).emit('user-dm-typing', {
        userId: user.id,
        username: user.username,
        dmChannelId,
      });
    });

    socket.on('dm-typing-stop', (dmChannelId: string) => {
      socket.to(`dm-${dmChannelId}`).emit('user-dm-stop-typing', {
        userId: user.id,
        dmChannelId,
      });
    });

    // --- VOZ E VÍDEO (WebRTC) ---
    socket.on('join-voice', async (data: { channelId: string; serverId: string; avatarUrl?: string }) => {
      const { channelId, serverId, avatarUrl } = data;

      leaveCurrentVoice(socket);

      if (!voiceRooms.has(channelId)) {
        voiceRooms.set(channelId, new Map());
      }

      const room = voiceRooms.get(channelId)!;

      const participant: VoiceParticipant = {
        userId: user.id,
        socketId: socket.id,
        username: user.username,
        avatarUrl,
        channelId,
        serverId,
        isMuted: false,
        isDeafened: false,
        isCameraOn: false,
        isScreenSharing: false,
        isSpeaking: false,
      };

      room.set(user.id, participant);
      socket.join(`voice-${channelId}`);

      const otherParticipants = Array.from(room.values()).filter((p) => p.userId !== user.id);

      socket.emit('voice-room-users', {
        channelId,
        users: otherParticipants,
      });

      socket.to(`voice-${channelId}`).emit('user-joined-voice', participant);

      io.emit('voice-state-channel-updated', {
        channelId,
        participants: Array.from(room.values()),
      });

      console.log(`[MELODIA Voz] ${user.username} entrou no canal ${channelId}`);
    });

    socket.on('leave-voice', () => {
      leaveCurrentVoice(socket);
    });

    socket.on('signal-offer', (data: { targetSocketId: string; offer: any; senderUsername?: string; senderAvatarUrl?: string; isScreenShare?: boolean }) => {
      io.to(data.targetSocketId).emit('signal-offer', {
        senderSocketId: socket.id,
        senderUserId: user.id,
        senderUsername: data.senderUsername || user.username,
        senderAvatarUrl: data.senderAvatarUrl,
        offer: data.offer,
        isScreenShare: data.isScreenShare,
      });
    });

    socket.on('signal-answer', (data: { targetSocketId: string; answer: any; senderUsername?: string; senderAvatarUrl?: string }) => {
      io.to(data.targetSocketId).emit('signal-answer', {
        senderSocketId: socket.id,
        senderUserId: user.id,
        senderUsername: data.senderUsername || user.username,
        senderAvatarUrl: data.senderAvatarUrl,
        answer: data.answer,
      });
    });

    socket.on('signal-ice', (data: { targetSocketId: string; candidate: any }) => {
      io.to(data.targetSocketId).emit('signal-ice', {
        senderSocketId: socket.id,
        candidate: data.candidate,
      });
    });

    socket.on('update-voice-state', (updates: Partial<VoiceParticipant>) => {
      for (const [channelId, room] of voiceRooms.entries()) {
        if (room.has(user.id)) {
          const participant = room.get(user.id)!;
          Object.assign(participant, updates);

          io.to(`voice-${channelId}`).emit('user-voice-state-updated', participant);
          io.emit('voice-state-channel-updated', {
            channelId,
            participants: Array.from(room.values()),
          });
          break;
        }
      }
    });

    socket.on('speaking-state', (data: { isSpeaking: boolean }) => {
      for (const [channelId, room] of voiceRooms.entries()) {
        if (room.has(user.id)) {
          const participant = room.get(user.id)!;
          participant.isSpeaking = data.isSpeaking;

          socket.to(`voice-${channelId}`).emit('user-speaking-changed', {
            userId: user.id,
            isSpeaking: data.isSpeaking,
          });
          break;
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`[MELODIA Socket] Desconectado: ${user.username}`);
      leaveCurrentVoice(socket);
      socketUserMap.delete(socket.id);
    });
  });

  function leaveCurrentVoice(socket: Socket) {
    const user = socket.data.user as UserPayload;
    if (!user) return;

    for (const [channelId, room] of voiceRooms.entries()) {
      if (room.has(user.id)) {
        room.delete(user.id);
        socket.leave(`voice-${channelId}`);

        socket.to(`voice-${channelId}`).emit('user-left-voice', {
          userId: user.id,
          channelId,
        });

        const remaining = Array.from(room.values());
        io.emit('voice-state-channel-updated', {
          channelId,
          participants: remaining,
        });

        if (room.size === 0) {
          voiceRooms.delete(channelId);
        }

        console.log(`[MELODIA Voz] ${user.username} saiu do canal ${channelId}`);
      }
    }
  }
};
