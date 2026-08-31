import { doctorRepository } from '@/services/repositories/doctorRepository';
import { bookingRepository } from '@/services/repositories/bookingRepository';
import type { useClientStore as useClientStoreType } from '@/store/clientStore';
import { Booking } from '@/types/domain';
import { AppError, getErrorMessage } from '@/types/errors';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { timeProvider } from '@/services/timeProvider';

let isSyncing = false;

// Proxy current time functions to the central timeProvider
export function getCurrentTime(): Date {
  return timeProvider.getCurrentTime();
}

export function setCustomNowFn(fn: (() => Date) | null) {
  timeProvider.setCustomNowFn(fn);
}

export const bookingSyncService = {
  getIsSyncing(): boolean {
    return isSyncing;
  },

  async sync(): Promise<void> {
    console.log(`[SyncService] sync() called. isSyncing=${isSyncing}`);
    if (isSyncing) {
      return;
    }

    const store = (
      require('@/store/clientStore').useClientStore as typeof useClientStoreType
    ).getState();
    if (!store.isConnected) {
      console.log('[SyncService] disconnected, aborting sync');
      return;
    }

    const pendingItems = store.bookingQueue.filter((b) => b.status === 'pending');
    console.log(`[SyncService] pending bookings: ${pendingItems.length}`);
    if (pendingItems.length === 0) {
      return;
    }

    isSyncing = true;
    console.log('[SyncService] sync locked');
    store.setSyncStatus('syncing');

    try {
      let activeUserId: string | undefined = undefined;
      if (isSupabaseConfigured && supabase?.auth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          activeUserId = session.user.id;
        }
      }

      for (const booking of pendingItems) {
        console.log(`[SyncService] processing booking: ${booking.id}`);
        console.log(`[SyncService] active user: ${activeUserId || 'none'}`);

        const attempts = (booking.attempts || 0) + 1;
        store.updateBookingInQueue(booking.id, { attempts });

        try {
          if (booking.mutationType === 'CANCEL') {
            if (isSupabaseConfigured) {
              if (!activeUserId) {
                console.warn(`[SyncService] No active user for cancel mutation of booking ${booking.id}`);
                continue;
              }
              if (booking.userId && booking.userId !== activeUserId) {
                console.error(`[SyncService] Cross-tenant isolation violation: cancel booking ${booking.id} belongs to user ${booking.userId}, but active user is ${activeUserId}`);
                continue;
              }
              await bookingRepository.deleteBooking(booking.id, activeUserId);
            }
            store.removeQueuedBooking(booking.id);
            continue;
          }

          // 1. Expiry Check
          const bookingDate = new Date(booking.dateTime);
          const now = timeProvider.getCurrentTime();
          if (bookingDate.getTime() < now.getTime()) {
            console.warn(`[SyncService] booking ${booking.id} expired. Slot time: ${bookingDate.toISOString()}, Check time: ${now.toISOString()}`);
            store.updateBookingInQueue(booking.id, {
              status: 'failed',
              errorReason: 'Selected slot has expired.',
            });
            continue;
          }

          // 2. Format slot date / time
          const year = bookingDate.getFullYear();
          const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
          const day = String(bookingDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          let hours = bookingDate.getHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const minutes = String(bookingDate.getMinutes()).padStart(2, '0');
          const slotTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

          // Double Booking protection
          const doubleBooked = store.bookingQueue.some(
            (b) =>
              b.id !== booking.id &&
              b.doctorId === booking.doctorId &&
              b.dateTime === booking.dateTime &&
              b.status === 'synchronized'
          );
          if (doubleBooked) {
            store.updateBookingInQueue(booking.id, {
              status: 'failed',
              errorReason: 'Slot already booked.',
            });
            continue;
          }

          // Fetch available slots from server
          const liveSlots = await doctorRepository.getAvailableSlots(booking.doctorId, dateStr);
          const slot = liveSlots.find((s) => s.time === slotTime);

          if (!slot || !slot.isAvailable) {
            store.updateBookingInQueue(booking.id, {
              status: 'failed',
              errorReason: 'Slot no longer available.',
            });
            continue;
          }

          let targetUserId = booking.userId;
          if (isSupabaseConfigured) {
            if (!activeUserId) {
              const errMsg = 'No authenticated user session found. Cannot sync booking.';
              console.error(`[SyncService] ${errMsg}`);
              store.updateBookingInQueue(booking.id, {
                errorReason: errMsg,
              });
              // Leave retryable
              continue;
            }
            if (!targetUserId) {
              targetUserId = activeUserId;
              store.updateBookingInQueue(booking.id, { userId: targetUserId });
              console.log(`[SyncService] Associated unowned booking ${booking.id} with active user ${targetUserId}`);
            } else if (targetUserId !== activeUserId) {
              const errMsg = `Cross-tenant isolation: booking ${booking.id} belongs to user ${targetUserId}, but active user is ${activeUserId}.`;
              console.error(`[SyncService] ${errMsg}`);
              store.updateBookingInQueue(booking.id, {
                status: 'failed',
                errorReason: errMsg,
              });
              continue;
            }
          }

          // Call the repository to save
          await bookingRepository.createBooking({
            ...booking,
            userId: targetUserId || 'guest',
            status: 'synchronized',
          }, targetUserId || 'guest');

          store.updateBookingInQueue(booking.id, {
            status: 'synchronized',
            errorReason: undefined,
          });

          console.log(`[SyncService] booking synchronized: ${booking.id}`);
        } catch (e: unknown) {
          const errMessage = getErrorMessage(e);
          console.error(`[BookingRepository] Supabase insert failed: ${errMessage}`);
          console.error(`[SyncService] booking remains retryable: ${booking.id}`);

          if (e instanceof AppError && (e.code === 'NETWORK_FAILURE' || e.code === 'TIMEOUT')) {
            store.updateBookingInQueue(booking.id, {
              errorReason: errMessage,
            });
            throw e;
          } else {
            store.updateBookingInQueue(booking.id, {
              status: 'failed',
              errorReason: errMessage,
            });
          }
        }
      }

      const updatedQueue = (
        require('@/store/clientStore').useClientStore as typeof useClientStoreType
      ).getState().bookingQueue;
      const hasFailed = updatedQueue.some((b) => b.status === 'failed');
      const hasPending = updatedQueue.some((b) => b.status === 'pending');

      if (hasPending) {
        store.setSyncStatus('failed');
      } else if (hasFailed) {
        store.setSyncStatus('failed');
      } else {
        store.setSyncStatus('completed');
      }
    } catch (err) {
      store.setSyncStatus('failed');
    } finally {
      isSyncing = false;
      console.log('[SyncService] sync unlocked');
    }
  },
};

let isCoordinatorSyncing = false;
let retryCount = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

if (typeof afterEach === 'function') {
  afterEach(() => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    retryCount = 0;
    isCoordinatorSyncing = false;
  });
}

export async function triggerSync(): Promise<void> {
  const store = (
    require('@/store/clientStore').useClientStore
  ).getState();

  // Cancel any scheduled retry timer since we are running a sync now
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  // Guard 1: Only run for authenticated users
  if (!store.userId) {
    console.log('[SyncCoordinator] No authenticated user active. Aborting auto-sync.');
    return;
  }

  // Guard 2: Must be connected
  if (!store.isConnected) {
    console.log('[SyncCoordinator] Device is offline. Aborting auto-sync.');
    return;
  }

  // Guard 2.5: Any pending items to sync?
  const pendingBookings = store.bookingQueue.filter((b: Booking) => b.status === 'pending').length;
  const pendingWishlist = store.wishlistQueue.length;
  const pendingCart = store.cartQueue.length;
  const totalPending = pendingBookings + pendingWishlist + pendingCart;

  if (totalPending === 0) {
    console.log('[SyncCoordinator] No pending items. Skipping synchronization.');
    return;
  }

  // Guard 3: Mutex protection to avoid concurrent runs
  if (isCoordinatorSyncing) {
    console.log('[SyncCoordinator] Sync already in progress, skipping trigger.');
    return;
  }

  isCoordinatorSyncing = true;
  console.log('[SyncCoordinator] Starting sequential auto-sync...');
  store.setSyncStatus('syncing');

  try {
    // 1. bookingSyncService.sync() must complete before userSyncService.syncAll()
    await bookingSyncService.sync();

    // 2. userSyncService.syncAll() runs next
    const { userSyncService } = require('@/services/userSyncService');
    await userSyncService.syncAll();

    console.log('[SyncCoordinator] Sequential auto-sync completed.');
  } catch (err) {
    console.error('[SyncCoordinator] Auto-sync encountered an error:', err);
  } finally {
    isCoordinatorSyncing = false;

    // Check if there are still items left in the queues that need to be synced
    const finalStore = (
      require('@/store/clientStore').useClientStore
    ).getState();

    const pendingBookings = finalStore.bookingQueue.filter((b: Booking) => b.status === 'pending').length;
    const pendingWishlist = finalStore.wishlistQueue.length;
    const pendingCart = finalStore.cartQueue.length;
    const totalPending = pendingBookings + pendingWishlist + pendingCart;

    // If there is any retryable error left in the queues, and we are connected, schedule auto-retry.
    if (totalPending > 0 && finalStore.isConnected) {
      finalStore.setSyncStatus('failed');

      if (retryCount < 3) {
        const delay = (retryCount + 1) * 10000; // 10s, 20s, 30s
        console.log(`[SyncCoordinator] Queues not empty (${totalPending} pending). Scheduling auto-retry in ${delay / 1000}s (Attempt ${retryCount + 1}/3)`);
        retryCount += 1;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          triggerSync().catch(console.error);
        }, delay);
      } else {
        console.warn('[SyncCoordinator] Max auto-retries reached. Waiting for next event trigger.');
      }
    } else {
      // Reset retry count on successful clear
      retryCount = 0;
      if (totalPending === 0) {
        finalStore.setSyncStatus('completed');
      }
    }
  }
}

