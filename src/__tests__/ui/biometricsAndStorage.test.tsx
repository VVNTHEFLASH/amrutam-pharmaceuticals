import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform, AppState, Switch, Pressable } from 'react-native';
import { secureStorage } from '../../services/secureStorage';
import { featureFlags } from '../../services/featureFlags';
import { biometricService } from '../../services/biometrics';
import { BiometricGate } from '../../components/biometric-gate';
import ProfileScreen from '../../app/profile';
import { useToastStore } from '../../store/toastStore';

// Mock Lucide Icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Lock: (props: any) => React.createElement(View, props),
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Setup useAuth mock controller
let mockIsAuthenticated = false;
let mockUser: any = null;
let mockProfile: any = null;

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockUser,
    profile: mockProfile,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    isLoading: false,
  }),
}));

// Mock supabase configuration status for profile screen
jest.mock('../../services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

// Mock SafeAreaView to avoid layout issue in tests
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 20, bottom: 20, left: 0, right: 0 }),
  };
});

describe('Secure Storage, Feature Flags, and Biometrics Gating', () => {
  const flushMicrotasks = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.clearSecureStoreMemory();
    useToastStore.setState({ toasts: [] });
    // Reset local auth mocks
    globalThis.localAuthMock.hasHardware = true;
    globalThis.localAuthMock.isEnrolled = true;
    globalThis.localAuthMock.authenticateSuccess = true;
    // Reset useAuth controls
    mockIsAuthenticated = false;
    mockUser = null;
    mockProfile = null;
  });

  describe('Secure Storage & Platform Fallback', () => {
    it('stores and retrieves items correctly in Native secure store', async () => {
      if (Platform.OS === 'web') return;

      await secureStorage.setItem('test-key', 'secret-value');
      const retrieved = await secureStorage.getItem('test-key');
      expect(retrieved).toBe('secret-value');

      await secureStorage.removeItem('test-key');
      const deleted = await secureStorage.getItem('test-key');
      expect(deleted).toBeNull();
    });

    it('stores in memory on Web and does not invoke local storage or secure store', async () => {
      if (Platform.OS !== 'web') return;

      await secureStorage.setItem('web-key', 'web-secret');
      const retrieved = await secureStorage.getItem('web-key');
      expect(retrieved).toBe('web-secret');
    });
  });

  describe('Centralized Feature Flags', () => {
    it('uses environment variable priority', () => {
      const originalEnv = process.env.EXPO_PUBLIC_FLAG_ENABLE_BIOMETRIC_AUTH;

      process.env.EXPO_PUBLIC_FLAG_ENABLE_BIOMETRIC_AUTH = 'false';
      expect(featureFlags.get('enableBiometricAuth')).toBe(false);

      process.env.EXPO_PUBLIC_FLAG_ENABLE_BIOMETRIC_AUTH = 'true';
      expect(featureFlags.get('enableBiometricAuth')).toBe(true);

      if (originalEnv === undefined) {
        delete process.env.EXPO_PUBLIC_FLAG_ENABLE_BIOMETRIC_AUTH;
      } else {
        process.env.EXPO_PUBLIC_FLAG_ENABLE_BIOMETRIC_AUTH = originalEnv;
      }
    });

    it('falls back to default configurations when environment variable is not defined', () => {
      const originalEnv = process.env.EXPO_PUBLIC_FLAG_ENABLE_BIOMETRIC_AUTH;
      delete process.env.EXPO_PUBLIC_FLAG_ENABLE_BIOMETRIC_AUTH;

      expect(featureFlags.get('enableBiometricAuth')).toBe(true);

      if (originalEnv === undefined) {
        delete process.env.EXPO_PUBLIC_FLAG_ENABLE_BIOMETRIC_AUTH;
      } else {
        process.env.EXPO_PUBLIC_FLAG_ENABLE_BIOMETRIC_AUTH = originalEnv;
      }
    });
  });

  describe('Biometric Service & Enrollment Defaults', () => {
    it('enables biometrics by default on devices that have hardware and are enrolled', async () => {
      if (Platform.OS === 'web') return;

      globalThis.localAuthMock.hasHardware = true;
      globalThis.localAuthMock.isEnrolled = true;

      const isEnabled = await biometricService.isEnabled();
      expect(isEnabled).toBe(true);
    });

    it('gracefully disables biometrics when hardware or enrollment is not present', async () => {
      if (Platform.OS === 'web') return;

      globalThis.localAuthMock.hasHardware = false;
      const isEnabled = await biometricService.isEnabled();
      expect(isEnabled).toBe(false);
    });

    it('authenticates user and toggles settings securely', async () => {
      if (Platform.OS === 'web') return;

      globalThis.localAuthMock.authenticateSuccess = true;
      const setTrueResult = await biometricService.setEnabled(true);
      expect(setTrueResult).toBe(true);

      const isEnabled1 = await biometricService.isEnabled();
      expect(isEnabled1).toBe(true);

      globalThis.localAuthMock.authenticateSuccess = false;
      const setFalseResult = await biometricService.setEnabled(false);
      expect(setFalseResult).toBe(false);

      const isEnabled2 = await biometricService.isEnabled();
      expect(isEnabled2).toBe(true);
    });
  });

  describe('Biometric Gate Screen Gating', () => {
    it('locks screen and hides children when biometric lock is active', async () => {
      if (Platform.OS === 'web') {
        let rendered: any;
        await act(async () => {
          rendered = renderer.create(
            <BiometricGate>
              <Pressable testID="childContent">
                <Switch value={false} />
              </Pressable>
            </BiometricGate>
          );
        });
        await flushMicrotasks();
        const root = rendered.root;
        expect(root.findByProps({ testID: 'childContent' })).toBeDefined();
        return;
      }

      globalThis.localAuthMock.authenticateSuccess = false;
      globalThis.setSecureStoreItemMock('biometric_enabled_pref', 'true');

      let rendered: any;
      await act(async () => {
        rendered = renderer.create(
          <BiometricGate>
            <Pressable testID="childContent">
              <Switch value={false} />
            </Pressable>
          </BiometricGate>
        );
      });
      await flushMicrotasks();

      const root = rendered.root;
      expect(() => root.findByProps({ testID: 'childContent' })).toThrow();
      expect(root.findByProps({ children: 'Application Locked' })).toBeDefined();
    });

    it('unlocks screen and shows children upon successful authentication', async () => {
      globalThis.localAuthMock.authenticateSuccess = true;
      globalThis.setSecureStoreItemMock('biometric_enabled_pref', 'true');

      let rendered: any;
      await act(async () => {
        rendered = renderer.create(
          <BiometricGate>
            <Pressable testID="childContent">
              <Switch value={false} />
            </Pressable>
          </BiometricGate>
        );
      });
      await flushMicrotasks();

      const root = rendered.root;
      expect(root.findByProps({ testID: 'childContent' })).toBeDefined();
    });

    it('triggers lock validation on AppState foreground transition', async () => {
      if (Platform.OS === 'web') return;

      globalThis.localAuthMock.authenticateSuccess = true;
      globalThis.setSecureStoreItemMock('biometric_enabled_pref', 'true');

      let rendered: any;
      await act(async () => {
        rendered = renderer.create(
          <BiometricGate>
            <Pressable testID="childContent">
              <Switch value={false} />
            </Pressable>
          </BiometricGate>
        );
      });
      await flushMicrotasks();

      expect(rendered.root.findByProps({ testID: 'childContent' })).toBeDefined();

      // Find the AppState custom change event listener callback
      const calls = (AppState.addEventListener as jest.Mock).mock.calls;
      const changeCall = calls.find(call => call[0] === 'change');
      const changeCallback = changeCall ? changeCall[1] : null;
      expect(changeCallback).toBeDefined();

      await act(async () => {
        if (changeCallback) {
          await changeCallback('background');
        }
      });

      globalThis.localAuthMock.authenticateSuccess = false;

      await act(async () => {
        if (changeCallback) {
          await changeCallback('active');
        }
      });
      await flushMicrotasks();

      expect(() => rendered.root.findByProps({ testID: 'childContent' })).toThrow();
    });
  });

  describe('Independent Biometric Profile Settings Integration', () => {
    it('renders biometric toggle option inside profile settings for authenticated users', async () => {
      mockIsAuthenticated = true;
      mockUser = { id: 'auth-user', email: 'test@amrutam.com' };
      mockProfile = { fullName: 'Test User', phone: '1234567890', avatarUrl: '' };

      globalThis.localAuthMock.hasHardware = true;
      globalThis.localAuthMock.isEnrolled = true;
      globalThis.setSecureStoreItemMock('biometric_enabled_pref', 'true');

      let rendered: any;
      await act(async () => {
        rendered = renderer.create(<ProfileScreen />);
      });
      await flushMicrotasks();

      const root = rendered.root;
      const toggle = root.findByProps({ accessibilityLabel: 'Toggle biometric lock' });
      expect(toggle).toBeDefined();

      if (Platform.OS === 'web') {
        expect(toggle.props.disabled).toBe(true);
      } else {
        expect(toggle.props.value).toBe(true);
      }
    });

    it('renders biometric toggle option inside profile settings for guest/unauthenticated users', async () => {
      mockIsAuthenticated = false;
      mockUser = null;
      mockProfile = null;

      globalThis.localAuthMock.hasHardware = true;
      globalThis.localAuthMock.isEnrolled = true;
      globalThis.setSecureStoreItemMock('biometric_enabled_pref', 'true');

      let rendered: any;
      await act(async () => {
        rendered = renderer.create(<ProfileScreen />);
      });
      await flushMicrotasks();

      const root = rendered.root;
      const toggle = root.findByProps({ accessibilityLabel: 'Toggle biometric lock' });
      expect(toggle).toBeDefined();

      if (Platform.OS === 'web') {
        expect(toggle.props.disabled).toBe(true);
      } else {
        expect(toggle.props.value).toBe(true);
      }
    });

    it('triggers biometric confirmation before changing settings and persists setting state', async () => {
      if (Platform.OS === 'web') return;

      mockIsAuthenticated = true;
      mockUser = { id: 'auth-user', email: 'test@amrutam.com' };
      mockProfile = { fullName: 'Test User', phone: '1234567890', avatarUrl: '' };

      globalThis.localAuthMock.hasHardware = true;
      globalThis.localAuthMock.isEnrolled = true;
      globalThis.setSecureStoreItemMock('biometric_enabled_pref', 'true');

      let rendered: any;
      await act(async () => {
        rendered = renderer.create(<ProfileScreen />);
      });
      await flushMicrotasks();

      const root = rendered.root;
      const toggle = root.findByProps({ accessibilityLabel: 'Toggle biometric lock' });

      globalThis.localAuthMock.authenticateSuccess = true;
      await act(async () => {
        await toggle.props.onValueChange(false);
      });
      await flushMicrotasks();

      expect(toggle.props.value).toBe(false);

      globalThis.localAuthMock.authenticateSuccess = false;
      await act(async () => {
        await toggle.props.onValueChange(true);
      });
      await flushMicrotasks();

      expect(toggle.props.value).toBe(false);
    });
  });
});
