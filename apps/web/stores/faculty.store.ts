'use client';

import { create } from 'zustand';
import api from '@/lib/api-client';
import type { User } from '@campusconnect/shared/types';

interface FacultyState {
  facultyList: User[];
  selectedFaculty: User | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface FacultyActions {
  fetchFaculty: (params?: Record<string, any>) => Promise<void>;
  fetchFacultyById: (id: string) => Promise<User | null>;
  clearFaculty: () => void;
  setSelectedFaculty: (faculty: User | null) => void;
}

type FacultyStore = FacultyState & FacultyActions;

const initialState: FacultyState = {
  facultyList: [],
  selectedFaculty: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

export const useFacultyStore = create<FacultyStore>((set, get) => ({
  ...initialState,

  fetchFaculty: async (params = {}) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get<User[]>('/faculty', params);

      if (!response.success || !response.data) {
        set({
          error: response.error?.message || 'Failed to fetch faculty',
          isLoading: false,
        });
        return;
      }

      set({
        facultyList: response.data as any, // Type assertion needed
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

  fetchFacultyById: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get<User>(`/faculty/${id}`);

      if (!response.success || !response.data) {
        set({
          error: response.error?.message || 'Faculty not found',
          isLoading: false,
        });
        return null;
      }

      const faculty = response.data as any;
      set({
        selectedFaculty: faculty,
        isLoading: false,
      });

      return faculty;
    } catch (error) {
      set({
        error: 'Network error occurred',
        isLoading: false,
      });
      return null;
    }
  },

  setSelectedFaculty: (faculty) =>
    set({
      selectedFaculty: faculty,
    }),

  clearFaculty: () =>
    set(initialState),
}));
