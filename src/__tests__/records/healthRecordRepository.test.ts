import { healthRecordRepository } from '../../services/repositories/healthRecordRepository';

describe('healthRecordRepository', () => {
  beforeEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  describe('getHealthRecords', () => {
    it('should paginate items and metadata count correctly without loading all 10,000 records', async () => {
      const result = await healthRecordRepository.getHealthRecords({ page: 2, pageSize: 8 });
      expect(result.items).toHaveLength(8);
      expect(result.metadata.page).toBe(2);
      expect(result.metadata.pageSize).toBe(8);
      expect(result.metadata.totalCount).toBe(10000);
      expect(result.metadata.totalPages).toBe(1250);
    });

    it('should filter by search query (patientName, doctorName, diagnosis, treatment)', async () => {
      const result = await healthRecordRepository.getHealthRecords({ page: 1, search: 'Dr. Shruti Sharma', pageSize: 5 });
      if (result.items.length > 0) {
        result.items.forEach((item) => {
          const match = item.patientName.toLowerCase().includes('dr. shruti sharma') ||
                        item.doctorName.toLowerCase().includes('dr. shruti sharma') ||
                        item.diagnosis.toLowerCase().includes('dr. shruti sharma') ||
                        item.treatment.toLowerCase().includes('dr. shruti sharma');
          expect(match).toBe(true);
        });
      }
    });

    it('should filter by specific record category type', async () => {
      const result = await healthRecordRepository.getHealthRecords({ page: 1, type: 'Diagnostic Report', pageSize: 5 });
      result.items.forEach((item) => {
        expect(item.type).toBe('Diagnostic Report');
      });
    });

    it('should filter by record tags properly', async () => {
      const result = await healthRecordRepository.getHealthRecords({ page: 1, tag: 'Diabetes', pageSize: 5 });
      result.items.forEach((item) => {
        expect(item.tags).toContain('Diabetes');
      });
    });

    it('should filter by year and month correctly', async () => {
      const result = await healthRecordRepository.getHealthRecords({ page: 1, year: 2024, month: 5, pageSize: 5 });
      result.items.forEach((item) => {
        const [y, m] = item.date.split('-').map(Number);
        expect(y).toBe(2024);
        expect(m).toBe(5);
      });
    });

    it('should filter by exact date correctly', async () => {
      const result = await healthRecordRepository.getHealthRecords({ page: 1, date: '2025-06-15', pageSize: 5 });
      result.items.forEach((item) => {
        expect(item.date).toBe('2025-06-15');
      });
    });

    it('should maintain consistent metadata across pagination pages when filter is unchanged (prevent cache collision)', async () => {
      const page1 = await healthRecordRepository.getHealthRecords({ page: 1, pageSize: 5 });
      const totalCountRaw = page1.metadata.totalCount; // Should be 10000

      const typePage1 = await healthRecordRepository.getHealthRecords({ page: 1, type: 'Diagnostic Report', pageSize: 5 });
      const typeTotalCount = typePage1.metadata.totalCount;
      expect(typeTotalCount).toBeLessThan(totalCountRaw);

      const page1Again = await healthRecordRepository.getHealthRecords({ page: 1, pageSize: 5 });
      expect(page1Again.metadata.totalCount).toBe(totalCountRaw);

      const page2 = await healthRecordRepository.getHealthRecords({ page: 2, pageSize: 5 });
      expect(page2.metadata.totalCount).toBe(totalCountRaw);
    });
  });

  describe('getHealthRecordById', () => {
    it('should lookup a valid record by ID', async () => {
      const record = await healthRecordRepository.getHealthRecordById('rec-5');
      expect(record.id).toBe('rec-5');
      expect(record.patientName).toBeDefined();
    });

    it('should throw on out of bounds or format failures', async () => {
      await expect(healthRecordRepository.getHealthRecordById('rec-invalid')).rejects.toThrow();
      await expect(healthRecordRepository.getHealthRecordById('rec-99999')).rejects.toThrow();
    });
  });
});
