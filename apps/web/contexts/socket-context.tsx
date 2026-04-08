'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { useQueueStore } from '@/stores/queue.store';
import type { FacultyStatusPayload, QueueUpdatePayload, TokenCalledPayload } from '@campusconnect/shared/types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthStore();
  const {
    setFacultyStatus,
    updateQueue,
    setCurrentToken,
  } = useQueueStore();

  const connect = useCallback(() => {
    if (socket?.connected) return;

    const newSocket = io(SOCKET_URL, {
      auth: {
        token: useAuthStore.getState().tokens?.accessToken,
      },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);

      // Join institution room if user belongs to one
      if (user?.institutionId) {
        newSocket.emit('join-institution', user.institutionId);
      }

      // Join user-specific room
      if (user?.id) {
        newSocket.emit('join-user', user.id);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Faculty status updates
    newSocket.on('faculty:status:changed', (data: FacultyStatusPayload) => {
      setFacultyStatus({
        facultyId: data.facultyId,
        status: data.status,
        message: data.message,
      });
    });

    // Queue updates
    newSocket.on('queue:updated', (data: QueueUpdatePayload) => {
      updateQueue(data);
    });

    // Token called
    newSocket.on('token:called', (data: TokenCalledPayload) => {
      setCurrentToken({
        id: data.tokenId,
        tokenNumber: data.tokenNumber,
        facultyId: data.facultyId,
        // ... other fields as needed
      } as any);
    });

    // Notifications
    newSocket.on('notification:new', (notification: any) => {
      // Could trigger a toast or update notification store
      console.log('New notification:', notification);
    });

    setSocket(newSocket);
  }, [socket, user, setFacultyStatus, updateQueue, setCurrentToken]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Auto-connect when user logs in
  useEffect(() => {
    if (user?.id) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user?.id, connect, disconnect]);

  // Update socket auth when tokens change
  useEffect(() => {
    if (socket && user?.id) {
      socket.auth.token = useAuthStore.getState().tokens?.accessToken;
    }
  }, [socket, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}
