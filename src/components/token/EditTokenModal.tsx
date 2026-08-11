import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { CustomField, Token } from '../../types/token';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useTokenStore } from '../../store/useTokenStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { useToast } from '../common/Toast';
import { t } from '../../utils/i18n';
import { Icon } from '../common/Icon';
import { ProviderPickerModal } from '../common/ProviderPickerModal';
import { CategoryPickerModal } from '../common/CategoryPickerModal';

interface EditTokenModalProps {
  visible: boolean;
  token: Token;
  onClose: () => void;
}

export const EditTokenModal: React.FC<EditTokenModalProps> = ({ visible, token, onClose }) => {
  const { showToast } = useToast();
  const categories = useCategoryStore((s) => s.categories);
  const updateToken = useTokenStore((s) => s.updateToken);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [issuer, setIssuer] = useState(token.issuer);
  const [iconType, setIconType] = useState(token.iconType || 'shield');
  const [accountName, setAccountName] = useState(token.accountName);
  const [categoryId, setCategoryId] = useState(token.categoryId);
  const [backupCodesText, setBackupCodesText] = useState((token.backupCodes || []).join('\n'));
  const [notes, setNotes] = useState(token.notes || '');
  const [customFields, setCustomFields] = useState<CustomField[]>(token.customFields || []);

  const [providerPickerVisible, setProviderPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const currentCategory = categories.find((c) => c.id === categoryId) || categories[0];

  useEffect(() => {
    if (token) {
      setIssuer(token.issuer);
      setIconType(token.iconType || 'shield');
      setAccountName(token.accountName);
      setCategoryId(token.categoryId);
      setBackupCodesText((token.backupCodes || []).join('\n'));
      setNotes(token.notes || '');
      setCustomFields(token.customFields || []);
    }
  }, [token]);

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

  const handleSave = async () => {
    if (!issuer.trim() || !accountName.trim()) return;

    const backupCodes = backupCodesText
      .split(/[\n, ]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const validCustomFields = customFields.filter((f) => f.key.trim() && f.value.trim());

    await updateToken(token.id, {
      issuer: issuer.trim(),
      iconType,
      accountName: accountName.trim(),
      categoryId,
      backupCodes,
      notes: notes.trim(),
      customFields: validCustomFields,
    });

    showToast(t('tokenUpdatedSuccess', language), 'check_circle');
    onClose();
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
            <Text style={[styles.modalTitle, { color: palette.onSurface }]}>
              {t('editAccountDetails', language)}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={palette.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Provider Picker Trigger */}
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
                  <Text style={[styles.pickerTriggerText, { color: palette.onSurface }]}>
                    {issuer || '选择提供商'}
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
                value={accountName}
                onChangeText={setAccountName}
              />
            </View>

            {/* Category Picker Trigger */}
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

            {/* Backup Codes */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {language === 'zh' ? '备份恢复码' : 'Backup Recovery Codes'}
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
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Custom Key-Value Fields */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '自定义字段' : 'Custom Fields'}
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
                    placeholder={language === 'zh' ? '字段名' : 'Key'}
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
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: palette.outlineVariant }]}
            >
              <Text style={[styles.cancelText, { color: palette.onSurfaceVariant }]}>
                {t('cancelButton', language)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: palette.primary }]}
            >
              <Text style={styles.saveText}>{t('saveButton', language)}</Text>
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
        }}
        onClose={() => setProviderPickerVisible(false)}
      />

      {/* Category Picker Modal */}
      <CategoryPickerModal
        visible={categoryPickerVisible}
        selectedCategoryId={categoryId}
        onSelect={(cId) => setCategoryId(cId)}
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
    maxWidth: 460,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
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
  modalTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
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
    marginBottom: 6,
  },
  helperAction: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
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
    minHeight: 60,
  },
  monoInput: {
    fontFamily: 'JetBrains Mono, monospace',
    letterSpacing: 1.5,
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
  footer: {
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
  cancelText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  saveText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '700',
  },
});
