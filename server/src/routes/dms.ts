import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateJWT);

// Listar canais de DM do usuário
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const dmChannels = await prisma.dMChannel.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            customStatus: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            customStatus: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const channels = dmChannels.map((dm) => {
      const otherUser = dm.user1Id === userId ? dm.user2 : dm.user1;
      return {
        id: dm.id,
        recipient: otherUser,
        lastMessage: dm.messages[0] || null,
        updatedAt: dm.updatedAt,
      };
    });

    res.json({ dmChannels: channels });
  } catch (error) {
    console.error('Erro ao buscar canais de DM:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens diretas' });
  }
});

// Abrir / Criar canal de DM com um amigo
router.post('/open/:friendId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const friendId = req.params.friendId as string;
    const userId = req.userId!;

    if (friendId === userId) {
      res.status(400).json({ error: 'Não é possível abrir DM com você mesmo' });
      return;
    }

    // Ordenar IDs para unicidade
    const [user1Id, user2Id] = [userId, friendId].sort();

    let dmChannel = await prisma.dMChannel.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            customStatus: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            customStatus: true,
          },
        },
      },
    });

    if (!dmChannel) {
      dmChannel = await prisma.dMChannel.create({
        data: {
          user1Id,
          user2Id,
        },
        include: {
          user1: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              customStatus: true,
            },
          },
          user2: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              customStatus: true,
            },
          },
        },
      });
    }

    const otherUser = dmChannel.user1Id === userId ? dmChannel.user2 : dmChannel.user1;

    res.json({
      dmChannel: {
        id: dmChannel.id,
        recipient: otherUser,
      },
    });
  } catch (error) {
    console.error('Erro ao abrir DM:', error);
    res.status(500).json({ error: 'Erro ao abrir conversa direta' });
  }
});

// Obter histórico de mensagens de uma DM
router.get('/:dmChannelId/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dmChannelId = req.params.dmChannelId as string;
    const userId = req.userId!;

    const dmChannel = await prisma.dMChannel.findUnique({
      where: { id: dmChannelId },
    });

    if (!dmChannel || (dmChannel.user1Id !== userId && dmChannel.user2Id !== userId)) {
      res.status(403).json({ error: 'Acesso negado a esta conversa' });
      return;
    }

    const messages = await prisma.directMessage.findMany({
      where: { dmChannelId },
      take: 50,
      orderBy: { createdAt: 'desc' },
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

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mensagens diretas' });
  }
});

export default router;
