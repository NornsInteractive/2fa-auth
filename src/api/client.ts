import { QueryClient } from '@tanstack/react-query';
import { Token, NewTokenInput } from '../types/token';
import { Category, NewCategoryInput } from '../types/category';
import { useSettingsStore } from '../store/useSettingsStore';
import { encryptPayload, decryptPayload } from '../utils/cryptoPayload';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      retry: 1,
    },
  },
});

export function getApiUrl(path: string): string {
  const customServer = useSettingsStore.getState().serverUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (customServer && customServer.trim().length > 0) {
    const base = customServer.trim().replace(/\/+$/, '');
    return cleanPath.startsWith('/api') ? `${base}${cleanPath}` : `${base}/api${cleanPath}`;
  }
  return cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;
}

export async function fetchEncrypted(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  let newBody = options.body;
  if (options.body && typeof options.body === 'string') {
    try {
      const parsed = JSON.parse(options.body);
      const encrypted = await encryptPayload(parsed);
      newBody = JSON.stringify(encrypted);
      headers.set('Content-Type', 'application/json');
    } catch (_) {}
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: newBody,
  });

  const originalJson = response.json.bind(response);
  response.json = async () => {
    const rawData = await originalJson();
    return await decryptPayload(rawData);
  };

  return response;
}

export const api = {
  // Tokens
  async getTokens(): Promise<Token[]> {
    try {
      const res = await fetchEncrypted(getApiUrl('/api/tokens'));
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch {
      return [];
    }
  },

  async createToken(input: NewTokenInput): Promise<Token> {
    try {
      const res = await fetchEncrypted(getApiUrl('/api/tokens'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create token on server');
      return await res.json();
    } catch {
      throw new Error('Offline mode: Saved locally');
    }
  },

  async deleteToken(id: string): Promise<void> {
    try {
      await fetchEncrypted(getApiUrl(`/api/tokens/${id}`), { method: 'DELETE' });
    } catch {
      // offline
    }
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetchEncrypted(getApiUrl('/api/categories'));
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch {
      return [];
    }
  },

  async createCategory(input: NewCategoryInput): Promise<Category> {
    try {
      const res = await fetchEncrypted(getApiUrl('/api/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create category');
      return await res.json();
    } catch {
      throw new Error('Offline mode: Saved locally');
    }
  },
};
