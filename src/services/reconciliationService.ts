import { wishlistRepository } from './repositories/wishlistRepository';
import { cartRepository } from './repositories/cartRepository';
import { bookingRepository } from './repositories/bookingRepository';
import type { useClientStore as useClientStoreType } from '@/store/clientStore';
import { CartItem, Booking } from '@/types/domain';

export const reconciliationService = {
  async reconcileUserData(userId: string): Promise<void> {
    const store = (
      require('@/store/clientStore').useClientStore as typeof useClientStoreType
    ).getState();

    // 1. Wishlist reconciliation
    const localWishlist = store.wishlist;
    const remoteWishlist = await wishlistRepository.getWishlist(userId);
    const mergedWishlistSet = new Set([...localWishlist, ...remoteWishlist]);
    const mergedWishlist = Array.from(mergedWishlistSet);

    // Push local-only wishlist items to remote
    for (const productId of localWishlist) {
      if (!remoteWishlist.includes(productId)) {
        await wishlistRepository.addToWishlist(userId, productId);
      }
    }

    // 2. Cart reconciliation
    const localCart = store.cart;
    const remoteCart = await cartRepository.getCart(userId);

    const mergedCartMap = new Map<string, CartItem>();

    // Add remote cart items
    for (const item of remoteCart) {
      mergedCartMap.set(item.productId, item);
    }

    // Merge local cart items
    for (const item of localCart) {
      const existing = mergedCartMap.get(item.productId);
      if (existing) {
        mergedCartMap.set(item.productId, {
          ...item,
          quantity: item.quantity + existing.quantity,
        });
      } else {
        mergedCartMap.set(item.productId, item);
      }
    }

    const mergedCart = Array.from(mergedCartMap.values());

    // Push merged cart items to remote
    for (const item of mergedCart) {
      await cartRepository.updateCartItem(userId, item.productId, item.quantity);
    }

    // 3. Bookings reconciliation
    const localBookings = store.bookingQueue;
    const remoteBookings = await bookingRepository.getBookings(userId);

    const mergedBookingsMap = new Map<string, Booking>();

    // Add remote bookings
    for (const b of remoteBookings) {
      mergedBookingsMap.set(b.id, b);
    }

    // Merge local bookings
    for (const b of localBookings) {
      if (b.userId && b.userId !== userId) {
        console.warn(`[Reconciliation] Discarding booking ${b.id} because it belongs to user ${b.userId} and current user is ${userId}`);
        continue;
      }
      const updatedLocalBooking = { ...b, userId: b.userId || userId };
      
      // If it exists in remote, keep the remote state (with potentially updated status)
      // Otherwise, keep the local one, allowing it to sync if pending
      if (!mergedBookingsMap.has(b.id)) {
        mergedBookingsMap.set(b.id, updatedLocalBooking);
      }
    }

    const mergedBookings = Array.from(mergedBookingsMap.values());

    const useClientStore = (
      require('@/store/clientStore').useClientStore as typeof useClientStoreType
    );
    useClientStore.setState({
      wishlist: mergedWishlist,
      cart: mergedCart,
      bookingQueue: mergedBookings,
    });
  },
};
