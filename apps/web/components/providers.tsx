'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { SocketProvider } from '@/contexts/socket-context';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const { user, setUser, setTokens, refreshToken } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on app load
    const initAuth = async () => {
      const storedUser = localStorage.getItem('auth-storage');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.state?.user && parsed.state?.tokens) {
            // Try to refresh token to ensure it's valid
            const success = await refreshToken();
            if (!success) {
              // Token refresh failed, clear storage
              useAuthStore.getState().clearAuth();
            }
          }
        } catch (error) {
          console.error('Failed to parse stored auth:', error);
          useAuthStore.getState().clearAuth();
        }
      }
    };

    initAuth();
  }, [setUser, setTokens, refreshToken]);

  return (
    <SocketProvider>
      <>{children}</>
      <Toaster position="top-right" richColors />
    </SocketProvider>
  );
}
