import { doctorRepository } from '../../services/repositories/doctorRepository';
import { productRepository } from '../../services/repositories/productRepository';
import { healthRecordRepository } from '../../services/repositories/healthRecordRepository';
import { isSupabaseConfigured, supabase } from '../../services/supabase';
import { apiClient } from '../../services/api/apiClient';

// Mock the supabase module
jest.mock('../../services/supabase', () => {
  const actual = jest.requireActual('../../services/supabase');
  return {
    ...actual,
    isSupabaseConfigured: true,
    supabase: {
      from: jest.fn(),
    },
  };
});

describe('Supabase Repository Integration Tests', () => {
  let mockQueryChain: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up a mock query chain builder that returns itself for chaining
    mockQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQueryChain);
  });

  describe('Doctor Repository (Supabase Mode)', () => {
    it('should query doctors with specialty and availability filters correctly', async () => {
      mockQueryChain.range.mockResolvedValue({
        data: [
          {
            id: 'doc-1',
            seed_index: 0,
            name: 'Dr. Aarav Sharma',
            specialty: 'Ayurvedic Specialist',
            image_url: 'https://example.com/doc-1.jpg',
            rating: 4.8,
            experience: 15,
            consultation_fee: 500,
            available_days: ['Monday', 'Wednesday'],
          },
        ],
        count: 1,
        error: null,
      });

      const result = await doctorRepository.getDoctors({
        page: 1,
        pageSize: 5,
        specialty: 'Ayurvedic Specialist',
        availability: 'Monday',
      });

      expect(supabase.from).toHaveBeenCalledWith('doctors');
      expect(mockQueryChain.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(mockQueryChain.eq).toHaveBeenCalledWith('specialty', 'Ayurvedic Specialist');
      expect(mockQueryChain.contains).toHaveBeenCalledWith('available_days', ['Monday']);
      expect(mockQueryChain.order).toHaveBeenCalledWith('seed_index', { ascending: true });
      expect(mockQueryChain.range).toHaveBeenCalledWith(0, 4);

      expect(result.items[0]).toEqual({
        id: 'doc-1',
        name: 'Dr. Aarav Sharma',
        specialty: 'Ayurvedic Specialist',
        imageUrl: 'https://example.com/doc-1.jpg',
        rating: 4.8,
        experience: 15,
        consultationFee: 500,
        availableDays: ['Monday', 'Wednesday'],
      });
    });

    it('should query single doctor by ID correctly', async () => {
      mockQueryChain.single.mockResolvedValue({
        data: {
          id: 'doc-1',
          seed_index: 0,
          name: 'Dr. Aarav Sharma',
          specialty: 'Ayurvedic Specialist',
          image_url: 'https://example.com/doc-1.jpg',
          rating: 4.8,
          experience: 15,
          consultation_fee: 500,
          available_days: ['Monday', 'Wednesday'],
        },
        error: null,
      });

      const doc = await doctorRepository.getDoctorById('doc-1');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'doc-1');
      expect(doc.imageUrl).toBe('https://example.com/doc-1.jpg');
      expect(doc.consultationFee).toBe(500);
    });
  });

  describe('Product Repository (Supabase Mode)', () => {
    it('should query products with category and price filters correctly', async () => {
      mockQueryChain.range.mockResolvedValue({
        data: [
          {
            id: 'prod-1',
            seed_index: 0,
            name: 'Amrutam Herbal Churn',
            category: 'Ayurvedic Medicine',
            price: 299,
            description: 'Premium Churn',
            image_url: 'https://example.com/prod-1.jpg',
            rating: 4.5,
            stock: 20,
          },
        ],
        count: 1,
        error: null,
      });

      const result = await productRepository.getProducts({
        page: 2,
        pageSize: 10,
        category: 'Ayurvedic Medicine',
        minPrice: 100,
        maxPrice: 500,
      });

      expect(supabase.from).toHaveBeenCalledWith('products');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('category', 'Ayurvedic Medicine');
      expect(mockQueryChain.gte).toHaveBeenCalledWith('price', 100);
      expect(mockQueryChain.lte).toHaveBeenCalledWith('price', 500);
      expect(mockQueryChain.range).toHaveBeenCalledWith(10, 19);
      expect(result.items[0].imageUrl).toBe('https://example.com/prod-1.jpg');
    });
  });

  describe('Health Record Repository (Supabase Mode)', () => {
    it('should query health records with date range filters correctly', async () => {
      mockQueryChain.range.mockResolvedValue({
        data: [
          {
            id: 'rec-1',
            seed_index: 0,
            patient_name: 'Aarav Sharma',
            doctor_name: 'Dr. Neha Mehta',
            date: '2024-05-15',
            diagnosis: 'Dermatitis',
            treatment: 'Topical cream',
            prescription: 'Cream Hydrocortisone',
            attachment_url: 'https://example.com/rec-1.pdf',
            type: 'Prescription',
            tags: ['Ayurveda'],
          },
        ],
        count: 1,
        error: null,
      });

      await healthRecordRepository.getHealthRecords({
        page: 1,
        pageSize: 5,
        year: 2024,
        month: 5,
      });

      expect(supabase.from).toHaveBeenCalledWith('health_records');
      expect(mockQueryChain.gte).toHaveBeenCalledWith('date', '2024-05-01');
      expect(mockQueryChain.lte).toHaveBeenCalledWith('date', '2024-05-31');
      expect(mockQueryChain.range).toHaveBeenCalledWith(0, 4);
    });

    it('should query health records with tag filter correctly', async () => {
      mockQueryChain.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      await healthRecordRepository.getHealthRecords({
        page: 1,
        pageSize: 5,
        tag: 'Dermatology',
      });

      expect(mockQueryChain.contains).toHaveBeenCalledWith('tags', ['Dermatology']);
    });

    it('should query health records with month-only filter and construct dynamic ranges', async () => {
      mockQueryChain.range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      });

      // Stub limit resolve values
      mockQueryChain.limit.mockResolvedValue({
        data: [{ date: '2025-01-01' }],
        error: null,
      });

      await healthRecordRepository.getHealthRecords({
        page: 1,
        pageSize: 5,
        month: 8,
      });

      expect(mockQueryChain.or).toHaveBeenCalled();
    });
  });

  describe('Cache Key Isolation / Mappings', () => {
    it('should correctly build unique cache keys for different search/filter query parameters', async () => {
      const executeSpy = jest.spyOn(apiClient, 'execute');

      mockQueryChain.range.mockResolvedValue({ data: [], count: 0, error: null });

      await productRepository.getProducts({ page: 1, pageSize: 5, category: 'Homeopathy' });
      await productRepository.getProducts({ page: 1, pageSize: 5, category: 'Personal Care' });

      expect(executeSpy).toHaveBeenCalledTimes(2);
      const call1 = executeSpy.mock.calls[0][0];
      const call2 = executeSpy.mock.calls[1][0];
      expect(call1).not.toBe(call2);
      expect(call1).toContain('category=Homeopathy');
      expect(call2).toContain('category=Personal%20Care');

      executeSpy.mockRestore();
    });
  });
});
