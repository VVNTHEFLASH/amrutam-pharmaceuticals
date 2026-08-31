import { useState, useEffect } from 'react';

export interface FeatureFlags {
  enableBiometricAuth: boolean;
  enableShopCheckout: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  enableBiometricAuth: true,
  enableShopCheckout: true,
};

export const featureFlags = {
  /**
   * Resolves the boolean value of a feature flag.
   * Priority:
   * 1. Check environment variables (EXPO_PUBLIC_FLAG_*)
   * 2. Check local defaults setup
   */
  get: <K extends keyof FeatureFlags>(key: K): FeatureFlags[K] => {
    // Standard format for feature flag env vars: EXPO_PUBLIC_FLAG_ENABLE_BIOMETRIC_AUTH
    const envKey = `EXPO_PUBLIC_FLAG_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    const envVal = process.env[envKey];
    if (envVal !== undefined) {
      return envVal === 'true';
    }
    return DEFAULT_FLAGS[key];
  },
};

/**
 * A custom hook to listen/read to feature flag changes.
 */
export function useFeatureFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
  const [value, setValue] = useState<FeatureFlags[K]>(() => featureFlags.get(key));

  useEffect(() => {
    setValue(featureFlags.get(key));
  }, [key]);

  return value;
}
