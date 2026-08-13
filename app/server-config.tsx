import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useAuthStore } from '../src/store/useAuthStore';
import { getColorPalette } from '../src/theme/colors';
import { t } from '../src/utils/i18n';
import { Icon } from '../src/components/common/Icon';

export default function ServerConfigScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  const setServerUrl = useSettingsStore((s) => s.setServerUrl);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [inputUrl, setInputUrl] = useState(serverUrl || '');
  const [originalUrl, setOriginalUrl] = useState(serverUrl || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');

  useEffect(() => {
    const current = useSettingsStore.getState().serverUrl || '';
    setInputUrl(current);
    setOriginalUrl(current);
  }, []);

  const validateUrl = (url: string): string | null => {
    const trimmed = url.trim();
    if (!trimmed) {
      return language === 'zh' ? '请输入服务端地址' : 'Please enter server URL';
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      return language === 'zh'
        ? '服务器地址须包含 http:// 或 https:// 协议头'
        : 'Server URL must start with http:// or https://';
    }
    return null;
  };

  const handleSaveAndContinue = async () => {
    const err = validateUrl(inputUrl);
    if (err) {
      setErrorMsg(err);
      return;
    }

    const cleanUrl = inputUrl.trim().replace(/\/+$/, '');
    setErrorMsg('');
    setTestSuccessMsg('');
    setTesting(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // Attempt healthcheck or token API ping
      let testRes = await fetch(`${cleanUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);

      if (!testRes) {
        testRes = await fetch(`${cleanUrl}/api/tokens`, {
          method: 'GET',
          signal: controller.signal,
        }).catch(() => null);
      }

      clearTimeout(timeoutId);

      if (testRes && (testRes.ok || testRes.status === 200 || testRes.status === 400 || testRes.status === 401)) {
        setTestSuccessMsg(t('serverConnSuccess', language));
        setTesting(false);

        const urlChanged = cleanUrl !== originalUrl;

        if (!urlChanged) {
          // Domain did NOT change
          setServerUrl(cleanUrl);
          if (isAuthenticated) {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/settings');
            }
          } else {
            router.replace('/login');
          }
        } else {
          // Domain HAS changed
          if (isAuthenticated) {
            setPendingUrl(cleanUrl);
            setShowConfirmModal(true);
          } else {
            setServerUrl(cleanUrl);
            router.replace('/login');
          }
        }
      } else {
        setTesting(false);
        setErrorMsg(t('serverConnFailed', language));
      }
    } catch (e: any) {
      setTesting(false);
      setErrorMsg(
        language === 'zh'
          ? `无法连接至服务器 (${e.message || '网络连接超时'})。请检查域名拼写及 Worker CORS 配置。`
          : `Connection failed (${e.message || 'Timeout'}). Please check URL and CORS.`
      );
    }
  };

  const handleConfirmChangeDomain = async () => {
    setShowConfirmModal(false);
    await logout(); // Clear current login session
    setServerUrl(pendingUrl);
    router.replace('/login');
  };

  const handleUseLocalMode = async () => {
    const urlChanged = '' !== originalUrl;
    if (urlChanged && isAuthenticated) {
      setPendingUrl('');
      setShowConfirmModal(true);
    } else {
      setServerUrl('');
      if (isAuthenticated) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/settings');
        }
      } else {
        router.replace('/login');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            isDesktop && styles.desktopCard,
            {
              backgroundColor: palette.surfaceContainer,
              borderColor: palette.outlineVariant,
            },
          ]}
        >
          {/* Header Icon */}
          <View style={[styles.iconContainer, { backgroundColor: palette.primaryContainer }]}>
            <Icon name="dns" size={32} color="#ffffff" />
          </View>

          {/* Title & Subtitle */}
          <Text style={[styles.title, { color: palette.onSurface }]}>
            {t('serverConfigTitle', language)}
          </Text>
          <Text style={[styles.subtitle, { color: palette.onSurfaceVariant }]}>
            {t('serverConfigSub', language)}
          </Text>

          {/* URL Input Form */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: palette.onSurface }]}>
              {t('serverUrlLabel', language)}
            </Text>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: palette.surface,
                  borderColor: errorMsg ? palette.error : palette.outlineVariant,
                },
              ]}
            >
              <Icon name="link" size={20} color={palette.onSurfaceVariant} style={styles.fieldIcon} />
              <TextInput
                style={[styles.fieldInput, { color: palette.onSurface }]}
                placeholder={t('serverUrlPlaceholder', language)}
                placeholderTextColor={palette.outline}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                value={inputUrl}
                onChangeText={(v) => {
                  setInputUrl(v);
                  setErrorMsg('');
                  setTestSuccessMsg('');
                }}
                onSubmitEditing={handleSaveAndContinue}
              />
            </View>

            {errorMsg ? (
              <Text style={[styles.errorText, { color: palette.error }]}>{errorMsg}</Text>
            ) : null}

            {testSuccessMsg ? (
              <Text style={[styles.successText, { color: palette.primary }]}>
                {testSuccessMsg}
              </Text>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSaveAndContinue}
              disabled={testing}
              style={[styles.primaryButton, { backgroundColor: palette.primary }]}
            >
              {testing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Icon name="check_circle" size={20} color="#ffffff" />
                  <Text style={styles.primaryButtonText}>
                    {t('saveAndContinue', language)}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleUseLocalMode}
              style={[styles.secondaryButton, { backgroundColor: palette.surfaceContainerLow }]}
            >
              <Icon name="phone_iphone" size={18} color={palette.onSurfaceVariant} />
              <Text style={[styles.secondaryButtonText, { color: palette.onSurfaceVariant }]}>
                {t('useOfflineMode', language)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Information Notice Footer */}
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: palette.surfaceContainerLow,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <Icon name="info" size={18} color={palette.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.infoText, { color: palette.onSurfaceVariant }]}>
              {language === 'zh'
                ? '提示：服务地址随时可以在“系统设置”页面进行修改或清除。本地保存的密钥在未绑定服务端时依然 100% 离线安全保存于手机。'
                : 'Note: You can update or clear your server URL anytime in Settings. Local keys remain 100% offline secure on device.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirmation Modal for Domain Change while Authenticated */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <View style={[styles.modalIconBox, { backgroundColor: palette.errorContainer }]}>
              <Icon name="warning" size={32} color={palette.error} />
            </View>

            <Text style={[styles.modalTitle, { color: palette.onSurface }]}>
              {language === 'zh' ? '确认更改服务端域名？' : 'Confirm Domain Change'}
            </Text>
            <Text style={[styles.modalMsg, { color: palette.onSurfaceVariant }]}>
              {language === 'zh'
                ? '检测到服务器地址发生变更。保存新地址将自动清除当前账号的登录状态并重新加载云端数据，是否确认继续？'
                : 'Server address has changed. Saving will log out current session to reload new server data. Proceed?'}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={[styles.modalCancelBtn, { borderColor: palette.outlineVariant }]}
              >
                <Text style={[styles.modalCancelText, { color: palette.onSurfaceVariant }]}>
                  {t('cancelButton', language)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmChangeDomain}
                style={[styles.modalConfirmBtn, { backgroundColor: palette.error }]}
              >
                <Text style={styles.modalConfirmText}>
                  {language === 'zh' ? '确认退出并切换' : 'Logout & Switch'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 28,
    padding: 32,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  desktopCard: {
    padding: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  formGroup: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
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
    marginTop: 6,
  },
  successText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    height: 48,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 44,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  secondaryButtonText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalMsg: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '700',
  },
});
