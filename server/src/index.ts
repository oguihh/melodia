import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import serverRoutes from './routes/servers';
import messageRoutes from './routes/messages';
import friendsRoutes from './routes/friends';
import dmsRoutes from './routes/dms';
import { setupSocketHandlers } from './socket/signaling';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json());

// Configuração do Socket.IO
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Tornar o Socket.IO acessível nas rotas REST
app.set('io', io);

// Rotas da API REST
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/dms', dmsRoutes);
app.use('/api', messageRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'MELODIA API', timestamp: new Date().toISOString() });
});

// Inicialização dos Sockets e Sinalização WebRTC
setupSocketHandlers(io);

// Iniciar Servidor
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🎵 Servidor MELODIA rodando com sucesso!`);
  console.log(`📡 HTTP API: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket: ws://localhost:${PORT}`);
  console.log(`=========================================`);
});
