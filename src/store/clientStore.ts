import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { connectivityService } from '@/services/connectivity';
import { Booking, CartItem, Product } from '@/types/domain';

export interface ClientState {
  cart: CartItem[];
  wishlist: string[]; // Array of product IDs
  bookingQueue: Booking[];
  isConnected: boolean;
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

  // Connectivity Actions
  setConnected: (isConnected: boolean) => void;
}

export type ClientStore = ClientState & ClientActions;

export const useClientStore = create<ClientStore>()(
  persist(
    (set) => ({
      // Initial States
      cart: [],
      wishlist: [],
      bookingQueue: [],
      isConnected: connectivityService.getIsConnected(),

      // Cart Actions
      addToCart: (product, quantity = 1) =>
        set((state) => {
          const existingItemIndex = state.cart.findIndex((item) => item.productId === product.id);
          if (existingItemIndex > -1) {
            const updatedCart = [...state.cart];
            updatedCart[existingItemIndex] = {
              ...updatedCart[existingItemIndex],
              quantity: updatedCart[existingItemIndex].quantity + quantity,
            };
            return { cart: updatedCart };
          }
          return {
            cart: [...state.cart, { productId: product.id, product, quantity }],
          };
        }),

      updateCartQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              cart: state.cart.filter((item) => item.productId !== productId),
            };
          }
          return {
            cart: state.cart.map((item) =>
              item.productId === productId ? { ...item, quantity } : item
            ),
          };
        }),

      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.productId !== productId),
        })),

      clearCart: () => set({ cart: [] }),

      // Wishlist Actions
      addToWishlist: (productId) =>
        set((state) => {
          if (state.wishlist.includes(productId)) {
            return state;
          }
          return { wishlist: [...state.wishlist, productId] };
        }),

      removeFromWishlist: (productId) =>
        set((state) => ({
          wishlist: state.wishlist.filter((id) => id !== productId),
        })),

      toggleWishlist: (productId) =>
        set((state) => {
          const exists = state.wishlist.includes(productId);
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

      // Connectivity Actions
      setConnected: (isConnected) => set({ isConnected }),
    }),
    {
      name: 'amrutam-client-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
        bookingQueue: state.bookingQueue,
      }),
    }
  )
);

// Subscribe the store status directly to the connectivity service changes
connectivityService.subscribe((isConnected) => {
  useClientStore.getState().setConnected(isConnected);
});
