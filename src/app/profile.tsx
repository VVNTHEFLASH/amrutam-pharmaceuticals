import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured } from '@/services/supabase';
import { useToastStore } from '@/store/toastStore';
import { biometricService } from '@/services/biometrics';
import { useFeatureFlag } from '@/services/featureFlags';
import { getErrorMessage } from '@/types/errors';

export default function ProfileScreen() {
  const {
    user,
    profile,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    updateProfile,
  } = useAuth();

  const theme = useTheme();
  const showToast = useToastStore((s) => s.showToast);
  const [actionLoading, setActionLoading] = useState(false);

  const isBiometricFeatureEnabled = useFeatureFlag('enableBiometricAuth');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [checkingBiometrics, setCheckingBiometrics] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isBiometricFeatureEnabled) {
        setCheckingBiometrics(false);
        return;
      }
      const supported = await biometricService.checkSupport();
      setBiometricSupported(supported);
      if (supported) {
        const enabled = await biometricService.isEnabled();
        setBiometricEnabled(enabled);
      }
      setCheckingBiometrics(false);
    })();
  }, [isBiometricFeatureEnabled]);

  const handleToggleBiometric = async (value: boolean) => {
    setActionLoading(true);
    try {
      const success = await biometricService.setEnabled(value);
      if (success) {
        setBiometricEnabled(value);
        showToast('success', `Biometric lock successfully ${value ? 'enabled' : 'disabled'}.`);
      } else {
        showToast('error', 'Authentication failed. Setting remained unchanged.');
      }
    } catch (err: unknown) {
      showToast('error', 'An error occurred while changing settings.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderBiometricSetting = () => {
    if (!isBiometricFeatureEnabled || checkingBiometrics) return null;

    return (
      <View style={[s.biometricCard, { backgroundColor: theme.backgroundElement }]}>
        <View style={s.biometricRow}>
          <View style={s.biometricTextContainer}>
            <ThemedText type="smallBold" style={s.biometricLabel}>
              Biometric Lock
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={s.biometricDesc}>
              {biometricSupported
                ? 'Protect application content behind a device biometric screen.'
                : 'Biometrics are unsupported on this device.'}
            </ThemedText>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleToggleBiometric}
            disabled={!biometricSupported || actionLoading}
            trackColor={{ false: theme.backgroundSelected, true: '#208AEF' }}
            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            accessibilityLabel="Toggle biometric lock"
          />
        </View>
      </View>
    );
  };

  // Flow toggles
  const [isSignUpFlow, setIsSignUpFlow] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Editable Profile States
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  // Loading & Error States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Track profile initialization when profile loads
  const [hasInitializedEditFields, setHasInitializedEditFields] = useState(false);

  if (isAuthenticated && profile && !hasInitializedEditFields) {
    setEditName(profile.fullName || '');
    setEditPhone(profile.phone || '');
    setEditAvatar(profile.avatarUrl || '');
    setHasInitializedEditFields(true);
  }

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('error', 'Please enter both email and password.');
      return;
    }
    setErrorMsg(null);
    setActionLoading(true);
    try {
      await signIn(email.trim(), password);
      showToast('success', 'Successfully signed in!');
      setErrorMsg(null);
    } catch (err: unknown) {
      const errMsg = getErrorMessage(err, 'Failed to sign in.');
      setErrorMsg(errMsg);
      showToast('error', errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignUp = async () => {
    setErrorMsg(null);
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      showToast('error', 'Please fill in all mandatory fields.');
      return;
    }
    if (password !== confirmPassword) {
      showToast('error', 'Passwords do not match.');
      return;
    }
    setActionLoading(true);
    try {
      await signUp(fullName.trim(), email.trim(), phone.trim(), password);
      showToast('success', 'Registration completed! Check your email.');
      setErrorMsg(null);
      setIsSignUpFlow(false);
    } catch (err: unknown) {
      const errMsg = getErrorMessage(err, 'Failed to sign up.');
      setErrorMsg(errMsg);
      showToast('error', errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setErrorMsg(null);
    setActionLoading(true);
    try {
      await updateProfile({
        fullName: editName.trim(),
        phone: editPhone.trim(),
        avatarUrl: editAvatar.trim(),
      });
      showToast('success', 'Profile updated successfully!');
      setErrorMsg(null);
    } catch (err: unknown) {
      const errMsg = getErrorMessage(err, 'Failed to update profile.');
      setErrorMsg(errMsg);
      showToast('error', errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg(null);
    setActionLoading(true);
    try {
      await signOut();
      setHasInitializedEditFields(false);
      showToast('success', 'Successfully signed out.');
      setErrorMsg(null);
    } catch (err: unknown) {
      const errMsg = getErrorMessage(err, 'Failed to sign out.');
      setErrorMsg(errMsg);
      showToast('error', errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Center unconfigured fallback
  if (!isSupabaseConfigured) {
    return (
      <ThemedView style={s.container}>
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={s.centerScroll}>
            <View style={[s.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="subtitle" style={s.title}>
                Auth Unconfigured
              </ThemedText>
              <ThemedText style={s.infoText}>
                Supabase credentials are not configured in your environment. Provide EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable authentication features.
              </ThemedText>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Initial loading state
  if (isLoading) {
    return (
      <ThemedView style={s.centerContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </ThemedView>
    );
  }

  // Render profile info if authenticated
  if (isAuthenticated && user) {
    return (
      <ThemedView style={s.container}>
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={s.scrollContent}>
              <ThemedText type="subtitle" style={s.headerTitle}>
                Your Profile
              </ThemedText>

              {errorMsg && (
                <View style={s.errorBlock}>
                  <ThemedText style={s.errorMsgText}>{errorMsg}</ThemedText>
                </View>
              )}

              <View style={[s.formCard, { backgroundColor: theme.backgroundElement }]}>
                {/* Avatar Placeholder or View */}
                <View style={s.avatarContainer}>
                  <View style={[s.avatarCircle, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={s.avatarLetter}>
                      {(profile?.fullName || user.email || 'A')[0].toUpperCase()}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {user.email}
                  </ThemedText>
                </View>

                {/* Edit Fields */}
                <View style={s.inputWrapper}>
                  <ThemedText type="smallBold" style={s.label}>
                    Full Name
                  </ThemedText>
                  <TextInput
                    style={[
                      s.input,
                      {
                        backgroundColor: theme.background,
                        color: theme.text,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter full name"
                    placeholderTextColor={theme.textSecondary}
                    accessibilityLabel="Edit full name"
                  />
                </View>

                <View style={s.inputWrapper}>
                  <ThemedText type="smallBold" style={s.label}>
                    Phone Number
                  </ThemedText>
                  <TextInput
                    style={[
                      s.input,
                      {
                        backgroundColor: theme.background,
                        color: theme.text,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Enter phone number"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    accessibilityLabel="Edit phone number"
                  />
                </View>

                <View style={s.inputWrapper}>
                  <ThemedText type="smallBold" style={s.label}>
                    Avatar URL
                  </ThemedText>
                  <TextInput
                    style={[
                      s.input,
                      {
                        backgroundColor: theme.background,
                        color: theme.text,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                    value={editAvatar}
                    onChangeText={setEditAvatar}
                    placeholder="Enter avatar image URL"
                    placeholderTextColor={theme.textSecondary}
                    accessibilityLabel="Edit avatar url"
                  />
                </View>

                <Pressable
                  style={[s.btn, actionLoading && { opacity: 0.7 }]}
                  onPress={handleUpdateProfile}
                  disabled={actionLoading}
                  accessibilityLabel="Save Profile Changes"
                  accessibilityRole="button"
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText style={s.btnText}>Save Changes</ThemedText>
                  )}
                </Pressable>

                <Pressable
                  style={[s.signOutBtn, { borderColor: theme.textSecondary }]}
                  onPress={handleSignOut}
                  disabled={actionLoading}
                  accessibilityLabel="Sign Out"
                  accessibilityRole="button"
                >
                  <ThemedText style={[s.signOutBtnText, { color: theme.text }]}>
                    Sign Out
                  </ThemedText>
                </Pressable>
              </View>
              {renderBiometricSetting()}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Not authenticated Forms: Sign In / Sign Up
  return (
    <ThemedView style={s.container}>
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={s.scrollContent}>
            <ThemedText type="subtitle" style={s.headerTitle}>
              {isSignUpFlow ? 'Create Account' : 'Sign In'}
            </ThemedText>

            {errorMsg && (
              <View style={s.errorBlock}>
                <ThemedText style={s.errorMsgText}>{errorMsg}</ThemedText>
              </View>
            )}

            <View style={[s.formCard, { backgroundColor: theme.backgroundElement }]}>
              {isSignUpFlow && (
                <View style={s.inputWrapper}>
                  <TextInput
                    style={[
                      s.input,
                      {
                        backgroundColor: theme.background,
                        color: theme.text,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    placeholderTextColor={theme.textSecondary}
                    accessibilityLabel="Full name input field"
                  />
                </View>
              )}

              <View style={s.inputWrapper}>
                <TextInput
                  style={[
                    s.input,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accessibilityLabel="Email input field"
                />
              </View>

              {isSignUpFlow && (
                <View style={s.inputWrapper}>
                  <TextInput
                    style={[
                      s.input,
                      {
                        backgroundColor: theme.background,
                        color: theme.text,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter phone number"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    accessibilityLabel="Phone number input field"
                  />
                </View>
              )}

              <View style={s.inputWrapper}>
                <TextInput
                  style={[
                    s.input,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  accessibilityLabel="Password input field"
                />
              </View>

              {isSignUpFlow && (
                <View style={s.inputWrapper}>
                  <TextInput
                    style={[
                      s.input,
                      {
                        backgroundColor: theme.background,
                        color: theme.text,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry
                    accessibilityLabel="Confirm password input field"
                  />
                </View>
              )}

              <Pressable
                style={[s.btn, actionLoading && { opacity: 0.7 }]}
                onPress={isSignUpFlow ? handleSignUp : handleSignIn}
                disabled={actionLoading}
                accessibilityLabel={isSignUpFlow ? 'Submit Registration' : 'Submit Sign In'}
                accessibilityRole="button"
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={s.btnText}>
                    {isSignUpFlow ? 'Sign Up' : 'Sign In'}
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                style={s.toggleFlowLink}
                onPress={() => {
                  setIsSignUpFlow(!isSignUpFlow);
                  setErrorMsg(null);
                }}
                accessibilityLabel={
                  isSignUpFlow
                    ? 'Switch back to login flow'
                    : 'Switch to registration flow'
                }
                accessibilityRole="button"
              >
                <ThemedText type="linkPrimary">
                  {isSignUpFlow
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </ThemedText>
              </Pressable>
            </View>
            {renderBiometricSetting()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safe: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingBottom: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  headerTitle: {
    marginVertical: Spacing.three,
    textAlign: 'center',
  },
  card: {
    padding: Spacing.four,
    borderRadius: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  formCard: {
    padding: Spacing.four,
    borderRadius: 8,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  label: {
    marginBottom: Spacing.one,
  },
  inputWrapper: {
    marginBottom: Spacing.three,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#208AEF',
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutBtn: {
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  signOutBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleFlowLink: {
    marginTop: Spacing.three,
    alignItems: 'center',
  },
  errorBlock: {
    backgroundColor: '#FFECEF',
    borderWidth: 1,
    borderColor: '#FFCCD3',
    padding: Spacing.two,
    borderRadius: 6,
    marginVertical: Spacing.two,
  },
  errorMsgText: {
    color: '#D92D20',
    fontSize: 14,
    textAlign: 'center',
  },
  biometricCard: {
    padding: Spacing.four,
    borderRadius: 8,
    width: '100%',
    marginTop: Spacing.four,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  biometricTextContainer: {
    flex: 1,
    marginRight: Spacing.two,
  },
  biometricLabel: {
    marginBottom: Spacing.one,
  },
  biometricDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
