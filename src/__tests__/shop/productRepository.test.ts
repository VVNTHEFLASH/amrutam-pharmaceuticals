import { productRepository } from '../../services/repositories/productRepository';

describe('productRepository', () => {
  beforeEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  describe('getProducts', () => {
    it('should paginate items and metadata count correctly without materializing all 20,000 products', async () => {
      const result = await productRepository.getProducts({ page: 2, pageSize: 6 });
      expect(result.items).toHaveLength(6);
      expect(result.metadata.page).toBe(2);
      expect(result.metadata.pageSize).toBe(6);
      expect(result.metadata.totalCount).toBe(20000);
      expect(result.metadata.totalPages).toBe(3334);
    });

    it('should filter by search query name', async () => {
      const result = await productRepository.getProducts({ page: 1, search: 'Premium', pageSize: 5 });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach((p) => {
        const match = p.name.toLowerCase().includes('premium') || 
                      p.category.toLowerCase().includes('premium') ||
                      p.description.toLowerCase().includes('premium');
        expect(match).toBe(true);
      });
    });

    it('should filter by category properly', async () => {
      const result = await productRepository.getProducts({ page: 1, category: 'Hair Care', pageSize: 5 });
      result.items.forEach((p) => {
        expect(p.category).toBe('Hair Care');
      });
    });

    it('should filter by price range correctly', async () => {
      const result = await productRepository.getProducts({ page: 1, minPrice: 300, maxPrice: 600, pageSize: 10 });
      result.items.forEach((p) => {
        expect(p.price).toBeGreaterThanOrEqual(300);
        expect(p.price).toBeLessThanOrEqual(600);
      });
    });

    it('should filter by minimum rating correctly', async () => {
      const result = await productRepository.getProducts({ page: 1, minRating: 4.8, pageSize: 5 });
      result.items.forEach((p) => {
        expect(p.rating).toBeGreaterThanOrEqual(4.8);
      });
    });

    it('should sort products according to price ascending', async () => {
      const ascPrice = await productRepository.getProducts({ page: 1, sort: 'price_asc', pageSize: 10 });
      for (let i = 1; i < ascPrice.items.length; i++) {
        expect(ascPrice.items[i].price).toBeGreaterThanOrEqual(ascPrice.items[i - 1].price);
      }
    });

    it('should sort products according to price descending', async () => {
      const descPrice = await productRepository.getProducts({ page: 1, sort: 'price_desc', pageSize: 10 });
      for (let i = 1; i < descPrice.items.length; i++) {
        expect(descPrice.items[i].price).toBeLessThanOrEqual(descPrice.items[i - 1].price);
      }
    });
  });

  describe('getProductById', () => {
    it('should lookup a valid product by its ID', async () => {
      const prod = await productRepository.getProductById('prod-5');
      expect(prod.id).toBe('prod-5');
      expect(prod.name).toBeDefined();
    });

    it('should fail with boundary or format failures', async () => {
      await expect(productRepository.getProductById('prod-invalid')).rejects.toThrow();
      await expect(productRepository.getProductById('prod-999999')).rejects.toThrow();
    });
  });
});
