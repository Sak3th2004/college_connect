'use client';

import { create } from 'zustand';
import api from '@/lib/api-client';
import type { Token } from '@campusconnect/shared/types';

interface QueueState {
  queue: Token[];
  currentToken: Token | null;
  facultyStatus: {
    facultyId: string;
    status: string;
    message?: string;
  } | null;
  isLoading: boolean;
  error: string | null;
  autoRefresh: boolean;
}

interface QueueActions {
  fetchQueue: (facultyId: string) => Promise<void>;
  joinQueue: (facultyId: string, purpose?: string) => Promise<{ success: boolean; error?: string; data?: Token }>;
  leaveQueue: (tokenId: string) => Promise<{ success: boolean; error?: string }>;
  setCurrentToken: (token: Token | null) => void;
  setFacultyStatus: (status: any) => void;
  clearQueue: () => void;
  toggleAutoRefresh: (enabled: boolean) => void;
}

type QueueStore = QueueState & QueueActions;

const initialState: QueueState = {
  queue: [],
  currentToken: null,
  facultyStatus: null,
  isLoading: false,
  error: null,
  autoRefresh: true,
};

export const useQueueStore = create<QueueStore>((set, get) => ({
  ...initialState,

  fetchQueue: async (facultyId: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get<any>(`/queue/${facultyId}`);

      if (!response.success || !response.data) {
        set({
          error: response.error?.message || 'Failed to fetch queue',
          isLoading: false,
        });
        return;
      }

      const { queue, currentToken } = response.data;

      set({
        queue: queue as Token[],
        currentToken: currentToken as Token | null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: 'Network error occurred',
        isLoading: false,
      });
    }
  },

  joinQueue: async (facultyId: string, purpose?: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.post<{ token: Token }>('/queue/join', {
        facultyId,
        purpose,
      });

      if (!response.success || !response.data) {
        set({ isLoading: false });
        return {
          success: false,
          error: response.error?.message || 'Failed to join queue',
        };
      }

      // Refresh queue
      await get().fetchQueue(facultyId);

      set({ isLoading: false });
      return {
        success: true,
        data: response.data.token as Token,
      };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  },

  leaveQueue: async (tokenId: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.post(`/queue/${tokenId}/leave`);

      if (!response.success) {
        set({ isLoading: false });
        return {
          success: false,
          error: response.error?.message || 'Failed to leave queue',
        };
      }

      // Clear current token if it was the one leaving
      if (get().currentToken?.id === tokenId) {
        set({ currentToken: null });
      }

      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  },

  setCurrentToken: (token) =>
    set({
      currentToken: token,
    }),

  setFacultyStatus: (status) =>
    set({
      facultyStatus: status,
    }),

  clearQueue: () =>
    set({
      queue: [],
      currentToken: null,
      facultyStatus: null,
      error: null,
    }),

  toggleAutoRefresh: (enabled) =>
    set({
      autoRefresh: enabled,
    }),
}));
