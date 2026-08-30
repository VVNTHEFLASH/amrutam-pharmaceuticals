import React from 'react';
import { FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useConsultation } from '@/features/consultation/hooks/useConsultation';
import { useClientStore } from '@/store/clientStore';
import { useToastStore } from '@/store/toastStore';
import { useAuth } from '@/context/AuthContext';

const NOW = new Date(2026, 7, 30, 11, 0); // Sunday, Aug 30, 2026 at 11:00 AM

export default function BookingsScreen() {
  const { isAuthenticated } = useAuth();
  const bookingQueue = useClientStore((s) => s.bookingQueue);
  const { cancelBooking } = useConsultation();
  const showToast = useToastStore((s) => s.showToast);

  const handleCancel = (bookingId: string) => {
    try {
      cancelBooking(bookingId);
      showToast('success', 'Consultation cancelled successfully.');
    } catch (e: any) {
      const errMsg = e?.message || 'Failed to cancel.';
      showToast('error', errMsg);
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

  if (!isAuthenticated) {
    return (
      <ThemedView style={s.container}>
        <SafeAreaView style={s.safe}>
          <ThemedText type="subtitle" style={s.title}>
            My Bookings
          </ThemedText>
          <View style={s.emptyContainer}>
            <ThemedText type="default" style={{ marginBottom: Spacing.three }}>
              Login to view bookings
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Login to view bookings"
              onPress={() => router.push('/profile')}
              style={s.loginBtn}
            >
              <ThemedText type="smallBold" style={s.loginBtnText}>
                Login
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

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
  container: { flex: 1, paddingHorizontal: Spacing.three, justifyContent: 'center', flexDirection: 'row' },
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
  loginBtn: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#fff',
  },
});
