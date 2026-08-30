import { supabase, isSupabaseConfigured } from '../supabase';
import { Booking } from '@/types/domain';
import { AppError } from '@/types/errors';

function mapDbBooking(row: any): Booking {
  return {
    id: row.id,
    userId: row.user_id,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    dateTime: row.date_time,
    patientName: row.patient_name,
    notes: row.notes || undefined,
    status: row.status as Booking['status'],
    createdAt: row.created_at,
  };
}

export const bookingRepository = {
  async createBooking(booking: Booking, userId: string): Promise<Booking> {
    if (!isSupabaseConfigured) {
      return { ...booking, userId, status: 'synchronized' };
    }

    const { data, error } = await supabase
      .from('bookings')
      .upsert({
        id: booking.id,
        user_id: userId,
        doctor_id: booking.doctorId,
        doctor_name: booking.doctorName,
        date_time: booking.dateTime,
        patient_name: booking.patientName,
        notes: booking.notes || null,
        status: booking.status,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to create booking in Supabase: ${error.message}`, error);
    }

    return mapDbBooking(data);
  },

  async getBookings(userId: string): Promise<Booking[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('date_time', { ascending: false });

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to fetch bookings from Supabase: ${error.message}`, error);
    }

    return (data || []).map(mapDbBooking);
  },

  async deleteBooking(bookingId: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('user_id', userId);

    if (error) {
      throw new AppError('UNKNOWN_FAILURE', `Failed to delete booking in Supabase: ${error.message}`, error);
    }
  },
};
