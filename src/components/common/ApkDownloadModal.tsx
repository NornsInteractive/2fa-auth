import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { Icon } from './Icon';
import { useToast } from './Toast';

interface ApkDownloadModalProps {
  visible: boolean;
  apkUrl: string;
  versionName?: string;
  fileSize?: string;
  onClose: () => void;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({
  visible,
  apkUrl,
  versionName = '1.0.0',
  fileSize = '175.6 MB',
  onClose,
}) => {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);
  const { showToast } = useToast();

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [qrLoaded, setQrLoaded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!visible || !apkUrl) return null;

  const qrCodeUri = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    apkUrl
  )}`;

  const handleDownload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(apkUrl, '_blank');
    } else {
      Linking.openURL(apkUrl);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(apkUrl);
      }
      setCopySuccess(true);
      showToast(
        language === 'zh' ? '下载链接已复制到剪贴板' : 'Download link copied to clipboard',
        'content_copy'
      );
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (_) {
      showToast(language === 'zh' ? '复制失败，请手动长按复制' : 'Failed to copy', 'error');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
            <View style={styles.headerTop}>
              <View style={styles.headerTitleGroup}>
                <View style={styles.iconCircle}>
                  <Icon name="android" size={24} color="#ffffff" fill />
                </View>
                <View>
                  <Text style={styles.bannerTitle}>
                    {language === 'zh' ? '下载 Android 客户端' : 'Download Android App'}
                  </Text>
                  <Text style={styles.bannerSubtitle}>
                    Mimir Authenticator · v{versionName}
                  </Text>
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={styles.closeBtn}
                accessibilityLabel="Close"
              >
                <Icon name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Body Content */}
          <View style={styles.body}>
            {/* QR Code Container */}
            <View style={styles.qrWrapper}>
              <View
                style={[
                  styles.qrCard,
                  {
                    backgroundColor: '#ffffff',
                    borderColor: isDark ? palette.outlineVariant : '#e2e8f0',
                  },
                ]}
              >
                {!qrLoaded && (
                  <View style={styles.qrLoading}>
                    <ActivityIndicator size="small" color={palette.primary} />
                  </View>
                )}
                <Image
                  source={{ uri: qrCodeUri }}
                  style={styles.qrImage}
                  onLoad={() => setQrLoaded(true)}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.qrHint, { color: palette.onSurfaceVariant }]}>
                {language === 'zh'
                  ? '📱 手机相机或扫码器扫描二维码直接下载'
                  : '📱 Scan QR code with your phone to download'}
              </Text>
            </View>

            {/* Badges / Specs */}
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: palette.surfaceContainerHigh }]}>
                <Icon name="inventory_2" size={13} color={palette.primary} />
                <Text style={[styles.badgeText, { color: palette.onSurface }]}>
                  {fileSize}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: palette.surfaceContainerHigh }]}>
                <Icon name="verified_user" size={13} color={palette.primary} />
                <Text style={[styles.badgeText, { color: palette.onSurface }]}>
                  {language === 'zh' ? '官方签名包' : 'Official Build'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: palette.surfaceContainerHigh }]}>
                <Icon name="phone_android" size={13} color={palette.primary} />
                <Text style={[styles.badgeText, { color: palette.onSurface }]}>
                  Android 8.0+
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionGroup}>
              {/* Primary Direct Download Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleDownload}
                style={[styles.primaryDownloadBtn, { backgroundColor: palette.primary }]}
              >
                <Icon name="download" size={20} color="#ffffff" fill />
                <Text style={styles.primaryDownloadText}>
                  {language === 'zh' ? '直接下载 APK 安装包' : 'Direct Download APK'}
                </Text>
              </TouchableOpacity>

              {/* Secondary Copy Link Button */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleCopyLink}
                style={[
                  styles.copyLinkBtn,
                  {
                    backgroundColor: palette.surfaceContainerHigh,
                    borderColor: palette.outlineVariant,
                  },
                ]}
              >
                <Icon
                  name={copySuccess ? 'check' : 'content_copy'}
                  size={16}
                  color={copySuccess ? palette.primary : palette.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.copyLinkText,
                    { color: copySuccess ? palette.primary : palette.onSurfaceVariant },
                  ]}
                >
                  {copySuccess
                    ? language === 'zh'
                      ? '已复制链接'
                      : 'Link Copied!'
                    : language === 'zh'
                    ? '复制下载链接'
                    : 'Copy Download Link'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  headerBanner: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 22,
    alignItems: 'center',
    gap: 16,
  },
  qrWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  qrCard: {
    width: 190,
    height: 190,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  qrLoading: {
    position: 'absolute',
    zIndex: 1,
  },
  qrImage: {
    width: 166,
    height: 166,
  },
  qrHint: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionGroup: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  primaryDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryDownloadText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  copyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  copyLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
