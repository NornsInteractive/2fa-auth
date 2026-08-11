import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { getColorPalette } from '../../src/theme/colors';
import { t } from '../../src/utils/i18n';
import { Icon } from '../../src/components/common/Icon';
import { useToast } from '../../src/components/common/Toast';

export default function LoginScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const login = useAuthStore((s) => s.login);
  const biometricLogin = useAuthStore((s) => s.biometricLogin);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError(language === 'zh' ? '请输入邮箱与主密码' : 'Please enter email and master password');
      return;
    }

    setLoading(true);
    setError('');

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      showToast(t('welcomeBack', language), 'shield_lock');
      router.replace('/');
    } else {
      setError(res.error || t('loginFailed', language));
    }
  };

  const handleBiometric = async () => {
    setLoading(true);
    const res = await biometricLogin();
    setLoading(false);
    if (res.success) {
      showToast(language === 'zh' ? '生物识别验证成功！' : 'Biometric authenticated', 'fingerprint');
      router.replace('/');
    } else {
      setError(res.error || '生物识别失败');
    }
  };

  return (
    <View style={[styles.pageWrapper, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surfaceContainer,
              borderColor: palette.outlineVariant,
            },
          ]}
        >
          {/* Top Primary Accent Line */}
          <View style={[styles.accentLine, { backgroundColor: palette.primary }]} />

          <View style={styles.cardPadding}>
            {/* Shield Icon Header */}
            <View style={styles.headerSection}>
              <View style={[styles.iconContainer, { backgroundColor: palette.primaryContainer }]}>
                <Icon name="shield_lock" size={32} color="#ffffff" fill />
              </View>
              <Text style={[styles.brandTitle, { color: palette.primary }]}>
                {t('appName', language)}
              </Text>
              <Text style={[styles.brandSubtitle, { color: palette.onSurfaceVariant }]}>
                {t('welcomeBack', language)}
              </Text>
            </View>

            {/* Login Form */}
            <View style={styles.form}>
              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: palette.onSurfaceVariant }]}>
                  {t('emailLabel', language)}
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.outlineVariant,
                    },
                  ]}
                >
                  <Icon name="mail" size={20} color={palette.outline} style={styles.inputLeadingIcon} />
                  <TextInput
                    style={[styles.textInput, { color: palette.onSurface }]}
                    placeholder={t('emailPlaceholder', language)}
                    placeholderTextColor={palette.outline}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setError('');
                    }}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: palette.onSurfaceVariant }]}>
                  {t('masterPasswordLabel', language)}
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.outlineVariant,
                    },
                  ]}
                >
                  <Icon name="key" size={20} color={palette.outline} style={styles.inputLeadingIcon} />
                  <TextInput
                    style={[styles.textInput, styles.passwordInput, { color: palette.onSurface }]}
                    placeholder={t('passwordPlaceholder', language)}
                    placeholderTextColor={palette.outline}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      setError('');
                    }}
                    onSubmitEditing={handleSignIn}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon
                      name={showPassword ? 'visibility_off' : 'visibility'}
                      size={20}
                      color={palette.outline}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={[styles.errorContainer, { backgroundColor: palette.errorContainer }]}>
                  <Icon name="error" size={16} color={palette.error} />
                  <Text style={[styles.errorText, { color: palette.onErrorContainer }]}>
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Sign In Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSignIn}
                style={[styles.signInButton, { backgroundColor: palette.primary }]}
                disabled={loading}
              >
                <Text style={styles.signInButtonText}>{t('signIn', language)}</Text>
                <Icon name="arrow_forward" size={18} color="#ffffff" />
              </TouchableOpacity>

              {/* Or Divider */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: palette.outlineVariant }]} />
                <Text style={[styles.dividerText, { color: palette.outline }]}>
                  {t('orDivider', language)}
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: palette.outlineVariant }]} />
              </View>

              {/* Biometric Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleBiometric}
                style={[
                  styles.biometricButton,
                  {
                    backgroundColor: palette.surfaceContainerHigh,
                    borderColor: palette.outlineVariant,
                  },
                ]}
              >
                <Icon name="fingerprint" size={24} color={palette.primary} />
                <Text style={[styles.biometricButtonText, { color: palette.onSurface }]}>
                  {t('biometricLogin', language)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer Navigation */}
            <View style={styles.footerSection}>
              <View style={styles.createAccountRow}>
                <Text style={[styles.footerText, { color: palette.onSurfaceVariant }]}>
                  {t('newToFortress', language)}{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <Text style={[styles.createAccountLink, { color: palette.primary }]}>
                    {t('createAccount', language)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    minHeight: '100%',
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  accentLine: {
    height: 4,
    width: '100%',
  },
  cardPadding: {
    padding: 28,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  brandTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  brandSubtitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 15,
    paddingVertical: 0,
  },
  passwordInput: {
    letterSpacing: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    flex: 1,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 9999,
    marginTop: 6,
    cursor: 'pointer',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  signInButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 13,
    borderRadius: 9999,
    borderWidth: 1,
    cursor: 'pointer',
  },
  biometricButtonText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 15,
    fontWeight: '600',
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  createAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  },
  createAccountLink: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '700',
  },
});
