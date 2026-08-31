import { triggerSync, bookingSyncService } from '../../services/bookingSyncService';
import { userSyncService } from '../../services/userSyncService';

const mockStoreState = {
  userId: 'user-123' as string | null,
  isConnected: true,
  syncStatus: 'idle',
  bookingQueue: [] as any[],
  wishlistQueue: [] as any[],
  cartQueue: [] as any[],
  setSyncStatus: jest.fn((status) => {
    mockStoreState.syncStatus = status;
  }),
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

jest.mock('../../services/userSyncService', () => ({
  userSyncService: {
    syncAll: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Sequential Sync Coordinator (triggerSync)', () => {
  let syncSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockStoreState.userId = 'user-123';
    mockStoreState.isConnected = true;
    mockStoreState.syncStatus = 'idle';
    mockStoreState.bookingQueue = [];
    mockStoreState.wishlistQueue = [];
    mockStoreState.cartQueue = [];

    syncSpy = jest.spyOn(bookingSyncService, 'sync').mockResolvedValue(undefined);
  });

  afterEach(() => {
    syncSpy.mockRestore();
    jest.useRealTimers();
  });

  it('should abort sync if no authenticated user is present', async () => {
    mockStoreState.userId = null;

    await triggerSync();

    expect(syncSpy).not.toHaveBeenCalled();
    expect(userSyncService.syncAll).not.toHaveBeenCalled();
  });

  it('should abort sync if the device is offline', async () => {
    mockStoreState.isConnected = false;

    await triggerSync();

    expect(syncSpy).not.toHaveBeenCalled();
    expect(userSyncService.syncAll).not.toHaveBeenCalled();
  });

  it('should run bookingSyncService.sync and userSyncService.syncAll sequentially', async () => {
    mockStoreState.bookingQueue = [{ id: 'bk-1', status: 'pending' }];
    let order: string[] = [];
    syncSpy.mockImplementation(async () => {
      order.push('booking');
      mockStoreState.bookingQueue = [];
    });
    (userSyncService.syncAll as jest.Mock).mockImplementation(async () => {
      order.push('user');
    });

    await triggerSync();

    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(userSyncService.syncAll).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['booking', 'user']);
    expect(mockStoreState.syncStatus).toBe('completed');
  });

  it('should queue retry if sync completes and queues are not empty due to failure', async () => {
    mockStoreState.bookingQueue = [{ id: 'bk-1', status: 'pending' }];

    await triggerSync();

    expect(mockStoreState.syncStatus).toBe('failed');

    jest.advanceTimersByTime(10500);

    expect(syncSpy).toHaveBeenCalledTimes(2);
  });
});
