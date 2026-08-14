import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAddCategoryMutation } from '../../api/hooks';
import { getColorPalette } from '../../theme/colors';
import { useToast } from '../common/Toast';
import { t } from '../../utils/i18n';
import { Icon } from '../common/Icon';

interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  'folder',
  'cloud',
  'vpn_key',
  'lock',
  'code',
  'terminal',
  'language',
  'account_balance',
  'business_center',
  'forum',
  'hub',
  'database',
  'star',
  'favorite',
  'shield',
  'security',
];

const AVAILABLE_COLORS = [
  '#005ac1', // Blue
  '#7e22ce', // Purple
  '#047857', // Green
  '#b45309', // Amber
  '#b91c1c', // Red
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#db2777', // Pink
  '#475569', // Slate
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ visible, onClose }) => {
  const { showToast } = useToast();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);
  const addCategoryMutation = useAddCategoryMutation();

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState('#005ac1');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting || addCategoryMutation.isPending) return;
    if (!name.trim()) {
      setError(t('categoryNamePlaceholder', language));
      return;
    }

    try {
      setIsSubmitting(true);
      await addCategoryMutation.mutateAsync({
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });

      showToast(`分类 "${name.trim()}" 创建成功！`, 'folder');
      setName('');
      setSelectedIcon('folder');
      setSelectedColor('#005ac1');
      setError('');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
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
              <View style={[styles.iconBox, { backgroundColor: selectedColor }]}>
                <Icon name={selectedIcon} size={18} color="#ffffff" />
              </View>
              <Text style={[styles.modalTitle, { color: palette.onSurface }]}>
                {t('addCategory', language)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color={palette.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Category Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('categoryName', language)} *
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
                placeholder={t('categoryNamePlaceholder', language)}
                placeholderTextColor={palette.outline}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setError('');
                }}
              />
            </View>

            {/* Icon Picker */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('categoryIcon', language)}
              </Text>
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map((icon) => {
                  const isSelected = selectedIcon === icon;
                  return (
                    <TouchableOpacity
                      key={icon}
                      activeOpacity={0.7}
                      onPress={() => setSelectedIcon(icon)}
                      style={[
                        styles.iconOption,
                        {
                          backgroundColor: isSelected
                            ? palette.primaryContainer
                            : palette.surfaceContainerLow,
                          borderColor: isSelected ? palette.primary : palette.outlineVariant,
                        },
                      ]}
                    >
                      <Icon
                        name={icon}
                        size={20}
                        color={isSelected ? '#ffffff' : palette.onSurface}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Color Swatches */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: palette.onSurfaceVariant }]}>
                {t('categoryColor', language)}
              </Text>
              <View style={styles.colorGrid}>
                {AVAILABLE_COLORS.map((c) => {
                  const isSelected = selectedColor === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      activeOpacity={0.7}
                      onPress={() => setSelectedColor(c)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        isSelected && styles.selectedColorSwatch,
                      ]}
                    >
                      {isSelected && <Icon name="check" size={16} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text>
            ) : null}
          </ScrollView>

          {/* Footer */}
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
              onPress={handleSubmit}
              disabled={isSubmitting || addCategoryMutation.isPending}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: palette.primary,
                  opacity: isSubmitting || addCategoryMutation.isPending ? 0.7 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                },
              ]}
            >
              {(isSubmitting || addCategoryMutation.isPending) && (
                <ActivityIndicator size="small" color="#ffffff" />
              )}
              <Text style={styles.submitText}>
                {isSubmitting || addCategoryMutation.isPending
                  ? language === 'zh'
                    ? '正在保存...'
                    : 'Saving...'
                  : t('saveButton', language)}
              </Text>
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
    maxWidth: 420,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    padding: 18,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  selectedColorSwatch: {
    borderWidth: 2,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  errorText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    marginTop: 4,
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
  submitBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  submitText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '700',
  },
});
