import { doctorRepository } from '@/services/repositories/doctorRepository';
import { bookingRepository } from '@/services/repositories/bookingRepository';
import type { useClientStore as useClientStoreType } from '@/store/clientStore';
import { Booking } from '@/types/domain';
import { AppError } from '@/types/errors';
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
        } catch (e: any) {
          const errMessage = e instanceof AppError ? e.message : String(e);
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
