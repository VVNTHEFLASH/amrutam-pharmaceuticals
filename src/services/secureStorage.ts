import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// In-memory fallback for Web/SSR platforms to avoid persisting sensitive credentials in unsecure local/session storage.
const webMemoryStorage = new Map<string, string>();

export const secureStorage = {
  /**
   * Retrieves an item.
   * On Native: uses expo-secure-store.
   * On Web: uses in-memory map.
   */
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return webMemoryStorage.get(key) ?? null;
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn(`SecureStore failed to getItem for key: ${key}. Falling back to memory.`, e);
      return webMemoryStorage.get(key) ?? null;
    }
  },

  /**
   * Saves an item.
   * On Native: uses expo-secure-store.
   * On Web: uses in-memory map.
   */
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      webMemoryStorage.set(key, value);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error(`SecureStore failed to setItem for key: ${key}. Storing in memory.`, e);
      webMemoryStorage.set(key, value);
    }
  },

  /**
   * Removes an item.
   * On Native: uses expo-secure-store.
   * On Web: uses in-memory map.
   */
  removeItem: async (key: string): Promise<void> => {
    webMemoryStorage.delete(key);
    if (Platform.OS === 'web') {
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error(`SecureStore failed to deleteItem for key: ${key}`, e);
    }
  },
};
