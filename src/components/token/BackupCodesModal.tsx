import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { useToast } from '../common/Toast';
import { t } from '../../utils/i18n';
import { Icon } from '../common/Icon';

interface BackupCodesModalProps {
  visible: boolean;
  codes: string[];
  issuer: string;
  onClose: () => void;
}

export const BackupCodesModal: React.FC<BackupCodesModalProps> = ({ visible, codes, issuer, onClose }) => {
  const { showToast } = useToast();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const handleCopyAll = () => {
    const text = codes.join('\n');
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    showToast(t('copiedBackupCodes', language), 'restore_page');
  };

  const handleCopySingle = (code: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    showToast(`Copied: ${code}`, 'content_copy');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBox, { backgroundColor: palette.secondaryContainer }]}>
                <Icon name="restore_page" size={20} color={palette.onSecondaryContainer} />
              </View>
              <Text style={[styles.modalTitle, { color: palette.onSurface }]}>
                {issuer} - {t('copyBackupCodes', language)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color={palette.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={[styles.subtitle, { color: palette.onSurfaceVariant }]}>
              {codes.length} {t('remainingBackupCodes', language)}
            </Text>

            <ScrollView style={styles.codeList} showsVerticalScrollIndicator={false}>
              <View style={styles.codeGrid}>
                {codes.map((code, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    onPress={() => handleCopySingle(code)}
                    style={[
                      styles.codeItem,
                      {
                        backgroundColor: palette.surfaceContainerLow,
                        borderColor: palette.outlineVariant,
                      },
                    ]}
                  >
                    <Text style={[styles.codeText, { color: palette.onSurface }]}>{code}</Text>
                    <Icon name="content_copy" size={14} color={palette.onSurfaceVariant} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleCopyAll}
              style={[styles.copyAllBtn, { backgroundColor: palette.primary }]}
            >
              <Icon name="content_copy" size={16} color="#ffffff" />
              <Text style={styles.copyAllText}>{t('copyBackupCodes', language)}</Text>
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
    width: 32,
    height: 32,
    borderRadius: 8,
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
  },
  subtitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    marginBottom: 12,
  },
  codeList: {
    maxHeight: 240,
  },
  codeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  codeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    cursor: 'pointer',
  },
  codeText: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  copyAllText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '700',
  },
});
