import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useTokenStore } from '../store/useTokenStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { NewTokenInput, Token } from '../types/token';
import { NewCategoryInput } from '../types/category';

export function useTokensQuery() {
  const localTokens = useTokenStore((s) => s.tokens);

  return useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      try {
        const serverTokens = await api.getTokens();
        if (serverTokens && serverTokens.length > 0) {
          return serverTokens;
        }
      } catch {
        // use local
      }
      return localTokens;
    },
    initialData: localTokens,
  });
}

export function useCategoriesQuery() {
  const localCategories = useCategoryStore((s) => s.categories);

  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const serverCats = await api.getCategories();
        if (serverCats && serverCats.length > 0) {
          return serverCats;
        }
      } catch {
        // fallback
      }
      return localCategories;
    },
    initialData: localCategories,
  });
}

export function useAddTokenMutation() {
  const queryClient = useQueryClient();
  const addTokenLocal = useTokenStore((s) => s.addToken);

  return useMutation({
    mutationFn: async (input: NewTokenInput) => {
      const created = await addTokenLocal(input);
      try {
        await api.createToken(input);
      } catch {
        // offline fallback
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
    },
  });
}

export function useAddCategoryMutation() {
  const queryClient = useQueryClient();
  const addCategoryLocal = useCategoryStore((s) => s.addCategory);

  return useMutation({
    mutationFn: async (input: NewCategoryInput) => {
      const created = await addCategoryLocal(input);
      try {
        await api.createCategory(input);
      } catch {
        // offline fallback
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
