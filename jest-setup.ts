let storage: { [key: string]: string } = {};

const mockAsyncStorage = {
  setItem: jest.fn(async (key: string, value: string) => {
    storage[key] = value;
    return null;
  }),
  getItem: jest.fn(async (key: string) => {
    return storage[key] || null;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete storage[key];
    return null;
  }),
  clear: jest.fn(async () => {
    storage = {};
    return null;
  }),
  getAllKeys: jest.fn(async () => {
    return Object.keys(storage);
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((key) => {
      delete storage[key];
    });
    return null;
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@react-native-community/netinfo', () => {
  return {
    fetch: jest.fn().mockResolvedValue({ isConnected: true }),
    addEventListener: jest.fn().mockImplementation((callback) => {
      callback({ isConnected: true });
      return jest.fn();
    }),
  };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return jest.fn().mockImplementation((props) => {
    return React.createElement(View, { testID: 'dateTimePicker', ...props });
  });
});


// Mock expo-secure-store
let mockSecureStoreMemory: { [key: string]: string } = {};
jest.mock('expo-secure-store', () => {
  return {
    getItemAsync: jest.fn(async (key: string) => {
      return mockSecureStoreMemory[key] !== undefined ? mockSecureStoreMemory[key] : null;
    }),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockSecureStoreMemory[key] = String(value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete mockSecureStoreMemory[key];
    }),
  };
});
declare global {
  var clearSecureStoreMemory: () => void;
  var setSecureStoreItemMock: (key: string, value: string) => void;
  var localAuthMock: {
    hasHardware: boolean;
    isEnrolled: boolean;
    authenticateSuccess: boolean;
  };
}

globalThis.clearSecureStoreMemory = () => {
  mockSecureStoreMemory = {};
};
globalThis.setSecureStoreItemMock = (key: string, value: string) => {
  mockSecureStoreMemory[key] = value;
};

// Mock expo-local-authentication
let mockLocalAuth = {
  hasHardware: true,
  isEnrolled: true,
  authenticateSuccess: true,
};
jest.mock('expo-local-authentication', () => {
  return {
    hasHardwareAsync: jest.fn(async () => mockLocalAuth.hasHardware),
    isEnrolledAsync: jest.fn(async () => mockLocalAuth.isEnrolled),
    authenticateAsync: jest.fn(async () => {
      return { success: mockLocalAuth.authenticateSuccess };
    }),
  };
});
globalThis.localAuthMock = mockLocalAuth;

