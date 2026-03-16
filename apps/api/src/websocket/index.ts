import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@sardorbek/shared';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

let io: Server;

export function setupSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for PM2 cluster mode
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('AUTH_TOKEN_MISSING'));
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('AUTH_TOKEN_INVALID'));
    }
  });

  io.on('connection', (socket) => {
    const { role } = socket.data as { role: string };

    // Join role-based rooms
    socket.join(role.toLowerCase());
    socket.join('all');

    socket.on('disconnect', () => {
      // Cleanup if needed
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

// Emit helpers
export function emitToAll(event: string, data: unknown): void {
  getIO().to('all').emit(event, data);
}

export function emitToAdmins(event: string, data: unknown): void {
  getIO().to('admin').emit(event, data);
}

export function emitToCashiers(event: string, data: unknown): void {
  getIO().to('cashier').emit(event, data);
}
