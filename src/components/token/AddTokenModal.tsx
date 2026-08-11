import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAddTokenMutation } from '../../api/hooks';
import { getColorPalette } from '../../theme/colors';
import { generateBackupCodes, generateRandomSecret, parseOtpAuthUri } from '../../utils/totp';
import { useToast } from '../common/Toast';
import { t } from '../../utils/i18n';
import { Icon } from '../common/Icon';
import { OTPAlgorithm } from '../../types/token';

interface AddTokenModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddTokenModal: React.FC<AddTokenModalProps> = ({ visible, onClose }) => {
  const { showToast } = useToast();
  const categories = useCategoryStore((s) => s.categories);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);
  const addTokenMutation = useAddTokenMutation();

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [uriInput, setUriInput] = useState('');
  const [issuer, setIssuer] = useState('');
  const [accountName, setAccountName] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('work');
  const [algorithm, setAlgorithm] = useState<OTPAlgorithm>('SHA1');
  const [digits, setDigits] = useState<number>(6);
  const [period, setPeriod] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleUriChange = (val: string) => {
    setUriInput(val);
    if (val.startsWith('otpauth://')) {
      const parsed = parseOtpAuthUri(val);
      if (parsed) {
        setIssuer(parsed.issuer);
        setAccountName(parsed.account);
        setSecretKey(parsed.secret);
        if (parsed.algorithm) setAlgorithm(parsed.algorithm);
        if (parsed.digits) setDigits(parsed.digits);
        if (parsed.period) setPeriod(parsed.period);
        setErrorMessage('');
      }
    }
  };

  const handleGenerateTestKey = () => {
    const key = generateRandomSecret(20);
    setSecretKey(key);
    if (!issuer) setIssuer('Fortress Test');
    if (!accountName) setAccountName('user@test.io');
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    if (!issuer.trim()) {
      setErrorMessage(t('issuerPlaceholder', language));
      return;
    }
    if (!accountName.trim()) {
      setErrorMessage(t('accountNamePlaceholder', language));
      return;
    }
    const cleanKey = secretKey.trim().toUpperCase().replace(/\s/g, '');
    if (!cleanKey || cleanKey.length < 8) {
      setErrorMessage(t('invalidSecretKey', language));
      return;
    }

    try {
      await addTokenMutation.mutateAsync({
        issuer: issuer.trim(),
        accountName: accountName.trim(),
        secretKey: cleanKey,
        categoryId: selectedCategory,
        algorithm,
        digits,
        period,
        notes,
        backupCodes: generateBackupCodes(10),
      });

      showToast(t('tokenAddedSuccess', language), 'check_circle');
      handleReset();
      onClose();
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to add token');
    }
  };

  const handleReset = () => {
    setUriInput('');
    setIssuer('');
    setAccountName('');
    setSecretKey('');
    setSelectedCategory('work');
    setAlgorithm('SHA1');
    setDigits(6);
    setPeriod(30);
    setNotes('');
    setErrorMessage('');
    setShowAdvanced(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: palette.surfaceContainer,
              borderColor: palette.outlineVariant,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBox, { backgroundColor: palette.primaryContainer }]}>
                <Icon name="shield_lock" size={20} color="#ffffff" fill />
              </View>
              <Text style={[styles.modalTitle, { color: palette.onSurface }]}>
                {t('addTokenTitle', language)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={palette.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Quick OTPAuth URI Input */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('pasteOtpUri', language)}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.outlineVariant,
                    color: palette.onSurface,
                  },
                ]}
                placeholder={t('pasteUriPlaceholder', language)}
                placeholderTextColor={palette.outline}
                value={uriInput}
                onChangeText={handleUriChange}
              />
            </View>

            {/* Issuer & Account */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('issuerLabel', language)} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.outlineVariant,
                    color: palette.onSurface,
                  },
                ]}
                placeholder={t('issuerPlaceholder', language)}
                placeholderTextColor={palette.outline}
                value={issuer}
                onChangeText={(v) => {
                  setIssuer(v);
                  setErrorMessage('');
                }}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('accountNameLabel', language)} *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.outlineVariant,
                    color: palette.onSurface,
                  },
                ]}
                placeholder={t('accountNamePlaceholder', language)}
                placeholderTextColor={palette.outline}
                value={accountName}
                onChangeText={(v) => {
                  setAccountName(v);
                  setErrorMessage('');
                }}
              />
            </View>

            {/* Secret Key with Test Generator */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                  {t('secretKeyLabel', language)} *
                </Text>
                <TouchableOpacity onPress={handleGenerateTestKey}>
                  <Text style={[styles.helperAction, { color: palette.primary }]}>
                    {t('generateDemoKey', language)}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.monoInput,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.outlineVariant,
                    color: palette.primary,
                  },
                ]}
                placeholder={t('secretKeyPlaceholder', language)}
                placeholderTextColor={palette.outline}
                value={secretKey}
                onChangeText={(v) => {
                  setSecretKey(v);
                  setErrorMessage('');
                }}
                autoCapitalize="characters"
              />
            </View>

            {/* Category Selection */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('categorySelectLabel', language)}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categories.map((c) => {
                  const isSelected = selectedCategory === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedCategory(c.id)}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: isSelected
                            ? palette.primaryContainer
                            : palette.surfaceContainerLow,
                          borderColor: isSelected ? palette.primary : palette.outlineVariant,
                        },
                      ]}
                    >
                      <Icon
                        name={c.icon || 'folder'}
                        size={14}
                        color={isSelected ? palette.onPrimaryContainer : palette.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.catPillText,
                          {
                            color: isSelected
                              ? palette.onPrimaryContainer
                              : palette.onSurfaceVariant,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {c.nameKey ? t(c.nameKey as any, language) : c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Advanced Toggle */}
            <TouchableOpacity
              onPress={() => setShowAdvanced(!showAdvanced)}
              style={styles.advancedToggle}
            >
              <Text style={[styles.advancedToggleText, { color: palette.primary }]}>
                {showAdvanced ? '− 隐藏高级选项' : '+ 高级选项 (算法/位数/周期)'}
              </Text>
            </TouchableOpacity>

            {showAdvanced && (
              <View style={[styles.advancedSection, { backgroundColor: palette.surfaceContainerLow }]}>
                {/* Digits */}
                <View style={styles.formRow}>
                  <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                    {t('digitsLabel', language)}:
                  </Text>
                  <View style={styles.optionGroup}>
                    {[6, 8].map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setDigits(d)}
                        style={[
                          styles.smallOption,
                          digits === d && { backgroundColor: palette.primaryContainer },
                        ]}
                      >
                        <Text style={{ color: digits === d ? '#ffffff' : palette.onSurface }}>
                          {d} 位
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Algorithm */}
                <View style={styles.formRow}>
                  <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                    {t('algorithmLabel', language)}:
                  </Text>
                  <View style={styles.optionGroup}>
                    {(['SHA1', 'SHA256'] as OTPAlgorithm[]).map((a) => (
                      <TouchableOpacity
                        key={a}
                        onPress={() => setAlgorithm(a)}
                        style={[
                          styles.smallOption,
                          algorithm === a && { backgroundColor: palette.primaryContainer },
                        ]}
                      >
                        <Text style={{ color: algorithm === a ? '#ffffff' : palette.onSurface }}>
                          {a}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                    {t('notesLabel', language)}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: palette.surface,
                        borderColor: palette.outlineVariant,
                        color: palette.onSurface,
                      },
                    ]}
                    placeholder="可选备注..."
                    placeholderTextColor={palette.outline}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
              </View>
            )}

            {/* Error message */}
            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: palette.errorContainer }]}>
                <Icon name="error" size={18} color={palette.error} />
                <Text style={[styles.errorText, { color: palette.onErrorContainer }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: palette.outlineVariant }]}
            >
              <Text style={[styles.cancelBtnText, { color: palette.onSurfaceVariant }]}>
                {t('cancelButton', language)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitBtn, { backgroundColor: palette.primary }]}
            >
              <Text style={styles.submitBtnText}>{t('saveButton', language)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 17,
    fontWeight: '700',
  },
  scrollBody: {
    padding: 18,
  },
  formGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  helperAction: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
    cursor: 'pointer',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  },
  monoInput: {
    fontFamily: 'JetBrains Mono, monospace',
    letterSpacing: 1.5,
  },
  catScroll: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    marginRight: 8,
  },
  catPillText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
  },
  advancedToggle: {
    marginVertical: 8,
  },
  advancedToggleText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '600',
  },
  advancedSection: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 10,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  smallOption: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  submitBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '700',
  },
});
