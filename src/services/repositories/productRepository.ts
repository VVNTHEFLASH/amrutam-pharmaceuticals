import { ProductQuery, PaginatedResult, PaginationMetadata } from '@/types/api';
import { Product } from '@/types/domain';
import { AppError } from '@/types/errors';

import { apiClient } from '../api/apiClient';
import { getProductByIndex, TOTAL_PRODUCTS } from '../mockData';

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

export const productRepository = {
  async getProducts(query: ProductQuery): Promise<PaginatedResult<Product>> {
    return apiClient.execute(`products?page=${query.page}`, () => {
      const page = query.page || 1;
      const pageSize = query.pageSize || 10;

      const filtered: Product[] = [];
      for (let i = 0; i < TOTAL_PRODUCTS; i++) {
        const item = getProductByIndex(i);

        if (query.category && item.category !== query.category) {
          continue;
        }

        if (query.minPrice !== undefined && item.price < query.minPrice) {
          continue;
        }

        if (query.maxPrice !== undefined && item.price > query.maxPrice) {
          continue;
        }

        if (query.minRating !== undefined && item.rating < query.minRating) {
          continue;
        }

        if (query.search) {
          const searchLower = query.search.toLowerCase();
          if (
            !item.name.toLowerCase().includes(searchLower) &&
            !item.category.toLowerCase().includes(searchLower) &&
            !item.description.toLowerCase().includes(searchLower)
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
            case 'price_asc':
              return a.price - b.price;
            case 'price_desc':
              return b.price - a.price;
            case 'rating_desc':
              return b.rating - a.rating;
            case 'name_asc':
              return a.name.localeCompare(b.name);
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

  async getProductById(id: string): Promise<Product> {
    return apiClient.execute(`products/${id}`, () => {
      const match = id.match(/^prod-(\d+)$/);
      if (!match) {
        throw new AppError('UNKNOWN_FAILURE', `Invalid product ID: ${id}`);
      }
      const index = parseInt(match[1], 10) - 1;
      if (index < 0 || index >= TOTAL_PRODUCTS) {
        throw new AppError('UNKNOWN_FAILURE', `Product with ID ${id} not found.`);
      }
      return getProductByIndex(index);
    });
  },
};
