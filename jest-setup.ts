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
