import { DayOfWeek } from './domain';

export interface PaginatedQuery {
  page: number;
  pageSize: number;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  metadata: PaginationMetadata;
}

export interface DoctorQuery extends PaginatedQuery {
  search?: string;
  specialty?: string;
  availability?: DayOfWeek; // Day of the week
  sort?: 'name_asc' | 'name_desc' | 'rating_desc' | 'fee_asc' | 'fee_desc';
}

export interface ProductQuery extends PaginatedQuery {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: 'price_asc' | 'price_desc' | 'rating_desc' | 'name_asc';
}

export type HealthRecordType = 'Prescription' | 'Diagnostic Report' | 'Lab Result' | 'Immunization';

export interface HealthRecordQuery extends PaginatedQuery {
  search?: string;
  type?: HealthRecordType;
  tag?: string;
  year?: number;
  month?: number; // 1-12
  date?: string; // YYYY-MM-DD
}

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
}
