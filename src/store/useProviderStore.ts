import { create } from 'zustand';
import { Provider, NewProviderInput } from '../types/provider';
import { storage } from '../utils/storage';
import { getApiUrl, fetchEncrypted } from '../api/client';
import { useAuthStore } from './useAuthStore';

export const DEFAULT_PROVIDERS: Provider[] = [
  { id: 'google', name: 'Google', icon: 'language', color: '#4285F4', isDefault: true },
  { id: 'github', name: 'GitHub', icon: 'code', color: '#24292e', isDefault: true },
  { id: 'microsoft', name: 'Microsoft', icon: 'hub', color: '#00a4ef', isDefault: true },
  { id: 'aws', name: 'AWS (Amazon)', icon: 'cloud', color: '#FF9900', isDefault: true },
  { id: 'cloudflare', name: 'Cloudflare', icon: 'shield', color: '#F38020', isDefault: true },
  { id: 'apple', name: 'Apple ID', icon: 'devices', color: '#555555', isDefault: true },
  { id: 'openai', name: 'OpenAI', icon: 'auto_awesome', color: '#10a37f', isDefault: true },
  { id: 'binance', name: 'Binance', icon: 'account_balance', color: '#F3BA2F', isDefault: true },
  { id: 'telegram', name: 'Telegram', icon: 'send', color: '#229ED9', isDefault: true },
  { id: 'discord', name: 'Discord', icon: 'forum', color: '#5865F2', isDefault: true },
  { id: 'slack', name: 'Slack', icon: 'tag', color: '#4A154B', isDefault: true },
  { id: 'steam', name: 'Steam', icon: 'sports_esports', color: '#171a21', isDefault: true },
];

interface ProviderState {
  providers: Provider[];
  currentUserId: string | null;
  loadProviders: (userId?: string) => Promise<void>;
  addProvider: (input: NewProviderInput, userId?: string) => Promise<Provider>;
  deleteProvider: (id: string) => Promise<void>;
}

const getProviderStorageKey = (userId?: string | null) =>
  userId ? `fortress_providers_user_${userId}` : 'fortress_providers_guest';

export const useProviderStore = create<ProviderState>((set, get) => ({
  providers: DEFAULT_PROVIDERS,
  currentUserId: null,

  loadProviders: async (userId?: string) => {
    const activeUserId = userId || get().currentUserId;
    set({ currentUserId: activeUserId || null });

    const storageKey = getProviderStorageKey(activeUserId);
    let saved = await storage.get<Provider[]>(storageKey, []);

    // Try fetch remote providers
    if (activeUserId) {
      try {
        const res = await fetchEncrypted(getApiUrl(`/api/providers?userId=${activeUserId}`));
        if (res.ok) {
          const remoteProviders = await res.json();
          if (Array.isArray(remoteProviders) && remoteProviders.length > 0) {
            saved = remoteProviders;
          }
        }
      } catch (_) {}
    }

    if (saved && saved.length > 0) {
      const customOnes = saved.filter((p) => !DEFAULT_PROVIDERS.some((d) => d.id === p.id));
      const merged = [...DEFAULT_PROVIDERS, ...customOnes];
      set({ providers: merged });
      await storage.set(storageKey, merged);
    } else {
      set({ providers: DEFAULT_PROVIDERS });
      await storage.set(storageKey, DEFAULT_PROVIDERS);
    }
  },

  addProvider: async (input: NewProviderInput, passedUserId?: string) => {
    const userId = passedUserId || get().currentUserId || useAuthStore.getState().user?.id || 'usr_guest';
    const newProvider: Provider = {
      id: `prov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: input.name.trim(),
      icon: input.icon || 'shield',
      color: input.color || '#005ac1',
      isDefault: false,
    };

    const next = [...get().providers, newProvider];
    set({ providers: next });
    await storage.set(getProviderStorageKey(userId), next);

    // Sync remote
    try {
      fetchEncrypted(getApiUrl('/api/providers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, userId }),
      }).catch(() => {});
    } catch (_) {}

    return newProvider;
  },

  deleteProvider: async (id: string) => {
    const target = get().providers.find((p) => p.id === id);
    if (target?.isDefault) return; // Cannot delete default providers

    const userId = get().currentUserId || useAuthStore.getState().user?.id || 'usr_guest';
    const next = get().providers.filter((p) => p.id !== id);
    set({ providers: next });
    await storage.set(getProviderStorageKey(userId), next);

    try {
      fetchEncrypted(getApiUrl(`/api/providers/${id}?userId=${userId}`), {
        method: 'DELETE',
      }).catch(() => {});
    } catch (_) {}
  },
}));
