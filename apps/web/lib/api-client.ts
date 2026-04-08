import type { ApiResponse } from '@campusconnect/shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (response.status === 401) {
        // Token expired, try to refresh
        if (!this.isRefreshing) {
          this.isRefreshing = true;

          try {
            // Attempt to refresh token using stored refresh token
            const refreshToken = localStorage.getItem('refresh_token') ||
                                 document.cookie.match(/refresh_token=([^;]+)/)?.[1];

            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const refreshResponse = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
              credentials: 'include',
            });

            const refreshData = await refreshResponse.json();

            if (refreshData.success && refreshData.data) {
              this.accessToken = refreshData.data.tokens.accessToken;
              // Update headers and retry original request
              (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;

              // Retry all queued requests
              this.failedQueue.forEach((callback) => callback.resolve());
              this.failedQueue = [];

              // Retry the current request
              const retryResponse = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
              });
              const retryData = await retryResponse.json();

              if (!retryResponse.ok) {
                return {
                  success: false,
                  error: retryData.error || { code: retryResponse.status, message: 'Request failed after refresh' },
                };
              }

              return retryData;
            } else {
              throw new Error('Refresh failed');
            }
          } catch (error) {
            // Refresh failed, clear auth and redirect to login
            this.failedQueue.forEach((callback) => callback.reject(error));
            this.failedQueue = [];
            this.isRefreshing = false;
            this.accessToken = null;

            // Clear localStorage/cookies
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            document.cookie = 'access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            document.cookie = 'refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            // Redirect to login
            if (typeof window !== 'undefined') {
              window.location.href = '/login?session=expired';
            }

            return {
              success: false,
              error: { code: 1005, message: 'Session expired. Please login again.' },
            };
          } finally {
            this.isRefreshing = false;
          }
        } else {
          // Refresh already in progress, queue this request
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          }) as Promise<ApiResponse<T>>;
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || { code: response.status, message: 'Request failed' },
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: { code: 5001, message: 'Network error' },
      };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<T>(`${endpoint}${searchParams}`, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
