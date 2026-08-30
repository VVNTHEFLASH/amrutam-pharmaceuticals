import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { useClientStore } from '@/store/clientStore';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';
import { bookingSyncService } from '@/services/bookingSyncService';
import { userSyncService } from '@/services/userSyncService';

export function ConnectionBanner() {
  const isConnected = useClientStore((s) => s.isConnected);
  const syncStatus = useClientStore((s) => s.syncStatus);
  const bookingQueue = useClientStore((s) => s.bookingQueue || []);
  const wishlistQueue = useClientStore((s) => s.wishlistQueue || []);
  const cartQueue = useClientStore((s) => s.cartQueue || []);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const pendingBookings = bookingQueue.filter((b) => b.status === 'pending').length;
  const pendingWishlist = wishlistQueue.length;
  const pendingCart = cartQueue.length;
  const totalPending = pendingBookings + pendingWishlist + pendingCart;

  useEffect(() => {
    if (syncStatus === 'completed' && isConnected && totalPending === 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus, isConnected, totalPending]);

  const handleManualSync = async () => {
    if (!isConnected || isTriggering || syncStatus === 'syncing') return;
    setIsTriggering(true);
    try {
      await bookingSyncService.sync();
      await userSyncService.syncAll();
    } catch (err) {
      console.warn('Manual sync failed:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  let bg: string, textCol: string, status: string, desc: string, Icon: any;
  let showBtn = false, showLoader = false;

  if (!isConnected) {
    bg = theme.backgroundElement === '#F0F0F3' ? '#FFEBE9' : '#3D1B19';
    textCol = theme.text;
    status = 'Offline';
    desc = totalPending > 0
      ? `${totalPending} change${totalPending > 1 ? 's' : ''} waiting to sync when online.`
      : 'No internet connection. Using cached database offline.';
    Icon = WifiOff;
  } else if (syncStatus === 'syncing' || isTriggering) {
    bg = theme.backgroundElement === '#F0F0F3' ? '#EFFFEC' : '#1F341F';
    textCol = theme.text;
    status = 'Syncing...';
    desc = 'Synchronizing queue updates with remote Supabase servers...';
    showLoader = true;
  } else if (totalPending > 0) {
    bg = theme.backgroundElement === '#F0F0F3' ? '#FFF9E6' : '#3B301A';
    textCol = theme.text;
    status = 'Warning / Sync Failed';
    desc = `${totalPending} action${totalPending > 1 ? 's' : ''} pending sync. Tap retry to force merge.`;
    Icon = AlertTriangle;
    showBtn = true;
  } else if (showSuccess) {
    bg = '#2ECC71';
    textCol = '#FFFFFF';
    status = 'Connected';
    desc = 'All offline changes synchronized successfully!';
    Icon = CheckCircle2;
  } else {
    return null;
  }

  const paddingTop = Math.max(insets.top, Platform.OS === 'ios' ? 20 : 10);

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`Sync Status: ${status}. ${desc}`}
      style={[styles.banner, { paddingTop, backgroundColor: bg, borderBottomColor: theme.backgroundSelected }]}
    >
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            {Icon && <Icon size={16} color={textCol} style={styles.icon} />}
            {showLoader && <ActivityIndicator size="small" color={textCol} style={styles.icon} />}
            <ThemedText type="smallBold" style={[styles.statusText, { color: textCol }]}>
              {status}
            </ThemedText>
          </View>
          <ThemedText type="small" style={[styles.descText, { color: textCol }]}>
            {desc}
          </ThemedText>
        </View>

        {showBtn && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sync Now"
            disabled={isTriggering || syncStatus === 'syncing'}
            onPress={handleManualSync}
            style={[styles.btn, { backgroundColor: theme.backgroundSelected, opacity: isTriggering || syncStatus === 'syncing' ? 0.5 : 1 }]}
          >
            <RefreshCw size={14} color={theme.text} />
            <ThemedText type="smallBold" style={{ fontSize: 11, color: theme.text }}>Sync Now</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9000,
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }
    })
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textContainer: { flex: 1, marginRight: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  icon: { marginRight: Spacing.one },
  statusText: { fontSize: 13 },
  descText: { fontSize: 12, lineHeight: 16, opacity: 0.9 },
  btn: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: 6, gap: Spacing.one }
});