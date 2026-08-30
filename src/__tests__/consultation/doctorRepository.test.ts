import { doctorRepository } from '../../services/repositories/doctorRepository';

describe('doctorRepository', () => {
  beforeEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  describe('getDoctors', () => {
    it('should paginate items and metadata count correctly', async () => {
      const result = await doctorRepository.getDoctors({ page: 1, pageSize: 5 });
      expect(result.items).toHaveLength(5);
      expect(result.metadata.page).toBe(1);
      expect(result.metadata.pageSize).toBe(5);
      expect(result.metadata.totalCount).toBe(5000);
      expect(result.metadata.totalPages).toBe(1000);
    });

    it('should handle specialties filtering properly', async () => {
      const result = await doctorRepository.getDoctors({ page: 1, specialty: 'Dermatologist', pageSize: 10 });
      result.items.forEach((doc) => {
        expect(doc.specialty).toBe('Dermatologist');
      });
    });

    it('should handle sorting modes of fee ascending', async () => {
      const ascFee = await doctorRepository.getDoctors({ page: 1, sort: 'fee_asc', pageSize: 5 });
      for (let i = 1; i < ascFee.items.length; i++) {
        expect(ascFee.items[i].consultationFee).toBeGreaterThanOrEqual(ascFee.items[i - 1].consultationFee);
      }
    });

    it('should handle sorting modes of rating descending', async () => {
      const descRating = await doctorRepository.getDoctors({ page: 1, sort: 'rating_desc', pageSize: 5 });
      for (let i = 1; i < descRating.items.length; i++) {
        expect(descRating.items[i].rating).toBeLessThanOrEqual(descRating.items[i - 1].rating);
      }
    });
  });

  describe('getDoctorById', () => {
    it('should lookup a valid doctor profile correctly', async () => {
      const doc = await doctorRepository.getDoctorById('doc-4');
      expect(doc.id).toBe('doc-4');
      expect(doc.name).toBeDefined();
    });

    it('should throw an error on invalid doctor ID schema or out of bounds', async () => {
      await expect(doctorRepository.getDoctorById('doc-invalid')).rejects.toThrow();
      await expect(doctorRepository.getDoctorById('doc-99999')).rejects.toThrow();
    });
  });
});
