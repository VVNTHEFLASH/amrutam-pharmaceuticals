import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';

import { useToastStore } from '@/store/toastStore';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: Math.max(insets.top, 24) }]}>
      {toasts.map((toast) => {
        const borderColors = {
          success: '#2ecc71',
          error: '#E74C3C',
          info: '#3498DB',
        };

        const Icons = {
          success: CheckCircle2,
          error: AlertCircle,
          info: Info,
        };

        const IconComponent = Icons[toast.type];

        return (
          <View
            key={toast.id}
            accessibilityRole="alert"
            style={[
              styles.toast,
              {
                backgroundColor: theme.backgroundElement,
                borderLeftColor: borderColors[toast.type],
                shadowColor: '#000',
              },
            ]}
          >
            <View style={styles.iconContainer}>
              <IconComponent size={20} color={borderColors[toast.type]} />
            </View>
            <View style={styles.content}>
              {toast.title && (
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {toast.title}
                </ThemedText>
              )}
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {toast.description}
              </ThemedText>
            </View>
            {toast.action && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={toast.action.label}
                onPress={() => {
                  toast.action?.onPress();
                  dismissToast(toast.id);
                }}
                style={styles.actionBtn}
              >
                <ThemedText type="smallBold" style={styles.actionText}>
                  {toast.action.label}
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              onPress={() => dismissToast(toast.id)}
              style={styles.closeBtn}
              accessibilityLabel="Dismiss notification"
            >
              <X size={16} color={theme.textSecondary} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 9999,
    gap: Spacing.two,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 450,
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: Spacing.three,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      },
    }),
  },
  iconContainer: {
    marginRight: Spacing.three,
  },
  content: {
    flex: 1,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  actionBtn: {
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 6,
    marginRight: Spacing.two,
  },
  actionText: {
    color: '#FFFFFF',
  },
});
