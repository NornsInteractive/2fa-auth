import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTokenStore } from '../../store/useTokenStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useProviderStore } from '../../store/useProviderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { useToast } from './Toast';
import { Icon } from './Icon';
import { parseOtpAuthUri } from '../../utils/totp';
import { Token } from '../../types/token';

interface ImportExportModalProps {
  visible: boolean;
  onClose: () => void;
}

const copyToClipboard = async (text: string) => {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
};

type TabType = 'export' | 'import_text' | 'import_file';

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ visible, onClose }) => {
  const { showToast } = useToast();
  const tokens = useTokenStore((s) => s.tokens);
  const addToken = useTokenStore((s) => s.addToken);
  const categories = useCategoryStore((s) => s.categories);
  const providers = useProviderStore((s) => s.providers);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [importText, setImportText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any[] | null>(null);

  // Generate backup payload
  const generateExportPayload = () => {
    return {
      app: 'Mimir Authenticator',
      version: 1,
      exportedAt: new Date().toISOString(),
      tokensCount: tokens.length,
      tokens: tokens.map((t) => ({
        issuer: t.issuer,
        accountName: t.accountName,
        secretKey: t.secretKey,
        algorithm: t.algorithm || 'SHA1',
        digits: t.digits || 6,
        period: t.period || 30,
        iconType: t.iconType || 'shield',
        categoryId: t.categoryId,
        notes: t.notes || '',
        backupCodes: t.backupCodes || [],
        customFields: t.customFields || [],
      })),
      categories: categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        color: c.color,
      })),
      providers: providers.map((p) => ({
        name: p.name,
        icon: p.icon,
        color: p.color,
      })),
    };
  };

  const handleExportDownload = async () => {
    try {
      const data = generateExportPayload();
      const jsonString = JSON.stringify(data, null, 2);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mimir_2fa_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(language === 'zh' ? '备份文件已开始下载' : 'Backup file downloaded', 'cloud_download');
      } else {
        await copyToClipboard(jsonString);
        showToast(
          language === 'zh' ? '已复制备份 JSON 到剪贴板' : 'Backup copied to clipboard',
          'content_copy'
        );
      }
    } catch (_) {
      showToast('导出失败，请重试', 'error');
    }
  };

  const handleExportCopy = async () => {
    try {
      const data = generateExportPayload();
      const jsonString = JSON.stringify(data, null, 2);
      await copyToClipboard(jsonString);
      showToast(
        language === 'zh' ? '已复制备份 JSON 数据到剪贴板！' : 'Copied JSON backup to clipboard',
        'content_copy'
      );
    } catch (_) {
      showToast('复制失败', 'error');
    }
  };

  // Parse raw text into tokens
  const parseRawInput = (raw: string): any[] => {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    // 1. Try parsing as JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        const tokenList = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.tokens)
          ? parsed.tokens
          : [];

        return tokenList
          .map((item: any) => {
            const secret = item.secretKey || item.secret || item.key;
            if (!secret) return null;
            return {
              issuer: item.issuer || item.name || '2FA Account',
              accountName: item.accountName || item.account || item.user || 'Account',
              secretKey: secret.toString().replace(/\s/g, '').toUpperCase(),
              algorithm: item.algorithm || 'SHA1',
              digits: item.digits || 6,
              period: item.period || 30,
              iconType: item.iconType || 'shield',
              notes: item.notes || '',
              backupCodes: item.backupCodes || [],
            };
          })
          .filter(Boolean);
      } catch (_) {}
    }

    // 2. Try parsing line by line as otpauth:// URIs
    const lines = trimmed.split(/\r?\n/);
    const parsedTokens: any[] = [];

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('otpauth://')) {
        const parsed = parseOtpAuthUri(cleanLine);
        if (parsed && parsed.secret) {
          parsedTokens.push({
            issuer: parsed.issuer || '2FA Account',
            accountName: parsed.account || 'Account',
            secretKey: parsed.secret.toUpperCase().replace(/\s/g, ''),
            algorithm: parsed.algorithm || 'SHA1',
            digits: parsed.digits || 6,
            period: parsed.period || 30,
            iconType: 'shield',
            notes: '',
            backupCodes: [],
          });
        }
      }
    }

    return parsedTokens;
  };

  // Web File Picker handler
  const handleFileUpload = (event: any) => {
    if (Platform.OS === 'web' && event?.target?.files?.[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          const list = parseRawInput(content);
          setParsedPreview(list);
          setImportText(content);
          if (list.length > 0) {
            showToast(
              language === 'zh' ? `已解析 ${list.length} 个密钥` : `Parsed ${list.length} tokens`,
              'check_circle'
            );
          } else {
            showToast(
              language === 'zh' ? '未能在文件中识别到有效密钥' : 'No valid tokens found in file',
              'info'
            );
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteImport = async () => {
    if (isProcessing) return;
    const tokensToImport = parsedPreview || parseRawInput(importText);

    if (!tokensToImport || tokensToImport.length === 0) {
      showToast(
        language === 'zh'
          ? '未识别到有效密钥，请检查输入格式'
          : 'No valid tokens found to import',
        'error'
      );
      return;
    }

    try {
      setIsProcessing(true);
      let successCount = 0;

      for (const item of tokensToImport) {
        try {
          await addToken({
            issuer: item.issuer || '2FA Account',
            accountName: item.accountName || 'Account',
            secretKey: item.secretKey,
            algorithm: item.algorithm || 'SHA1',
            digits: item.digits || 6,
            period: item.period || 30,
            iconType: item.iconType || 'shield',
            notes: item.notes || '',
            backupCodes: item.backupCodes || [],
            customFields: item.customFields || [],
          });
          successCount++;
        } catch (_) {}
      }

      showToast(
        language === 'zh'
          ? `成功导入 ${successCount} 个 2FA 密钥！`
          : `Successfully imported ${successCount} tokens!`,
        'check_circle'
      );
      setImportText('');
      setParsedPreview(null);
      onClose();
    } catch (_) {
      showToast('导入过程中发生异常', 'error');
    } finally {
      setIsProcessing(false);
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
              <View style={[styles.iconBox, { backgroundColor: palette.primaryContainer }]}>
                <Icon name="import_export" size={20} color="#ffffff" fill />
              </View>
              <Text style={[styles.modalTitle, { color: palette.onSurface }]}>
                {language === 'zh' ? '数据备份与导入导出' : 'Import / Export Vault'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={palette.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={[styles.tabBar, { borderBottomColor: palette.outlineVariant }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('export')}
              style={[
                styles.tabItem,
                activeTab === 'export' && [
                  styles.activeTabItem,
                  { borderBottomColor: palette.primary },
                ],
              ]}
            >
              <Icon
                name="cloud_download"
                size={16}
                color={activeTab === 'export' ? palette.primary : palette.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === 'export' ? palette.primary : palette.onSurfaceVariant,
                    fontWeight: activeTab === 'export' ? '700' : '500',
                  },
                ]}
              >
                {language === 'zh' ? '导出备份' : 'Export'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('import_file')}
              style={[
                styles.tabItem,
                activeTab === 'import_file' && [
                  styles.activeTabItem,
                  { borderBottomColor: palette.primary },
                ],
              ]}
            >
              <Icon
                name="upload_file"
                size={16}
                color={activeTab === 'import_file' ? palette.primary : palette.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === 'import_file' ? palette.primary : palette.onSurfaceVariant,
                    fontWeight: activeTab === 'import_file' ? '700' : '500',
                  },
                ]}
              >
                {language === 'zh' ? '文件导入' : 'Import File'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('import_text')}
              style={[
                styles.tabItem,
                activeTab === 'import_text' && [
                  styles.activeTabItem,
                  { borderBottomColor: palette.primary },
                ],
              ]}
            >
              <Icon
                name="content_paste"
                size={16}
                color={activeTab === 'import_text' ? palette.primary : palette.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === 'import_text' ? palette.primary : palette.onSurfaceVariant,
                    fontWeight: activeTab === 'import_text' ? '700' : '500',
                  },
                ]}
              >
                {language === 'zh' ? '文本/URI 导入' : 'Paste URI / JSON'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Contents */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. EXPORT TAB */}
            {activeTab === 'export' && (
              <View style={styles.tabContent}>
                <View
                  style={[
                    styles.infoBox,
                    { backgroundColor: palette.surfaceContainerLow, borderColor: palette.outlineVariant },
                  ]}
                >
                  <Icon name="verified_user" size={24} color={palette.primary} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.infoTitle, { color: palette.onSurface }]}>
                      {language === 'zh'
                        ? `当前保险库共有 ${tokens.length} 个 2FA 密钥`
                        : `Current vault contains ${tokens.length} tokens`}
                    </Text>
                    <Text style={[styles.infoSub, { color: palette.onSurfaceVariant }]}>
                      {language === 'zh'
                        ? '导出的备份文件包含您的所有密钥、分类和提供商，请妥善保管该文件。'
                        : 'The backup file includes your secrets, categories, and providers. Keep it safe.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.exportActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleExportDownload}
                    style={[styles.primaryActionBtn, { backgroundColor: palette.primary }]}
                  >
                    <Icon name="download" size={18} color="#ffffff" />
                    <Text style={styles.primaryActionBtnText}>
                      {language === 'zh' ? '下载 JSON 备份文件' : 'Download JSON Backup'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleExportCopy}
                    style={[
                      styles.secondaryActionBtn,
                      {
                        backgroundColor: palette.secondaryContainer,
                        borderColor: palette.outlineVariant,
                      },
                    ]}
                  >
                    <Icon name="content_copy" size={18} color={palette.onSecondaryContainer} />
                    <Text
                      style={[
                        styles.secondaryActionBtnText,
                        { color: palette.onSecondaryContainer },
                      ]}
                    >
                      {language === 'zh' ? '复制备份 JSON' : 'Copy JSON'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 2. FILE IMPORT TAB */}
            {activeTab === 'import_file' && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionPrompt, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh'
                    ? '支持导入 Mimir / Bitwarden / 2FAS / 格式的 JSON 备份文件。'
                    : 'Select a standard 2FA JSON backup file to import.'}
                </Text>

                {Platform.OS === 'web' ? (
                  <View
                    style={[
                      styles.fileDropZone,
                      {
                        backgroundColor: palette.surfaceContainerLow,
                        borderColor: palette.outlineVariant,
                      },
                    ]}
                  >
                    <Icon name="cloud_upload" size={36} color={palette.primary} />
                    <Text style={[styles.fileDropTitle, { color: palette.onSurface }]}>
                      {language === 'zh' ? '点击选择 JSON 备份文件' : 'Click to select JSON file'}
                    </Text>
                    <input
                      type="file"
                      accept=".json,application/json,text/plain"
                      onChange={handleFileUpload}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <Text style={{ color: palette.onSurfaceVariant, fontSize: 13 }}>
                    {language === 'zh'
                      ? '在手机端建议使用“文本/URI 导入”标签页直接粘贴导入。'
                      : 'On mobile, please use Paste URI / JSON tab to paste backup text directly.'}
                  </Text>
                )}

                {parsedPreview && (
                  <View
                    style={[
                      styles.previewBox,
                      { backgroundColor: palette.secondaryContainer, borderColor: palette.outlineVariant },
                    ]}
                  >
                    <Text style={[styles.previewTitle, { color: palette.onSecondaryContainer }]}>
                      {language === 'zh'
                        ? `已识别 ${parsedPreview.length} 个密钥待导入：`
                        : `Found ${parsedPreview.length} tokens:`}
                    </Text>
                    {parsedPreview.slice(0, 5).map((tok, idx) => (
                      <Text
                        key={idx}
                        style={[styles.previewItem, { color: palette.onSecondaryContainer }]}
                      >
                        • {tok.issuer} ({tok.accountName})
                      </Text>
                    ))}
                    {parsedPreview.length > 5 && (
                      <Text style={{ fontSize: 12, color: palette.onSecondaryContainer, fontStyle: 'italic' }}>
                        ...及另外 {parsedPreview.length - 5} 个密钥
                      </Text>
                    )}
                  </View>
                )}

                {parsedPreview && parsedPreview.length > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleExecuteImport}
                    disabled={isProcessing}
                    style={[
                      styles.primaryActionBtn,
                      { backgroundColor: palette.primary, opacity: isProcessing ? 0.7 : 1 },
                    ]}
                  >
                    {isProcessing && <ActivityIndicator size="small" color="#ffffff" />}
                    <Text style={styles.primaryActionBtnText}>
                      {isProcessing
                        ? language === 'zh'
                          ? '正在导入并同步...'
                          : 'Importing...'
                        : language === 'zh'
                        ? `确认导入 ${parsedPreview.length} 个密钥`
                        : `Import ${parsedPreview.length} Tokens`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* 3. TEXT / URI IMPORT TAB */}
            {activeTab === 'import_text' && (
              <View style={styles.tabContent}>
                <Text style={[styles.sectionPrompt, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh'
                    ? '支持粘贴 JSON 备份数据，或每行一个 otpauth://totp/... 链接：'
                    : 'Paste JSON backup data or multiple otpauth://totp/... URIs (one per line):'}
                </Text>

                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.outlineVariant,
                      color: palette.onSurface,
                    },
                  ]}
                  placeholder={
                    language === 'zh'
                      ? '在此粘贴 JSON 文本或 otpauth://totp/... 链接...'
                      : 'Paste JSON text or otpauth://totp/... links here...'
                  }
                  placeholderTextColor={palette.outline}
                  value={importText}
                  onChangeText={(txt) => {
                    setImportText(txt);
                    const list = parseRawInput(txt);
                    setParsedPreview(list.length > 0 ? list : null);
                  }}
                  multiline
                  numberOfLines={6}
                />

                {parsedPreview && parsedPreview.length > 0 && (
                  <View
                    style={[
                      styles.previewBox,
                      { backgroundColor: palette.secondaryContainer, borderColor: palette.outlineVariant },
                    ]}
                  >
                    <Text style={[styles.previewTitle, { color: palette.onSecondaryContainer }]}>
                      {language === 'zh'
                        ? `已识别 ${parsedPreview.length} 个密钥待导入：`
                        : `Found ${parsedPreview.length} tokens:`}
                    </Text>
                    {parsedPreview.slice(0, 4).map((tok, idx) => (
                      <Text
                        key={idx}
                        style={[styles.previewItem, { color: palette.onSecondaryContainer }]}
                      >
                        • {tok.issuer} ({tok.accountName})
                      </Text>
                    ))}
                    {parsedPreview.length > 4 && (
                      <Text style={{ fontSize: 12, color: palette.onSecondaryContainer, fontStyle: 'italic' }}>
                        ...及另外 {parsedPreview.length - 4} 个密钥
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleExecuteImport}
                  disabled={isProcessing || !importText.trim()}
                  style={[
                    styles.primaryActionBtn,
                    {
                      backgroundColor: palette.primary,
                      opacity: isProcessing || !importText.trim() ? 0.6 : 1,
                    },
                  ]}
                >
                  {isProcessing && <ActivityIndicator size="small" color="#ffffff" />}
                  <Text style={styles.primaryActionBtnText}>
                    {isProcessing
                      ? language === 'zh'
                        ? '正在导入并同步...'
                        : 'Importing...'
                      : language === 'zh'
                      ? '解析并开始导入'
                      : 'Parse and Import'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Close */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { borderColor: palette.outlineVariant }]}
            >
              <Text style={[styles.closeBtnText, { color: palette.onSurfaceVariant }]}>
                {language === 'zh' ? '关闭' : 'Close'}
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
    maxWidth: 520,
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    cursor: 'pointer',
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  body: {
    padding: 18,
    maxHeight: 400,
  },
  tabContent: {
    gap: 14,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  exportActionsRow: {
    gap: 10,
    marginTop: 6,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    cursor: 'pointer',
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    cursor: 'pointer',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionPrompt: {
    fontSize: 13,
    lineHeight: 18,
  },
  fileDropZone: {
    position: 'relative',
    height: 120,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fileDropTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewItem: {
    fontSize: 12,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  closeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
