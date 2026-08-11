import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { getColorPalette } from '../../src/theme/colors';
import { calculatePasswordStrength } from '../../src/utils/crypto';
import { t } from '../../src/utils/i18n';
import { Icon } from '../../src/components/common/Icon';
import { useToast } from '../../src/components/common/Toast';

export default function RegisterScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const register = useAuthStore((s) => s.register);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pwdStrength = calculatePasswordStrength(password);

  const handleRegister = async () => {
    if (!name.trim()) {
      setError(t('fullNamePlaceholder', language));
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError(t('emailPlaceholder', language));
      return;
    }
    if (password.length < 6) {
      setError(t('pwdTooShort', language));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('pwdMismatch', language));
      return;
    }

    setLoading(true);
    setError('');

    const res = await register(name, email, password);
    setLoading(false);

    if (res.success) {
      showToast('保险库创建成功，已安全解锁！', 'shield_lock');
      router.replace('/');
    } else {
      setError(res.error || 'Registration failed');
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
          {/* Accent Line */}
          <View style={[styles.accentLine, { backgroundColor: palette.primary }]} />

          <View style={styles.cardPadding}>
            {/* Header */}
            <View style={styles.headerSection}>
              <View style={[styles.iconContainer, { backgroundColor: palette.primaryContainer }]}>
                <Icon name="shield_lock" size={32} color="#ffffff" fill />
              </View>
              <Text style={[styles.brandTitle, { color: palette.onSurface }]}>
                {t('appName', language)}
              </Text>
              <Text style={[styles.brandSubtitle, { color: palette.onSurfaceVariant }]}>
                {t('createVaultTitle', language)}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: palette.onSurface }]}>
                  {t('fullNameLabel', language)}
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
                  <Icon name="person" size={20} color={palette.outline} style={styles.inputLeadingIcon} />
                  <TextInput
                    style={[styles.textInput, { color: palette.onSurface }]}
                    placeholder={t('fullNamePlaceholder', language)}
                    placeholderTextColor={palette.outline}
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      setError('');
                    }}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: palette.onSurface }]}>
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

              {/* Master Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: palette.onSurface }]}>
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

                {/* Password Strength Bar */}
                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={[styles.strengthBarBg, { backgroundColor: palette.surfaceVariant }]}>
                      <View
                        style={[
                          styles.strengthBarFill,
                          {
                            width: `${pwdStrength.score}%`,
                            backgroundColor: pwdStrength.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.strengthLabel, { color: pwdStrength.color }]}>
                      {language === 'zh' ? pwdStrength.labelZh : pwdStrength.labelEn}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: palette.onSurface }]}>
                  {t('confirmPasswordLabel', language)}
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
                  <Icon name="lock" size={20} color={palette.outline} style={styles.inputLeadingIcon} />
                  <TextInput
                    style={[styles.textInput, styles.passwordInput, { color: palette.onSurface }]}
                    placeholder={t('passwordPlaceholder', language)}
                    placeholderTextColor={palette.outline}
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      setError('');
                    }}
                    onSubmitEditing={handleRegister}
                  />
                </View>
              </View>

              {/* Error */}
              {error ? (
                <View style={[styles.errorContainer, { backgroundColor: palette.errorContainer }]}>
                  <Icon name="error" size={16} color={palette.error} />
                  <Text style={[styles.errorText, { color: palette.onErrorContainer }]}>
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Create Account Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleRegister}
                style={[styles.createButton, { backgroundColor: palette.primary }]}
                disabled={loading}
              >
                <Text style={styles.createButtonText}>{t('createAccount', language)}</Text>
                <Icon name="arrow_forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Footer Sign in Link */}
            <View style={styles.footerSection}>
              <View style={styles.signInRow}>
                <Text style={[styles.footerText, { color: palette.onSurfaceVariant }]}>
                  {t('alreadyHaveAccount', language)}{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={[styles.signInLink, { color: palette.primary }]}>
                    {t('signIn', language)}
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
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    marginTop: 4,
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    paddingVertical: 0,
  },
  passwordInput: {
    letterSpacing: 2,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 9999,
  },
  strengthLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '700',
    width: 48,
    textAlign: 'right',
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 9999,
    marginTop: 6,
    cursor: 'pointer',
  },
  createButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 15,
    fontWeight: '700',
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 18,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  },
  signInLink: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '700',
  },
});
