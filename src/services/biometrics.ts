import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { secureStorage } from './secureStorage';

export const BIOMETRICS_PREF_KEY = 'biometric_enabled_pref';

export const biometricService = {
  /**
   * Checks if the device has biometric hardware available and has accounts/fingerprints enrolled.
   */
  checkSupport: async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return false;
    }
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (e) {
      console.warn('Failed to check biometric support:', e);
      return false;
    }
  },

  /**
   * Determines if biometrics should be used based on the user's secure preference.
   * If no preference is set, it defaults to true if biometric hardware/enrollment is present.
   */
  isEnabled: async (): Promise<boolean> => {
    const isSupported = await biometricService.checkSupport();
    if (!isSupported) {
      return false;
    }

    try {
      const pref = await secureStorage.getItem(BIOMETRICS_PREF_KEY);
      if (pref === null) {
        // First run - default to enabled since biometrics are supported/enrolled
        await secureStorage.setItem(BIOMETRICS_PREF_KEY, 'true');
        return true;
      }
      return pref === 'true';
    } catch (e) {
      console.error('Failed to read biometric preference from secure storage:', e);
      return false;
    }
  },

  /**
   * Toggles the user biometric preference state.
   * Authenticates first before committing the change.
   */
  setEnabled: async (enabled: boolean): Promise<boolean> => {
    const isSupported = await biometricService.checkSupport();
    if (!isSupported) {
      return false;
    }

    const title = enabled
      ? 'Confirm your identity to enable Biometric Lock'
      : 'Confirm your identity to disable Biometric Lock';
      
    const success = await biometricService.authenticateUser(title);
    if (success) {
      await secureStorage.setItem(BIOMETRICS_PREF_KEY, enabled ? 'true' : 'false');
      return true;
    }
    return false;
  },

  /**
   * Prompts the device's native lock/biometrics authentication system.
   */
  authenticateUser: async (promptMessage: string = 'Unlock Amrutam'): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return true;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (e) {
      console.error('Biometric authentication failed:', e);
      return false;
    }
  },
};
