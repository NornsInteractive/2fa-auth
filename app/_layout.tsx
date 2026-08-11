import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, Text, TextInput, TouchableOpacity } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../tamagui.config';
import { queryClient } from '../src/api/client';
import { ToastProvider } from '../src/components/common/Toast';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useAuthStore } from '../src/store/useAuthStore';
import { useCategoryStore } from '../src/store/useCategoryStore';
import { useTokenStore } from '../src/store/useTokenStore';
import { getColorPalette } from '../src/theme/colors';
import { getRemainingSeconds } from '../src/utils/totp';
import { t } from '../src/utils/i18n';
import { Icon } from '../src/components/common/Icon';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLocked = useAuthStore((s) => s.isLocked);
  const lastActiveTimestamp = useAuthStore((s) => s.lastActiveTimestamp);
  const unlockVault = useAuthStore((s) => s.unlockVault);
  const lockVault = useAuthStore((s) => s.lockVault);
  const loadAuth = useAuthStore((s) => s.loadAuth);
  const touchActive = useAuthStore((s) => s.touchActive);

  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const loadTokens = useTokenStore((s) => s.loadTokens);
  const setRemainingSeconds = useTokenStore((s) => s.setRemainingSeconds);

  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  // Initialize App Data
  useEffect(() => {
    loadSettings();
    loadAuth();
    loadCategories();
    loadTokens();
  }, []);

  // Global 1-second TOTP clock timer & auto-lock monitor
  useEffect(() => {
    const interval = setInterval(() => {
      const rem = getRemainingSeconds(30);
      setRemainingSeconds(rem);

      // Check auto-lock
      if (autoLockMinutes > 0 && isAuthenticated && !isLocked) {
        const elapsedMinutes = (Date.now() - lastActiveTimestamp) / (1000 * 60);
        if (elapsedMinutes >= autoLockMinutes) {
          lockVault();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [autoLockMinutes, isAuthenticated, isLocked, lastActiveTimestamp]);

  // Inject Web Material Symbols & Fonts on Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const handleUnlock = async () => {
    if (!unlockPassword) return;
    const res = await unlockVault(unlockPassword);
    if (res.success) {
      setUnlockPassword('');
      setUnlockError('');
    } else {
      setUnlockError(t('loginFailed', language));
    }
  };

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  return (
    <QueryClientProvider client={queryClient}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={isDark ? 'dark' : 'light'}>
        <ToastProvider>
          <View
            style={[styles.rootContainer, { backgroundColor: palette.background }]}
            // @ts-ignore
            onPointerDown={touchActive}
          >
            {/* Vault Locked Screen Overlay */}
            {isLocked && !isAuthRoute ? (
              <View style={[styles.lockedOverlay, { backgroundColor: palette.background }]}>
                <View
                  style={[
                    styles.lockedCard,
                    {
                      backgroundColor: palette.surfaceContainer,
                      borderColor: palette.outlineVariant,
                    },
                  ]}
                >
                  <View style={[styles.lockIconBox, { backgroundColor: palette.primaryContainer }]}>
                    <Icon name="lock" size={32} color="#ffffff" fill />
                  </View>
                  <Text style={[styles.lockedTitle, { color: palette.onSurface }]}>
                    {t('vaultSecure', language)}
                  </Text>
                  <Text style={[styles.lockedSubtitle, { color: palette.onSurfaceVariant }]}>
                    {t('welcomeBack', language)}
                  </Text>

                  <View style={styles.unlockForm}>
                    <View
                      style={[
                        styles.inputWrapper,
                        {
                          backgroundColor: palette.surface,
                          borderColor: unlockError ? palette.error : palette.outlineVariant,
                        },
                      ]}
                    >
                      <Icon name="key" size={20} color={palette.onSurfaceVariant} style={styles.fieldIcon} />
                      <TextInput
                        style={[styles.fieldInput, { color: palette.onSurface }]}
                        placeholder={t('masterPasswordLabel', language)}
                        placeholderTextColor={palette.outline}
                        secureTextEntry={!showPassword}
                        value={unlockPassword}
                        onChangeText={(v) => {
                          setUnlockPassword(v);
                          setUnlockError('');
                        }}
                        onSubmitEditing={handleUnlock}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Icon
                          name={showPassword ? 'visibility_off' : 'visibility'}
                          size={20}
                          color={palette.onSurfaceVariant}
                        />
                      </TouchableOpacity>
                    </View>

                    {unlockError ? (
                      <Text style={[styles.errorText, { color: palette.error }]}>
                        {unlockError}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleUnlock}
                      style={[styles.unlockButton, { backgroundColor: palette.primary }]}
                    >
                      <Icon name="lock_open" size={18} color="#ffffff" />
                      <Text style={styles.unlockButtonText}>{t('navUnlockVault', language)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <Slot />
            )}
          </View>
        </ToastProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    minHeight: '100%',
    width: '100%',
  },
  lockedOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  lockedCard: {
    width: '100%',
    maxWidth: 380,
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  lockIconBox: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  unlockForm: {
    width: '100%',
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  },
  errorText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    textAlign: 'center',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 9999,
    marginTop: 6,
    cursor: 'pointer',
  },
  unlockButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 15,
    fontWeight: '700',
  },
});
