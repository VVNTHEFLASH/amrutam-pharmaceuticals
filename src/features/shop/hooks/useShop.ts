import { useCallback, useEffect, useState } from 'react';

import { productRepository } from '@/services/repositories/productRepository';
import { ProductQuery } from '@/types/api';
import { Product } from '@/types/domain';
import { AppError } from '@/types/errors';

export function useShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState({ totalCount: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    page: 1,
    search: '',
    category: '',
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    minRating: undefined as number | undefined,
    sort: 'rating_desc' as 'price_asc' | 'price_desc' | 'rating_desc' | 'name_asc',
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q: ProductQuery = {
        page: filters.page,
        pageSize: 10,
        sort: filters.sort,
      };
      if (filters.search.trim()) {
        q.search = filters.search.trim();
      }
      if (filters.category) {
        q.category = filters.category;
      }
      if (filters.minPrice !== undefined) {
        q.minPrice = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        q.maxPrice = filters.maxPrice;
      }
      if (filters.minRating !== undefined) {
        q.minRating = filters.minRating;
      }

      const result = await productRepository.getProducts(q);
      setProducts(result.items);
      setPages({
        totalCount: result.metadata.totalCount,
        totalPages: result.metadata.totalPages,
      });
    } catch (e: any) {
      setError(e instanceof AppError ? e.message : 'Error loading products.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      page: 1,
      search: '',
      category: '',
      minPrice: undefined,
      maxPrice: undefined,
      minRating: undefined,
      sort: 'rating_desc',
    });
  }, []);

  return {
    products,
    loading,
    error,
    totalPages: pages.totalPages,
    totalCount: pages.totalCount,
    page: filters.page,
    filters,
    updateFilters,
    resetFilters,
    retry: fetchProducts,
  };
}
