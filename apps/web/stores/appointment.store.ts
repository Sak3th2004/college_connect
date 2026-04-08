'use client';

import { create } from 'zustand';
import api from '@/lib/api-client';
import type { Appointment } from '@campusconnect/shared/types';

interface AppointmentState {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: string;
    facultyId?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AppointmentActions {
  fetchAppointments: (params?: Record<string, any>) => Promise<void>;
  createAppointment: (data: any) => Promise<{ success: boolean; error?: string; data?: Appointment }>;
  updateAppointmentStatus: (id: string, data: any) => Promise<{ success: boolean; error?: string }>;
  rescheduleAppointment: (id: string, data: any) => Promise<{ success: boolean; error?: string }>;
  rateAppointment: (id: string, rating: number, feedback?: string) => Promise<{ success: boolean; error?: string }>;
  clearAppointments: () => void;
  setFilters: (filters: Partial<AppointmentState['filters']>) => void;
}

type AppointmentStore = AppointmentState & AppointmentActions;

const initialState: AppointmentState = {
  appointments: [],
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

export const useAppointmentStore = create<AppointmentStore>((set, get) => ({
  ...initialState,

  fetchAppointments: async (params = {}) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get<Appointment[]>('/appointments', {
        ...get().filters,
        ...params,
      });

      if (!response.success || !response.data) {
        set({
          error: response.error?.message || 'Failed to fetch appointments',
          isLoading: false,
        });
        return;
      }

      set({
        appointments: response.data as any,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total: response.meta?.total || 0,
          totalPages: response.meta?.totalPages || 0,
        },
        isLoading: false,
      });
    } catch (error) {
      set({
        error: 'Network error occurred',
        isLoading: false,
      });
    }
  },

  createAppointment: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.post<{ appointment: Appointment }>('/appointments', data);

      if (!response.success || !response.data) {
        set({ isLoading: false });
        return {
          success: false,
          error: response.error?.message || 'Failed to create appointment',
        };
      }

      // Refresh appointments list
      await get().fetchAppointments();

      set({ isLoading: false });
      return {
        success: true,
        data: response.data.appointment as Appointment,
      };
    } catch (error) {
      set({ isLoading: false });
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  },

  updateAppointmentStatus: async (id: string, data: any) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.put(`/appointments/${id}/status`, data);

      if (!response.success) {
        set({ isLoading: false });
        return {
          success: false,
          error: response.error?.message || 'Failed to update appointment',
        };
      }

      // Refresh appointments
      await get().fetchAppointments();

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

  rescheduleAppointment: async (id: string, data: any) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.put(`/appointments/${id}/reschedule`, data);

      if (!response.success) {
        set({ isLoading: false });
        return {
          success: false,
          error: response.error?.message || 'Failed to reschedule appointment',
        };
      }

      await get().fetchAppointments();
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

  rateAppointment: async (id: string, rating: number, feedback?: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.post(`/appointments/${id}/rate`, {
        rating,
        feedback,
      });

      if (!response.success) {
        set({ isLoading: false });
        return {
          success: false,
          error: response.error?.message || 'Failed to rate appointment',
        };
      }

      await get().fetchAppointments();
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

  setFilters: (filters) =>
    set({
      filters: { ...get().filters, ...filters },
    }),

  clearAppointments: () =>
    set(initialState),
}));
