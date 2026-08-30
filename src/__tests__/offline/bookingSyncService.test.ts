import { bookingSyncService, setCustomNowFn } from '../../services/bookingSyncService';
import { doctorRepository } from '../../services/repositories/doctorRepository';
import { connectivityService } from '../../services/connectivity';
import { useClientStore } from '../../store/clientStore';
import { apiMockConfig } from '../../services/api/apiClient';

describe('bookingSyncService Queue synchronization system', () => {
  const originalGetAvailableSlots = doctorRepository.getAvailableSlots;

  beforeEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    useClientStore.getState().clearCart();
    useClientStore.getState().removeSyncedBookings();
    useClientStore.getState().bookingQueue.forEach((b) => {
      useClientStore.getState().removeQueuedBooking(b.id);
    });
    setCustomNowFn(() => new Date(2026, 7, 30, 10, 0));
    apiMockConfig.setMode('SUCCESS');
    apiMockConfig.setLatency(0);
    connectivityService.forceConnected(true);
  });

  afterEach(() => {
    doctorRepository.getAvailableSlots = originalGetAvailableSlots;
    setCustomNowFn(null);
  });

  it('should synchronize pending bookings successfully when online', async () => {
    connectivityService.forceConnected(false);
    const bId = 'sync-success-id';
    useClientStore.getState().enqueueBooking({
      id: bId,
      doctorId: 'doc-1',
      doctorName: 'Dr. Sharma',
      dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
      patientName: 'Vishnu',
      status: 'pending',
      createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
    });

    doctorRepository.getAvailableSlots = jest.fn().mockResolvedValue([{ time: '02:00 PM', isAvailable: true }]);
    connectivityService.forceConnected(true);
    await bookingSyncService.sync();

    expect(useClientStore.getState().bookingQueue.find((b) => b.id === bId)?.status).toBe('synchronized');
  });

  it('should mark booking failed and set reason if selected slot has expired', async () => {
    connectivityService.forceConnected(false);
    const bId = 'sync-expired-id';
    useClientStore.getState().enqueueBooking({
      id: bId,
      doctorId: 'doc-1',
      doctorName: 'Dr. Sharma',
      dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
      patientName: 'Vishnu',
      status: 'pending',
      createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
    });

    setCustomNowFn(() => new Date(2026, 7, 30, 15, 0));
    connectivityService.forceConnected(true);
    await bookingSyncService.sync();

    const item = useClientStore.getState().bookingQueue.find((b) => b.id === bId);
    expect(item?.status).toBe('failed');
    expect(item?.errorReason).toBe('Selected slot has expired.');
  });

  it('should mark booking failed if slot conflict occurs (slot unavailable)', async () => {
    connectivityService.forceConnected(false);
    const bId = 'sync-conflict-id';
    useClientStore.getState().enqueueBooking({
      id: bId,
      doctorId: 'doc-1',
      doctorName: 'Dr. Sharma',
      dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
      patientName: 'Vishnu',
      status: 'pending',
      createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
    });

    doctorRepository.getAvailableSlots = jest.fn().mockResolvedValue([{ time: '02:00 PM', isAvailable: false }]);
    connectivityService.forceConnected(true);
    await bookingSyncService.sync();

    const item = useClientStore.getState().bookingQueue.find((b) => b.id === bId);
    expect(item?.status).toBe('failed');
    expect(item?.errorReason).toBe('Slot no longer available.');
  });

  it('should reject a duplicate booking if slot has already been synchronized', async () => {
    connectivityService.forceConnected(false);
    useClientStore.getState().enqueueBooking({
      id: 'd1',
      doctorId: 'doc-1',
      doctorName: 'Dr. Sharma',
      dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
      patientName: 'Vishnu',
      status: 'synchronized',
      createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
    });
    useClientStore.getState().enqueueBooking({
      id: 'd2',
      doctorId: 'doc-1',
      doctorName: 'Dr. Sharma',
      dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
      patientName: 'Vishnu',
      status: 'pending',
      createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
    });

    doctorRepository.getAvailableSlots = jest.fn().mockResolvedValue([{ time: '02:00 PM', isAvailable: true }]);
    connectivityService.forceConnected(true);
    await bookingSyncService.sync();

    const item = useClientStore.getState().bookingQueue.find((b) => b.id === 'd2');
    expect(item?.status).toBe('failed');
    expect(item?.errorReason).toBe('Slot already booked.');
  });

  it('should keep booking pending and increment attempt counter on network failure', async () => {
    connectivityService.forceConnected(false);
    const bId = 'sync-retry-id';
    useClientStore.getState().enqueueBooking({
      id: bId,
      doctorId: 'doc-1',
      doctorName: 'Dr. Sharma',
      dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
      patientName: 'Vishnu',
      status: 'pending',
      createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
    });

    apiMockConfig.setMode('NETWORK_FAILURE');
    connectivityService.forceConnected(true);
    try {
      await bookingSyncService.sync();
    } catch (e) {}

    const item = useClientStore.getState().bookingQueue.find((b) => b.id === bId);
    expect(item?.status).toBe('pending');
    expect(item?.attempts).toBe(1);
  });

  it('should serialize executions using syncing flag concurrency lock', async () => {
    useClientStore.getState().enqueueBooking({
      id: 'conc-1',
      doctorId: 'doc-1',
      doctorName: 'Dr. Sharma',
      dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
      patientName: 'Vishnu',
      status: 'pending',
      createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
    });

    doctorRepository.getAvailableSlots = jest.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 60));
      return [{ time: '02:00 PM', isAvailable: true }];
    });

    const p1 = bookingSyncService.sync();
    const p2 = bookingSyncService.sync();

    expect(bookingSyncService.getIsSyncing()).toBe(true);
    await Promise.all([p1, p2]);
    expect(bookingSyncService.getIsSyncing()).toBe(false);
  });
});
