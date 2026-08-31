import { supabase, isSupabaseConfigured } from '../supabase';
import { CartItem, Product } from '@/types/domain';
import { AppError } from '@/types/errors';
import { Database } from '@/types/database';

type ProductRow = Database['public']['Tables']['products']['Row'];

interface CartItemDbRow {
  product_id: string;
  quantity: number;
  product: ProductRow | null;
}

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

export const cartRepository = {
  async getOrCreateCart(userId: string): Promise<string> {
    if (!isSupabaseConfigured) {
      return 'mock-cart-id';
    }

    // Attempt to select the cart
    const { data: existingCart, error: selectError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to query cart: ${selectError.message}`, selectError);
    }

    if (existingCart) {
      return existingCart.id;
    }

    // Try to create it
    const { data: newCart, error: insertError } = await supabase
      .from('carts')
      .insert({ user_id: userId })
      .select('id')
      .single();

    if (insertError) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to create cart: ${insertError.message}`, insertError);
    }

    return newCart.id;
  },

  async getCart(userId: string): Promise<CartItem[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (cartError) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to fetch cart: ${cartError.message}`, cartError);
    }

    if (!cart) {
      return [];
    }

    const { data: items, error: itemsError } = await supabase
      .from('cart_items')
      .select('product_id, quantity, product:products(*)')
      .eq('cart_id', cart.id);

    if (itemsError) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to fetch cart items: ${itemsError.message}`, itemsError);
    }

    return ((items || []) as unknown as CartItemDbRow[])
      .filter((row) => row.product !== null)
      .map((row) => ({
        productId: row.product_id,
        quantity: row.quantity,
        product: mapDbProduct(row.product!),
      }));
  },

  async updateCartItem(userId: string, productId: string, quantity: number): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    if (quantity <= 0) {
      await this.removeCartItem(userId, productId);
      return;
    }

    const cartId = await this.getOrCreateCart(userId);

    const { error } = await supabase
      .from('cart_items')
      .upsert({
        cart_id: cartId,
        product_id: productId,
        quantity,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'cart_id,product_id' });

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to update cart item in Supabase: ${error.message}`, error);
    }
  },

  async removeCartItem(userId: string, productId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!cart) {
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id)
      .eq('product_id', productId);

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to remove cart item from Supabase: ${error.message}`, error);
    }
  },

  async clearCart(userId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    const { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!cart) {
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to clear cart: ${error.message}`, error);
    }
  },
};
