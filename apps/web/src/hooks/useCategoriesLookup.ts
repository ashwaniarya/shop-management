'use client';

import { useCallback } from 'react';

import type { Category } from '@shop/shared';

import { listCategories } from '@/lib/api';

import { useAsync } from './useAsync';

interface UseCategoriesLookupResult {
  categories: Category[];
  categoriesById: Map<number, Category>;
  isLoading: boolean;
  error: unknown;
}

export function useCategoriesLookup(): UseCategoriesLookupResult {
  const fetcher = useCallback(() => listCategories({ limit: 100 }).then((page) => page.data), []);
  const { data, isLoading, error } = useAsync(fetcher);
  const categories = data ?? [];

  return { categories, categoriesById: new Map(categories.map((category) => [category.id, category])), isLoading, error };
}
