import { apiCache } from '../../services/api/apiCache';

describe('apiCache Isolation & Logout Clearance', () => {
  beforeEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  it('should clear only cached API items on clearAll while preserving auth or store persistent keys', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    // Seed private API cache
    await apiCache.set('user-profile', { name: 'John Doe' }, 3000);
    await apiCache.set('health-records-list', [{ id: 'hr-1' }], 5000);

    // Seed unrelated persistent keys
    await AsyncStorage.setItem('sb-supabase-auth-token', 'auth-session-info');
    await AsyncStorage.setItem('amrutam-client-store', 'zustand-offline-store-data');
    await AsyncStorage.setItem('user-settings', 'dark-mode');

    // Run cache clearance
    await apiCache.clearAll();

    // Verify cache items are removed
    const cachedProfile = await apiCache.get('user-profile');
    const cachedRecords = await apiCache.get('health-records-list');
    expect(cachedProfile).toBeNull();
    expect(cachedRecords).toBeNull();

    // Verify unrelated data is intact
    const authVal = await AsyncStorage.getItem('sb-supabase-auth-token');
    const storeVal = await AsyncStorage.getItem('amrutam-client-store');
    const settingsVal = await AsyncStorage.getItem('user-settings');

    expect(authVal).toBe('auth-session-info');
    expect(storeVal).toBe('zustand-offline-store-data');
    expect(settingsVal).toBe('dark-mode');
  });
});
