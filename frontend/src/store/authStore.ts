import { create } from 'zustand';
import { User } from '../types';
import { api, setAdminSessionCredentials } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeBusinessId: string | null;
  isImpersonating: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }, user: User) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setActiveBusinessId: (id: string) => void;
  updateUser: (partial: Partial<User>) => void;
  setTrackingMode: (mode: string) => void;
  impersonateUser: (targetUser: User) => void;
  stopImpersonation: () => void;
}

const getInitialUser = (): User | null => {
  try {
    let raw = localStorage.getItem('commercia_user');
    if (!raw) {
      const legacy = localStorage.getItem('rsbizz_user');
      if (legacy) {
        raw = legacy;
        try {
          localStorage.setItem('commercia_user', legacy);
          localStorage.removeItem('rsbizz_user');
        } catch (_) {}
      }
    }
    if (!raw) return null;
    const parsed: User = JSON.parse(raw);
    localStorage.removeItem('commercia_test_subscription');
    const customTrackingMode = localStorage.getItem('commercia_active_tracking_mode');
    if (customTrackingMode && parsed.businesses && parsed.businesses.length > 0) {
      parsed.businesses[0].trackingMode = customTrackingMode;
    }
    return parsed;
  } catch (e) {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getInitialUser(),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  activeBusinessId: localStorage.getItem('commercia_active_business_id') || localStorage.getItem('activeBusinessId') || null,
  isImpersonating: !!localStorage.getItem('commercia_admin_impersonator_token'),

  impersonateUser: (targetUser: User) => {
    const currentAdmin = get().user;
    if (currentAdmin) {
      localStorage.setItem('commercia_admin_backup_user', JSON.stringify(currentAdmin));
      localStorage.setItem('commercia_admin_impersonator_token', 'impersonating_active');
    }
    const businessId = targetUser.businesses && targetUser.businesses.length > 0 ? targetUser.businesses[0].id : null;
    if (businessId) {
      localStorage.setItem('activeBusinessId', businessId);
      localStorage.setItem('commercia_active_business_id', businessId);
    }
    localStorage.setItem('commercia_user', JSON.stringify(targetUser));
    set({
      user: targetUser,
      activeBusinessId: businessId,
      isImpersonating: true,
    });
  },

  stopImpersonation: () => {
    const backup = localStorage.getItem('commercia_admin_backup_user');
    if (backup) {
      try {
        const adminUser = JSON.parse(backup);
        localStorage.setItem('commercia_user', backup);
        localStorage.removeItem('commercia_admin_backup_user');
        localStorage.removeItem('commercia_admin_impersonator_token');
        const bizId = adminUser.businesses?.[0]?.id || null;
        if (bizId) {
          localStorage.setItem('activeBusinessId', bizId);
          localStorage.setItem('commercia_active_business_id', bizId);
        }
        set({
          user: adminUser,
          activeBusinessId: bizId,
          isImpersonating: false,
        });
        return;
      } catch (_) {}
    }
    localStorage.removeItem('commercia_admin_backup_user');
    localStorage.removeItem('commercia_admin_impersonator_token');
    set({ isImpersonating: false });
  },

  setTrackingMode: (mode: string) => {
    const current = get().user;
    if (!current) return;
    const activeId = get().activeBusinessId;
    const updatedBusinesses = (current.businesses || []).map((b: any) => {
      if (b.id === activeId || (!activeId && current.businesses?.[0]?.id === b.id)) {
        return {
          ...b,
          trackingMode: mode,
          settings: {
            ...(b.settings || {}),
            enableStock: mode === 'avec_stock' || mode === 'complet',
            enableCredits: mode === 'avec_credit' || mode === 'complet',
          },
        };
      }
      return b;
    });
    const updatedUser = { ...current, businesses: updatedBusinesses };
    try {
      localStorage.setItem('commercia_user', JSON.stringify(updatedUser));
      localStorage.setItem('commercia_active_tracking_mode', mode);
    } catch (_) {}
    set({ user: updatedUser });
  },

  updateUser: (partial: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    try {
      localStorage.setItem('commercia_user', JSON.stringify(updated));
    } catch (_) {}
    set({ user: updated });
  },

  login: (tokens, user) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('commercia_user', JSON.stringify(user));
    const businessId = user.businesses && user.businesses.length > 0 ? user.businesses[0].id : null;
    if (businessId) {
      localStorage.setItem('activeBusinessId', businessId);
      localStorage.setItem('commercia_active_business_id', businessId);
    }
    set({
      user,
      isAuthenticated: true,
      activeBusinessId: businessId,
      isLoading: false,
    });
  },

  logout: () => {
    api.post('/admin-auth/logout').catch(() => {});
    setAdminSessionCredentials(null, null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('activeBusinessId');
    localStorage.removeItem('commercia_active_business_id');
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
      
      localStorage.removeItem('commercia_test_subscription');

      localStorage.setItem('commercia_user', JSON.stringify(user));
      let businessId = get().activeBusinessId;
      if (user.businesses && user.businesses.length > 0) {
        if (!businessId || !user.businesses.some((b: any) => b.id === businessId)) {
          businessId = user.businesses[0].id;
          localStorage.setItem('activeBusinessId', businessId);
          localStorage.setItem('commercia_active_business_id', businessId);
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
      localStorage.removeItem('activeBusinessId');
      localStorage.removeItem('commercia_active_business_id');
      localStorage.removeItem('commercia_user');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setActiveBusinessId: (id: string) => {
    localStorage.setItem('activeBusinessId', id);
    localStorage.setItem('commercia_active_business_id', id);
    set({ activeBusinessId: id });
  },
}));
