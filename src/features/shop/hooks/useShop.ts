import { useCallback, useEffect, useState } from 'react';

import { productRepository } from '@/services/repositories/productRepository';
import { ProductQuery } from '@/types/api';
import { Product } from '@/types/domain';
import { AppError, getErrorMessage } from '@/types/errors';

export function useShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState({ totalCount: 0, totalPages: 1 });
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState({
    page: 1,
    search: '',
    category: '',
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    minRating: undefined as number | undefined,
    sort: 'rating_desc' as 'price_asc' | 'price_desc' | 'rating_desc' | 'name_asc' | 'name_desc',
  });

  const [queryIdRef] = useState(() => ({ current: 0 }));
  const [loadingRef] = useState(() => ({ inFlight: false }));

  const fetchProducts = useCallback(async () => {
    const isFirstPage = filters.page === 1;
    if (isFirstPage) {
      setLoading(true);
      setProducts([]); // Clear current list immediately on first page request (filter change / initial load)
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    const queryId = ++queryIdRef.current;
    loadingRef.inFlight = true;

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

      // Guard: Ignore if this request was superseded by a newer one
      if (queryId !== queryIdRef.current) return;

      if (isFirstPage) {
        setProducts(result.items || []);
      } else {
        setProducts((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          for (const item of (result.items || [])) {
            map.set(item.id, item);
          }
          return Array.from(map.values());
        });
      }

      setPages({
        totalCount: result.metadata.totalCount,
        totalPages: result.metadata.totalPages,
      });

      setHasMore(filters.page < result.metadata.totalPages);
    } catch (e: unknown) {
      if (queryId === queryIdRef.current) {
        setError(getErrorMessage(e, 'Error loading products.'));
      }
    } finally {
      if (queryId === queryIdRef.current) {
        setLoading(false);
        setIsLoadingMore(false);
        loadingRef.inFlight = false;
      }
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => {
      const nextFilters = {
        ...prev,
        ...newFilters,
      };
      if ('page' in newFilters) {
        nextFilters.page = newFilters.page!;
      } else {
        nextFilters.page = 1;
      }
      return nextFilters;
    });
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

  const loadMore = useCallback(() => {
    if (loading || isLoadingMore || !hasMore) return;
    if (loadingRef.inFlight) return;
    loadingRef.inFlight = true;
    updateFilters({ page: filters.page + 1 });
  }, [loading, isLoadingMore, hasMore, filters.page, updateFilters]);

  return {
    products,
    loading,
    isLoadingMore,
    hasMore,
    loadMore,
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
