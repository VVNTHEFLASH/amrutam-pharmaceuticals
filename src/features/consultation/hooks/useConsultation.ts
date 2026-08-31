import { useCallback, useEffect, useState } from 'react';

import { doctorRepository } from '@/services/repositories/doctorRepository';
import { useClientStore } from '@/store/clientStore';
import { DoctorQuery, TimeSlot } from '@/types/api';
import { Doctor, DayOfWeek } from '@/types/domain';
import { AppError, getErrorMessage } from '@/types/errors';
import { useAuth } from '@/context/AuthContext';
import { bookingSyncService, triggerSync } from '@/services/bookingSyncService';
import { timeProvider } from '@/services/timeProvider';

import { isSlotExpired, parseSlotDateTime } from '../utils/dateUtils';

export function useConsultation() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState({ totalCount: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    page: 1,
    search: '',
    specialty: '',
    availability: '' as DayOfWeek | '',
    sort: 'rating_desc' as 'name_asc' | 'name_desc' | 'rating_desc' | 'fee_asc' | 'fee_desc',
  });

  const [queryIdRef] = useState(() => ({ current: 0 }));

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('2026-08-30');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const { user } = useAuth();
  const bookingQueue = useClientStore((state) => state.bookingQueue);
  const enqueueBooking = useClientStore((state) => state.enqueueBooking);
  const removeQueuedBooking = useClientStore((state) => state.removeQueuedBooking);
  const updateBookingInQueue = useClientStore((state) => state.updateBookingInQueue);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setDoctors([]); // Clear list immediately on fetch to prevent showing stale results
    setError(null);
    const queryId = ++queryIdRef.current;

    try {
      const q: DoctorQuery = {
        page: filters.page,
        pageSize: 10,
        sort: filters.sort,
      };
      if (filters.search.trim()) {
        q.search = filters.search.trim();
      }
      if (filters.specialty) {
        q.specialty = filters.specialty;
      }
      if (filters.availability) {
        q.availability = filters.availability as DayOfWeek;
      }

      const result = await doctorRepository.getDoctors(q);
      if (queryId !== queryIdRef.current) return;

      setDoctors(result.items);
      setPages({
        totalCount: result.metadata.totalCount,
        totalPages: result.metadata.totalPages,
      });
    } catch (e: unknown) {
      if (queryId === queryIdRef.current) {
        setError(getErrorMessage(e, 'Error loading doctors.'));
      }
    } finally {
      if (queryId === queryIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const fetchDoctorSlots = useCallback(async (docId: string, dateStr: string) => {
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const liveSlots = await doctorRepository.getAvailableSlots(docId, dateStr);
      setSlots(liveSlots);
    } catch (e: unknown) {
      setSlotsError(getErrorMessage(e, 'Error loading slots.'));
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      fetchDoctorSlots(selectedDoctor.id, selectedDate);
    }
  }, [selectedDoctor, selectedDate, fetchDoctorSlots]);

  const bookSlot = useCallback(
    async (doctor: Doctor, dateStr: string, slotTime: string) => {
      if (!user) {
        const { useToastStore, routerRegistry } = require('@/store/toastStore');
        useToastStore.getState().showToast('error', 'Login to book', undefined, {
          label: 'Login',
          onPress: () => {
            routerRegistry.push('/profile');
          },
        });
        throw new AppError('UNAUTHORIZED', 'Login to book');
      }

      const list = [
        '09:00 AM',
        '10:00 AM',
        '11:00 AM',
        '12:00 PM',
        '02:00 PM',
        '03:00 PM',
        '04:00 PM',
        '05:00 PM',
      ];
      if (!list.includes(slotTime)) {
        throw new AppError('UNKNOWN_FAILURE', 'Invalid slot time.');
      }

      const slotDate = parseSlotDateTime(dateStr, slotTime);
      const currentNow = timeProvider.getCurrentTime();
      if (isSlotExpired(dateStr, slotTime, currentNow)) {
        throw new AppError('UNKNOWN_FAILURE', 'Selected slot has expired.');
      }

      const double = bookingQueue.some(
        (b) =>
          b.doctorId === doctor.id &&
          b.dateTime === slotDate.toISOString() &&
          b.status !== 'failed'
      );
      if (double) {
        throw new AppError('BOOKING_CONFLICT', 'You already booked this slot.');
      }

      let ms = null;
      try {
        const liveSlots = await doctorRepository.getAvailableSlots(doctor.id, dateStr);
        ms = liveSlots.find((s) => s.time === slotTime);
      } catch (err: unknown) {
        // Bypassing network or timeout errors while offline
        if (err instanceof AppError && (err.code === 'NETWORK_FAILURE' || err.code === 'TIMEOUT')) {
          // Serves offline queueing
        } else {
          throw err;
        }
      }

      if (ms && !ms.isAvailable) {
        throw new AppError('BOOKING_CONFLICT', 'Slot no longer available.');
      }

      enqueueBooking({
        id: `book-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user?.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        dateTime: slotDate.toISOString(),
        patientName: 'Vishnu Sowmiya',
        status: 'pending',
        createdAt: currentNow.toISOString(),
      });

      // Background synchronization
      triggerSync().catch((err) => {
        console.error('[useConsultation] Background sync failed:', err);
      });

      try {
        await fetchDoctorSlots(doctor.id, dateStr);
      } catch (err) {
        // Silent catch for offline refresh failures
      }
    },
    [bookingQueue, enqueueBooking, fetchDoctorSlots, user]
  );

  const cancelBooking = useCallback(
    (bookingId: string) => {
      const booking = bookingQueue.find((b) => b.id === bookingId);
      if (!booking) {
        throw new AppError('UNKNOWN_FAILURE', 'Booking not found.');
      }
      const currentNow = timeProvider.getCurrentTime();
      if (new Date(booking.dateTime).getTime() < currentNow.getTime()) {
        throw new AppError('UNKNOWN_FAILURE', 'Cannot cancel expired consultations.');
      }
      if (booking.userId) {
        if (booking.status === 'synchronized') {
          updateBookingInQueue(bookingId, { status: 'pending', mutationType: 'CANCEL' });
          triggerSync().catch(console.error);
        } else {
          removeQueuedBooking(bookingId);
        }
      } else {
        removeQueuedBooking(bookingId);
      }
    },
    [bookingQueue, removeQueuedBooking, updateBookingInQueue]
  );

  return {
    doctors,
    loading,
    error,
    ...pages,
    ...filters,
    setFilters: (update: Partial<typeof filters>) =>
      setFilters((prev) => {
        const next = { ...prev, ...update };
        const hasFilterChange =
          update.search !== undefined ||
          update.specialty !== undefined ||
          update.availability !== undefined ||
          update.sort !== undefined;
        if (hasFilterChange && update.page === undefined) {
          next.page = 1;
        }
        return next;
      }),
    retryDoctors: fetchDoctors,
    selectedDoctor,
    selectedDate,
    slots,
    loadingSlots,
    slotsError,
    setSelectedDoctor,
    setSelectedDate,
    bookSlot,
    cancelBooking,
    refreshSlots: () => selectedDoctor && fetchDoctorSlots(selectedDoctor.id, selectedDate),
  };
}
