import { QueryClient } from '@tanstack/react-query';
import { Token, NewTokenInput } from '../types/token';
import { Category, NewCategoryInput } from '../types/category';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      retry: 1,
    },
  },
});

const API_BASE = '/api';

export const api = {
  // Tokens
  async getTokens(): Promise<Token[]> {
    try {
      const res = await fetch(`${API_BASE}/tokens`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch {
      // Handled by local store fallback
      return [];
    }
  },

  async createToken(input: NewTokenInput): Promise<Token> {
    try {
      const res = await fetch(`${API_BASE}/tokens`, {
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
      await fetch(`${API_BASE}/tokens/${id}`, { method: 'DELETE' });
    } catch {
      // offline
    }
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch {
      return [];
    }
  },

  async createCategory(input: NewCategoryInput): Promise<Category> {
    try {
      const res = await fetch(`${API_BASE}/categories`, {
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
