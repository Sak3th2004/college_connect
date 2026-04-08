'use client';

import { create } from 'zustand';
import api from '@/lib/api-client';
import type { Notification } from '@campusconnect/shared/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

interface NotificationActions {
  fetchNotifications: (params?: { page?: number; limit?: number; isRead?: boolean }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  clearNotifications: () => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...initialState,

  fetchNotifications: async (params = {}) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get<Notification[]>('/notifications', params);

      if (!response.success || !response.data) {
        set({
          error: response.error?.message || 'Failed to fetch notifications',
          isLoading: false,
        });
        return;
      }

      const notifications = response.data as Notification[];
      const unreadCount = notifications.filter((n) => !n.isRead).length;

      set({
        notifications,
        unreadCount,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: 'Network error occurred',
        isLoading: false,
      });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      const response = await api.post(`/notifications/${notificationId}/read`);

      if (!response.success) {
        return false;
      }

      // Update local state
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));

      return true;
    } catch (error) {
      console.error('Mark as read failed:', error);
      return false;
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await api.post('/notifications/read-all');

      if (!response.success) {
        return false;
      }

      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
        unreadCount: 0,
      }));

      return true;
    } catch (error) {
      console.error('Mark all as read failed:', error);
      return false;
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);

      if (!response.success) {
        return false;
      }

      const notification = get().notifications.find((n) => n.id === notificationId);

      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: notification && !notification.isRead
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }));

      return true;
    } catch (error) {
      console.error('Delete notification failed:', error);
      return false;
    }
  },

  clearNotifications: () =>
    set(initialState),

  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  decrementUnreadCount: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
}));
