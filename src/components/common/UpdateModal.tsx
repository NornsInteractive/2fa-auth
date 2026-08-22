import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { UpdateInfo } from '../../utils/updateChecker';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { Icon } from './Icon';

interface UpdateModalProps {
  visible: boolean;
  updateInfo: UpdateInfo | null;
  onClose: () => void;
}

type DownloadStatus = 'idle' | 'downloading' | 'completed' | 'error';

export const UpdateModal: React.FC<UpdateModalProps> = ({ visible, updateInfo, onClose }) => {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [downloadedFileUri, setDownloadedFileUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const downloadResumableRef = useRef<FileSystem.DownloadResumable | null>(null);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!visible) {
      handleCancelDownload();
      setDownloadStatus('idle');
      setDownloadProgress(0);
      setDownloadedBytes(0);
      setTotalBytes(0);
      setErrorMessage(null);
    }
  }, [visible]);

  if (!updateInfo) return null;

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCancelDownload = async () => {
    if (downloadResumableRef.current) {
      try {
        await downloadResumableRef.current.cancelAsync();
      } catch (_) {}
      downloadResumableRef.current = null;
    }
    setDownloadStatus('idle');
    setDownloadProgress(0);
  };

  const handleClose = () => {
    handleCancelDownload();
    onClose();
  };

  const installApk = async (fileUri: string) => {
    if (Platform.OS !== 'android') {
      if (updateInfo.downloadUrl) {
        Linking.openURL(updateInfo.downloadUrl);
      }
      return;
    }

    try {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });
    } catch (err: any) {
      console.warn('IntentLauncher failed to start package installer:', err);
      try {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);
        await Linking.openURL(contentUri);
      } catch (err2) {
        if (updateInfo.downloadUrl) {
          Linking.openURL(updateInfo.downloadUrl);
        }
      }
    }
  };

  const handleStartDownload = async () => {
    if (!updateInfo.downloadUrl) return;

    // On Web, open download URL in browser/trigger file download
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(updateInfo.downloadUrl, '_blank');
      } else {
        Linking.openURL(updateInfo.downloadUrl);
      }
      return;
    }

    // On Android / Native app: in-app download and open installer
    try {
      setDownloadStatus('downloading');
      setDownloadProgress(0);
      setErrorMessage(null);

      const targetFileName = `mimir-v${updateInfo.latestVersionCode}.apk`;
      const targetDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
      const targetFileUri = `${targetDirectory}${targetFileName}`;

      // Check if file is already downloaded and valid
      const existingInfo = await FileSystem.getInfoAsync(targetFileUri).catch(() => null);
      if (existingInfo && existingInfo.exists && existingInfo.size && updateInfo.fileSize && existingInfo.size === updateInfo.fileSize) {
        setDownloadStatus('completed');
        setDownloadedFileUri(targetFileUri);
        setDownloadProgress(1);
        await installApk(targetFileUri);
        return;
      }

      // If existing file is partial or outdated, clean it up
      if (existingInfo && existingInfo.exists) {
        await FileSystem.deleteAsync(targetFileUri, { idempotent: true }).catch(() => {});
      }

      const progressCallback = (progressData: FileSystem.DownloadProgressData) => {
        const expected = progressData.totalBytesExpectedToWrite || updateInfo.fileSize || 0;
        const written = progressData.totalBytesWritten || 0;
        const progress = expected > 0 ? Math.min(1, written / expected) : 0;

        setDownloadProgress(progress);
        setDownloadedBytes(written);
        setTotalBytes(expected);
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        updateInfo.downloadUrl,
        targetFileUri,
        {},
        progressCallback
      );
      downloadResumableRef.current = downloadResumable;

      const result = await downloadResumable.downloadAsync();
      downloadResumableRef.current = null;

      if (result && result.uri) {
        setDownloadStatus('completed');
        setDownloadedFileUri(result.uri);
        setDownloadProgress(1);

        // Auto trigger Android package installer
        await installApk(result.uri);
      } else {
        throw new Error(language === 'zh' ? '下载未完成' : 'Download incomplete');
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('canceled') || err.message.includes('cancelled'))) {
        setDownloadStatus('idle');
        return;
      }
      setDownloadStatus('error');
      setErrorMessage(err.message || (language === 'zh' ? '下载过程中发生错误' : 'Download failed'));
    }
  };

  const handleOpenInBrowser = () => {
    if (updateInfo.downloadUrl) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(updateInfo.downloadUrl, '_blank');
      } else {
        Linking.openURL(updateInfo.downloadUrl);
      }
    }
  };

  const progressPercent = Math.round(downloadProgress * 100);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Background dismissable touch layer */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

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
            {/* Top Right Close Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleClose}
              style={styles.headerCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Icon name="close" size={20} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.iconCircle}>
              <Icon
                name={downloadStatus === 'completed' ? 'check_circle' : 'system_update'}
                size={28}
                color="#ffffff"
                fill
              />
            </View>
            <Text style={styles.bannerTitle}>
              {downloadStatus === 'completed'
                ? (language === 'zh' ? '安装包已就绪' : 'Update Ready')
                : (language === 'zh' ? '发现新版本' : 'New Version Available')}
            </Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>
                v{updateInfo.latestVersionName} (Build {updateInfo.latestVersionCode})
              </Text>
            </View>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Meta info badges */}
            <View style={styles.metaRow}>
              {updateInfo.fileSize > 0 && (
                <View style={[styles.metaPill, { backgroundColor: palette.surfaceContainerHigh }]}>
                  <Icon name="inventory_2" size={14} color={palette.onSurfaceVariant} />
                  <Text style={[styles.metaPillText, { color: palette.onSurfaceVariant }]}>
                    {formatSize(updateInfo.fileSize)}
                  </Text>
                </View>
              )}

              <View style={[styles.metaPill, { backgroundColor: palette.surfaceContainerHigh }]}>
                <Icon name="verified" size={14} color={palette.primary} />
                <Text style={[styles.metaPillText, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '官方安装包' : 'Official Package'}
                </Text>
              </View>
            </View>

            {/* In-App Download Progress Area */}
            {downloadStatus === 'downloading' && (
              <View
                style={[
                  styles.progressCard,
                  {
                    backgroundColor: palette.surfaceContainerLow,
                    borderColor: palette.primary,
                  },
                ]}
              >
                <View style={styles.progressHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color={palette.primary} />
                    <Text style={[styles.progressTitle, { color: palette.onSurface }]}>
                      {language === 'zh' ? '正在应用内下载安装包...' : 'Downloading package...'}
                    </Text>
                  </View>
                  <Text style={[styles.progressPercent, { color: palette.primary }]}>
                    {progressPercent}%
                  </Text>
                </View>

                {/* Progress Bar Track */}
                <View style={[styles.progressBarTrack, { backgroundColor: palette.surfaceContainerHighest }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: palette.primary,
                        width: `${Math.max(4, Math.min(100, progressPercent))}%`,
                      },
                    ]}
                  />
                </View>

                {/* Download Size Details */}
                <View style={styles.progressFooter}>
                  <Text style={[styles.progressSub, { color: palette.onSurfaceVariant }]}>
                    {downloadedBytes > 0
                      ? `${formatSize(downloadedBytes)} / ${formatSize(totalBytes || updateInfo.fileSize)}`
                      : (language === 'zh' ? '正在建立连接...' : 'Connecting...')}
                  </Text>
                  <TouchableOpacity
                    onPress={handleCancelDownload}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 12, color: palette.error, fontWeight: '600' }}>
                      {language === 'zh' ? '取消下载' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Completed state notice */}
            {downloadStatus === 'completed' && (
              <View
                style={[
                  styles.statusNoticeCard,
                  {
                    backgroundColor: palette.surfaceContainerLow,
                    borderColor: palette.outlineVariant,
                  },
                ]}
              >
                <Icon name="check_circle" size={20} color="#00875a" fill />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.statusNoticeTitle, { color: palette.onSurface }]}>
                    {language === 'zh' ? '已成功下载安装包' : 'Package downloaded successfully'}
                  </Text>
                  <Text style={[styles.statusNoticeSub, { color: palette.onSurfaceVariant }]}>
                    {language === 'zh'
                      ? '已尝试打开安装程序。如未自动弹出，请点击下方「立即安装」'
                      : 'Package installer opened. Click Install Now below if not triggered.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Error state notice */}
            {downloadStatus === 'error' && (
              <View
                style={[
                  styles.statusNoticeCard,
                  {
                    backgroundColor: palette.errorContainer,
                    borderColor: palette.error,
                  },
                ]}
              >
                <Icon name="error" size={20} color={palette.error} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.statusNoticeTitle, { color: palette.onErrorContainer }]}>
                    {language === 'zh' ? '下载失败' : 'Download failed'}
                  </Text>
                  <Text style={[styles.statusNoticeSub, { color: palette.onErrorContainer }]}>
                    {errorMessage || (language === 'zh' ? '网络连接异常，请重试' : 'Network error')}
                  </Text>
                </View>
              </View>
            )}

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

            {/* Browser Fallback Link */}
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleOpenInBrowser}
                style={styles.browserLinkRow}
              >
                <Icon name="open_in_browser" size={15} color={palette.primary} />
                <Text style={[styles.browserLinkText, { color: palette.primary }]}>
                  {language === 'zh' ? '遇到问题？在浏览器中直接下载 APK' : 'Trouble updating? Download in browser'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {/* Cancel / Later Button - Always accessible! */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              style={[styles.cancelBtn, { borderColor: palette.outlineVariant }]}
            >
              <Text style={[styles.cancelBtnText, { color: palette.onSurfaceVariant }]}>
                {downloadStatus === 'downloading'
                  ? (language === 'zh' ? '取消下载' : 'Cancel')
                  : (language === 'zh' ? '稍后更新' : 'Later')}
              </Text>
            </TouchableOpacity>

            {/* Primary Action Button */}
            {downloadStatus === 'completed' ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => downloadedFileUri && installApk(downloadedFileUri)}
                style={[styles.downloadBtn, { backgroundColor: palette.primary }]}
              >
                <Icon name="install_mobile" size={18} color="#ffffff" fill />
                <Text style={styles.downloadBtnText}>
                  {language === 'zh' ? '立即安装' : 'Install Now'}
                </Text>
              </TouchableOpacity>
            ) : downloadStatus === 'downloading' ? (
              <View
                style={[
                  styles.downloadBtn,
                  { backgroundColor: palette.primary, opacity: 0.85 },
                ]}
              >
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.downloadBtnText}>
                  {language === 'zh' ? `正在下载 ${progressPercent}%` : `Downloading ${progressPercent}%`}
                </Text>
              </View>
            ) : downloadStatus === 'error' ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleStartDownload}
                style={[styles.downloadBtn, { backgroundColor: palette.primary }]}
              >
                <Icon name="refresh" size={18} color="#ffffff" />
                <Text style={styles.downloadBtnText}>
                  {language === 'zh' ? '重试下载' : 'Retry'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleStartDownload}
                style={[styles.downloadBtn, { backgroundColor: palette.primary }]}
              >
                <Icon name="download" size={18} color="#ffffff" />
                <Text style={styles.downloadBtnText}>
                  {Platform.OS === 'web'
                    ? (language === 'zh' ? '立即下载' : 'Download Now')
                    : (language === 'zh' ? '应用内下载更新' : 'Download Update')}
                </Text>
              </TouchableOpacity>
            )}
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerBanner: {
    position: 'relative',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  headerCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: 340,
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
  progressCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  statusNoticeTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusNoticeSub: {
    fontSize: 12,
    lineHeight: 16,
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
  browserLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 4,
  },
  browserLinkText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
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
