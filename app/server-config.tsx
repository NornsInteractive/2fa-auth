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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../src/store/useSettingsStore';
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

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [inputUrl, setInputUrl] = useState(serverUrl || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState('');

  useEffect(() => {
    if (serverUrl) {
      setInputUrl(serverUrl);
    }
  }, [serverUrl]);

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
      // Optional ping test
      const testRes = await fetch(`${cleanUrl}/api/tokens`, { method: 'GET' }).catch(() => null);
      if (testRes) {
        setTestSuccessMsg(
          language === 'zh' ? '服务器连接成功！' : 'Successfully connected to server!'
        );
      }
    } catch (_) {
      // Allow proceeding even if offline
    } finally {
      setTesting(false);
      setServerUrl(cleanUrl);
      // Navigate to login
      router.replace('/login');
    }
  };

  const handleUseLocalMode = () => {
    setServerUrl('');
    router.replace('/login');
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
            {language === 'zh' ? '配置服务端域名' : 'Server Endpoint Setup'}
          </Text>
          <Text style={[styles.subtitle, { color: palette.onSurfaceVariant }]}>
            {language === 'zh'
              ? '请输入您的 Cloudflare Workers 后端服务器地址，以连接云端 D1 数据库并进行跨设备同步。'
              : 'Enter your Cloudflare Workers backend address to connect to D1 database for cross-device sync.'}
          </Text>

          {/* URL Input Form */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: palette.onSurface }]}>
              {language === 'zh' ? '服务端 URL 地址' : 'Server URL'}
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
                placeholder="https://mimir-2fa-api.workers.dev"
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
                    {language === 'zh' ? '保存并继续登录' : 'Save & Proceed to Login'}
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
                {language === 'zh' ? '使用纯本地模式 (跳过)' : 'Use Local Mode (Skip)'}
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
});
