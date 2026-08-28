import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();
router.use(authenticateJWT);

// Listar amigos e solicitações de amizade
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const acceptedFriendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId, status: 'ACCEPTED' },
          { receiverId: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            customStatus: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            customStatus: true,
          },
        },
      },
    });

    const friends = acceptedFriendships.map((f) => {
      const friendUser = f.senderId === userId ? f.receiver : f.sender;
      return {
        friendshipId: f.id,
        user: friendUser,
      };
    });

    const pendingReceived = await prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            customStatus: true,
          },
        },
      },
    });

    const pendingSent = await prisma.friendship.findMany({
      where: {
        senderId: userId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            customStatus: true,
          },
        },
      },
    });

    res.json({
      friends,
      pendingReceived,
      pendingSent,
    });
  } catch (error) {
    console.error('Erro ao buscar amigos:', error);
    res.status(500).json({ error: 'Erro ao buscar lista de amigos' });
  }
});

// Enviar pedido de amizade por nome de usuário (username)
router.post('/request', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.body;
    const userId = req.userId!;
    const io = req.app.get('io') as SocketIOServer;

    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Nome de usuário inválido' });
      return;
    }

    const cleanUsername = username.trim();

    const targetUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!targetUser) {
      res.status(404).json({ error: `Nenhum usuário encontrado com o nome "${cleanUsername}"` });
      return;
    }

    if (targetUser.id === userId) {
      res.status(400).json({ error: 'Você não pode adicionar a si mesmo como amigo' });
      return;
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        res.status(400).json({ error: `Você e ${targetUser.username} já são amigos!` });
        return;
      }
      if (existing.senderId === userId && existing.status === 'PENDING') {
        res.status(400).json({ error: 'Você já enviou um pedido de amizade para este usuário' });
        return;
      }
      if (existing.receiverId === userId && existing.status === 'PENDING') {
        const updated = await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: 'ACCEPTED' },
        });

        // Notificar ambos os sockets em tempo real
        io?.to(`user-${userId}`).emit('friend-request-accepted', { friendshipId: updated.id });
        io?.to(`user-${targetUser.id}`).emit('friend-request-accepted', { friendshipId: updated.id });

        res.json({ message: `Pedido de ${targetUser.username} aceito com sucesso!`, friendship: updated });
        return;
      }
    }

    const friendship = await prisma.friendship.create({
      data: {
        senderId: userId,
        receiverId: targetUser.id,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            customStatus: true,
          },
        },
      },
    });

    // Notificar em tempo real o destinatário que recebeu um pedido!
    io?.to(`user-${targetUser.id}`).emit('friend-request-received', friendship);

    res.status(201).json({
      message: `Pedido de amizade enviado para ${targetUser.username}!`,
      friendship,
    });
  } catch (error) {
    console.error('Erro ao enviar pedido de amizade:', error);
    res.status(500).json({ error: 'Erro ao enviar pedido de amizade' });
  }
});

// Aceitar pedido de amizade
router.post('/accept/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;
    const io = req.app.get('io') as SocketIOServer;

    const friendship = await prisma.friendship.findUnique({
      where: { id },
    });

    if (!friendship || friendship.receiverId !== userId) {
      res.status(404).json({ error: 'Pedido de amizade não encontrado' });
      return;
    }

    const updated = await prisma.friendship.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    // Notificar ambos os usuários em tempo real
    io?.to(`user-${friendship.senderId}`).emit('friend-request-accepted', { friendshipId: id });
    io?.to(`user-${friendship.receiverId}`).emit('friend-request-accepted', { friendshipId: id });

    res.json({ message: 'Pedido de amizade aceito!', friendship: updated });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aceitar pedido' });
  }
});

// Rejeitar / Cancelar pedido de amizade
router.post('/reject/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;
    const io = req.app.get('io') as SocketIOServer;

    const friendship = await prisma.friendship.findUnique({
      where: { id },
    });

    if (!friendship || (friendship.receiverId !== userId && friendship.senderId !== userId)) {
      res.status(404).json({ error: 'Pedido não encontrado' });
      return;
    }

    await prisma.friendship.delete({
      where: { id },
    });

    io?.to(`user-${friendship.senderId}`).emit('friend-request-rejected', { friendshipId: id });
    io?.to(`user-${friendship.receiverId}`).emit('friend-request-rejected', { friendshipId: id });

    res.json({ message: 'Pedido cancelado/rejeitado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao rejeitar pedido' });
  }
});

// Remover amigo
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;
    const io = req.app.get('io') as SocketIOServer;

    const friendship = await prisma.friendship.findUnique({
      where: { id },
    });

    if (!friendship || (friendship.senderId !== userId && friendship.receiverId !== userId)) {
      res.status(404).json({ error: 'Amizade não encontrada' });
      return;
    }

    await prisma.friendship.delete({
      where: { id },
    });

    io?.to(`user-${friendship.senderId}`).emit('friend-removed', { friendshipId: id });
    io?.to(`user-${friendship.receiverId}`).emit('friend-removed', { friendshipId: id });

    res.json({ message: 'Amigo removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover amigo' });
  }
});

export default router;
