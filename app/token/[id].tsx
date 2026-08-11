import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTokenStore } from '../../src/store/useTokenStore';
import { useSettingsStore } from '../../src/store/useSettingsStore';
import { getColorPalette } from '../../src/theme/colors';
import { formatTOTPCode, generateTOTP } from '../../src/utils/totp';
import { t } from '../../src/utils/i18n';
import { Icon } from '../../src/components/common/Icon';
import { ProgressRing } from '../../src/components/common/ProgressRing';
import { useToast } from '../../src/components/common/Toast';
import { EditTokenModal } from '../../src/components/token/EditTokenModal';
import { BackupCodesModal } from '../../src/components/token/BackupCodesModal';

export default function TokenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const token = useTokenStore((s) => s.tokens.find((t) => t.id === id));
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

  if (!token) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.notFoundBox}>
          <Text style={[styles.notFoundText, { color: palette.onSurface }]}>
            {t('noTokensFound', language)}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/')} style={[styles.backBtn, { backgroundColor: palette.primary }]}>
            <Text style={styles.backBtnText}>返回主页</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
    showToast('2FA 账号已删除', 'delete');
    router.replace('/');
  };

  const getIconName = (type?: string, issuer?: string) => {
    if (type) {
      if (type === 'account_balance') return 'account_balance';
      if (type === 'code') return 'code';
      if (type === 'language') return 'language';
      if (type === 'hub') return 'hub';
      if (type === 'cloud') return 'cloud';
    }
    const iss = (issuer || '').toLowerCase();
    if (iss.includes('google')) return 'language';
    if (iss.includes('git')) return 'code';
    if (iss.includes('bank')) return 'account_balance';
    return 'shield';
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Task Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={[styles.backIconBtn, { backgroundColor: palette.surfaceContainerLow }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow_back" size={22} color={palette.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.onSurface }]}>
            {token.issuer}
          </Text>
        </View>

        {/* Hero Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleCopyCode}
          style={[
            styles.heroCard,
            {
              backgroundColor: palette.surfaceContainer,
              borderColor: palette.outlineVariant,
            },
          ]}
        >
          {/* Header Info */}
          <View style={styles.heroHeader}>
            <View style={styles.heroIssuerRow}>
              <View style={[styles.heroIconBox, { backgroundColor: palette.surfaceContainerHighest }]}>
                <Icon
                  name={getIconName(token.iconType, token.issuer)}
                  size={28}
                  color={palette.primary}
                  fill
                />
              </View>
              <View style={styles.heroTitles}>
                <Text style={[styles.heroIssuer, { color: palette.onSurface }]}>
                  {token.issuer}
                </Text>
                <Text style={[styles.heroAccount, { color: palette.onSurfaceVariant }]}>
                  {token.accountName}
                </Text>
              </View>
            </View>
          </View>

          {/* The Code Display */}
          <View style={styles.codeSection}>
            <View style={styles.codeLeft}>
              <Text style={[styles.codeLabel, { color: palette.onSurfaceVariant }]}>
                {t('currentCode', language)}
              </Text>
              <Text
                style={[
                  styles.codeDisplay,
                  {
                    color: remainingSeconds <= 5 ? palette.error : palette.onSurface,
                  },
                ]}
              >
                {formattedCode}
              </Text>
            </View>

            {/* Countdown Progress Ring with live number */}
            <View style={styles.countdownBox}>
              <ProgressRing
                remainingSeconds={remainingSeconds}
                period={token.period || 30}
                size={56}
                strokeWidth={5}
                showText={true}
                primaryColor={palette.primary}
                errorColor={palette.error}
                trackColor={palette.surfaceVariant}
                textColor={palette.onSurface}
              />
            </View>
          </View>

          {/* Click to copy prompt */}
          <View
            style={[
              styles.copyHintBadge,
              {
                backgroundColor: palette.surface,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <Icon name="content_copy" size={14} color={palette.onSurfaceVariant} />
            <Text style={[styles.copyHintText, { color: palette.onSurfaceVariant }]}>
              {t('clickToCopy', language)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action List Section */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: palette.onSurfaceVariant }]}>
            {t('editAccountDetails', language)}
          </Text>

          {/* Action 1: Copy Code */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCopyCode}
            style={[
              styles.actionItem,
              {
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: palette.secondaryContainer }]}>
              <Icon name="content_copy" size={20} color={palette.onSecondaryContainer} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: palette.onSurface }]}>
                {t('copyVerificationCode', language)}
              </Text>
              <Text style={[styles.actionSub, { color: palette.onSurfaceVariant }]}>
                {t('copyVerificationCodeSub', language)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action 2: Copy Secret Key */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCopySecret}
            style={[
              styles.actionItem,
              {
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: palette.secondaryContainer }]}>
              <Icon name="key" size={20} color={palette.onSecondaryContainer} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: palette.onSurface }]}>
                {t('copySecretKey', language)}
              </Text>
              <Text style={[styles.secretText, { color: palette.onSurfaceVariant }]}>
                {revealSecret ? token.secretKey : '••••••••••••••••'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setRevealSecret(!revealSecret);
              }}
              style={[styles.revealBtn, { backgroundColor: palette.surfaceContainerLow }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name={revealSecret ? 'visibility_off' : 'visibility'}
                size={18}
                color={palette.onSurfaceVariant}
              />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Action 3: Copy Backup Codes */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setBackupModalVisible(true)}
            style={[
              styles.actionItem,
              {
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: palette.secondaryContainer }]}>
              <Icon name="restore_page" size={20} color={palette.onSecondaryContainer} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: palette.onSurface }]}>
                {t('copyBackupCodes', language)}
              </Text>
              <Text style={[styles.actionSub, { color: palette.onSurfaceVariant }]}>
                {token.backupCodes?.length || 0} {t('remainingBackupCodes', language)}
              </Text>
            </View>
            <Icon name="chevron_right" size={20} color={palette.onSurfaceVariant} />
          </TouchableOpacity>

          {/* Action 4: Edit Details */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setEditModalVisible(true)}
            style={[
              styles.actionItem,
              {
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <View style={[styles.actionIconBox, { backgroundColor: palette.secondaryContainer }]}>
              <Icon name="edit" size={20} color={palette.onSecondaryContainer} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: palette.onSurface }]}>
                {t('editAccountDetails', language)}
              </Text>
              <Text style={[styles.actionSub, { color: palette.onSurfaceVariant }]}>
                {t('editAccountDetailsSub', language)}
              </Text>
            </View>
            <Icon name="chevron_right" size={20} color={palette.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={[styles.dangerTitle, { color: palette.error }]}>
            {t('dangerZone', language)}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setDeleteConfirmVisible(true)}
            style={[
              styles.dangerButton,
              {
                backgroundColor: palette.errorContainer,
                borderColor: palette.error,
              },
            ]}
          >
            <View style={[styles.dangerIconBox, { backgroundColor: 'rgba(186,26,26,0.15)' }]}>
              <Icon name="delete" size={20} color={palette.error} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: palette.onErrorContainer }]}>
                {t('removeAccount', language)}
              </Text>
              <Text style={[styles.actionSub, { color: palette.onErrorContainer, opacity: 0.8 }]}>
                {t('removeAccountSub', language)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
            <View style={[styles.dangerAlertIcon, { backgroundColor: palette.errorContainer }]}>
              <Icon name="warning" size={28} color={palette.error} />
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100%',
    width: '100%',
  },
  scrollContent: {
    padding: 20,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  backIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  headerTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 20,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    marginBottom: 24,
    cursor: 'pointer',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIssuerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitles: {
    gap: 2,
  },
  heroIssuer: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 18,
    fontWeight: '700',
  },
  heroAccount: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
  },
  codeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  codeLeft: {
    gap: 6,
  },
  codeLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeDisplay: {
    fontFamily: 'JetBrains Mono, Courier New, monospace',
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 4,
  },
  countdownBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    marginTop: 12,
  },
  copyHintText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '600',
  },
  actionsSection: {
    gap: 10,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    cursor: 'pointer',
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 15,
    fontWeight: '600',
  },
  actionSub: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
  },
  secretText: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  revealBtn: {
    width: 34,
    height: 34,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerSection: {
    gap: 10,
  },
  dangerTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
    cursor: 'pointer',
  },
  dangerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  notFoundText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  backBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
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
    maxWidth: 400,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  dangerAlertIcon: {
    width: 54,
    height: 54,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmMsg: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9999,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '700',
  },
});
