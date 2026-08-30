import { apiCache } from '../../services/api/apiCache';

describe('apiCache Service', () => {
  beforeEach(async () => {
    // Clear the storage mock
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return null on a cache miss', async () => {
    const data = await apiCache.get('missing-endpoint');
    expect(data).toBeNull();
  });

  it('should successfully write and read cache items', async () => {
    const payload = { key: 'value', nested: [1, 2, 3] };
    await apiCache.set('endpoint-1', payload, 5000);
    const entry = await apiCache.get('endpoint-1');

    expect(entry).not.toBeNull();
    expect(entry?.value).toEqual(payload);
    expect(entry?.ttl).toBe(5000);
    expect(typeof entry?.timestamp).toBe('number');
  });

  it('should identify a fresh cache entry correctly', async () => {
    const payload = { test: true };
    await apiCache.set('endpoint-fresh', payload, 10000);
    const entry = await apiCache.get('endpoint-fresh');

    expect(entry).not.toBeNull();
    expect(apiCache.isFresh(entry!)).toBe(true);
  });

  it('should identify an expired cache entry correctly', async () => {
    const payload = { test: true };
    await apiCache.set('endpoint-exp', payload, 2000);

    // Fast-forward time past the TTL of 2000ms
    jest.advanceTimersByTime(2500);

    const entry = await apiCache.get('endpoint-exp');
    expect(entry).not.toBeNull();
    expect(apiCache.isFresh(entry!)).toBe(false);
  });

  it('should clear an entry correctly when remove is invoked', async () => {
    await apiCache.set('endpoint-rem', { val: 1 }, 1000);
    await apiCache.remove('endpoint-rem');
    const entry = await apiCache.get('endpoint-rem');
    expect(entry).toBeNull();
  });

  it('should remove expired entries and keep valid entries', async () => {
    await apiCache.set('valid-endpoint', { val: 'still-good' }, 10000);
    await apiCache.set('expired-endpoint', { val: 'goodbye' }, 1000);

    // Fast-forward past 1000ms but before 10000ms
    jest.advanceTimersByTime(2000);

    await apiCache.sweepExpiredEntries();

    const validEntry = await apiCache.get('valid-endpoint');
    const expiredEntry = await apiCache.get('expired-endpoint');

    expect(validEntry).not.toBeNull();
    expect(validEntry?.value).toEqual({ val: 'still-good' });
    expect(expiredEntry).toBeNull();
  });

  it('should preserve unrelated storage keys', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('some-other-key', 'dont-touch-me');
    await apiCache.set('expired-endpoint-2', { val: 'goodbye' }, 1000);

    jest.advanceTimersByTime(2000);

    await apiCache.sweepExpiredEntries();

    const otherData = await AsyncStorage.getItem('some-other-key');
    expect(otherData).toBe('dont-touch-me');

    const expiredEntry = await apiCache.get('expired-endpoint-2');
    expect(expiredEntry).toBeNull();
  });

  it('should not throw when storage access fails during cleanup', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const originalGetAllKeys = AsyncStorage.getAllKeys;

    AsyncStorage.getAllKeys = jest.fn().mockRejectedValue(new Error('Storage failure'));

    await expect(apiCache.sweepExpiredEntries()).resolves.not.toThrow();

    AsyncStorage.getAllKeys = originalGetAllKeys;
  });
});
