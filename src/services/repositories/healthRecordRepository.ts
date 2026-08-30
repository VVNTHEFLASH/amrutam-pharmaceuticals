import { HealthRecordQuery, PaginatedResult, PaginationMetadata } from '@/types/api';
import { HealthRecord } from '@/types/domain';
import { AppError } from '@/types/errors';

import { apiClient } from '../api/apiClient';
import { getHealthRecordByIndex, TOTAL_HEALTH_RECORDS } from '../mockData';

function buildMetadata(totalCount: number, page: number, pageSize: number): PaginationMetadata {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  return {
    page: currentPage,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

export const healthRecordRepository = {
  async getHealthRecords(query: HealthRecordQuery): Promise<PaginatedResult<HealthRecord>> {
    const parts = [
      `page=${query.page || 1}`,
      `pageSize=${query.pageSize || 10}`,
      query.search ? `search=${encodeURIComponent(query.search.trim())}` : '',
      query.type ? `type=${encodeURIComponent(query.type)}` : '',
      query.tag ? `tag=${encodeURIComponent(query.tag)}` : '',
      query.year !== undefined ? `year=${query.year}` : '',
      query.month !== undefined ? `month=${query.month}` : '',
      query.date ? `date=${encodeURIComponent(query.date)}` : '',
    ].filter(Boolean).sort().join('&');
    const cacheKey = `healthRecords?${parts}`;

    return apiClient.execute(cacheKey, () => {
      const page = query.page || 1;
      const pageSize = query.pageSize || 10;

      const filtered: HealthRecord[] = [];
      for (let i = 0; i < TOTAL_HEALTH_RECORDS; i++) {
        const item = getHealthRecordByIndex(i);

        if (query.type && item.type !== query.type) {
          continue;
        }

        if (query.tag && !item.tags.includes(query.tag)) {
          continue;
        }

        if (query.date && item.date !== query.date) {
          continue;
        }

        if (query.year !== undefined || query.month !== undefined) {
          const [yearStr, monthStr] = item.date.split('-');
          const itemYear = parseInt(yearStr, 10);
          const itemMonth = parseInt(monthStr, 10);

          if (query.year !== undefined && itemYear !== query.year) {
            continue;
          }
          if (query.month !== undefined && itemMonth !== query.month) {
            continue;
          }
        }

        if (query.search) {
          const searchLower = query.search.toLowerCase();
          if (
            !item.patientName.toLowerCase().includes(searchLower) &&
            !item.doctorName.toLowerCase().includes(searchLower) &&
            !item.diagnosis.toLowerCase().includes(searchLower) &&
            !item.treatment.toLowerCase().includes(searchLower)
          ) {
            continue;
          }
        }

        filtered.push(item);
      }

      const totalCount = filtered.length;
      const metadata = buildMetadata(totalCount, page, pageSize);
      const start = (metadata.page - 1) * pageSize;
      const paginatedItems = filtered.slice(start, start + pageSize);

      return {
        items: paginatedItems,
        metadata,
      };
    });
  },

  async getHealthRecordById(id: string): Promise<HealthRecord> {
    return apiClient.execute(`healthRecords/${id}`, () => {
      const match = id.match(/^rec-(\d+)$/);
      if (!match) {
        throw new AppError('UNKNOWN_FAILURE', `Invalid health record ID: ${id}`);
      }
      const index = parseInt(match[1], 10) - 1;
      if (index < 0 || index >= TOTAL_HEALTH_RECORDS) {
        throw new AppError('UNKNOWN_FAILURE', `Health record with ID ${id} not found.`);
      }
      return getHealthRecordByIndex(index);
    });
  },
};
