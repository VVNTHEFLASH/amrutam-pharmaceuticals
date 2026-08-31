import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, AppState, AppStateStatus, Pressable, ActivityIndicator, Platform } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { biometricService } from '../services/biometrics';
import { useFeatureFlag } from '../services/featureFlags';
import { useTheme } from '../hooks/use-theme';
import { Lock } from 'lucide-react-native';

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const isFeatureEnabled = useFeatureFlag('enableBiometricAuth');
  const theme = useTheme();
  
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const appState = useRef(AppState.currentState || 'active');

  const attemptUnlock = async () => {
    setErrorMsg(null);
    try {
      const success = await biometricService.authenticateUser();
      if (success) {
        setIsLocked(false);
        setErrorMsg(null);
      } else {
        setErrorMsg('Authentication failed. Please try again.');
      }
    } catch (e) {
      setErrorMsg('An error occurred during authentication.');
    }
  };

  const initLockState = async () => {
    if (Platform.OS === 'web' || !isFeatureEnabled) {
      setIsLocked(false);
      setIsChecking(false);
      return;
    }

    try {
      const enabled = await biometricService.isEnabled();
      if (enabled) {
        setIsLocked(true);
        const success = await biometricService.authenticateUser();
        if (success) {
          setIsLocked(false);
        } else {
          setErrorMsg('Authentication required to access Amrutam.');
        }
      } else {
        setIsLocked(false);
      }
    } catch (err) {
      console.warn('Error reading lock state:', err);
      // Fallback: Proceed to avoid trapping user on native error
      setIsLocked(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    initLockState();

    if (Platform.OS === 'web' || !isFeatureEnabled) {
      return;
    }

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Transition from background/inactive to active
      if (
        appState.current &&
        typeof appState.current === 'string' &&
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        try {
          const enabled = await biometricService.isEnabled();
          if (enabled) {
            setIsLocked(true);
            setErrorMsg(null);
            const success = await biometricService.authenticateUser();
            if (success) {
              setIsLocked(false);
            } else {
              setErrorMsg('Authentication required to access Amrutam.');
            }
          }
        } catch (e) {
          setIsLocked(false);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isFeatureEnabled]);

  if (isChecking) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </ThemedView>
    );
  }

  if (isLocked) {
    return (
      <ThemedView type="background" style={[styles.lockedContainer, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <Lock size={64} color="#208AEF" style={styles.icon} />
          
          <ThemedText type="subtitle" style={styles.title}>
            Application Locked
          </ThemedText>
          
          <ThemedText themeColor="textSecondary" style={styles.description}>
            Biometric credentials or passcode verified unlock is required to proceed.
          </ThemedText>

          {errorMsg ? (
            <ThemedText style={styles.errorText}>
              {errorMsg}
            </ThemedText>
          ) : null}

          <Pressable 
            style={[styles.unlockBtn, { backgroundColor: '#208AEF' }]} 
            onPress={attemptUnlock}
            accessibilityLabel="Authenticate with Touch/Face ID or Passcode"
            accessibilityRole="button"
          >
            <ThemedText style={styles.btnText}>Unlock Screen</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    maxWidth: 360,
    width: '100%',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  unlockBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
