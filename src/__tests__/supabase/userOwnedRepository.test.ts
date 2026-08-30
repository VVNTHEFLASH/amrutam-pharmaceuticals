import { bookingRepository } from '../../services/repositories/bookingRepository';
import { wishlistRepository } from '../../services/repositories/wishlistRepository';
import { cartRepository } from '../../services/repositories/cartRepository';
import { supabase } from '../../services/supabase';

// Mock supabase module
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

describe('User Owned Repository Supabase Integration Tests', () => {
  let mockQueryChain: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQueryChain);
  });

  describe('Booking Repository', () => {
    it('should insert a booking correctly', async () => {
      const mockBooking = {
        id: 'book-1',
        doctorId: 'doc-1',
        doctorName: 'Dr. Sharma',
        dateTime: '2026-08-30T10:00:00.000Z',
        patientName: 'John Doe',
        status: 'pending' as const,
        createdAt: '2026-08-30T10:00:00.000Z',
      };

      mockQueryChain.single.mockResolvedValue({
        data: {
          id: 'book-1',
          user_id: 'user-123',
          doctor_id: 'doc-1',
          doctor_name: 'Dr. Sharma',
          date_time: '2026-08-30T10:00:00.000Z',
          patient_name: 'John Doe',
          notes: null,
          status: 'pending',
          created_at: '2026-08-30T10:00:00.000Z',
        },
        error: null,
      });

      const res = await bookingRepository.createBooking(mockBooking, 'user-123');

      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(mockQueryChain.upsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'book-1',
        user_id: 'user-123',
        doctor_id: 'doc-1',
        status: 'pending',
      }));
      expect(res.id).toBe('book-1');
      expect(res.userId).toBe('user-123');
    });

    it('should delete a booking correctly', async () => {
      mockQueryChain.delete.mockReturnThis();
      mockQueryChain.eq.mockReturnThis();

      await bookingRepository.deleteBooking('book-1', 'user-123');

      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(mockQueryChain.delete).toHaveBeenCalled();
      expect(mockQueryChain.eq).toHaveBeenCalledWith('id', 'book-1');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });

  describe('Wishlist Repository', () => {
    it('should get wishlist item ids correctly', async () => {
      mockQueryChain.eq.mockResolvedValue({
        data: [{ product_id: 'prod-1' }, { product_id: 'prod-2' }],
        error: null,
      });

      const ids = await wishlistRepository.getWishlist('user-123');

      expect(supabase.from).toHaveBeenCalledWith('wishlist_items');
      expect(mockQueryChain.select).toHaveBeenCalledWith('product_id');
      expect(mockQueryChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(ids).toEqual(['prod-1', 'prod-2']);
    });

    it('should add item to wishlist correctly', async () => {
      mockQueryChain.upsert.mockResolvedValue({ error: null });

      await wishlistRepository.addToWishlist('user-123', 'prod-1');

      expect(supabase.from).toHaveBeenCalledWith('wishlist_items');
      expect(mockQueryChain.upsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        product_id: 'prod-1',
      }, { onConflict: 'user_id,product_id' });
    });

    it('should remove item from wishlist correctly', async () => {
      mockQueryChain.delete.mockReturnThis();
      mockQueryChain.eq.mockReturnThis();

      await wishlistRepository.removeFromWishlist('user-123', 'prod-1');

      expect(supabase.from).toHaveBeenCalledWith('wishlist_items');
      expect(mockQueryChain.delete).toHaveBeenCalled();
    });
  });

  describe('Cart Repository', () => {
    it('should get cart items correctly', async () => {
      mockQueryChain.maybeSingle.mockResolvedValue({
        data: { id: 'cart-456' },
        error: null,
      });

      const mockItemsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            {
              product_id: 'prod-1',
              quantity: 2,
              product: {
                id: 'prod-1',
                name: 'Chyawanprash',
                category: 'Ayurveda',
                price: 350,
                description: 'Test description',
                image_url: 'image.jpg',
                rating: 4.8,
                stock: 50,
              },
            },
          ],
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'carts') return mockQueryChain;
        return mockItemsChain;
      });

      const cartItems = await cartRepository.getCart('user-123');

      expect(supabase.from).toHaveBeenCalledWith('carts');
      expect(mockQueryChain.select).toHaveBeenCalledWith('id');
      expect(cartItems[0].productId).toBe('prod-1');
      expect(cartItems[0].quantity).toBe(2);
      expect(cartItems[0].product.name).toBe('Chyawanprash');
    });

    it('should clear cart correctly', async () => {
      mockQueryChain.maybeSingle.mockResolvedValue({
        data: { id: 'cart-456' },
        error: null,
      });

      const mockDeleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'carts') return mockQueryChain;
        return mockDeleteChain;
      });

      await cartRepository.clearCart('user-123');

      expect(supabase.from).toHaveBeenCalledWith('carts');
    });
  });
});
