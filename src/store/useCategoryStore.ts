import { create } from 'zustand';
import { Category, NewCategoryInput } from '../types/category';
import { DEFAULT_CATEGORIES } from '../api/mockData';
import { storage } from '../utils/storage';

interface CategoryState {
  categories: Category[];
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  addCategory: (input: NewCategoryInput) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<NewCategoryInput>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  loadCategories: () => Promise<void>;
}

const CATEGORIES_STORAGE_KEY = 'fortress_categories_v1';

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: DEFAULT_CATEGORIES,
  selectedCategoryId: 'all',

  setSelectedCategoryId: (id: string) => {
    set({ selectedCategoryId: id });
  },

  addCategory: async (input: NewCategoryInput) => {
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
    await storage.set(CATEGORIES_STORAGE_KEY, next);
    return newCategory;
  },

  updateCategory: async (id: string, updates: Partial<NewCategoryInput>) => {
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
    await storage.set(CATEGORIES_STORAGE_KEY, next);
  },

  deleteCategory: async (id: string) => {
    // Cannot delete 'all' default category
    if (id === 'all') return;
    const next = get().categories.filter((c) => c.id !== id);
    let nextSelected = get().selectedCategoryId;
    if (nextSelected === id) {
      nextSelected = 'all';
    }
    set({ categories: next, selectedCategoryId: nextSelected });
    await storage.set(CATEGORIES_STORAGE_KEY, next);
  },

  loadCategories: async () => {
    const saved = await storage.get<Category[]>(CATEGORIES_STORAGE_KEY, []);
    if (saved && saved.length > 0) {
      // Merge with default categories ensuring 'all' is always present
      const hasAll = saved.some((c) => c.id === 'all');
      if (!hasAll) {
        set({ categories: [DEFAULT_CATEGORIES[0], ...saved] });
      } else {
        set({ categories: saved });
      }
    } else {
      set({ categories: DEFAULT_CATEGORIES });
      await storage.set(CATEGORIES_STORAGE_KEY, DEFAULT_CATEGORIES);
    }
  },
}));
