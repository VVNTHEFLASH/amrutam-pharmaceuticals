import { useCallback, useEffect, useState } from 'react';

import { doctorRepository } from '@/services/repositories/doctorRepository';
import { useClientStore } from '@/store/clientStore';
import { DoctorQuery, TimeSlot } from '@/types/api';
import { Doctor } from '@/types/domain';
import { AppError } from '@/types/errors';

import { isSlotExpired, parseSlotDateTime } from '../utils/dateUtils';

const NOW = new Date(2026, 7, 30, 11, 0); // Sunday, Aug 30, 2026 at 11:00 AM

export function useConsultation() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState({ totalCount: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    page: 1,
    search: '',
    specialty: '',
    availability: '',
    sort: 'rating_desc' as 'name_asc' | 'name_desc' | 'rating_desc' | 'fee_asc' | 'fee_desc',
  });

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('2026-08-30');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const bookingQueue = useClientStore((state) => state.bookingQueue);
  const enqueueBooking = useClientStore((state) => state.enqueueBooking);
  const removeQueuedBooking = useClientStore((state) => state.removeQueuedBooking);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setError(null);
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
        q.availability = filters.availability;
      }

      const result = await doctorRepository.getDoctors(q);
      setDoctors(result.items);
      setPages({
        totalCount: result.metadata.totalCount,
        totalPages: result.metadata.totalPages,
      });
    } catch (e: any) {
      setError(e instanceof AppError ? e.message : 'Error loading doctors.');
    } finally {
      setLoading(false);
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
    } catch (e: any) {
      setSlotsError(e instanceof AppError ? e.message : 'Error loading slots.');
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
      if (isSlotExpired(dateStr, slotTime, NOW)) {
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
      } catch (err: any) {
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
        doctorId: doctor.id,
        doctorName: doctor.name,
        dateTime: slotDate.toISOString(),
        patientName: 'Vishnu Sowmiya',
        status: 'pending',
        createdAt: NOW.toISOString(),
      });

      try {
        await fetchDoctorSlots(doctor.id, dateStr);
      } catch (err) {
        // Silent catch for offline refresh failures
      }
    },
    [bookingQueue, enqueueBooking, fetchDoctorSlots]
  );

  const cancelBooking = useCallback(
    (bookingId: string) => {
      const booking = bookingQueue.find((b) => b.id === bookingId);
      if (!booking) {
        throw new AppError('UNKNOWN_FAILURE', 'Booking not found.');
      }
      if (new Date(booking.dateTime).getTime() < NOW.getTime()) {
        throw new AppError('UNKNOWN_FAILURE', 'Cannot cancel expired consultations.');
      }
      removeQueuedBooking(bookingId);
    },
    [bookingQueue, removeQueuedBooking]
  );

  return {
    doctors,
    loading,
    error,
    ...pages,
    ...filters,
    setFilters: (update: Partial<typeof filters>) =>
      setFilters((prev) => ({ ...prev, ...update })),
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
