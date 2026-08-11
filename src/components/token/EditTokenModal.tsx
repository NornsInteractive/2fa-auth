import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Token } from '../../types/token';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useTokenStore } from '../../store/useTokenStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { useToast } from '../common/Toast';
import { t } from '../../utils/i18n';
import { Icon } from '../common/Icon';

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
  const [accountName, setAccountName] = useState(token.accountName);
  const [categoryId, setCategoryId] = useState(token.categoryId);
  const [notes, setNotes] = useState(token.notes || '');

  useEffect(() => {
    if (token) {
      setIssuer(token.issuer);
      setAccountName(token.accountName);
      setCategoryId(token.categoryId);
      setNotes(token.notes || '');
    }
  }, [token]);

  const handleSave = async () => {
    if (!issuer.trim() || !accountName.trim()) return;

    await updateToken(token.id, {
      issuer: issuer.trim(),
      accountName: accountName.trim(),
      categoryId,
      notes: notes.trim(),
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
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color={palette.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('issuerLabel', language)}
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
                value={issuer}
                onChangeText={setIssuer}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('accountNameLabel', language)}
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

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('categorySelectLabel', language)}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
                {categories.map((c) => {
                  const isSelected = categoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setCategoryId(c.id)}
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
                multiline
                numberOfLines={3}
              />
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
    maxWidth: 440,
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
  label: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  },
  catRow: {
    flexDirection: 'row',
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
