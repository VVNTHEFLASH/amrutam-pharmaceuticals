import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { bookingSyncService } from '@/services/bookingSyncService';
import { connectivityService } from '@/services/connectivity';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { Booking, CartItem, Product } from '@/types/domain';
import { AppError } from '@/types/errors';

export interface WishlistQueueItem {
  id: string;
  type: 'ADD' | 'REMOVE';
  productId: string;
  attempts?: number;
}

export interface CartQueueItem {
  id: string;
  type: 'ADD' | 'REMOVE' | 'UPDATE' | 'CLEAR';
  productId?: string;
  quantity?: number;
  attempts?: number;
}

export interface ClientState {
  userId: string | null;
  cart: CartItem[];
  wishlist: string[]; // Array of product IDs
  bookingQueue: Booking[];
  isConnected: boolean;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'failed';
  wishlistQueue: WishlistQueueItem[];
  cartQueue: CartQueueItem[];
}

export interface ClientActions {
  // Cart Actions
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // Wishlist Actions
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (productId: string) => void;

  // Booking Actions
  enqueueBooking: (booking: Booking) => void;
  removeQueuedBooking: (bookingId: string) => void;
  markBookingSynced: (bookingId: string) => void;
  removeSyncedBookings: () => void;
  updateBookingInQueue: (bookingId: string, updates: Partial<Booking>) => void;

  // Connectivity Actions
  setConnected: (isConnected: boolean) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'completed' | 'failed') => void;
}

export type ClientStore = ClientState & ClientActions;

const queueWishlistMutation = (type: 'ADD' | 'REMOVE', productId: string) => {
  (async () => {
    if (isSupabaseConfigured && supabase?.auth?.getSession) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          useClientStore.setState((state) => ({
            wishlistQueue: [...(state.wishlistQueue || []), {
              id: `wl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              type,
              productId,
            }],
          }));
          const { triggerSync } = require('@/services/bookingSyncService');
          triggerSync().catch(console.error);
        }
      } catch (err) {
        // Safe catch
      }
    }
  })();
};

const queueCartMutation = (type: 'ADD' | 'REMOVE' | 'UPDATE' | 'CLEAR', productId?: string, quantity?: number) => {
  (async () => {
    if (isSupabaseConfigured && supabase?.auth?.getSession) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          useClientStore.setState((state) => ({
            cartQueue: [...(state.cartQueue || []), {
              id: `cart-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              type,
              productId,
              quantity,
            }],
          }));
          const { triggerSync } = require('@/services/bookingSyncService');
          triggerSync().catch(console.error);
        }
      } catch (err) {
        // Safe catch
      }
    }
  })();
};

export const useClientStore = create<ClientStore>()(
  persist(
    (set, get) => ({
      // Initial States
      userId: null,
      cart: [],
      wishlist: [],
      bookingQueue: [],
      isConnected: connectivityService.getIsConnected(),
      syncStatus: 'idle',
      wishlistQueue: [],
      cartQueue: [],

      // Cart Actions
      addToCart: (product, quantity = 1) => {
        if (!get().userId) {
          const { useToastStore, routerRegistry } = require('@/store/toastStore');
          useToastStore.getState().showToast('error', 'Login to add to cart', undefined, {
            label: 'Login',
            onPress: () => {
              routerRegistry.push('/profile');
            },
          });
          throw new AppError('UNAUTHORIZED', 'Login to add to cart');
        }
        return set((state) => {
          const existingItemIndex = state.cart.findIndex((item) => item.productId === product.id);
          if (existingItemIndex > -1) {
            const finalQty = state.cart[existingItemIndex].quantity + quantity;
            const updatedCart = [...state.cart];
            updatedCart[existingItemIndex] = {
              ...updatedCart[existingItemIndex],
              quantity: finalQty,
            };
            queueCartMutation('ADD', product.id, finalQty);
            return { cart: updatedCart };
          }
          queueCartMutation('ADD', product.id, quantity);
          return {
            cart: [...state.cart, { productId: product.id, product, quantity }],
          };
        });
      },

      updateCartQuantity: (productId, quantity) => {
        if (!get().userId) {
          const { useToastStore, routerRegistry } = require('@/store/toastStore');
          useToastStore.getState().showToast('error', 'Login to add to cart', undefined, {
            label: 'Login',
            onPress: () => {
              routerRegistry.push('/profile');
            },
          });
          throw new AppError('UNAUTHORIZED', 'Login to add to cart');
        }
        return set((state) => {
          if (quantity <= 0) {
            queueCartMutation('REMOVE', productId);
            return {
              cart: state.cart.filter((item) => item.productId !== productId),
            };
          }
          queueCartMutation('UPDATE', productId, quantity);
          return {
            cart: state.cart.map((item) =>
              item.productId === productId ? { ...item, quantity } : item
            ),
          };
        });
      },

      removeFromCart: (productId) => {
        if (!get().userId) {
          const { useToastStore, routerRegistry } = require('@/store/toastStore');
          useToastStore.getState().showToast('error', 'Login to add to cart', undefined, {
            label: 'Login',
            onPress: () => {
              routerRegistry.push('/profile');
            },
          });
          throw new AppError('UNAUTHORIZED', 'Login to add to cart');
        }
        return set((state) => {
          queueCartMutation('REMOVE', productId);
          return {
            cart: state.cart.filter((item) => item.productId !== productId),
          };
        });
      },

      clearCart: () => {
        if (!get().userId) {
          const { useToastStore, routerRegistry } = require('@/store/toastStore');
          useToastStore.getState().showToast('error', 'Login to add to cart', undefined, {
            label: 'Login',
            onPress: () => {
              routerRegistry.push('/profile');
            },
          });
          throw new AppError('UNAUTHORIZED', 'Login to add to cart');
        }
        return set((state) => {
          queueCartMutation('CLEAR');
          return { cart: [] };
        });
      },

      // Wishlist Actions
      addToWishlist: (productId) =>
        set((state) => {
          if (state.wishlist.includes(productId)) {
            return state;
          }
          queueWishlistMutation('ADD', productId);
          return { wishlist: [...state.wishlist, productId] };
        }),

      removeFromWishlist: (productId) =>
        set((state) => {
          queueWishlistMutation('REMOVE', productId);
          return {
            wishlist: state.wishlist.filter((id) => id !== productId),
          };
        }),

      toggleWishlist: (productId) =>
        set((state) => {
          const exists = state.wishlist.includes(productId);
          queueWishlistMutation(exists ? 'REMOVE' : 'ADD', productId);
          return {
            wishlist: exists
              ? state.wishlist.filter((id) => id !== productId)
              : [...state.wishlist, productId],
          };
        }),

      // Booking Actions
      enqueueBooking: (booking) =>
        set((state) => ({
          bookingQueue: [...state.bookingQueue, booking],
        })),

      removeQueuedBooking: (bookingId) =>
        set((state) => ({
          bookingQueue: state.bookingQueue.filter((booking) => booking.id !== bookingId),
        })),

      markBookingSynced: (bookingId) =>
        set((state) => ({
          bookingQueue: state.bookingQueue.map((booking) =>
            booking.id === bookingId ? { ...booking, status: 'synchronized' } : booking
          ),
        })),

      removeSyncedBookings: () =>
        set((state) => ({
          bookingQueue: state.bookingQueue.filter((booking) => booking.status !== 'synchronized'),
        })),

      updateBookingInQueue: (bookingId, updates) =>
        set((state) => ({
          bookingQueue: state.bookingQueue.map((booking) =>
            booking.id === bookingId ? { ...booking, ...updates } : booking
          ),
        })),

      // Connectivity Actions
      setConnected: (isConnected) => set({ isConnected }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
    }),
    {
      name: 'amrutam-client-store',
      storage: createJSONStorage(() => {
        const isSSR = Platform.OS === 'web' && typeof window === 'undefined';
        if (isSSR) {
          return {
            getItem: async () => null,
            setItem: async () => {},
            removeItem: async () => {},
          };
        }
        return AsyncStorage;
      }),
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
        bookingQueue: state.bookingQueue,
        wishlistQueue: state.wishlistQueue,
        cartQueue: state.cartQueue,
      }),
    }
  )
);

// Subscribe the store status directly to the connectivity service changes
connectivityService.subscribe((isConnected) => {
  const store = useClientStore.getState();
  const wasConnected = store.isConnected;
  store.setConnected(isConnected);

  if (isConnected && !wasConnected) {
    const { triggerSync } = require('@/services/bookingSyncService');
    triggerSync().catch(console.error);
  }
});
