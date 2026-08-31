import { ProductQuery, PaginatedResult, PaginationMetadata } from '@/types/api';
import { Product } from '@/types/domain';
import { AppError } from '@/types/errors';
import { Database } from '@/types/database';

import { apiClient } from '../api/apiClient';
import { getProductByIndex, TOTAL_PRODUCTS } from '../mockData';
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

type ProductRow = Database['public']['Tables']['products']['Row'];

function mapDbProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    description: row.description,
    imageUrl: row.image_url,
    rating: Number(row.rating),
    stock: row.stock,
  };
}

export const productRepository = {
  async getProducts(query: ProductQuery): Promise<PaginatedResult<Product>> {
    const parts = [
      `page=${query.page || 1}`,
      `pageSize=${query.pageSize || 10}`,
      query.search ? `search=${encodeURIComponent(query.search.trim())}` : '',
      query.category ? `category=${encodeURIComponent(query.category)}` : '',
      query.minPrice !== undefined ? `minPrice=${query.minPrice}` : '',
      query.maxPrice !== undefined ? `maxPrice=${query.maxPrice}` : '',
      query.minRating !== undefined ? `minRating=${query.minRating}` : '',
      query.sort ? `sort=${query.sort}` : '',
    ].filter(Boolean).sort().join('&');
    const cacheKey = `products?${parts}`;

    return apiClient.execute(cacheKey, async () => {
      const page = query.page || 1;
      const pageSize = query.pageSize || 10;

      if (isSupabaseConfigured) {
        let queryBuilder = supabase.from('products').select('*', { count: 'exact' });

        if (query.category) {
          queryBuilder = queryBuilder.eq('category', query.category);
        }

        if (query.minPrice !== undefined) {
          queryBuilder = queryBuilder.gte('price', query.minPrice);
        }

        if (query.maxPrice !== undefined) {
          queryBuilder = queryBuilder.lte('price', query.maxPrice);
        }

        if (query.minRating !== undefined) {
          queryBuilder = queryBuilder.gte('rating', query.minRating);
        }

        if (query.search) {
          const searchClean = query.search.trim();
          queryBuilder = queryBuilder.or(`name.ilike.%${searchClean}%,category.ilike.%${searchClean}%,description.ilike.%${searchClean}%`);
        }

        if (query.sort) {
          switch (query.sort) {
            case 'price_asc':
              queryBuilder = queryBuilder.order('price', { ascending: true });
              break;
            case 'price_desc':
              queryBuilder = queryBuilder.order('price', { ascending: false });
              break;
            case 'rating_desc':
              queryBuilder = queryBuilder.order('rating', { ascending: false });
              break;
            case 'name_asc':
              queryBuilder = queryBuilder.order('name', { ascending: true });
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
          throw new AppError('UNKNOWN_FAILURE', `Failed to fetch products from Supabase: ${error?.message || 'Empty response'}`, error);
        }

        const totalCount = count || 0;
        const metadata = buildMetadata(totalCount, page, pageSize);
        const items = data.map(mapDbProduct);

        return {
          items,
          metadata,
        };
      }

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
    return apiClient.execute(`products/${id}`, async () => {
      const match = id.match(/^prod-(\d+)$/);
      if (!match) {
        throw new AppError('UNKNOWN_FAILURE', `Invalid product ID: ${id}`);
      }
      const index = parseInt(match[1], 10) - 1;
      if (index < 0 || index >= TOTAL_PRODUCTS) {
        throw new AppError('UNKNOWN_FAILURE', `Product with ID ${id} not found.`);
      }

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          throw new AppError('UNKNOWN_FAILURE', `Product with ID ${id} not found from Supabase.`, error);
        }
        return mapDbProduct(data);
      }

      return getProductByIndex(index);
    });
  },
};
