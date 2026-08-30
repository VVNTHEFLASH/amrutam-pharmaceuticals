import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

const CACHE_PREFIX = '@api_cache:';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

const isSSR = Platform.OS === 'web' && typeof window === 'undefined';

export const apiCache = {
  async set<T>(endpoint: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    if (isSSR) {
      return;
    }
    try {
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(CACHE_PREFIX + endpoint, JSON.stringify(entry));
    } catch (e) {
      console.warn(`Failed to write to cache for endpoint: ${endpoint}`, e);
    }
  },

  async get<T>(endpoint: string): Promise<CacheEntry<T> | null> {
    if (isSSR) {
      return null;
    }
    try {
      const data = await AsyncStorage.getItem(CACHE_PREFIX + endpoint);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as CacheEntry<T>;
    } catch (e) {
      console.warn(`Failed to read from cache for endpoint: ${endpoint}`, e);
      return null;
    }
  },

  isFresh(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp <= entry.ttl;
  },

  async remove(endpoint: string): Promise<void> {
    if (isSSR) {
      return;
    }
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + endpoint);
    } catch (e) {
      // Ignored
    }
  },
};
