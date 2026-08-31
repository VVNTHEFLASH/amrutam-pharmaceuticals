import { useCallback, useEffect, useState } from 'react';

import { healthRecordRepository } from '@/services/repositories/healthRecordRepository';
import { HealthRecordQuery, HealthRecordType } from '@/types/api';
import { HealthRecord } from '@/types/domain';
import { AppError } from '@/types/errors';

export function useRecords() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState({ totalCount: 0, totalPages: 1 });

  const [queryIdRef] = useState(() => ({ current: 0 }));

  const [filters, setFilters] = useState({
    page: 1,
    search: '',
    type: undefined as HealthRecordType | undefined,
    tag: '',
    year: undefined as number | undefined,
    month: undefined as number | undefined,
    date: '', // YYYY-MM-DD
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setRecords([]); // Clear list immediately on fetch to prevent showing stale results
    setError(null);
    const queryId = ++queryIdRef.current;

    try {
      const q: HealthRecordQuery = {
        page: filters.page,
        pageSize: 10,
      };
      if (filters.search.trim()) {
        q.search = filters.search.trim();
      }
      if (filters.type) {
        q.type = filters.type;
      }
      if (filters.tag.trim()) {
        q.tag = filters.tag.trim();
      }
      if (filters.year !== undefined) {
        q.year = filters.year;
      }
      if (filters.month !== undefined) {
        q.month = filters.month;
      }
      if (filters.date.trim()) {
        q.date = filters.date.trim();
      }

      const result = await healthRecordRepository.getHealthRecords(q);
      if (queryId !== queryIdRef.current) return;

      setRecords(result.items);
      setPages({
        totalCount: result.metadata.totalCount,
        totalPages: result.metadata.totalPages,
      });
    } catch (e: any) {
      if (queryId === queryIdRef.current) {
        setError(e instanceof AppError ? e.message : 'Error loading health records.');
      }
    } finally {
      if (queryId === queryIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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
      type: undefined,
      tag: '',
      year: undefined,
      month: undefined,
      date: '',
    });
  }, []);

  return {
    records,
    loading,
    error,
    totalPages: pages.totalPages,
    totalCount: pages.totalCount,
    page: filters.page,
    filters,
    updateFilters,
    resetFilters,
    retry: fetchRecords,
  };
}
