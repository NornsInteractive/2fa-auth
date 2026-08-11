import { create } from 'zustand';
import { NewTokenInput, Token } from '../types/token';
import { DEFAULT_TOKENS } from '../api/mockData';
import { generateBackupCodes, generateTOTP, getRemainingSeconds } from '../utils/totp';
import { storage } from '../utils/storage';

interface TokenState {
  tokens: Token[];
  searchQuery: string;
  remainingSeconds: number;
  copiedTokenId: string | null;
  setSearchQuery: (query: string) => void;
  setRemainingSeconds: (seconds: number) => void;
  setCopiedTokenId: (id: string | null) => void;
  addToken: (input: NewTokenInput) => Promise<Token>;
  updateToken: (id: string, updates: Partial<Token>) => Promise<void>;
  deleteToken: (id: string) => Promise<void>;
  getTokenById: (id: string) => Token | undefined;
  loadTokens: () => Promise<void>;
  resetToDefault: () => Promise<void>;
}

const TOKENS_STORAGE_KEY = 'fortress_tokens_v1';

export const useTokenStore = create<TokenState>((set, get) => ({
  tokens: DEFAULT_TOKENS,
  searchQuery: '',
  remainingSeconds: getRemainingSeconds(30),
  copiedTokenId: null,

  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setRemainingSeconds: (remainingSeconds: number) => set({ remainingSeconds }),
  setCopiedTokenId: (copiedTokenId: string | null) => set({ copiedTokenId }),

  addToken: async (input: NewTokenInput) => {
    const newToken: Token = {
      id: `token_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: 'user_default',
      categoryId: input.categoryId || 'work',
      issuer: input.issuer.trim(),
      accountName: input.accountName.trim(),
      secretKey: input.secretKey.trim().toUpperCase().replace(/\s/g, ''),
      algorithm: input.algorithm || 'SHA1',
      digits: input.digits || 6,
      period: input.period || 30,
      iconType: input.iconType || 'shield',
      backupCodes: input.backupCodes && input.backupCodes.length > 0 ? input.backupCodes : generateBackupCodes(10),
      notes: input.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const next = [newToken, ...get().tokens];
    set({ tokens: next });
    await storage.set(TOKENS_STORAGE_KEY, next);
    return newToken;
  },

  updateToken: async (id: string, updates: Partial<Token>) => {
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
    await storage.set(TOKENS_STORAGE_KEY, next);
  },

  deleteToken: async (id: string) => {
    const next = get().tokens.filter((t) => t.id !== id);
    set({ tokens: next });
    await storage.set(TOKENS_STORAGE_KEY, next);
  },

  getTokenById: (id: string) => {
    return get().tokens.find((t) => t.id === id);
  },

  loadTokens: async () => {
    const saved = await storage.get<Token[]>(TOKENS_STORAGE_KEY, []);
    if (saved && saved.length > 0) {
      set({ tokens: saved });
    } else {
      set({ tokens: DEFAULT_TOKENS });
      await storage.set(TOKENS_STORAGE_KEY, DEFAULT_TOKENS);
    }
  },

  resetToDefault: async () => {
    set({ tokens: DEFAULT_TOKENS });
    await storage.set(TOKENS_STORAGE_KEY, DEFAULT_TOKENS);
  },
}));
