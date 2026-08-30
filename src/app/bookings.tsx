import React from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useConsultation } from '@/features/consultation/hooks/useConsultation';
import { useClientStore } from '@/store/clientStore';

const NOW = new Date(2026, 7, 30, 11, 0); // Sunday, Aug 30, 2026 at 11:00 AM

export default function BookingsScreen() {
  const bookingQueue = useClientStore((s) => s.bookingQueue);
  const { cancelBooking } = useConsultation();

  const handleCancel = (bookingId: string) => {
    try {
      cancelBooking(bookingId);
      const msg = 'Consultation cancelled successfully.';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Cancelled', msg);
      }
    } catch (e: any) {
      const errMsg = e?.message || 'Failed to cancel.';
      if (Platform.OS === 'web') {
        alert(errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    }
  };

  const renderBooking = ({ item }: { item: typeof bookingQueue[0] }) => {
    const bookingDate = new Date(item.dateTime);
    const isPast = bookingDate.getTime() < NOW.getTime();

    const badgeColors = {
      pending: '#faad14',
      synchronized: '#52c41a',
      failed: '#ff4d4f',
    };

    return (
      <ThemedView type="backgroundElement" style={s.card}>
        <View style={s.cardHeader}>
          <ThemedText type="default" style={{ fontWeight: '700' }}>
            {item.doctorName}
          </ThemedText>
          <View style={[s.statusBadge, { backgroundColor: badgeColors[item.status] || '#bfbfbf' }]}>
            <ThemedText type="code" style={s.badgeText}>
              {item.status.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          Patient: {item.patientName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Schedule: {bookingDate.toLocaleString()}
        </ThemedText>

        {!isPast && (
          <Pressable
            accessibilityLabel={`Cancel consultation with ${item.doctorName}`}
            onPress={() => handleCancel(item.id)}
            style={s.cancelBtn}>
            <ThemedText type="smallBold" style={s.cancelText}>
              Cancel Consultation
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
    );
  };

  return (
    <ThemedView style={s.container}>
      <SafeAreaView style={s.safe}>
        <ThemedText type="subtitle" style={s.title}>
          My Bookings
        </ThemedText>

        {bookingQueue.length === 0 ? (
          <View style={s.emptyContainer}>
            <ThemedText type="default">No upcoming consultations found.</ThemedText>
          </View>
        ) : (
          <FlatList
            data={bookingQueue}
            keyExtractor={(item) => item.id}
            renderItem={renderBooking}
            contentContainerStyle={s.listContent}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.four, justifyContent: 'center', flexDirection: 'row' },
  safe: { flex: 1, maxWidth: MaxContentWidth, paddingBottom: 0 },
  title: { marginVertical: Spacing.three },
  listContent: { gap: Spacing.three, paddingBottom: 96 },
  card: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.one },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Spacing.one },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cancelBtn: {
    backgroundColor: '#fff1f0',
    borderColor: '#ffbb96',
    borderWidth: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.one,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  cancelText: { color: '#ff4d4f' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
