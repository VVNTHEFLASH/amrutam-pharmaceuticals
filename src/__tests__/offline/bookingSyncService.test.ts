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
    useClientStore.setState({
      cart: [],
      wishlist: [],
      bookingQueue: [],
      wishlistQueue: [],
      cartQueue: [],
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
    while (bookingSyncService.getIsSyncing()) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

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

  describe('Phase 3B Verification Tests', () => {
    let originalIsSupabaseConfigured: boolean;
    const supabaseModule = require('../../services/supabase');
    const { timeProvider } = require('../../services/timeProvider');
    const { bookingRepository } = require('../../services/repositories/bookingRepository');

    beforeAll(() => {
      originalIsSupabaseConfigured = supabaseModule.isSupabaseConfigured;
    });

    afterAll(() => {
      Object.defineProperty(supabaseModule, 'isSupabaseConfigured', {
        value: originalIsSupabaseConfigured,
      });
    });

    beforeEach(() => {
      Object.defineProperty(supabaseModule, 'isSupabaseConfigured', {
        value: true,
        writable: true,
        configurable: true
      });
      if (!supabaseModule.supabase) {
        Object.defineProperty(supabaseModule, 'supabase', {
          value: {},
          writable: true,
          configurable: true
        });
      }

      // Mock auth
      supabaseModule.supabase.auth = {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-b' } } },
          error: null,
        }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } }
        }),
      };

      // Mock database query builder
      const mockQuery: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockQuery.then = (onfulfilled: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled);
      supabaseModule.supabase.from = jest.fn().mockReturnValue(mockQuery);

      // Mock bookingRepository methods
      bookingRepository.createBooking = jest.fn().mockImplementation(async (booking, userId) => {
        return { ...booking, userId, status: 'synchronized' };
      });
    });

    it('Test A — Real production clock: Should use actual current time by default', () => {
      timeProvider.setCustomNowFn(null);
      const systemNow = new Date();
      const providerNow = timeProvider.getCurrentTime();
      expect(Math.abs(providerNow.getTime() - systemNow.getTime())).toBeLessThan(100);
    });

    it('Test B — Injected test clock: Verify appointment expiration behavior deterministically', async () => {
      timeProvider.setCustomNowFn(() => new Date(2026, 7, 30, 11, 0));
      expect(timeProvider.getCurrentTime().toISOString()).toBe(new Date(2026, 7, 30, 11, 0).toISOString());
    });

    it('Test C — Successful booking persistence: Should update status to synchronized on repository success', async () => {
      const bId = 'persist-success';
      useClientStore.getState().enqueueBooking({
        id: bId,
        doctorId: 'doc-1',
        doctorName: 'Dr. Sharma',
        dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
        patientName: 'Vishnu',
        status: 'pending',
        createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
        userId: 'user-b',
      });

      doctorRepository.getAvailableSlots = jest.fn().mockResolvedValue([{ time: '02:00 PM', isAvailable: true }]);
      await bookingSyncService.sync();

      expect(bookingRepository.createBooking).toHaveBeenCalled();
      const item = useClientStore.getState().bookingQueue.find((b) => b.id === bId);
      expect(item?.status).toBe('synchronized');
    });

    it('Test D — Supabase failure: Should mark booking failed and keep retryable/failed with errorReason', async () => {
      const bId = 'persist-fail';
      useClientStore.getState().enqueueBooking({
        id: bId,
        doctorId: 'doc-1',
        doctorName: 'Dr. Sharma',
        dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
        patientName: 'Vishnu',
        status: 'pending',
        createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
        userId: 'user-b',
      });

      bookingRepository.createBooking = jest.fn().mockRejectedValue(new Error('Supabase RLS Error'));
      doctorRepository.getAvailableSlots = jest.fn().mockResolvedValue([{ time: '02:00 PM', isAvailable: true }]);

      await bookingSyncService.sync();

      const item = useClientStore.getState().bookingQueue.find((b) => b.id === bId);
      expect(item?.status).toBe('failed');
      expect(item?.errorReason).toContain('Supabase RLS Error');
    });

    it('Test E — Missing user: Assert booking cannot be synchronized without an authenticated user', async () => {
      const bId = 'persist-missing-user';
      useClientStore.getState().enqueueBooking({
        id: bId,
        doctorId: 'doc-1',
        doctorName: 'Dr. Sharma',
        dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
        patientName: 'Vishnu',
        status: 'pending',
        createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
      });

      supabaseModule.supabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      });

      doctorRepository.getAvailableSlots = jest.fn().mockResolvedValue([{ time: '02:00 PM', isAvailable: true }]);
      await bookingSyncService.sync();

      const item = useClientStore.getState().bookingQueue.find((b) => b.id === bId);
      expect(item?.status).toBe('pending');
    });

    it('Test F — Cross-user booking: Assert repository is not called and booking state is not reassigned', async () => {
      const bId = 'persist-cross-user';
      useClientStore.getState().enqueueBooking({
        id: bId,
        doctorId: 'doc-1',
        doctorName: 'Dr. Sharma',
        dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
        patientName: 'Vishnu',
        status: 'pending',
        createdAt: new Date(2026, 7, 30, 11, 0).toISOString(),
        userId: 'user-a',
      });

      supabaseModule.supabase.auth.getSession = jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-b' } } },
        error: null,
      });

      doctorRepository.getAvailableSlots = jest.fn().mockResolvedValue([{ time: '02:00 PM', isAvailable: true }]);
      bookingRepository.createBooking = jest.fn();

      await bookingSyncService.sync();

      expect(bookingRepository.createBooking).not.toHaveBeenCalled();
      const item = useClientStore.getState().bookingQueue.find((b) => b.id === bId);
      expect(item?.status).toBe('failed');
      expect(item?.errorReason).toContain('Cross-tenant isolation');
    });

    it('Test G — User switching: Assert User A states are not exposed to User B on session change', async () => {
      useClientStore.getState().enqueueBooking({
        id: 'u-a-booking',
        doctorId: 'doc-1',
        doctorName: 'Dr. Sharma',
        dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
        userId: 'user-a',
        status: 'pending',
        patientName: 'Vishnu',
        createdAt: new Date().toISOString(),
      });
      const mockProduct = {
        id: 'prod-1',
        name: 'Product 1',
        price: 250,
        imageUrl: '',
        category: 'wellness',
        rating: 4.5,
        stock: 10,
        description: 'Mock Description',
      };
      useClientStore.getState().addToCart(mockProduct, 2);

      const { reconciliationService } = require('../../services/reconciliationService');
      await reconciliationService.reconcileUserData('user-b');

      const queue = useClientStore.getState().bookingQueue;
      expect(queue.find(b => b.id === 'u-a-booking')).toBeUndefined();
    });

    it('Test H — Auto-sync: Verify bookSlot queues and triggers background sync without blocking', async () => {
      useClientStore.getState().bookingQueue = [];
      const mockSync = jest.fn().mockResolvedValue(undefined);
      bookingSyncService.sync = mockSync;

      const doctor = { id: 'doc-1', name: 'Dr. Sharma', specialty: 'General', fee: 100, rating: 4.5, isAvailable: true, imageUrl: '' };

      const hookResults: any[] = [];
      const TestComponent = () => {
        const results = require('../../features/consultation/hooks/useConsultation').useConsultation();
        hookResults.push(results);
        return null;
      };

      const React = require('react');
      const renderer = require('react-test-renderer');
      const { AuthProvider: RealAuthProvider } = require('../../context/AuthContext');
      
      doctorRepository.getAvailableSlots = jest.fn().mockResolvedValue([{ time: '02:00 PM', isAvailable: true }]);

      await renderer.act(async () => {
        renderer.create(
          React.createElement(RealAuthProvider, {}, React.createElement(TestComponent))
        );
      });

      const { bookSlot } = hookResults[hookResults.length - 1];

      await renderer.act(async () => {
        await bookSlot(doctor, '2026-08-30', '02:00 PM');
      });

      expect(useClientStore.getState().bookingQueue.length).toBe(1);
      expect(mockSync).toHaveBeenCalledTimes(1);
    });
  });
});
