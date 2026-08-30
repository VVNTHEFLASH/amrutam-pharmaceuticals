import { doctorRepository } from '@/services/repositories/doctorRepository';
import type { useClientStore as useClientStoreType } from '@/store/clientStore';
import { Booking } from '@/types/domain';
import { AppError } from '@/types/errors';

let isSyncing = false;

// Get dynamic current time for validity checks
let customNowFn: (() => Date) | null = null;

export function getCurrentTime(): Date {
  if (customNowFn) {
    return customNowFn();
  }
  return new Date();
}

export function setCustomNowFn(fn: (() => Date) | null) {
  customNowFn = fn;
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
    if (pendingItems.length === 0) {
      console.log('[SyncService] no pending items, aborting sync');
      return;
    }

    isSyncing = true;
    console.log('[SyncService] sync locked');
    store.setSyncStatus('syncing');

    try {
      for (const booking of pendingItems) {
        const attempts = (booking.attempts || 0) + 1;
        store.updateBookingInQueue(booking.id, { attempts });

        try {
          // 1. Expiry Check
          const bookingDate = new Date(booking.dateTime);
          const now = getCurrentTime();
          if (bookingDate.getTime() < now.getTime()) {
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

          // Synchronize successfully
          store.updateBookingInQueue(booking.id, {
            status: 'synchronized',
            errorReason: undefined,
          });
        } catch (e: any) {
          const errMessage = e instanceof AppError ? e.message : String(e);

          if (e instanceof AppError && (e.code === 'NETWORK_FAILURE' || e.code === 'TIMEOUT')) {
            store.updateBookingInQueue(booking.id, {
              errorReason: errMessage,
            });
            // Stop syncing subsequent items on network failure to avoid spamming/loops
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
