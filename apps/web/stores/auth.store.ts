'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api-client';
import type { User, AuthTokens } from '@campusconnect/shared/types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  clearAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  tokens: null,
  isLoading: false,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setTokens: (tokens) =>
        set({
          tokens,
        }),

      login: async (email, password) => {
        set({ isLoading: true });

        try {
          const response = await api.post<{ user: User; tokens: AuthTokens }>('/auth/login', {
            email,
            password,
          });

          if (!response.success || !response.data) {
            return {
              success: false,
              error: response.error?.message || 'Login failed',
            };
          }

          const { user, tokens } = response.data;

          // Save tokens to httpOnly cookies via API response
          // The backend should set httpOnly cookies, but we also store locally for convenience
          set({
            user,
            tokens,
            isLoading: false,
            isAuthenticated: true,
          });

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: 'Network error occurred',
          };
        }
      },

      logout: async () => {
        try {
          // Call backend to clear httpOnly cookies
          await api.post('/auth/logout');
        } catch (error) {
          // Ignore errors on logout
          console.error('Logout error:', error);
        } finally {
          get().clearAuth();
        }
      },

      refreshToken: async () => {
        const { tokens } = get();

        if (!tokens?.refreshToken) {
          return false;
        }

        try {
          const response = await api.post<{ tokens: AuthTokens }>('/auth/refresh', {
            refreshToken: tokens.refreshToken,
          });

          if (!response.success || !response.data) {
            return false;
          }

          set({
            tokens: response.data.tokens,
          });

          return true;
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().clearAuth();
          return false;
        }
      },

      clearAuth: () =>
        set({
          ...initialState,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
      }),
    }
  )
);
