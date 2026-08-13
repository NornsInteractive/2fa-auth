import { create } from 'zustand';
import { Category, NewCategoryInput } from '../types/category';
import { DEFAULT_CATEGORIES } from '../api/mockData';
import { storage } from '../utils/storage';
import { getApiUrl } from '../api/client';
import { useAuthStore } from './useAuthStore';

interface CategoryState {
  categories: Category[];
  currentUserId: string | null;
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  addCategory: (input: NewCategoryInput, userId?: string) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<NewCategoryInput>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  loadCategories: (userId?: string) => Promise<void>;
}

const getCategoryStorageKey = (userId?: string | null) =>
  userId ? `fortress_categories_user_${userId}` : 'fortress_categories_guest';

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: DEFAULT_CATEGORIES,
  currentUserId: null,
  selectedCategoryId: 'all',

  setSelectedCategoryId: (id: string) => {
    set({ selectedCategoryId: id });
  },

  addCategory: async (input: NewCategoryInput, passedUserId?: string) => {
    const userId = passedUserId || get().currentUserId || useAuthStore.getState().user?.id || 'usr_guest';
    const newCategory: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: input.name,
      slug: input.name.toLowerCase().replace(/\s+/g, '-'),
      icon: input.icon || 'folder',
      color: input.color || '#005ac1',
      isDefault: false,
    };

    const next = [...get().categories, newCategory];
    set({ categories: next });
    await storage.set(getCategoryStorageKey(userId), next);

    // Sync remote
    try {
      fetch(getApiUrl('/api/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, userId }),
      }).catch(() => {});
    } catch (_) {}

    return newCategory;
  },

  updateCategory: async (id: string, updates: Partial<NewCategoryInput>) => {
    const userId = get().currentUserId || useAuthStore.getState().user?.id || 'usr_guest';
    const next = get().categories.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          ...updates,
          slug: updates.name ? updates.name.toLowerCase().replace(/\s+/g, '-') : c.slug,
        };
      }
      return c;
    });
    set({ categories: next });
    await storage.set(getCategoryStorageKey(userId), next);
  },

  deleteCategory: async (id: string) => {
    if (id === 'all') return;
    const userId = get().currentUserId || useAuthStore.getState().user?.id || 'usr_guest';
    const next = get().categories.filter((c) => c.id !== id);
    let nextSelected = get().selectedCategoryId;
    if (nextSelected === id) {
      nextSelected = 'all';
    }
    set({ categories: next, selectedCategoryId: nextSelected });
    await storage.set(getCategoryStorageKey(userId), next);

    try {
      fetch(getApiUrl(`/api/categories/${id}?userId=${userId}`), {
        method: 'DELETE',
      }).catch(() => {});
    } catch (_) {}
  },

  loadCategories: async (userId?: string) => {
    const activeUserId = userId || get().currentUserId;
    set({ currentUserId: activeUserId || null });

    const storageKey = getCategoryStorageKey(activeUserId);
    let saved = await storage.get<Category[]>(storageKey, []);

    // Try fetch remote
    if (activeUserId) {
      try {
        const res = await fetch(getApiUrl(`/api/categories?userId=${activeUserId}`));
        if (res.ok) {
          const remoteCats = await res.json();
          if (Array.isArray(remoteCats) && remoteCats.length > 0) {
            saved = remoteCats;
          }
        }
      } catch (_) {}
    }

    if (saved && saved.length > 0) {
      const hasAll = saved.some((c) => c.id === 'all');
      const merged = hasAll ? saved : [DEFAULT_CATEGORIES[0], ...saved];
      set({ categories: merged });
      await storage.set(storageKey, merged);
    } else {
      set({ categories: DEFAULT_CATEGORIES });
      await storage.set(storageKey, DEFAULT_CATEGORIES);
    }
  },
}));
