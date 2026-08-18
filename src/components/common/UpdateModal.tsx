import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { UpdateInfo } from '../../utils/updateChecker';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { Icon } from './Icon';

interface UpdateModalProps {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ visible, updateInfo, onClose }) => {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  if (!updateInfo) return null;

  const handleDownload = () => {
    if (updateInfo.downloadUrl) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(updateInfo.downloadUrl, '_blank');
      } else {
        Linking.openURL(updateInfo.downloadUrl);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={updateInfo.isForce ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: palette.surfaceContainer,
              borderColor: palette.outlineVariant,
            },
          ]}
        >
          {/* Header Banner */}
          <View style={[styles.headerBanner, { backgroundColor: palette.primary }]}>
            <View style={styles.iconCircle}>
              <Icon name="system_update" size={28} color="#ffffff" fill />
            </View>
            <Text style={styles.bannerTitle}>
              {language === 'zh' ? '发现新版本' : 'New Version Available'}
            </Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>
                v{updateInfo.latestVersionName} (Build {updateInfo.latestVersionCode})
              </Text>
            </View>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Meta info */}
            <View style={styles.metaRow}>
              {updateInfo.fileSize > 0 && (
                <View style={[styles.metaPill, { backgroundColor: palette.surfaceContainerHigh }]}>
                  <Icon name="inventory_2" size={14} color={palette.onSurfaceVariant} />
                  <Text style={[styles.metaPillText, { color: palette.onSurfaceVariant }]}>
                    {formatSize(updateInfo.fileSize)}
                  </Text>
                </View>
              )}

              {updateInfo.isForce && (
                <View style={[styles.metaPill, { backgroundColor: palette.errorContainer }]}>
                  <Icon name="warning" size={14} color={palette.error} />
                  <Text style={[styles.metaPillText, { color: palette.onErrorContainer }]}>
                    {language === 'zh' ? '重要更新' : 'Required Update'}
                  </Text>
                </View>
              )}
            </View>

            {/* Changelog title */}
            <Text style={[styles.changelogTitle, { color: palette.onSurface }]}>
              {language === 'zh' ? '更新日志：' : 'Changelog:'}
            </Text>

            {/* Changelog content */}
            <View
              style={[
                styles.changelogCard,
                {
                  backgroundColor: palette.surfaceContainerLow,
                  borderColor: palette.outlineVariant,
                },
              ]}
            >
              <Text style={[styles.changelogText, { color: palette.onSurface }]}>
                {updateInfo.changelog ||
                  (language === 'zh'
                    ? '• 性能优化与体验改进\n• 修复若干已知问题'
                    : '• Performance improvements\n• Bug fixes')}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {!updateInfo.isForce && (
              <TouchableOpacity
                onPress={onClose}
                style={[styles.cancelBtn, { borderColor: palette.outlineVariant }]}
              >
                <Text style={[styles.cancelBtnText, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '稍后提醒' : 'Later'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleDownload}
              style={[
                styles.downloadBtn,
                { backgroundColor: palette.primary, flex: updateInfo.isForce ? 1 : undefined },
              ]}
            >
              <Icon name="download" size={18} color="#ffffff" />
              <Text style={styles.downloadBtnText}>
                {language === 'zh' ? '立即更新' : 'Update Now'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerBanner: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    padding: 20,
    maxHeight: 280,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  changelogTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  changelogCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  changelogText: {
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  downloadBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
