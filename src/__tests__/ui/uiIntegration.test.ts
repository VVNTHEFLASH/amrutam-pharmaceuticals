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

  it('should support slot booking logic including enqueueing into clientStore', async () => {
    const doc = { id: 'doc-1', name: 'Dr. John' } as any;
    (doctorRepository.getAvailableSlots as jest.Mock).mockResolvedValue([{ time: '12:00 PM', isAvailable: true }]);

    mockHookIndex = 0;
    const hookResult = useConsultation();

    await hookResult.bookSlot(doc, '2026-08-30', '12:00 PM');
    expect(mockStoreState.bookingQueue.length).toBe(1);
  });
});