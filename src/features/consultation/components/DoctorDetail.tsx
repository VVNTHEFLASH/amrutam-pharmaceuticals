import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TimeSlot } from '@/types/api';
import { Booking, Doctor } from '@/types/domain';

import { isSlotExpired, parseSlotDateTime } from '../utils/dateUtils';

const DEFAULT_NOW = new Date(2026, 7, 30, 11, 0);

interface DoctorDetailProps {
  doctor: Doctor;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  slots: TimeSlot[];
  loadingSlots: boolean;
  slotsError: string | null;
  onBack: () => void;
  onBook: (doctor: Doctor, slotTime: string) => void;
  bookingQueue: Booking[];
  bookingMessage: string | null;
}

export function DoctorDetail({
  doctor,
  selectedDate,
  setSelectedDate,
  slots,
  loadingSlots,
  slotsError,
  onBack,
  onBook,
  bookingQueue,
  bookingMessage,
}: DoctorDetailProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <ThemedText type="linkPrimary">← Back to Doctors</ThemedText>
      </Pressable>

      <ThemedView type="backgroundElement" style={styles.detailCard}>
        <ThemedText type="subtitle">{doctor.name}</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          {doctor.specialty} • {doctor.experience} years exp
        </ThemedText>
        <ThemedText type="small">★ {doctor.rating} Rating</ThemedText>
        <ThemedText type="smallBold">Fee: ₹{doctor.consultationFee}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Available Days: {doctor.availableDays.join(', ')}
        </ThemedText>
      </ThemedView>

      <View style={styles.dateSelectorSection}>
        <ThemedText type="smallBold">Select Date (YYYY-MM-DD):</ThemedText>
        <TextInput
          style={styles.dateInput}
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="2026-08-30"
        />
      </View>

      <ThemedText type="smallBold" style={styles.slotsHeader}>
        Available Slots:
      </ThemedText>

      {loadingSlots ? (
        <ThemedText type="small">Loading schedules...</ThemedText>
      ) : slotsError ? (
        <ThemedText type="small" style={{ color: 'red' }}>
          {slotsError}
        </ThemedText>
      ) : (
        <ScrollView contentContainerStyle={styles.slotsGrid}>
          {slots.map((slot) => {
            const slotDate = parseSlotDateTime(selectedDate, slot.time);
            const isExpired = isSlotExpired(selectedDate, slot.time, DEFAULT_NOW);
            const isDirectlyBooked = bookingQueue.some(
              (b) =>
                b.doctorId === doctor.id &&
                b.dateTime === slotDate.toISOString() &&
                b.status !== 'failed'
            );

            let status: 'expired' | 'booked' | 'unavailable' | 'available' = 'available';
            if (isExpired) {
              status = 'expired';
            } else if (isDirectlyBooked) {
              status = 'booked';
            } else if (!slot.isAvailable) {
              status = 'unavailable';
            }

            const buttonColors = {
              available: '#208AEF',
              expired: '#FF4D4F',
              booked: '#3c87f7',
              unavailable: '#8c8c8c',
            };

            const buttonLabel = {
              available: 'Book',
              expired: 'Expired',
              booked: 'Booked',
              unavailable: 'Unavailable',
            };

            return (
              <View key={slot.time} style={styles.slotRow}>
                <ThemedText type="smallBold" style={styles.slotTimeText}>
                  {slot.time}
                </ThemedText>
                <Pressable
                  disabled={status !== 'available'}
                  onPress={() => onBook(doctor, slot.time)}
                  style={[
                    styles.bookButton,
                    {
                      backgroundColor: buttonColors[status],
                      opacity: status === 'available' ? 1 : 0.65,
                    },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: '#fff' }}>
                    {buttonLabel[status]}
                  </ThemedText>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}

      {bookingMessage && (
        <ThemedText type="small" style={styles.errorText}>
          {bookingMessage}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  backButton: { paddingVertical: Spacing.two, alignSelf: 'flex-start' },
  detailCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  dateSelectorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: Spacing.one,
    borderRadius: Spacing.one,
    width: 140,
    backgroundColor: '#fff',
    color: '#000',
  },
  slotsHeader: { marginBottom: Spacing.two },
  slotsGrid: { gap: Spacing.two },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  slotTimeText: { width: 100 },
  bookButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.one,
    minWidth: 120,
    alignItems: 'center',
  },
  errorText: { color: 'red', marginTop: Spacing.three, textAlign: 'center' },
});
