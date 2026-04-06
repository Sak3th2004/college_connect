import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from '../utils/logger';
import type { JWTPayload } from '@campusconnect/shared/types';
import { SocketEvents } from '@campusconnect/shared';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  institutionId?: string;
  role?: string;
}

export function initializeSocketHandlers(io: Server) {
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtAccessSecret) as JWTPayload;
      socket.userId = decoded.sub;
      socket.institutionId = decoded.institutionId;
      socket.role = decoded.role;
      
      next();
    } catch (error) {
      logger.error({ error }, 'Socket authentication error');
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ userId: socket.userId, socketId: socket.id }, 'Socket connected');

    // Join user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join institution room
    if (socket.institutionId) {
      socket.join(`institution:${socket.institutionId}`);
    }

    // Join role-specific rooms
    if (socket.role === 'FACULTY' && socket.userId) {
      socket.join(`faculty:${socket.userId}`);
    }

    // Handle faculty status updates
    socket.on(SocketEvents.FACULTY_STATUS_UPDATE, (data: { status: string; message?: string }) => {
      if (socket.role !== 'FACULTY') {
        return;
      }

      // Broadcast to institution
      socket.to(`institution:${socket.institutionId}`).emit(SocketEvents.FACULTY_STATUS_CHANGED, {
        facultyId: socket.userId,
        status: data.status,
        message: data.message,
        updatedAt: new Date(),
      });

      logger.debug({ userId: socket.userId, status: data.status }, 'Faculty status broadcasted');
    });

    // Handle queue subscription
    socket.on('queue:subscribe', (facultyId: string) => {
      socket.join(`queue:${facultyId}`);
      logger.debug({ userId: socket.userId, facultyId }, 'Subscribed to queue');
    });

    socket.on('queue:unsubscribe', (facultyId: string) => {
      socket.leave(`queue:${facultyId}`);
    });

    // Handle notification read
    socket.on(SocketEvents.NOTIFICATION_READ, (notificationId: string) => {
      // Acknowledgment - handled by REST API
      logger.debug({ userId: socket.userId, notificationId }, 'Notification read');
    });

    // Handle typing indicator for support chat
    socket.on(SocketEvents.SUPPORT_TYPING, (data: { ticketId: string; isTyping: boolean }) => {
      socket.to(`ticket:${data.ticketId}`).emit(SocketEvents.SUPPORT_TYPING, {
        userId: socket.userId,
        isTyping: data.isTyping,
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info({ userId: socket.userId, socketId: socket.id, reason }, 'Socket disconnected');
      
      // Broadcast user offline to institution
      if (socket.institutionId) {
        socket.to(`institution:${socket.institutionId}`).emit(SocketEvents.USER_OFFLINE, {
          userId: socket.userId,
        });
      }
    });

    // Broadcast user online
    if (socket.institutionId) {
      socket.to(`institution:${socket.institutionId}`).emit(SocketEvents.USER_ONLINE, {
        userId: socket.userId,
      });
    }
  });

  logger.info('Socket.IO handlers initialized');
}
