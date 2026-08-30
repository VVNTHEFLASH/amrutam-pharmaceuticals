import React from 'react';
import { ConnectionBanner } from '../../components/connection-banner';
import { bookingSyncService } from '../../services/bookingSyncService';
import { userSyncService } from '../../services/userSyncService';

// Mock Lucide Icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WifiOff: (props: any) => React.createElement(View, props),
    AlertTriangle: (props: any) => React.createElement(View, props),
    RefreshCw: (props: any) => React.createElement(View, props),
    CheckCircle2: (props: any) => React.createElement(View, props),
  };
});

// Mock Safe Area
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 30, bottom: 20, left: 0, right: 0 }),
}));

// Mock Themes
jest.mock('../../hooks/use-theme', () => ({
  useTheme: () => ({
    backgroundElement: '#F0F0F3',
    text: '#000000',
    backgroundSelected: '#E0E0E0',
  }),
}));

// Mock Zustand Store
const mockStoreState = {
  isConnected: true,
  syncStatus: 'idle',
  bookingQueue: [] as any[],
  wishlistQueue: [] as any[],
  cartQueue: [] as any[],
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

// Mock Sync Services
jest.mock('../../services/bookingSyncService', () => ({
  bookingSyncService: {
    sync: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/userSyncService', () => ({
  userSyncService: {
    syncAll: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock React Hooks directly to run component as a pure function
let mockHookCallCount = 0;
let mockShowSuccess = false;
let mockIsTriggering = false;
const mockSetShowSuccess = jest.fn();
const mockSetIsTriggering = jest.fn();

jest.mock('react', () => {
  const original = jest.requireActual('react');
  return {
    ...original,
    useState: (init: any) => {
      const callIndex = mockHookCallCount++;
      if (callIndex === 0) {
        return [mockShowSuccess, mockSetShowSuccess];
      } else {
        return [mockIsTriggering, mockSetIsTriggering];
      }
    },
    useEffect: jest.fn(),
  };
});

describe('ConnectionBanner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookCallCount = 0;
    mockShowSuccess = false;
    mockIsTriggering = false;
    mockStoreState.isConnected = true;
    mockStoreState.syncStatus = 'idle';
    mockStoreState.bookingQueue = [];
    mockStoreState.wishlistQueue = [];
    mockStoreState.cartQueue = [];
  });

  it('should return null when connected and idle with no pending changes', () => {
    const result = ConnectionBanner();
    expect(result).toBeNull();
  });

  it('should show offline banner with cache info when offline with no changes', () => {
    mockStoreState.isConnected = false;
    const result = ConnectionBanner();
    expect(result).not.toBeNull();
    expect(result.props.accessibilityLabel).toContain('Offline');
    expect(result.props.accessibilityLabel).toContain('Using cached database offline');
  });

  it('should show count of pending modifications when offline with waiting queue items', () => {
    mockStoreState.isConnected = false;
    mockStoreState.bookingQueue = [{ id: 'bk-1', status: 'pending' }];
    mockStoreState.wishlistQueue = [{ id: 'wl-1' }];
    mockStoreState.cartQueue = [{ id: 'c-1' }];

    const result = ConnectionBanner();
    expect(result).not.toBeNull();
    expect(result.props.accessibilityLabel).toContain('Offline');
    expect(result.props.accessibilityLabel).toContain('3 changes waiting to sync');
  });

  it('should show syncing status when online and syncStatus is syncing', () => {
    mockStoreState.isConnected = true;
    mockStoreState.syncStatus = 'syncing';
    const result = ConnectionBanner();
    expect(result).not.toBeNull();
    expect(result.props.accessibilityLabel).toContain('Syncing...');
  });

  it('should show manual sync button when online and syncStatus is failed or pending items exist', () => {
    mockStoreState.isConnected = true;
    mockStoreState.syncStatus = 'failed';
    mockStoreState.bookingQueue = [{ id: 'bk-1', status: 'pending' }];

    const result = ConnectionBanner();
    expect(result).not.toBeNull();
    expect(result.props.accessibilityLabel).toContain('Warning / Sync Failed');

    // Verify button exists in components
    const row = result.props.children;
    const button = row.props.children[1];
    expect(button).not.toBeNull();
    expect(button.props.accessibilityLabel).toBe('Sync Now');
  });

  it('should trigger sequential syncing on manual press', async () => {
    mockStoreState.isConnected = true;
    mockStoreState.syncStatus = 'failed';
    mockStoreState.bookingQueue = [{ id: 'bk-1', status: 'pending' }];

    const result = ConnectionBanner();
    const row = result.props.children;
    const button = row.props.children[1];

    // Trigger press
    await button.props.onPress();

    expect(bookingSyncService.sync).toHaveBeenCalledTimes(1);
    expect(userSyncService.syncAll).toHaveBeenCalledTimes(1);
  });
});


