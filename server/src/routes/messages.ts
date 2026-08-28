import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateJWT);

// Buscar histórico de mensagens de um canal
router.get('/channels/:channelId/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channelId = req.params.channelId as string;
    const limit = parseInt(req.query.limit as string) || 50;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: { userId: req.userId },
            },
          },
        },
      },
    });

    if (!channel || channel.server.members.length === 0) {
      res.status(403).json({ error: 'Acesso negado a este canal' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { channelId },
      take: limit,
      orderBy: { createdAt: 'desc' },
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

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

export default router;
