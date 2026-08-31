import { supabase, isSupabaseConfigured } from './supabase';
import { wishlistRepository } from './repositories/wishlistRepository';
import { cartRepository } from './repositories/cartRepository';
import type { useClientStore as useClientStoreType } from '@/store/clientStore';
import { AppError } from '@/types/errors';

let isSyncing = false;

export const userSyncService = {
  getIsSyncing(): boolean {
    return isSyncing;
  },

  async syncAll(): Promise<void> {
    if (isSyncing) {
      return;
    }

    if (!isSupabaseConfigured) {
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return;
    }

    const userId = session.user.id;
    const useClientStore = (
      require('@/store/clientStore').useClientStore as typeof useClientStoreType
    );
    const store = useClientStore.getState();

    // Check connectivity
    if (!store.isConnected) {
      return;
    }

    isSyncing = true;
    store.setSyncStatus('syncing');

    try {
      // 1. Process Wishlist Queue
      const wishlistQueue = [...(store.wishlistQueue || [])];
      for (const item of wishlistQueue) {
        try {
          if (item.type === 'ADD') {
            await wishlistRepository.addToWishlist(userId, item.productId);
          } else if (item.type === 'REMOVE') {
            await wishlistRepository.removeFromWishlist(userId, item.productId);
          }
          // Remove from local queue
          useClientStore.setState({
            wishlistQueue: useClientStore.getState().wishlistQueue.filter((q) => q.id !== item.id),
          });
        } catch (e: unknown) {
          if (e instanceof AppError && (e.code === 'NETWORK_FAILURE' || e.code === 'TIMEOUT')) {
            throw e; // Pause execution and retry later
          }
          // Otherwise discard malformed or invalid items
          useClientStore.setState({
            wishlistQueue: useClientStore.getState().wishlistQueue.filter((q) => q.id !== item.id),
          });
        }
      }

      // 2. Process Cart Queue
      const cartQueue = [...(store.cartQueue || [])];
      for (const item of cartQueue) {
        try {
          if (item.type === 'ADD' || item.type === 'UPDATE') {
            await cartRepository.updateCartItem(userId, item.productId!, item.quantity!);
          } else if (item.type === 'REMOVE') {
            await cartRepository.removeCartItem(userId, item.productId!);
          } else if (item.type === 'CLEAR') {
            await cartRepository.clearCart(userId);
          }
          // Remove from local queue
          useClientStore.setState({
            cartQueue: useClientStore.getState().cartQueue.filter((q) => q.id !== item.id),
          });
        } catch (e: unknown) {
          if (e instanceof AppError && (e.code === 'NETWORK_FAILURE' || e.code === 'TIMEOUT')) {
            throw e; // Pause execution and retry later
          }
          // Otherwise discard malformed or invalid items
          useClientStore.setState({
            cartQueue: useClientStore.getState().cartQueue.filter((q) => q.id !== item.id),
          });
        }
      }

      store.setSyncStatus('completed');
    } catch (err) {
      store.setSyncStatus('failed');
    } finally {
      isSyncing = false;
    }
  },
};
