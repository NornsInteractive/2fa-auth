import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Platform } from 'react-native';
import { Token } from '../../types/token';
import { useTokenStore } from '../../store/useTokenStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { formatTOTPCode, generateTOTP } from '../../utils/totp';
import { t } from '../../utils/i18n';
import { Icon } from '../common/Icon';
import { ProgressRing } from '../common/ProgressRing';
import { useToast } from '../common/Toast';
import { EditTokenModal } from './EditTokenModal';
import { BackupCodesModal } from './BackupCodesModal';

interface TokenDetailModalProps {
  visible: boolean;
  token: Token | null;
  onClose: () => void;
}

export const TokenDetailModal: React.FC<TokenDetailModalProps> = ({ visible, token, onClose }) => {
  if (!token) return null;

  const { showToast } = useToast();
  const deleteToken = useTokenStore((s) => s.deleteToken);
  const remainingSeconds = useTokenStore((s) => s.remainingSeconds);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [revealSecret, setRevealSecret] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  // Live TOTP code
  const rawCode = useMemo(() => {
    return generateTOTP(token.secretKey, {
      digits: token.digits || 6,
      period: token.period || 30,
      algorithm: token.algorithm || 'SHA1',
    });
  }, [token.secretKey, token.digits, token.period, token.algorithm, remainingSeconds]);

  const formattedCode = useMemo(() => formatTOTPCode(rawCode), [rawCode]);

  const handleCopyCode = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(rawCode);
    }
    showToast(`${t('copiedCode', language)}: ${formattedCode}`, 'content_copy');
  };

  const handleCopySecret = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(token.secretKey);
    }
    showToast(t('copiedSecret', language), 'key');
  };

  const handleDelete = async () => {
    await deleteToken(token.id);
    setDeleteConfirmVisible(false);
    showToast('2FA 密钥已删除', 'delete');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: palette.surfaceContainer,
              borderColor: palette.outlineVariant,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: palette.surfaceContainerHighest },
                ]}
              >
                <Icon name={token.iconType || 'shield'} size={24} color={palette.primary} fill />
              </View>
              <View style={styles.headerTitles}>
                <Text style={[styles.issuerTitle, { color: palette.onSurface }]}>
                  {token.issuer}
                </Text>
                <Text style={[styles.accountSub, { color: palette.onSurfaceVariant }]}>
                  {token.accountName}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={palette.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Live PIN Hero Box */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleCopyCode}
              style={[
                styles.codeHeroBox,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.outlineVariant,
                },
              ]}
            >
              <View style={styles.codeTextGroup}>
                <Text style={[styles.codeLabel, { color: palette.onSurfaceVariant }]}>
                  {t('currentCode', language)}
                </Text>
                <Text
                  style={[
                    styles.codeDigits,
                    {
                      color: remainingSeconds <= 5 ? palette.error : palette.onSurface,
                    },
                  ]}
                >
                  {formattedCode}
                </Text>
              </View>

              <ProgressRing
                remainingSeconds={remainingSeconds}
                period={token.period || 30}
                size={54}
                strokeWidth={5}
                showText
                primaryColor={palette.primary}
                errorColor={palette.error}
                trackColor={palette.surfaceVariant}
                textColor={palette.onSurface}
              />
            </TouchableOpacity>

            {/* Hint Badge */}
            <TouchableOpacity onPress={handleCopyCode} style={styles.copyHintRow}>
              <Icon name="content_copy" size={14} color={palette.primary} />
              <Text style={[styles.copyHintText, { color: palette.primary }]}>
                {t('clickToCopy', language)}
              </Text>
            </TouchableOpacity>

            {/* Secret Key Row */}
            <View
              style={[
                styles.detailRow,
                {
                  backgroundColor: palette.surfaceContainerLow,
                  borderColor: palette.outlineVariant,
                },
              ]}
            >
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, { color: palette.onSurfaceVariant }]}>
                  {t('copySecretKey', language)}
                </Text>
                <Text style={[styles.secretText, { color: palette.onSurface }]}>
                  {revealSecret ? token.secretKey : '••••••••••••••••'}
                </Text>
              </View>
              <View style={styles.detailActions}>
                <TouchableOpacity
                  onPress={() => setRevealSecret(!revealSecret)}
                  style={[styles.smallActionBtn, { backgroundColor: palette.surface }]}
                >
                  <Icon
                    name={revealSecret ? 'visibility_off' : 'visibility'}
                    size={16}
                    color={palette.onSurfaceVariant}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCopySecret}
                  style={[styles.smallActionBtn, { backgroundColor: palette.surface }]}
                >
                  <Icon name="content_copy" size={16} color={palette.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Backup Codes Row */}
            {token.backupCodes && token.backupCodes.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setBackupModalVisible(true)}
                style={[
                  styles.detailRow,
                  {
                    backgroundColor: palette.surfaceContainerLow,
                    borderColor: palette.outlineVariant,
                  },
                ]}
              >
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: palette.onSurfaceVariant }]}>
                    {t('copyBackupCodes', language)}
                  </Text>
                  <Text style={[styles.detailSub, { color: palette.onSurface }]}>
                    {token.backupCodes.length} {t('remainingBackupCodes', language)}
                  </Text>
                </View>
                <Icon name="chevron_right" size={20} color={palette.onSurfaceVariant} />
              </TouchableOpacity>
            )}

            {/* Notes Section */}
            {token.notes ? (
              <View
                style={[
                  styles.detailRow,
                  {
                    backgroundColor: palette.surfaceContainerLow,
                    borderColor: palette.outlineVariant,
                  },
                ]}
              >
                <View style={styles.detailInfo}>
                  <Text style={[styles.detailLabel, { color: palette.onSurfaceVariant }]}>
                    {t('notesLabel', language)}
                  </Text>
                  <Text style={[styles.detailSub, { color: palette.onSurface }]}>
                    {token.notes}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Custom Fields Section */}
            {token.customFields && token.customFields.length > 0 && (
              <View style={styles.customFieldsSection}>
                <Text style={[styles.sectionTitle, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '自定义字段' : 'Custom Fields'}
                </Text>
                {token.customFields.map((f) => (
                  <View
                    key={f.id}
                    style={[
                      styles.customFieldItem,
                      {
                        backgroundColor: palette.surfaceContainerLow,
                        borderColor: palette.outlineVariant,
                      },
                    ]}
                  >
                    <Text style={[styles.customFieldKey, { color: palette.onSurfaceVariant }]}>
                      {f.key}
                    </Text>
                    <Text style={[styles.customFieldValue, { color: palette.onSurface }]}>
                      {f.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsFooter}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setEditModalVisible(true)}
                style={[styles.editBtn, { backgroundColor: palette.secondaryContainer }]}
              >
                <Icon name="edit" size={18} color={palette.onSecondaryContainer} />
                <Text style={[styles.editBtnText, { color: palette.onSecondaryContainer }]}>
                  {t('editAccountDetails', language)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setDeleteConfirmVisible(true)}
                style={[styles.deleteBtn, { backgroundColor: palette.errorContainer }]}
              >
                <Icon name="delete" size={18} color={palette.error} />
                <Text style={[styles.deleteBtnText, { color: palette.onErrorContainer }]}>
                  {t('removeAccount', language)}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Edit Modal */}
      <EditTokenModal
        visible={editModalVisible}
        token={token}
        onClose={() => setEditModalVisible(false)}
      />

      {/* Backup Codes Modal */}
      <BackupCodesModal
        visible={backupModalVisible}
        codes={token.backupCodes || []}
        issuer={token.issuer}
        onClose={() => setBackupModalVisible(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <Icon name="warning" size={32} color={palette.error} />
            <Text style={[styles.confirmTitle, { color: palette.onSurface }]}>
              {t('deleteConfirmTitle', language)}
            </Text>
            <Text style={[styles.confirmMsg, { color: palette.onSurfaceVariant }]}>
              {t('deleteConfirmMsg', language)}
            </Text>

            <View style={styles.confirmFooter}>
              <TouchableOpacity
                onPress={() => setDeleteConfirmVisible(false)}
                style={[styles.confirmCancelBtn, { borderColor: palette.outlineVariant }]}
              >
                <Text style={[styles.confirmCancelText, { color: palette.onSurfaceVariant }]}>
                  {t('cancelButton', language)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.confirmDeleteBtn, { backgroundColor: palette.error }]}
              >
                <Text style={styles.confirmDeleteText}>{t('confirmDeleteButton', language)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    gap: 2,
  },
  issuerTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 18,
    fontWeight: '700',
  },
  accountSub: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
  },
  scrollBody: {
    maxHeight: 460,
  },
  codeHeroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    cursor: 'pointer',
  },
  codeTextGroup: {
    gap: 4,
  },
  codeLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeDigits: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
  },
  copyHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 14,
    alignSelf: 'center',
    cursor: 'pointer',
  },
  copyHintText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  detailInfo: {
    flex: 1,
    gap: 3,
  },
  detailLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '700',
  },
  detailSub: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
  },
  secretText: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customFieldsSection: {
    marginVertical: 6,
    gap: 6,
  },
  sectionTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  customFieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  customFieldKey: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
  },
  customFieldValue: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    cursor: 'pointer',
  },
  editBtnText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    cursor: 'pointer',
  },
  deleteBtnText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  confirmMsg: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
  },
});
