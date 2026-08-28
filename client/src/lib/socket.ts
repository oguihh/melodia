import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './api';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = getStoredToken();
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

    socket = io(SOCKET_URL, {
      auth: {
        token: token || '',
      },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }

  return socket;
};

export const reconnectSocketWithToken = (token: string): Socket => {
  if (socket) {
    socket.disconnect();
  }

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    reconnection: true,
  });

  socket.connect();
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
