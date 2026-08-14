import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useProviderStore } from '../src/store/useProviderStore';
import { useTokenStore } from '../src/store/useTokenStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getColorPalette } from '../src/theme/colors';
import { Icon } from '../src/components/common/Icon';
import { FortressSidebar } from '../src/components/common/FortressSidebar';
import { FortressBottomNav } from '../src/components/common/FortressBottomNav';
import { useToast } from '../src/components/common/Toast';
import { Provider } from '../src/types/provider';

const ICON_OPTIONS = [
  'shield',
  'hub',
  'language',
  'code',
  'cloud',
  'devices',
  'account_balance',
  'auto_awesome',
  'send',
  'forum',
  'tag',
  'sports_esports',
  'lock',
  'security',
  'vpn_key',
];

const COLOR_OPTIONS = [
  '#005ac1',
  '#4285F4',
  '#24292e',
  '#00a4ef',
  '#FF9900',
  '#F38020',
  '#10a37f',
  '#5865F2',
  '#7c3aed',
  '#ba1a1a',
  '#00875a',
  '#d97706',
];

export default function ProvidersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 840;
  const { showToast } = useToast();

  const providers = useProviderStore((s) => s.providers);
  const addProvider = useProviderStore((s) => s.addProvider);
  const deleteProvider = useProviderStore((s) => s.deleteProvider);
  const tokens = useTokenStore((s) => s.tokens);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [searchQuery, setSearchQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('shield');
  const [selectedColor, setSelectedColor] = useState('#005ac1');
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);

  // Filter providers
  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providers;
    const q = searchQuery.toLowerCase().trim();
    return providers.filter((p) => p.name.toLowerCase().includes(q));
  }, [providers, searchQuery]);

  // Count tokens per provider
  const providerTokenCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tokens.forEach((t) => {
      const key = t.issuer.toLowerCase().trim();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [tokens]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProvider = async () => {
    if (isSubmitting) return;
    if (!newProviderName.trim()) {
      showToast(language === 'zh' ? '请输入提供商名称' : 'Please enter provider name', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await addProvider({
        name: newProviderName.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });

      showToast(
        language === 'zh' ? `已添加提供商 "${newProviderName}"` : `Provider "${newProviderName}" added`,
        'check_circle'
      );
      setNewProviderName('');
      setAddModalVisible(false);
    } catch (_) {
      showToast('添加提供商失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (isSubmitting || !deleteTarget) return;
    try {
      setIsSubmitting(true);
      await deleteProvider(deleteTarget.id);
      showToast(
        language === 'zh' ? `已删除提供商 "${deleteTarget.name}"` : `Provider "${deleteTarget.name}" deleted`,
        'delete'
      );
      setDeleteTarget(null);
    } catch (_) {
      showToast('删除提供商失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.layoutWrapper}>
        {/* Desktop Sidebar */}
        {isDesktop && <FortressSidebar />}

        {/* Content */}
        <View style={styles.contentWrapper}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={[styles.backBtn, { backgroundColor: palette.surfaceContainerLow }]}
                >
                  <Icon name="arrow_back" size={22} color={palette.onSurfaceVariant} />
                </TouchableOpacity>
                <View>
                  <Text style={[styles.title, { color: palette.onSurface }]}>
                    {language === 'zh' ? '提供商管理' : 'Provider Management'}
                  </Text>
                  <Text style={[styles.subtitle, { color: palette.onSurfaceVariant }]}>
                    {language === 'zh'
                      ? '管理各 2FA 身份验证提供商及品牌图标'
                      : 'Manage 2FA Identity Providers and custom issuers'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setAddModalVisible(true)}
                style={[styles.addBtn, { backgroundColor: palette.primary }]}
              >
                <Icon name="add" size={18} color="#ffffff" />
                <Text style={styles.addBtnText}>
                  {language === 'zh' ? '新增提供商' : 'Add Provider'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: palette.surfaceContainer,
                  borderColor: palette.outlineVariant,
                },
              ]}
            >
              <Icon name="search" size={20} color={palette.onSurfaceVariant} />
              <TextInput
                style={[styles.searchInput, { color: palette.onSurface }]}
                placeholder={language === 'zh' ? '模糊搜索提供商...' : 'Search providers...'}
                placeholderTextColor={palette.outline}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={18} color={palette.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </View>

            {/* Providers Grid */}
            <View style={styles.providersGrid}>
              {filteredProviders.map((p) => {
                const count = providerTokenCounts[p.name.toLowerCase().trim()] || 0;

                return (
                  <View
                    key={p.id}
                    style={[
                      styles.providerCard,
                      {
                        backgroundColor: palette.surfaceContainer,
                        borderColor: palette.outlineVariant,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconBox, { backgroundColor: p.color || palette.primary }]}>
                        <Icon name={p.icon || 'shield'} size={22} color="#ffffff" fill />
                      </View>
                      <View style={styles.cardHeaderRight}>
                        {p.isDefault ? (
                          <View
                            style={[
                              styles.systemBadge,
                              { backgroundColor: palette.secondaryContainer },
                            ]}
                          >
                            <Text
                              style={[
                                styles.systemBadgeText,
                                { color: palette.onSecondaryContainer },
                              ]}
                            >
                              {language === 'zh' ? '官方系统' : 'System'}
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => setDeleteTarget(p)}
                            style={[styles.deleteBtn, { backgroundColor: palette.errorContainer }]}
                          >
                            <Icon name="delete" size={16} color={palette.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <Text style={[styles.providerName, { color: palette.onSurface }]} numberOfLines={1}>
                      {p.name}
                    </Text>

                    <View style={styles.tokenCountRow}>
                      <Icon name="key" size={14} color={palette.onSurfaceVariant} />
                      <Text style={[styles.tokenCountText, { color: palette.onSurfaceVariant }]}>
                        {count} {language === 'zh' ? '个关联密钥' : 'tokens'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>

          {/* Mobile Bottom Nav */}
          {!isDesktop && <FortressBottomNav />}
        </View>
      </View>

      {/* Add Provider Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconBox, { backgroundColor: selectedColor }]}>
                  <Icon name={selectedIcon} size={20} color="#ffffff" fill />
                </View>
                <Text style={[styles.modalTitle, { color: palette.onSurface }]}>
                  {language === 'zh' ? '新增自定义提供商' : 'Add Custom Provider'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Icon name="close" size={22} color={palette.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Name Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '提供商名称' : 'Provider Name'} *
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.outlineVariant,
                      color: palette.onSurface,
                    },
                  ]}
                  placeholder={language === 'zh' ? '例如: Notion / Stripe / Epic' : 'e.g. Notion'}
                  placeholderTextColor={palette.outline}
                  value={newProviderName}
                  onChangeText={setNewProviderName}
                />
              </View>

              {/* Icon Picker */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '选择图标' : 'Select Icon'}
                </Text>
                <View style={styles.iconsRow}>
                  {ICON_OPTIONS.map((iconName) => (
                    <TouchableOpacity
                      key={iconName}
                      onPress={() => setSelectedIcon(iconName)}
                      style={[
                        styles.iconChoice,
                        {
                          backgroundColor:
                            selectedIcon === iconName
                              ? palette.primaryContainer
                              : palette.surfaceContainerLow,
                          borderColor:
                            selectedIcon === iconName ? palette.primary : palette.outlineVariant,
                        },
                      ]}
                    >
                      <Icon
                        name={iconName}
                        size={20}
                        color={selectedIcon === iconName ? '#ffffff' : palette.onSurface}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Color Picker */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '品牌主题色' : 'Brand Theme Color'}
                </Text>
                <View style={styles.colorsRow}>
                  {COLOR_OPTIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setSelectedColor(c)}
                      style={[
                        styles.colorChoice,
                        { backgroundColor: c },
                        selectedColor === c && styles.selectedColorChoice,
                      ]}
                    >
                      {selectedColor === c && <Icon name="check" size={16} color="#ffffff" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={[styles.cancelBtn, { borderColor: palette.outlineVariant }]}
              >
                <Text style={[styles.cancelBtnText, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '取消' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateProvider}
                disabled={isSubmitting}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: palette.primary,
                    opacity: isSubmitting ? 0.7 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  },
                ]}
              >
                {isSubmitting && <ActivityIndicator size="small" color="#ffffff" />}
                <Text style={styles.saveBtnText}>
                  {isSubmitting
                    ? language === 'zh'
                      ? '正在保存...'
                      : 'Saving...'
                    : language === 'zh'
                    ? '保存并创建'
                    : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
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
            <Icon name="warning" size={36} color={palette.error} />
            <Text style={[styles.confirmTitle, { color: palette.onSurface }]}>
              {language === 'zh' ? '删除提供商' : 'Delete Provider'}
            </Text>
            <Text style={[styles.confirmMsg, { color: palette.onSurfaceVariant }]}>
              {language === 'zh'
                ? `确定要删除提供商 "${deleteTarget?.name}" 吗？关联的 2FA 密钥不会被删除。`
                : `Are you sure you want to delete "${deleteTarget?.name}"?`}
            </Text>

            <View style={styles.confirmFooter}>
              <TouchableOpacity
                onPress={() => setDeleteTarget(null)}
                style={[styles.cancelBtn, { borderColor: palette.outlineVariant, flex: 1 }]}
              >
                <Text style={[styles.cancelBtnText, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '取消' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                disabled={isSubmitting}
                style={[
                  styles.confirmDeleteBtn,
                  {
                    backgroundColor: palette.error,
                    opacity: isSubmitting ? 0.7 : 1,
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  },
                ]}
              >
                {isSubmitting && <ActivityIndicator size="small" color="#ffffff" />}
                <Text style={styles.confirmDeleteBtnText}>
                  {isSubmitting
                    ? language === 'zh'
                      ? '正在删除...'
                      : 'Deleting...'
                    : language === 'zh'
                    ? '确认删除'
                    : 'Delete'}
                </Text>
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
  layoutWrapper: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'column',
    height: '100%',
  },
  scrollContent: {
    padding: 20,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    cursor: 'pointer',
  },
  addBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    paddingVertical: 0,
  },
  providersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerCard: {
    width: '48%',
    minWidth: 260,
    flexGrow: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderRight: {},
  systemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  systemBadgeText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  providerName: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  tokenCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tokenCountText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    maxHeight: 380,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  iconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconChoice: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorChoice: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  selectedColorChoice: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 18,
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
  confirmDeleteBtn: {
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
  },
});
