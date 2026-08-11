import { create } from 'zustand';
import { NewTokenInput, Token } from '../types/token';
import { generateBackupCodes, getRemainingSeconds } from '../utils/totp';
import { storage } from '../utils/storage';

interface TokenState {
  tokens: Token[];
  currentUserId: string | null;
  searchQuery: string;
  selectedProvider: string;
  remainingSeconds: number;
  copiedTokenId: string | null;
  setSearchQuery: (query: string) => void;
  setSelectedProvider: (provider: string) => void;
  setRemainingSeconds: (seconds: number) => void;
  setCopiedTokenId: (id: string | null) => void;
  addToken: (input: NewTokenInput, userId?: string) => Promise<Token>;
  updateToken: (id: string, updates: Partial<Token>) => Promise<void>;
  deleteToken: (id: string) => Promise<void>;
  getTokenById: (id: string) => Token | undefined;
  loadTokens: (userId?: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

const getTokenStorageKey = (userId?: string | null) =>
  userId ? `fortress_tokens_user_${userId}` : 'fortress_tokens_guest';

export const useTokenStore = create<TokenState>((set, get) => ({
  tokens: [],
  currentUserId: null,
  searchQuery: '',
  selectedProvider: 'all',
  remainingSeconds: getRemainingSeconds(30),
  copiedTokenId: null,

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setSelectedProvider: (selectedProvider: string) => set({ selectedProvider }),
  setRemainingSeconds: (remainingSeconds: number) => set({ remainingSeconds }),
  setCopiedTokenId: (copiedTokenId: string | null) => set({ copiedTokenId }),

  addToken: async (input: NewTokenInput, passedUserId?: string) => {
    const userId = passedUserId || get().currentUserId || 'user_default';
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
      fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newToken, userId }),
      }).catch(() => {});
    } catch (_) {}

    return newToken;
  },

  updateToken: async (id: string, updates: Partial<Token>) => {
    const userId = get().currentUserId;
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
      fetch(`/api/tokens/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, userId }),
      }).catch(() => {});
    } catch (_) {}
  },

  deleteToken: async (id: string) => {
    const userId = get().currentUserId;
    const next = get().tokens.filter((t) => t.id !== id);
    set({ tokens: next });
    await storage.set(getTokenStorageKey(userId), next);

    // Sync remote
    try {
      fetch(`/api/tokens/${id}?userId=${userId}`, {
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
      const res = await fetch(`/api/tokens?userId=${activeUserId}`);
      if (res.ok) {
        const remoteTokens = await res.json();
        if (Array.isArray(remoteTokens) && remoteTokens.length > 0) {
          saved = remoteTokens;
          await storage.set(storageKey, saved);
        }
      }
    } catch (_) {}

    set({ tokens: saved || [] });
  },

  resetToDefault: async () => {
    const userId = get().currentUserId;
    set({ tokens: [] });
    if (userId) {
      await storage.set(getTokenStorageKey(userId), []);
    }
  },
}));
