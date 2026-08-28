import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'discord-clone-super-secret-jwt-key-2026';

const registerSchema = z.object({
  username: z.string().min(3, 'Nome de usuário deve ter no mínimo 3 caracteres').max(30),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  avatarUrl: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// Registro
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { username, email, password, avatarUrl } = parsed.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      res.status(409).json({ error: 'Usuário ou e-mail já cadastrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const defaultAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        avatarUrl: defaultAvatar,
      },
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Conta criada com sucesso!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        customStatus: user.customStatus,
      },
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno ao registrar usuário' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: 'E-mail ou senha incorretos' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'E-mail ou senha incorretos' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        customStatus: user.customStatus,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
});

// Obter dados do usuário logado
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        customStatus: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Atualizar perfil
router.patch('/profile', authenticateJWT, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { avatarUrl, customStatus } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(customStatus !== undefined && { customStatus }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        customStatus: true,
      },
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

export default router;
