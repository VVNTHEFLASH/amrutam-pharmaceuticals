import { DoctorQuery, PaginatedResult, PaginationMetadata, TimeSlot } from '@/types/api';
import { Doctor } from '@/types/domain';
import { AppError } from '@/types/errors';
import { Database } from '@/types/database';

import { apiClient } from '../api/apiClient';
import { getDoctorByIndex, TOTAL_DOCTORS } from '../mockData';
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

type DoctorRow = Database['public']['Tables']['doctors']['Row'];

function mapDbDoctor(row: DoctorRow): Doctor {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    imageUrl: row.image_url,
    rating: Number(row.rating),
    experience: row.experience,
    consultationFee: Number(row.consultation_fee),
    availableDays: row.available_days,
  };
}

export const doctorRepository = {
  async getDoctors(query: DoctorQuery): Promise<PaginatedResult<Doctor>> {
    const parts = [
      `page=${query.page || 1}`,
      `pageSize=${query.pageSize || 10}`,
      query.search ? `search=${encodeURIComponent(query.search.trim())}` : '',
      query.specialty ? `specialty=${encodeURIComponent(query.specialty)}` : '',
      query.availability ? `availability=${encodeURIComponent(query.availability)}` : '',
      query.sort ? `sort=${query.sort}` : '',
    ].filter(Boolean).sort().join('&');
    const cacheKey = `doctors?${parts}`;

    return apiClient.execute(cacheKey, async () => {
      const page = query.page || 1;
      const pageSize = query.pageSize || 10;

      if (isSupabaseConfigured) {
        let queryBuilder = supabase.from('doctors').select('*', { count: 'exact' });

        if (query.specialty) {
          queryBuilder = queryBuilder.eq('specialty', query.specialty);
        }

        if (query.availability) {
          queryBuilder = queryBuilder.contains('available_days', [query.availability]);
        }

        if (query.search) {
          const searchClean = query.search.trim();
          queryBuilder = queryBuilder.or(`name.ilike.%${searchClean}%,specialty.ilike.%${searchClean}%`);
        }

        if (query.sort) {
          switch (query.sort) {
            case 'name_asc':
              queryBuilder = queryBuilder.order('name', { ascending: true });
              break;
            case 'name_desc':
              queryBuilder = queryBuilder.order('name', { ascending: false });
              break;
            case 'rating_desc':
              queryBuilder = queryBuilder.order('rating', { ascending: false });
              break;
            case 'fee_asc':
              queryBuilder = queryBuilder.order('consultation_fee', { ascending: true });
              break;
            case 'fee_desc':
              queryBuilder = queryBuilder.order('consultation_fee', { ascending: false });
              break;
          }
        }

        // Always order by seed_index as stable secondary sorting to preserve index order
        queryBuilder = queryBuilder.order('seed_index', { ascending: true });

        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;
        queryBuilder = queryBuilder.range(start, end);

        const { data, count, error } = await queryBuilder;
        if (error || !data) {
          throw new AppError('UNKNOWN_FAILURE', `Failed to fetch doctors from Supabase: ${error?.message || 'Empty response'}`, error);
        }

        const totalCount = count || 0;
        const metadata = buildMetadata(totalCount, page, pageSize);
        const items = data.map(mapDbDoctor);

        return {
          items,
          metadata,
        };
      }

      const filtered: Doctor[] = [];
      for (let i = 0; i < TOTAL_DOCTORS; i++) {
        const item = getDoctorByIndex(i);

        if (query.specialty && item.specialty !== query.specialty) {
          continue;
        }

        if (query.availability && !item.availableDays.includes(query.availability)) {
          continue;
        }

        if (query.search) {
          const searchLower = query.search.toLowerCase();
          if (
            !item.name.toLowerCase().includes(searchLower) &&
            !item.specialty.toLowerCase().includes(searchLower)
          ) {
            continue;
          }
        }

        filtered.push(item);
      }

      // Sorting
      if (query.sort) {
        filtered.sort((a, b) => {
          switch (query.sort) {
            case 'name_asc':
              return a.name.localeCompare(b.name);
            case 'name_desc':
              return b.name.localeCompare(a.name);
            case 'rating_desc':
              return b.rating - a.rating;
            case 'fee_asc':
              return a.consultationFee - b.consultationFee;
            case 'fee_desc':
              return b.consultationFee - a.consultationFee;
            default:
              return 0;
          }
        });
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

  async getDoctorById(id: string): Promise<Doctor> {
    return apiClient.execute(`doctors/${id}`, async () => {
      const match = id.match(/^doc-(\d+)$/);
      if (!match) {
        throw new AppError('UNKNOWN_FAILURE', `Invalid doctor ID: ${id}`);
      }
      const index = parseInt(match[1], 10) - 1;
      if (index < 0 || index >= TOTAL_DOCTORS) {
        throw new AppError('UNKNOWN_FAILURE', `Doctor with ID ${id} not found.`);
      }

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('doctors')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          throw new AppError('UNKNOWN_FAILURE', `Doctor with ID ${id} not found from Supabase.`, error);
        }
        return mapDbDoctor(data);
      }

      return getDoctorByIndex(index);
    });
  },

  async getAvailableSlots(doctorId: string, dateStr: string): Promise<TimeSlot[]> {
    return apiClient.execute(`doctors/${doctorId}/slots?date=${dateStr}`, () => {
      const match = doctorId.match(/^doc-(\d+)$/);
      if (!match) {
        throw new AppError('UNKNOWN_FAILURE', `Invalid doctor ID: ${doctorId}`);
      }
      const index = parseInt(match[1], 10) - 1;
      if (index < 0 || index >= TOTAL_DOCTORS) {
        throw new AppError('UNKNOWN_FAILURE', `Doctor with ID ${doctorId} not found.`);
      }

      const slots: TimeSlot[] = [
        { time: '09:00 AM', isAvailable: true },
        { time: '10:00 AM', isAvailable: true },
        { time: '11:00 AM', isAvailable: true },
        { time: '12:00 PM', isAvailable: true },
        { time: '02:00 PM', isAvailable: true },
        { time: '03:00 PM', isAvailable: true },
        { time: '04:00 PM', isAvailable: true },
        { time: '05:00 PM', isAvailable: true },
      ];

      let hash = 0;
      const combined = doctorId + dateStr;
      for (let j = 0; j < combined.length; j++) {
        hash = combined.charCodeAt(j) + ((hash << 5) - hash);
      }

      return slots.map((slot, sIdx) => {
        const seedValue = hash + sIdx;
        const x = Math.sin(seedValue) * 10000;
        const isAvailable = x - Math.floor(x) > 0.45;
        return {
          time: slot.time,
          isAvailable,
        };
      });
    });
  },
};
