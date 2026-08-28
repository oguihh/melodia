import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido ou inválido' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'discord-clone-super-secret-jwt-key-2026';

  try {
    const decoded = jwt.verify(token, secret) as { id: string; username: string; email: string };
    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sessão expirada ou token inválido' });
  }
};
