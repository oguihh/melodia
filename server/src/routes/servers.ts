import { Router, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateJWT);

const createServerSchema = z.object({
  name: z.string().min(2, 'O nome do servidor deve ter no mínimo 2 caracteres').max(50),
  iconUrl: z.string().optional(),
});

const createChannelSchema = z.object({
  name: z.string().min(2, 'O nome do canal deve ter no mínimo 2 caracteres').max(30),
  type: z.enum(['TEXT', 'VOICE']),
});

// Listar servidores do usuário
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const servers = await prisma.server.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        channels: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ servers });
  } catch (error) {
    console.error('Erro ao buscar servidores:', error);
    res.status(500).json({ error: 'Erro ao buscar servidores' });
  }
});

// Criar novo servidor
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createServerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { name, iconUrl } = parsed.data;
    const userId = req.userId!;

    const server = await prisma.server.create({
      data: {
        name,
        iconUrl: iconUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'ADMIN',
          },
        },
        channels: {
          create: [
            { name: 'geral', type: 'TEXT' },
            { name: 'Geral', type: 'VOICE' },
          ],
        },
      },
      include: {
        channels: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                customStatus: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ server });
  } catch (error) {
    console.error('Erro ao criar servidor:', error);
    res.status(500).json({ error: 'Erro ao criar servidor' });
  }
});

// Obter detalhes de um servidor
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.userId!;

    const server = await prisma.server.findUnique({
      where: { id },
      include: {
        channels: {
          orderBy: { createdAt: 'asc' },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                customStatus: true,
              },
            },
          },
        },
      },
    });

    if (!server) {
      res.status(404).json({ error: 'Servidor não encontrado' });
      return;
    }

    const isMember = server.members.some((m: { userId: string }) => m.userId === userId);
    if (!isMember) {
      res.status(403).json({ error: 'Você não tem acesso a este servidor' });
      return;
    }

    res.json({ server });
  } catch (error) {
    console.error('Erro ao buscar servidor:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do servidor' });
  }
});

// Criar canal em um servidor
router.post('/:id/channels', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serverId = req.params.id as string;
    const userId = req.userId!;
    const parsed = createChannelSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const membership = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'Permissão negada' });
      return;
    }

    const channel = await prisma.channel.create({
      data: {
        name: parsed.data.name.toLowerCase().trim().replace(/\s+/g, '-'),
        type: parsed.data.type,
        serverId,
      },
    });

    res.status(201).json({ channel });
  } catch (error) {
    console.error('Erro ao criar canal:', error);
    res.status(500).json({ error: 'Erro ao criar canal' });
  }
});

// Gerar convite para o servidor
router.post('/:id/invites', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serverId = req.params.id as string;
    const userId = req.userId!;
    const code = crypto.randomBytes(4).toString('hex');

    const invite = await prisma.invite.create({
      data: {
        code,
        serverId,
        creatorId: userId,
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            iconUrl: true,
          },
        },
      },
    });

    res.status(201).json({ invite });
  } catch (error) {
    console.error('Erro ao gerar convite:', error);
    res.status(500).json({ error: 'Erro ao gerar convite' });
  }
});

// Entrar em um servidor usando código de convite
router.post('/join/:code', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const code = req.params.code as string;
    const userId = req.userId!;

    const invite = await prisma.invite.findUnique({
      where: { code },
      include: {
        server: true,
      },
    });

    if (!invite) {
      res.status(404).json({ error: 'Convite inválido ou expirado' });
      return;
    }

    const existing = await prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId: invite.serverId,
          userId,
        },
      },
    });

    if (existing) {
      res.json({
        message: 'Você já faz parte deste servidor',
        serverId: invite.serverId,
      });
      return;
    }

    await prisma.$transaction([
      prisma.serverMember.create({
        data: {
          serverId: invite.serverId,
          userId,
          role: 'MEMBER',
        },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      }),
    ]);

    res.status(200).json({
      message: 'Você entrou no servidor com sucesso!',
      serverId: invite.serverId,
    });
  } catch (error) {
    console.error('Erro ao entrar no servidor:', error);
    res.status(500).json({ error: 'Erro ao processar convite' });
  }
});

export default router;
