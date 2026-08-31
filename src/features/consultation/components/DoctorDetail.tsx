import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TimeSlot } from '@/types/api';
import { Booking, Doctor } from '@/types/domain';
import { useTheme } from '@/hooks/use-theme';

import { isSlotExpired, parseSlotDateTime } from '../utils/dateUtils';
import { timeProvider } from '@/services/timeProvider';


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
  const theme = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getPickerDate = () => {
    if (!selectedDate) return new Date(2026, 7, 30);
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (!y || !m || !d) return new Date(2026, 7, 30);
    return new Date(y, m - 1, d);
  };

  const handleDateSelect = (event: DateTimePickerChangeEvent, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;
      setSelectedDate(formatted);
    }
  };

  const handleDateDismiss = () => {
    setShowDatePicker(false);
  };

  const handleResetDate = () => {
    setSelectedDate('2026-08-30');
  };

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
        <ThemedText type="smallBold" style={{ color: theme.text }}>
          Booking Date:
        </ThemedText>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={selectedDate}
            min="2026-08-30"
            onChange={(e) => {
              const val = e.target.value;
              if (val >= '2026-08-30') {
                setSelectedDate(val);
              } else {
                setSelectedDate('2026-08-30');
              }
            }}
            style={{
              padding: 8,
              borderRadius: 4,
              border: `1px solid ${theme.backgroundSelected}`,
              backgroundColor: theme.backgroundElement,
              color: theme.text,
              fontFamily: 'Poppins_500Medium',
              fontSize: 14,
              height: 38,
              outline: 'none',
            }}
          />
        ) : (
          <Pressable
            style={[
              styles.dateBtn,
              { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
            ]}
            onPress={() => setShowDatePicker(true)}
            accessibilityLabel="Select booking date"
          >
            <CalendarDays size={16} color={theme.text} style={{ marginRight: 8 }} />
            <ThemedText type="smallBold" themeColor={selectedDate ? 'text' : 'textSecondary'}>
              {selectedDate ? selectedDate : 'Select Date'}
            </ThemedText>
          </Pressable>
        )}

        {selectedDate && selectedDate !== '2026-08-30' && (
          <Pressable
            style={[styles.resetBtn, { backgroundColor: '#FF4D4F' }]}
            onPress={handleResetDate}
            accessibilityLabel="Reset date"
          >
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Reset
            </ThemedText>
          </Pressable>
        )}

        {showDatePicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={getPickerDate()}
            mode="date"
            display="default"
            minimumDate={new Date(2026, 7, 30)}
            onValueChange={handleDateSelect}
            onDismiss={handleDateDismiss}
            onNeutralButtonPress={handleDateDismiss}
          />
        )}
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
            const isExpired = isSlotExpired(selectedDate, slot.time, timeProvider.getCurrentTime());
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
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.time} slot on ${selectedDate} is ${status}`}
                  accessibilityState={{ disabled: status !== 'available' }}
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
    flexWrap: 'wrap',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
  },
  resetBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.one,
    marginLeft: 8,
  },
  slotsHeader: { marginBottom: Spacing.two },
  slotsGrid: { gap: Spacing.two, paddingBottom: 96 },
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
