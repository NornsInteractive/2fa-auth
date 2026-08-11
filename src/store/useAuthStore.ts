import { create } from 'zustand';
import { User } from '../types/auth';
import { hashPassword } from '../utils/crypto';
import { storage } from '../utils/storage';
import { useTokenStore } from './useTokenStore';
import { useCategoryStore } from './useCategoryStore';

export interface StoredAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  securityLevel: 'High' | 'Standard' | 'Maximum';
  avatarUrl: string;
  createdAt: string;
}

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

const SESSION_STORAGE_KEY = 'fortress_session_v2';
const USERS_REGISTRY_KEY = 'fortress_users_registry_v2';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLocked: false,
  masterPasswordHash: null,
  lastActiveTimestamp: Date.now(),

  touchActive: () => {
    set({ lastActiveTimestamp: Date.now() });
  },

  register: async (name: string, email: string, masterPassword: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      if (!cleanEmail || !cleanName || !masterPassword) {
        return { success: false, error: '所有字段均为必填' };
      }

      // Check existing accounts in local registry
      const accounts = await storage.get<StoredAccount[]>(USERS_REGISTRY_KEY, []);
      if (accounts.some((acc) => acc.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: '该邮箱已被注册，请直接登录' };
      }

      const pwdHash = await hashPassword(masterPassword);
      const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const newAccount: StoredAccount = {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        passwordHash: pwdHash,
        securityLevel: 'High',
        avatarUrl: `https://api.dicebear.com/7.x/identicon/png?seed=${encodeURIComponent(cleanEmail)}`,
        createdAt: new Date().toISOString(),
      };

      // Save to local registry
      await storage.set(USERS_REGISTRY_KEY, [...accounts, newAccount]);

      // Try sync to Cloudflare Workers if online
      try {
        fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cleanName, email: cleanEmail, password: masterPassword }),
        }).catch(() => {});
      } catch (_) {}

      const user: User = {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        securityLevel: 'High',
        avatarUrl: newAccount.avatarUrl,
        biometricsEnabled: true,
        autoLockMinutes: 5,
        createdAt: newAccount.createdAt,
      };

      set({
        user,
        isAuthenticated: true,
        isLocked: false,
        masterPasswordHash: pwdHash,
        lastActiveTimestamp: Date.now(),
      });

      await storage.set(SESSION_STORAGE_KEY, user);

      // Load user-isolated tokens and categories (will be empty for new account)
      await useTokenStore.getState().loadTokens(userId);
      await useCategoryStore.getState().loadCategories(userId);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || '注册失败，请重试' };
    }
  },

  login: async (email: string, masterPassword: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !masterPassword) {
        return { success: false, error: '请输入邮箱与主密码' };
      }

      const inputHash = await hashPassword(masterPassword);
      const accounts = await storage.get<StoredAccount[]>(USERS_REGISTRY_KEY, []);
      let targetAccount = accounts.find((acc) => acc.email.toLowerCase() === cleanEmail);

      // Try remote login if not found in local registry
      if (!targetAccount) {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password: masterPassword }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              targetAccount = {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                passwordHash: inputHash,
                securityLevel: (data.user.securityLevel as any) || 'High',
                avatarUrl: data.user.avatarUrl || `https://api.dicebear.com/7.x/identicon/png?seed=${encodeURIComponent(cleanEmail)}`,
                createdAt: data.user.createdAt || new Date().toISOString(),
              };
              await storage.set(USERS_REGISTRY_KEY, [...accounts, targetAccount]);
            }
          }
        } catch (_) {}
      }

      if (!targetAccount) {
        return { success: false, error: '账号不存在，请先注册新账号' };
      }

      if (targetAccount.passwordHash !== inputHash) {
        return { success: false, error: '主密码错误，请重新输入' };
      }

      const user: User = {
        id: targetAccount.id,
        name: targetAccount.name,
        email: targetAccount.email,
        securityLevel: targetAccount.securityLevel,
        avatarUrl: targetAccount.avatarUrl,
        biometricsEnabled: true,
        autoLockMinutes: 5,
        createdAt: targetAccount.createdAt,
      };

      set({
        user,
        isAuthenticated: true,
        isLocked: false,
        masterPasswordHash: inputHash,
        lastActiveTimestamp: Date.now(),
      });

      await storage.set(SESSION_STORAGE_KEY, user);

      // Load strictly isolated data for this user
      await useTokenStore.getState().loadTokens(user.id);
      await useCategoryStore.getState().loadCategories(user.id);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || '登录失败' };
    }
  },

  biometricLogin: async () => {
    try {
      const accounts = await storage.get<StoredAccount[]>(USERS_REGISTRY_KEY, []);
      if (accounts.length === 0) {
        return { success: false, error: '暂无可快速登录的账号，请先注册' };
      }

      // Login to last logged account
      const lastSession = await storage.get<User | null>(SESSION_STORAGE_KEY, null);
      const targetAccount = lastSession
        ? accounts.find((a) => a.id === lastSession.id) || accounts[0]
        : accounts[0];

      const user: User = {
        id: targetAccount.id,
        name: targetAccount.name,
        email: targetAccount.email,
        securityLevel: targetAccount.securityLevel,
        avatarUrl: targetAccount.avatarUrl,
        biometricsEnabled: true,
        autoLockMinutes: 5,
        createdAt: targetAccount.createdAt,
      };

      set({
        user,
        isAuthenticated: true,
        isLocked: false,
        masterPasswordHash: targetAccount.passwordHash,
        lastActiveTimestamp: Date.now(),
      });

      await storage.set(SESSION_STORAGE_KEY, user);
      await useTokenStore.getState().loadTokens(user.id);
      await useCategoryStore.getState().loadCategories(user.id);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: '生物识别登录失败' };
    }
  },

  unlockVault: async (masterPassword: string) => {
    const inputHash = await hashPassword(masterPassword);
    const user = get().user;
    if (!user) return { success: false, error: '未登录' };

    const accounts = await storage.get<StoredAccount[]>(USERS_REGISTRY_KEY, []);
    const account = accounts.find((a) => a.id === user.id);

    if (account && account.passwordHash !== inputHash) {
      return { success: false, error: '主密码不正确' };
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
      masterPasswordHash: null,
    });
    await storage.remove(SESSION_STORAGE_KEY);
    // Clear in-memory tokens
    useTokenStore.setState({ tokens: [], searchQuery: '', selectedProvider: 'all' });
  },

  updateUser: async (updates: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    set({ user: updated });
    await storage.set(SESSION_STORAGE_KEY, updated);
  },

  loadAuth: async () => {
    const savedUser = await storage.get<User | null>(SESSION_STORAGE_KEY, null);
    if (savedUser) {
      const accounts = await storage.get<StoredAccount[]>(USERS_REGISTRY_KEY, []);
      const account = accounts.find((a) => a.id === savedUser.id);

      set({
        user: savedUser,
        isAuthenticated: true,
        isLocked: false,
        masterPasswordHash: account ? account.passwordHash : null,
      });

      await useTokenStore.getState().loadTokens(savedUser.id);
      await useCategoryStore.getState().loadCategories(savedUser.id);
    } else {
      set({
        user: null,
        isAuthenticated: false,
        isLocked: false,
        masterPasswordHash: null,
      });
      useTokenStore.setState({ tokens: [] });
    }
  },
}));
