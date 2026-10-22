import { create } from 'zustand';
import { User } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeBusinessId: string | null;
  login: (tokens: { accessToken: string; refreshToken: string }, user: User) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setActiveBusinessId: (id: string) => void;
}

const getInitialUser = (): User | null => {
  try {
    const raw = localStorage.getItem('commercia_user') || localStorage.getItem('rsbizz_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getInitialUser(),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  activeBusinessId: localStorage.getItem('activeBusinessId') || null,

  login: (tokens, user) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('commercia_user', JSON.stringify(user));
    const businessId = user.businesses && user.businesses.length > 0 ? user.businesses[0].id : null;
    if (businessId) {
      localStorage.setItem('activeBusinessId', businessId);
    }
    set({
      user,
      isAuthenticated: true,
      activeBusinessId: businessId,
      isLoading: false,
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('activeBusinessId');
    localStorage.removeItem('commercia_user');
    set({
      user: null,
      isAuthenticated: false,
      activeBusinessId: null,
      isLoading: false,
    });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const user = await api.get<User>('/auth/me');
      localStorage.setItem('commercia_user', JSON.stringify(user));
      let businessId = get().activeBusinessId;
      if (user.businesses && user.businesses.length > 0) {
        if (!businessId || !user.businesses.some((b: any) => b.id === businessId)) {
          businessId = user.businesses[0].id;
          localStorage.setItem('activeBusinessId', businessId);
        }
      }
      set({
        user,
        isAuthenticated: true,
        activeBusinessId: businessId,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('commercia_user');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setActiveBusinessId: (id: string) => {
    localStorage.setItem('activeBusinessId', id);
    set({ activeBusinessId: id });
  },
}));
