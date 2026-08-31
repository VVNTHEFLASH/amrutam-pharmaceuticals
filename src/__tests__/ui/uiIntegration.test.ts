import { productRepository } from '../../services/repositories/productRepository';
import { doctorRepository } from '../../services/repositories/doctorRepository';
import { healthRecordRepository } from '../../services/repositories/healthRecordRepository';
import { useClientStore } from '../../store/clientStore';
import { useShop } from '../../features/shop/hooks/useShop';
import { useConsultation } from '../../features/consultation/hooks/useConsultation';
import { useRecords } from '../../features/records/hooks/useRecords';
import { timeProvider } from '../../services/timeProvider';

jest.mock('../../services/repositories/productRepository');
jest.mock('../../services/repositories/doctorRepository');
jest.mock('../../services/repositories/healthRecordRepository');

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' }, isAuthenticated: true }),
}));

const mockStoreState = {
  bookingQueue: [] as any[],
  enqueueBooking: jest.fn((booking) => {
    mockStoreState.bookingQueue.push(booking);
  }),
  removeQueuedBooking: jest.fn(),
  updateBookingInQueue: jest.fn(),
};

jest.mock('../../store/clientStore', () => {
  const mockUseStore = (selector: any) => selector(mockStoreState);
  mockUseStore.getState = () => mockStoreState;
  mockUseStore.setState = (updates: any) => {
    Object.assign(mockStoreState, updates);
  };
  return {
    useClientStore: mockUseStore,
  };
});

let mockEffectCallbacks: (() => void)[] = [];
let mockHookIndex = 0;
let mockStateStore: any[] = [];

const resetMockHooks = () => {
  mockHookIndex = 0;
  mockStateStore = [];
  mockEffectCallbacks = [];
  mockStoreState.bookingQueue = [];
};

jest.mock('react', () => {
  const original = jest.requireActual('react');
  return {
    ...original,
    useState: jest.fn((init) => {
      const index = mockHookIndex++;
      if (mockStateStore[index] === undefined) {
        mockStateStore[index] = typeof init === 'function' ? init() : init;
      }
      const setter = jest.fn((update) => {
        if (typeof update === 'function') {
          mockStateStore[index] = update(mockStateStore[index]);
        } else {
          mockStateStore[index] = update;
        }
      });
      return [mockStateStore[index], setter];
    }),
    useEffect: jest.fn((cb) => {
      mockEffectCallbacks.push(cb);
    }),
    useCallback: jest.fn((cb) => cb),
  };
});

describe('UI Integration Feature Hooks & Repositories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockHooks();
    timeProvider.setCustomNowFn(() => new Date(2026, 7, 30, 10, 0));

    const itemsRes = { items: [{ id: '1', name: 'Test', specialty: 'General Physician', category: 'Wellness', type: 'Prescription', consultationFee: 100, price: 10, rating: 5, date: '2026-08-30', tags: [] }], metadata: { totalCount: 1, totalPages: 1 } };
    (productRepository.getProducts as jest.Mock).mockResolvedValue(itemsRes);
    (doctorRepository.getDoctors as jest.Mock).mockResolvedValue(itemsRes);
    (healthRecordRepository.getHealthRecords as jest.Mock).mockResolvedValue(itemsRes);
  });

  afterEach(() => {
    timeProvider.setCustomNowFn(null);
  });

  it('should query productRepository with shop filters', async () => {
    mockHookIndex = 0;
    const hookResult = useShop();

    hookResult.updateFilters({ search: 'Ginseng', category: 'Wellness' });
    mockHookIndex = 0;
    useShop();

    for (const cb of mockEffectCallbacks) cb();

    expect(productRepository.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, search: 'Ginseng', category: 'Wellness' })
    );
  });

  it('should query doctorRepository with filters', async () => {
    mockHookIndex = 0;
    useConsultation();
    for (const cb of mockEffectCallbacks) cb();
    expect(doctorRepository.getDoctors).toHaveBeenCalled();
  });

  it('should query healthRecordRepository with filters', async () => {
    mockHookIndex = 0;
    useRecords();
    for (const cb of mockEffectCallbacks) cb();
    expect(healthRecordRepository.getHealthRecords).toHaveBeenCalled();
  });

  it('should reset doctors page to 1 when filters change, and fetch with all filters', async () => {
    mockHookIndex = 0;
    let hookResult = useConsultation();

    // 1. Changing only the page should keep filters and not reset page
    hookResult.setFilters({ page: 2 });
    mockHookIndex = 0;
    hookResult = useConsultation();
    expect(hookResult.page).toBe(2);

    // 2. Change filters now
    hookResult.setFilters({ search: 'Aarav', specialty: 'Ayurveda', availability: 'Monday', sort: 'fee_asc' });
    mockHookIndex = 0;
    hookResult = useConsultation();

    // Page must be reset to 1
    expect(hookResult.page).toBe(1);

    // Trigger effects
    for (const cb of mockEffectCallbacks) cb();

    expect(doctorRepository.getDoctors).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        search: 'Aarav',
        specialty: 'Ayurveda',
        availability: 'Monday',
        sort: 'fee_asc',
      })
    );
  });

  it('should ignore stale out-of-order doctor query responses (race condition protection)', async () => {
    let callCount = 0;
    let resolveFirst: any;
    let resolveSecond: any;
    const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });
    const secondPromise = new Promise((resolve) => { resolveSecond = resolve; });

    (doctorRepository.getDoctors as jest.Mock).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? firstPromise : secondPromise;
    });

    mockHookIndex = 0;
    let hookResult = useConsultation();
    
    // First query starts
    const firstEffects = [...mockEffectCallbacks];
    for (const cb of firstEffects) cb();

    // Second query starts via filter updates
    mockHookIndex = 0;
    hookResult = useConsultation();
    hookResult.setFilters({ specialty: 'Yoga' });
    
    mockHookIndex = 0;
    hookResult = useConsultation();
    const secondEffects = [...mockEffectCallbacks];
    for (const cb of secondEffects) cb();

    // Resolve second query first
    resolveSecond({
      items: [{ id: 'doc-2Ref', name: 'Dr. Yoga', specialty: 'Yoga', imageUrl: '', rating: 5, experience: 5, consultationFee: 100, availableDays: [] }],
      metadata: { totalCount: 1, totalPages: 1 },
    });
    await secondPromise;

    // Resolve first query later (simulating lagging network)
    resolveFirst({
      items: [{ id: 'doc-1Ref', name: 'Dr. Stale', specialty: 'Stale', imageUrl: '', rating: 5, experience: 5, consultationFee: 100, availableDays: [] }],
      metadata: { totalCount: 1, totalPages: 1 },
    });
    await firstPromise;

    mockHookIndex = 0;
    hookResult = useConsultation();

    // The data must reflect the second query, not the first
    expect(hookResult.doctors).toEqual([{ id: 'doc-2Ref', name: 'Dr. Yoga', specialty: 'Yoga', imageUrl: '', rating: 5, experience: 5, consultationFee: 100, availableDays: [] }]);
  });

  it('should reset records page to 1 when filters change, and fetch with all filters', async () => {
    mockHookIndex = 0;
    let hookResult = useRecords();

    // Change page
    hookResult.updateFilters({ page: 2 });
    mockHookIndex = 0;
    hookResult = useRecords();
    expect(hookResult.page).toBe(2);

    // Change type/tag filters
    hookResult.updateFilters({ search: 'Lab', type: 'Diagnostic Report', tag: 'Cardio', year: 2026, month: 8 });
    mockHookIndex = 0;
    hookResult = useRecords();

    // Page must be reset to 1
    expect(hookResult.page).toBe(1);

    // Trigger effects
    for (const cb of mockEffectCallbacks) cb();

    expect(healthRecordRepository.getHealthRecords).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        search: 'Lab',
        type: 'Diagnostic Report',
        tag: 'Cardio',
        year: 2026,
        month: 8,
      })
    );
  });

  it('should ignore stale out-of-order records query responses (race condition protection)', async () => {
    let callCount = 0;
    let resolveFirst: any;
    let resolveSecond: any;
    const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });
    const secondPromise = new Promise((resolve) => { resolveSecond = resolve; });

    (healthRecordRepository.getHealthRecords as jest.Mock).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? firstPromise : secondPromise;
    });

    mockHookIndex = 0;
    let hookResult = useRecords();
    
    // First query starts
    const firstEffects = [...mockEffectCallbacks];
    for (const cb of firstEffects) cb();

    // Second query starts via filter updates
    mockHookIndex = 0;
    hookResult = useRecords();
    hookResult.updateFilters({ tag: 'Lab' });
    
    mockHookIndex = 0;
    hookResult = useRecords();
    const secondEffects = [...mockEffectCallbacks];
    for (const cb of secondEffects) cb();

    // Resolve second query first
    resolveSecond({
      items: [{ id: 'rec-2Ref', patientName: 'Patient Yoga', doctorName: 'Dr. Yoga', date: '2026-08-30', diagnosis: 'None', treatment: 'None', prescription: 'None', type: 'Diagnostic Report', tags: [] }],
      metadata: { totalCount: 1, totalPages: 1 },
    });
    await secondPromise;

    // Resolve first query later (simulating lagging network)
    resolveFirst({
      items: [{ id: 'rec-1Ref', patientName: 'Patient Stale', doctorName: 'Dr. Stale', date: '2026-08-30', diagnosis: 'None', treatment: 'None', prescription: 'None', type: 'Prescription', tags: [] }],
      metadata: { totalCount: 1, totalPages: 1 },
    });
    await firstPromise;

    mockHookIndex = 0;
    hookResult = useRecords();

    // The data must reflect the second query, not the first
    expect(hookResult.records).toEqual([{ id: 'rec-2Ref', patientName: 'Patient Yoga', doctorName: 'Dr. Yoga', date: '2026-08-30', diagnosis: 'None', treatment: 'None', prescription: 'None', type: 'Diagnostic Report', tags: [] }]);
  });

  it('should support slot booking logic including enqueueing into clientStore', async () => {
    const doc = { id: 'doc-1', name: 'Dr. John' } as any;
    (doctorRepository.getAvailableSlots as jest.Mock).mockResolvedValue([{ time: '12:00 PM', isAvailable: true }]);

    mockHookIndex = 0;
    const hookResult = useConsultation();

    await hookResult.bookSlot(doc, '2026-08-30', '12:00 PM');
    expect(mockStoreState.bookingQueue.length).toBe(1);
  });

  it('should fail booking if slot is expired and not enqueue it', async () => {
    const doc = { id: 'doc-1', name: 'Dr. John' } as any;
    (doctorRepository.getAvailableSlots as jest.Mock).mockResolvedValue([{ time: '09:00 AM', isAvailable: true }]);

    mockHookIndex = 0;
    const hookResult = useConsultation();

    await expect(hookResult.bookSlot(doc, '2026-08-30', '09:00 AM')).rejects.toThrow('Selected slot has expired.');
    expect(mockStoreState.bookingQueue.length).toBe(0);
  });

  it('should succeed booking if slot is in the future', async () => {
    const doc = { id: 'doc-1', name: 'Dr. John' } as any;
    (doctorRepository.getAvailableSlots as jest.Mock).mockResolvedValue([{ time: '12:00 PM', isAvailable: true }]);

    mockHookIndex = 0;
    const hookResult = useConsultation();

    await hookResult.bookSlot(doc, '2026-08-30', '12:00 PM');
    expect(mockStoreState.bookingQueue.length).toBe(1);
  });
});