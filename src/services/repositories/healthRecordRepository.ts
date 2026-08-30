import { HealthRecordQuery, PaginatedResult, PaginationMetadata } from '@/types/api';
import { HealthRecord } from '@/types/domain';
import { AppError } from '@/types/errors';

import { apiClient } from '../api/apiClient';
import { getHealthRecordByIndex, TOTAL_HEALTH_RECORDS } from '../mockData';
import { supabase, isSupabaseConfigured } from '../supabase';

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

function mapDbHealthRecord(row: any): HealthRecord {
  return {
    id: row.id,
    patientName: row.patient_name,
    doctorName: row.doctor_name,
    date: row.date,
    diagnosis: row.diagnosis,
    treatment: row.treatment,
    prescription: row.prescription,
    attachmentUrl: row.attachment_url || undefined,
    type: row.type as HealthRecord['type'],
    tags: row.tags,
  };
}

export const healthRecordRepository = {
  async getHealthRecords(query: HealthRecordQuery): Promise<PaginatedResult<HealthRecord>> {
    let userId = 'anonymous';
    if (isSupabaseConfigured && supabase?.auth?.getSession) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          userId = session.user.id;
        }
      } catch (e) {
        // Safe catch
      }
    }

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
    const cacheKey = `healthRecords:${userId}?${parts}`;

    return apiClient.execute(cacheKey, async () => {
      const page = query.page || 1;
      const pageSize = query.pageSize || 10;

      if (isSupabaseConfigured) {
        let queryBuilder = supabase.from('health_records').select('*', { count: 'exact' });

        if (query.type) {
          queryBuilder = queryBuilder.eq('type', query.type);
        }

        if (query.tag) {
          queryBuilder = queryBuilder.cs('tags', [query.tag]);
        }

        if (query.date) {
          queryBuilder = queryBuilder.eq('date', query.date);
        }

        if (query.year !== undefined && query.month !== undefined) {
          const lastDay = new Date(query.year, query.month, 0).getDate();
          const startDate = `${query.year}-${query.month.toString().padStart(2, '0')}-01`;
          const endDate = `${query.year}-${query.month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
          queryBuilder = queryBuilder.gte('date', startDate).lte('date', endDate);
        } else if (query.year !== undefined) {
          const startDate = `${query.year}-01-01`;
          const endDate = `${query.year}-12-31`;
          queryBuilder = queryBuilder.gte('date', startDate).lte('date', endDate);
        } else if (query.month !== undefined) {
          queryBuilder = queryBuilder.like('date', `%-${query.month.toString().padStart(2, '0')}-%`);
        }

        if (query.search) {
          const searchClean = query.search.trim();
          queryBuilder = queryBuilder.or(`patient_name.ilike.%${searchClean}%,doctor_name.ilike.%${searchClean}%,diagnosis.ilike.%${searchClean}%,treatment.ilike.%${searchClean}%`);
        }

        // Always order by date desc, then seed_index asc
        queryBuilder = queryBuilder.order('date', { ascending: false }).order('seed_index', { ascending: true });

        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;
        queryBuilder = queryBuilder.range(start, end);

        const { data, count, error } = await queryBuilder;
        if (error || !data) {
          throw new AppError('UNKNOWN_FAILURE', `Failed to fetch health records from Supabase: ${error?.message || 'Empty response'}`, error);
        }

        const totalCount = count || 0;
        const metadata = buildMetadata(totalCount, page, pageSize);
        const items = data.map(mapDbHealthRecord);

        return {
          items,
          metadata,
        };
      }

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
    return apiClient.execute(`healthRecords/${id}`, async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('health_records')
          .select('*')
          .eq('id', id)
          .single();

        if (data) {
          return mapDbHealthRecord(data);
        }
      }

      const match = id.match(/^rec-(\d+)$/);
      if (!match) {
        throw new AppError('UNKNOWN_FAILURE', `Health record with ID ${id} not found.`);
      }
      const index = parseInt(match[1], 10) - 1;
      if (index < 0 || index >= TOTAL_HEALTH_RECORDS) {
        throw new AppError('UNKNOWN_FAILURE', `Health record with ID ${id} not found.`);
      }

      return getHealthRecordByIndex(index);
    });
  },

  async createHealthRecord(record: Omit<HealthRecord, 'id'>, userId: string): Promise<HealthRecord> {
    const recordId = `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (!isSupabaseConfigured) {
      return {
        ...record,
        id: recordId,
      };
    }

    const { data, error } = await supabase
      .from('health_records')
      .insert({
        id: recordId,
        user_id: userId,
        patient_name: record.patientName,
        doctor_name: record.doctorName,
        date: record.date,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        prescription: record.prescription,
        attachment_url: record.attachmentUrl || null,
        type: record.type,
        tags: record.tags,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to create health record: ${error.message}`, error);
    }

    return mapDbHealthRecord(data);
  },

  async deleteHealthRecord(id: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from('health_records')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to delete health record: ${error.message}`, error);
    }
  },
};
