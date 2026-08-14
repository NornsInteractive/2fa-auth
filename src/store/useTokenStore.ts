import { create } from 'zustand';
import { NewTokenInput, Token } from '../types/token';
import { generateBackupCodes, getRemainingSeconds } from '../utils/totp';
import { storage } from '../utils/storage';
import { getApiUrl, fetchEncrypted } from '../api/client';
import { useAuthStore } from './useAuthStore';

interface TokenState {
  tokens: Token[];
  currentUserId: string | null;
  searchQuery: string;
  selectedProvider: string;
  remainingSeconds: number;
  copiedTokenId: string | null;
  isRefreshing: boolean;
  setSearchQuery: (query: string) => void;
  setSelectedProvider: (provider: string) => void;
  setRemainingSeconds: (seconds: number) => void;
  setCopiedTokenId: (id: string | null) => void;
  addToken: (input: NewTokenInput, userId?: string) => Promise<Token>;
  updateToken: (id: string, updates: Partial<Token>) => Promise<void>;
  deleteToken: (id: string) => Promise<void>;
  getTokenById: (id: string) => Token | undefined;
  loadTokens: (userId?: string) => Promise<void>;
  refreshTokens: () => Promise<void>;
  resetToDefault: () => Promise<void>;
}

const getTokenStorageKey = (userId?: string | null) =>
  userId ? `fortress_tokens_user_${userId}` : 'fortress_tokens_guest';

const normalizeToken = (t: any): Token => ({
  id: t.id,
  userId: t.userId || t.user_id || '',
  categoryId: t.categoryId || t.category_id || 'all',
  issuer: t.issuer || '',
  accountName: t.accountName || t.account_name || '',
  secretKey: t.secretKey || t.secret_key || '',
  algorithm: t.algorithm || 'SHA1',
  digits: t.digits || 6,
  period: t.period || 30,
  iconType: t.iconType || t.icon_type || 'shield',
  notes: t.notes || '',
  backupCodes: Array.isArray(t.backupCodes)
    ? t.backupCodes
    : (typeof t.backup_codes === 'string' ? JSON.parse(t.backup_codes || '[]') : []),
  createdAt: t.createdAt || t.created_at || new Date().toISOString(),
  updatedAt: t.updatedAt || t.updated_at || new Date().toISOString(),
});

export const useTokenStore = create<TokenState>((set, get) => ({
  tokens: [],
  currentUserId: null,
  searchQuery: '',
  selectedProvider: 'all',
  remainingSeconds: getRemainingSeconds(30),
  copiedTokenId: null,
  isRefreshing: false,

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setSelectedProvider: (selectedProvider: string) => set({ selectedProvider }),
  setRemainingSeconds: (remainingSeconds: number) => set({ remainingSeconds }),
  setCopiedTokenId: (copiedTokenId: string | null) => set({ copiedTokenId }),

  addToken: async (input: NewTokenInput, passedUserId?: string) => {
    const userId = passedUserId || get().currentUserId || useAuthStore.getState().user?.id || 'usr_guest';
    const newToken: Token = {
      id: `token_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      categoryId: input.categoryId || 'all',
      issuer: input.issuer.trim(),
      accountName: input.accountName.trim(),
      secretKey: input.secretKey.trim().toUpperCase().replace(/\s/g, ''),
      algorithm: input.algorithm || 'SHA1',
      digits: input.digits || 6,
      period: input.period || 30,
      iconType: input.iconType || 'shield',
      backupCodes: input.backupCodes && input.backupCodes.length > 0 ? input.backupCodes : [],
      notes: input.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const next = [newToken, ...get().tokens];
    set({ tokens: next });
    await storage.set(getTokenStorageKey(userId), next);

    // Try remote sync to Cloudflare Workers
    try {
      fetchEncrypted(getApiUrl('/api/tokens'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newToken, userId }),
      }).catch(() => {});
    } catch (_) {}

    return newToken;
  },

  updateToken: async (id: string, updates: Partial<Token>) => {
    const userId = get().currentUserId || useAuthStore.getState().user?.id || 'usr_guest';
    const next = get().tokens.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    set({ tokens: next });
    await storage.set(getTokenStorageKey(userId), next);

    // Sync remote
    try {
      fetchEncrypted(getApiUrl(`/api/tokens/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, userId }),
      }).catch(() => {});
    } catch (_) {}
  },

  deleteToken: async (id: string) => {
    const userId = get().currentUserId || useAuthStore.getState().user?.id || 'usr_guest';
    const next = get().tokens.filter((t) => t.id !== id);
    set({ tokens: next });
    await storage.set(getTokenStorageKey(userId), next);

    // Sync remote
    try {
      fetchEncrypted(getApiUrl(`/api/tokens/${id}?userId=${userId}`), {
        method: 'DELETE',
      }).catch(() => {});
    } catch (_) {}
  },

  getTokenById: (id: string) => {
    return get().tokens.find((t) => t.id === id);
  },

  loadTokens: async (userId?: string) => {
    const activeUserId = userId || get().currentUserId;
    set({ currentUserId: activeUserId || null });

    if (!activeUserId) {
      set({ tokens: [] });
      return;
    }

    const storageKey = getTokenStorageKey(activeUserId);
    let saved = await storage.get<Token[]>(storageKey, []);

    // Try fetch remote tokens from Cloudflare D1
    try {
      const res = await fetchEncrypted(getApiUrl(`/api/tokens?userId=${activeUserId}`));
      if (res.ok) {
        const remoteTokens = await res.json();
        if (Array.isArray(remoteTokens) && remoteTokens.length > 0) {
          saved = remoteTokens.map(normalizeToken);
          await storage.set(storageKey, saved);
        }
      }
    } catch (_) {}

    set({ tokens: (saved || []).map(normalizeToken) });
  },

  refreshTokens: async () => {
    const activeUserId = get().currentUserId || useAuthStore.getState().user?.id;
    if (!activeUserId) return;
    set({ isRefreshing: true });
    try {
      const res = await fetchEncrypted(getApiUrl(`/api/tokens?userId=${activeUserId}`));
      if (res.ok) {
        const remoteTokens = await res.json();
        if (Array.isArray(remoteTokens)) {
          const normalized = remoteTokens.map(normalizeToken);
          const current = get().tokens;

          // Check if tokens changed seamlessly
          const isDifferent =
            normalized.length !== current.length ||
            normalized.some((nt, idx) => {
              const ct = current[idx];
              return (
                !ct ||
                nt.id !== ct.id ||
                nt.secretKey !== ct.secretKey ||
                nt.accountName !== ct.accountName ||
                nt.issuer !== ct.issuer ||
                nt.categoryId !== ct.categoryId
              );
            });

          if (isDifferent) {
            set({ tokens: normalized });
            const storageKey = getTokenStorageKey(activeUserId);
            await storage.set(storageKey, normalized);
          }
        }
      }
    } catch (_) {
    } finally {
      set({ isRefreshing: false });
    }
  },

  resetToDefault: async () => {
    const userId = get().currentUserId;
    set({ tokens: [] });
    if (userId) {
      await storage.set(getTokenStorageKey(userId), []);
    }
  },
}));
