import { supabase, isSupabaseConfigured } from '../supabase';
import { AppError } from '@/types/errors';
import { Database } from '@/types/database';

interface WishlistItemDbRow {
  product_id: string;
}

export const wishlistRepository = {
  async getWishlist(userId: string): Promise<string[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabase
      .from('wishlist_items')
      .select('product_id')
      .eq('user_id', userId);

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to fetch wishlist from Supabase: ${error.message}`, error);
    }

    return ((data || []) as unknown as WishlistItemDbRow[]).map((row) => row.product_id);
  },

  async addToWishlist(userId: string, productId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from('wishlist_items')
      .upsert({
        user_id: userId,
        product_id: productId,
      }, { onConflict: 'user_id,product_id' });

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to add product to wishlist in Supabase: ${error.message}`, error);
    }
  },

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to remove product from wishlist in Supabase: ${error.message}`, error);
    }
  },
};
