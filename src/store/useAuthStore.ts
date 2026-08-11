import { create } from 'zustand';
import { User } from '../types/auth';
import { hashPassword } from '../utils/crypto';
import { storage } from '../utils/storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  masterPasswordHash: string | null;
  lastActiveTimestamp: number;
  register: (name: string, email: string, masterPassword: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, masterPassword: string) => Promise<{ success: boolean; error?: string }>;
  biometricLogin: () => Promise<{ success: boolean; error?: string }>;
  unlockVault: (masterPassword: string) => Promise<{ success: boolean; error?: string }>;
  lockVault: () => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  touchActive: () => void;
  loadAuth: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'fortress_auth_v1';
const PWD_STORAGE_KEY = 'fortress_pwd_v1';

const DEFAULT_USER: User = {
  id: 'user_alex_mercer',
  name: 'Alex Mercer',
  email: 'admin@fortress.auth',
  securityLevel: 'High',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBP18h7lMt9Jz969VwHvr9kclC06hg8li0TjxKYjcpul_kGLszoJ7cCmriJbv9PqG1OxLDoBxAYa6ucWPASZFp4GGnZDkPz0oU2ynba_0pHFf6eSGfBwCr0VeHDA6gW20ltCNnxT2fkSPfrynp9N-4rZW8teEGZfKsItOCRlENr3pztp-jUjC4NNEGuYayvWG6uEn0QkIPhvFN9mRLySFK6eSue8PeTf93kuSan-tjXeYXqOFPmbaNU',
  biometricsEnabled: true,
  autoLockMinutes: 5,
  createdAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: DEFAULT_USER,
  isAuthenticated: true,
  isLocked: false,
  masterPasswordHash: null,
  lastActiveTimestamp: Date.now(),

  touchActive: () => {
    set({ lastActiveTimestamp: Date.now() });
  },

  register: async (name: string, email: string, masterPassword: string) => {
    try {
      const pwdHash = await hashPassword(masterPassword);
      const newUser: User = {
        id: `user_${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        securityLevel: 'High',
        avatarUrl: DEFAULT_USER.avatarUrl,
        biometricsEnabled: true,
        autoLockMinutes: 5,
        createdAt: new Date().toISOString(),
      };

      set({
        user: newUser,
        isAuthenticated: true,
        isLocked: false,
        masterPasswordHash: pwdHash,
        lastActiveTimestamp: Date.now(),
      });

      await storage.set(AUTH_STORAGE_KEY, newUser);
      await storage.set(PWD_STORAGE_KEY, pwdHash);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Registration failed' };
    }
  },

  login: async (email: string, masterPassword: string) => {
    try {
      const inputHash = await hashPassword(masterPassword);
      const storedHash = get().masterPasswordHash || (await storage.get<string | null>(PWD_STORAGE_KEY, null));

      // If first time with default demo account, accept password or set it
      if (!storedHash) {
        await storage.set(PWD_STORAGE_KEY, inputHash);
        set({ masterPasswordHash: inputHash });
      } else if (storedHash !== inputHash) {
        // Allow demo master password "123456" or matching hash
        const demoHash = await hashPassword('123456');
        if (inputHash !== demoHash && storedHash !== inputHash) {
          return { success: false, error: 'Invalid master password' };
        }
      }

      let user = get().user || (await storage.get<User | null>(AUTH_STORAGE_KEY, DEFAULT_USER));
      if (!user) {
        user = { ...DEFAULT_USER, email: email.trim().toLowerCase() };
      }

      set({
        user,
        isAuthenticated: true,
        isLocked: false,
        lastActiveTimestamp: Date.now(),
      });

      await storage.set(AUTH_STORAGE_KEY, user);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed' };
    }
  },

  biometricLogin: async () => {
    // Biometric unlock simulation
    const user = get().user || (await storage.get<User | null>(AUTH_STORAGE_KEY, DEFAULT_USER));
    set({
      user: user || DEFAULT_USER,
      isAuthenticated: true,
      isLocked: false,
      lastActiveTimestamp: Date.now(),
    });
    return { success: true };
  },

  unlockVault: async (masterPassword: string) => {
    const inputHash = await hashPassword(masterPassword);
    const storedHash = get().masterPasswordHash || (await storage.get<string | null>(PWD_STORAGE_KEY, null));
    const demoHash = await hashPassword('123456');

    if (storedHash && inputHash !== storedHash && inputHash !== demoHash) {
      return { success: false, error: 'Incorrect master password' };
    }

    set({ isLocked: false, lastActiveTimestamp: Date.now() });
    return { success: true };
  },

  lockVault: () => {
    set({ isLocked: true });
  },

  logout: async () => {
    set({
      user: null,
      isAuthenticated: false,
      isLocked: false,
    });
    await storage.remove(AUTH_STORAGE_KEY);
  },

  updateUser: async (updates: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    set({ user: updated });
    await storage.set(AUTH_STORAGE_KEY, updated);
  },

  loadAuth: async () => {
    const savedUser = await storage.get<User | null>(AUTH_STORAGE_KEY, null);
    const savedHash = await storage.get<string | null>(PWD_STORAGE_KEY, null);

    if (savedUser) {
      set({
        user: savedUser,
        isAuthenticated: true,
        isLocked: false,
        masterPasswordHash: savedHash,
      });
    } else {
      // Default to demo logged in state for instant preview
      set({
        user: DEFAULT_USER,
        isAuthenticated: true,
        isLocked: false,
        masterPasswordHash: savedHash,
      });
      await storage.set(AUTH_STORAGE_KEY, DEFAULT_USER);
    }
  },
}));
