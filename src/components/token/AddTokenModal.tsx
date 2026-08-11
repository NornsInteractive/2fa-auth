import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAddTokenMutation } from '../../api/hooks';
import { getColorPalette } from '../../theme/colors';
import { parseOtpAuthUri } from '../../utils/totp';
import { useToast } from '../common/Toast';
import { t } from '../../utils/i18n';
import { Icon } from '../common/Icon';
import { CustomField, OTPAlgorithm } from '../../types/token';
import { ProviderPickerModal } from '../common/ProviderPickerModal';
import { CategoryPickerModal } from '../common/CategoryPickerModal';

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
  const [iconType, setIconType] = useState('shield');
  const [accountName, setAccountName] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('work');
  const [backupCodesText, setBackupCodesText] = useState('');
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [algorithm, setAlgorithm] = useState<OTPAlgorithm>('SHA1');
  const [digits, setDigits] = useState<number>(6);
  const [period, setPeriod] = useState<number>(30);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [providerPickerVisible, setProviderPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const currentCategory = categories.find((c) => c.id === selectedCategory) || categories[0];

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

  const handleAddCustomField = () => {
    const newField: CustomField = {
      id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      key: '',
      value: '',
    };
    setCustomFields([...customFields, newField]);
  };

  const handleUpdateCustomField = (id: string, field: 'key' | 'value', text: string) => {
    setCustomFields(
      customFields.map((f) => (f.id === id ? { ...f, [field]: text } : f))
    );
  };

  const handleDeleteCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
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

    // Parse backup codes (one per line or separated by space)
    const backupCodes = backupCodesText
      .split(/[\n, ]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const validCustomFields = customFields.filter((f) => f.key.trim() && f.value.trim());

    try {
      await addTokenMutation.mutateAsync({
        issuer: issuer.trim(),
        accountName: accountName.trim(),
        secretKey: cleanKey,
        categoryId: selectedCategory,
        iconType,
        algorithm,
        digits,
        period,
        notes: notes.trim(),
        backupCodes,
        customFields: validCustomFields,
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
    setIconType('shield');
    setAccountName('');
    setSecretKey('');
    setSelectedCategory('work');
    setBackupCodesText('');
    setNotes('');
    setCustomFields([]);
    setAlgorithm('SHA1');
    setDigits(6);
    setPeriod(30);
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
                {language === 'zh' ? '新增密钥' : 'Add New 2FA Key'}
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
                {t('pasteOtpUri', language)} (可选)
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

            {/* Provider Selection Button (Opens Fuzzy-search ProviderPickerModal) */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {language === 'zh' ? '提供商 (Issuer)' : 'Provider / Issuer'} *
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setProviderPickerVisible(true)}
                style={[
                  styles.pickerTrigger,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.outlineVariant,
                  },
                ]}
              >
                <View style={styles.pickerTriggerLeft}>
                  <Icon name={iconType || 'hub'} size={18} color={palette.primary} />
                  <Text
                    style={[
                      styles.pickerTriggerText,
                      { color: issuer ? palette.onSurface : palette.outline },
                    ]}
                  >
                    {issuer || (language === 'zh' ? '点击搜索选择提供商 (如 Google, GitHub...)' : 'Click to select provider')}
                  </Text>
                </View>
                <Icon name="arrow_drop_down" size={20} color={palette.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Account Name */}
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

            {/* Secret Key */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('secretKeyLabel', language)} *
              </Text>
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

            {/* Category Selection (Opens Fuzzy-search CategoryPickerModal) */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('categorySelectLabel', language)}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setCategoryPickerVisible(true)}
                style={[
                  styles.pickerTrigger,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.outlineVariant,
                  },
                ]}
              >
                <View style={styles.pickerTriggerLeft}>
                  <Icon name={currentCategory?.icon || 'folder'} size={18} color={currentCategory?.color || palette.primary} />
                  <Text style={[styles.pickerTriggerText, { color: palette.onSurface }]}>
                    {currentCategory?.nameKey ? t(currentCategory.nameKey as any, language) : currentCategory?.name || '选择分类'}
                  </Text>
                </View>
                <Icon name="arrow_drop_down" size={20} color={palette.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Optional Fields Section: Backup Codes, Notes, Custom Fields */}
            <View style={[styles.optionalSection, { backgroundColor: palette.surfaceContainerLow, borderColor: palette.outlineVariant }]}>
              <Text style={[styles.optionalSectionTitle, { color: palette.primary }]}>
                {language === 'zh' ? '附加安全信息 (非必填)' : 'Additional Security Info (Optional)'}
              </Text>

              {/* Backup Codes (Multi-line text area to store provider backup codes for copy) */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '提供商备份恢复码 (Recovery Codes)' : 'Provider Backup Recovery Codes'}
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    styles.monoInput,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.outlineVariant,
                      color: palette.onSurface,
                    },
                  ]}
                  placeholder={
                    language === 'zh'
                      ? '输入或粘贴提供商给您的备份恢复码（每行一个），以供后续快速复制使用...'
                      : 'Paste provider backup recovery codes here (one per line)...'
                  }
                  placeholderTextColor={palette.outline}
                  value={backupCodesText}
                  onChangeText={setBackupCodesText}
                  multiline
                  numberOfLines={3}
                />
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
                  placeholder={language === 'zh' ? '添加备注信息 (如注册邮箱、安全提示)...' : 'Add notes or security hints...'}
                  placeholderTextColor={palette.outline}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Custom Key-Value Fields */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                    {language === 'zh' ? '自定义字段 (Key-Value)' : 'Custom Fields'}
                  </Text>
                  <TouchableOpacity onPress={handleAddCustomField}>
                    <Text style={[styles.helperAction, { color: palette.primary }]}>
                      {language === 'zh' ? '+ 添加字段' : '+ Add Field'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {customFields.map((cf) => (
                  <View key={cf.id} style={styles.customFieldRow}>
                    <TextInput
                      style={[
                        styles.customFieldInput,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.outlineVariant,
                          color: palette.onSurface,
                        },
                      ]}
                      placeholder={language === 'zh' ? '字段名 (如 PIN/手机)' : 'Field Name'}
                      placeholderTextColor={palette.outline}
                      value={cf.key}
                      onChangeText={(txt) => handleUpdateCustomField(cf.id, 'key', txt)}
                    />
                    <TextInput
                      style={[
                        styles.customFieldInput,
                        {
                          backgroundColor: palette.surface,
                          borderColor: palette.outlineVariant,
                          color: palette.onSurface,
                          flex: 1.5,
                        },
                      ]}
                      placeholder={language === 'zh' ? '字段值' : 'Value'}
                      placeholderTextColor={palette.outline}
                      value={cf.value}
                      onChangeText={(txt) => handleUpdateCustomField(cf.id, 'value', txt)}
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteCustomField(cf.id)}
                      style={[styles.deleteCfBtn, { backgroundColor: palette.surface }]}
                    >
                      <Icon name="close" size={16} color={palette.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
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

      {/* Provider Picker Modal */}
      <ProviderPickerModal
        visible={providerPickerVisible}
        selectedProviderName={issuer}
        onSelect={(pName, pIcon) => {
          setIssuer(pName);
          if (pIcon) setIconType(pIcon);
          setErrorMessage('');
        }}
        onClose={() => setProviderPickerVisible(false)}
      />

      {/* Category Picker Modal */}
      <CategoryPickerModal
        visible={categoryPickerVisible}
        selectedCategoryId={selectedCategory}
        onSelect={(cId) => setSelectedCategory(cId)}
        onClose={() => setCategoryPickerVisible(false)}
      />
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
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 70,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    cursor: 'pointer',
  },
  pickerTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerTriggerText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  },
  monoInput: {
    fontFamily: 'JetBrains Mono, monospace',
    letterSpacing: 1.5,
  },
  optionalSection: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 4,
  },
  optionalSectionTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  customFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  customFieldInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  deleteCfBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedToggle: {
    marginVertical: 6,
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
