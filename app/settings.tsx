import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, useWindowDimensions, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useAuthStore } from '../src/store/useAuthStore';
import { useTokenStore } from '../src/store/useTokenStore';
import { getColorPalette, THEME_COLOR_OPTIONS } from '../src/theme/colors';
import { t } from '../src/utils/i18n';
import { Icon } from '../src/components/common/Icon';
import { useToast } from '../src/components/common/Toast';
import { FortressSidebar } from '../src/components/common/FortressSidebar';
import { FortressBottomNav } from '../src/components/common/FortressBottomNav';
import { ThemeColorKey, ThemeMode, Language } from '../src/types/settings';

export default function SettingsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 840;
  const { showToast } = useToast();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const lockVault = useAuthStore((s) => s.lockVault);

  const tokens = useTokenStore((s) => s.tokens);
  const resetToDefault = useTokenStore((s) => s.resetToDefault);

  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const setThemeColor = useSettingsStore((s) => s.setThemeColor);
  const autoLockMinutes = useSettingsStore((s) => s.autoLockMinutes);
  const setAutoLockMinutes = useSettingsStore((s) => s.setAutoLockMinutes);
  const biometricsEnabled = useSettingsStore((s) => s.biometricsEnabled);
  const setBiometricsEnabled = useSettingsStore((s) => s.setBiometricsEnabled);
  const cloudSyncEnabled = useSettingsStore((s) => s.cloudSyncEnabled);
  const setCloudSyncEnabled = useSettingsStore((s) => s.setCloudSyncEnabled);
  const persistSessionOnReload = useSettingsStore((s) => s.persistSessionOnReload);
  const setPersistSessionOnReload = useSettingsStore((s) => s.setPersistSessionOnReload);
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  const syncIntervalSeconds = useSettingsStore((s) => s.syncIntervalSeconds);
  const setSyncIntervalSeconds = useSettingsStore((s) => s.setSyncIntervalSeconds);

  const [clearModalVisible, setClearModalVisible] = useState(false);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const autoLockOptions = [
    { label: '1 ' + t('autoLockMinutes', language), value: 1 },
    { label: '5 ' + t('autoLockMinutes', language), value: 5 },
    { label: '15 ' + t('autoLockMinutes', language), value: 15 },
    { label: t('autoLockNever', language), value: 0 },
  ];

  const syncIntervalOptions = [
    { label: language === 'zh' ? '10秒' : '10s', value: 10 },
    { label: language === 'zh' ? '30秒' : '30s', value: 30 },
    { label: language === 'zh' ? '1分钟' : '1m', value: 60 },
    { label: language === 'zh' ? '5分钟' : '5m', value: 300 },
    { label: language === 'zh' ? '关闭' : 'Off', value: 0 },
  ];

  const handleResetVault = async () => {
    await resetToDefault();
    setClearModalVisible(false);
    showToast('本地保险库已重置为默认演示数据', 'restore_page');
  };

  const handleLogout = async () => {
    await logout();
    showToast(t('logoutSuccess', language), 'shield_lock');
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.layoutWrapper}>
        {/* Desktop Sidebar */}
        {isDesktop && <FortressSidebar />}

        {/* Content */}
        <View style={styles.contentWrapper}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.backBtn, { backgroundColor: palette.surfaceContainerLow }]}
              >
                <Icon name="arrow_back" size={22} color={palette.onSurfaceVariant} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: palette.onSurface }]}>
                {t('settingsTitle', language)}
              </Text>
            </View>

            {/* Section 1: Appearance & Personalization */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: palette.primary }]}>
                {t('appearanceSection', language)}
              </Text>

              {/* Theme Mode */}
              <View
                style={[
                  styles.cardRow,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: palette.onSurface }]}>
                    {t('themeModeLabel', language)}
                  </Text>
                </View>
                <View style={styles.pillGroup}>
                  {(['light', 'dark'] as ThemeMode[]).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setThemeMode(mode)}
                      style={[
                        styles.modePill,
                        {
                          backgroundColor:
                            themeMode === mode
                              ? palette.primaryContainer
                              : palette.surfaceContainerLow,
                        },
                      ]}
                    >
                      <Icon
                        name={mode === 'light' ? 'light_mode' : 'dark_mode'}
                        size={16}
                        color={themeMode === mode ? '#ffffff' : palette.onSurface}
                      />
                      <Text
                        style={[
                          styles.modePillText,
                          { color: themeMode === mode ? '#ffffff' : palette.onSurface },
                        ]}
                      >
                        {mode === 'light' ? t('themeModeLight', language) : t('themeModeDark', language)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Theme Color Scheme */}
              <View
                style={[
                  styles.cardColumn,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <Text style={[styles.rowTitle, { color: palette.onSurface, marginBottom: 12 }]}>
                  {t('themeColorLabel', language)}
                </Text>
                <View style={styles.colorGrid}>
                  {THEME_COLOR_OPTIONS.map((opt) => {
                    const isSelected = themeColor === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        activeOpacity={0.7}
                        onPress={() => setThemeColor(opt.key)}
                        style={[
                          styles.colorItem,
                          {
                            backgroundColor: isSelected
                              ? palette.secondaryContainer
                              : palette.surfaceContainerLow,
                            borderColor: isSelected ? opt.primary : palette.outlineVariant,
                          },
                        ]}
                      >
                        <View style={[styles.colorDot, { backgroundColor: opt.primaryContainer }]} />
                        <Text
                          style={[
                            styles.colorName,
                            {
                              color: palette.onSurface,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {language === 'zh' ? opt.nameZh : opt.name}
                        </Text>
                        {isSelected && <Icon name="check" size={16} color={opt.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Language Switcher */}
              <View
                style={[
                  styles.cardRow,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: palette.onSurface }]}>
                    {t('languageLabel', language)}
                  </Text>
                </View>
                <View style={styles.pillGroup}>
                  {(['zh', 'en'] as Language[]).map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      onPress={() => setLanguage(lang)}
                      style={[
                        styles.modePill,
                        {
                          backgroundColor:
                            language === lang
                              ? palette.primaryContainer
                              : palette.surfaceContainerLow,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modePillText,
                          { color: language === lang ? '#ffffff' : palette.onSurface },
                        ]}
                      >
                        {lang === 'zh' ? '简体中文' : 'English'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Section 2: Vault Security */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: palette.primary }]}>
                {t('securitySection', language)}
              </Text>

              {/* Auto Lock Duration */}
              <View
                style={[
                  styles.cardColumn,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <Text style={[styles.rowTitle, { color: palette.onSurface, marginBottom: 10 }]}>
                  {t('autoLockLabel', language)}
                </Text>
                <View style={styles.autoLockRow}>
                  {autoLockOptions.map((opt) => {
                    const isSelected = autoLockMinutes === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setAutoLockMinutes(opt.value)}
                        style={[
                          styles.autoLockPill,
                          {
                            backgroundColor: isSelected
                              ? palette.primaryContainer
                              : palette.surfaceContainerLow,
                            borderColor: isSelected ? palette.primary : palette.outlineVariant,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.autoLockPillText,
                            { color: isSelected ? '#ffffff' : palette.onSurface },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Biometrics */}
              <View
                style={[
                  styles.cardRow,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View style={styles.rowInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.rowTitle, { color: palette.onSurface }]}>
                      {t('biometricLabel', language)}
                    </Text>
                    <View
                      style={{
                        backgroundColor: palette.surfaceVariant,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: palette.onSurfaceVariant,
                          fontWeight: '600',
                        }}
                      >
                        {language === 'zh' ? '开发中' : 'In Dev'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.rowSub, { color: palette.onSurfaceVariant }]}>
                    {language === 'zh'
                      ? '指纹 / Face ID 快速进入 (功能开发中，暂不可用)'
                      : 'Fingerprint / Face ID (Feature in development, currently unavailable)'}
                  </Text>
                </View>
                <Switch
                  value={false}
                  onValueChange={() =>
                    showToast(
                      language === 'zh'
                        ? '生物识别功能开发中，暂不可用'
                        : 'Biometric feature is in development',
                      'info'
                    )
                  }
                  thumbColor={'#ccc'}
                  trackColor={{ false: '#767577', true: palette.secondaryContainer }}
                />
              </View>

              {/* Persist Session on Reload Toggle */}
              <View
                style={[
                  styles.cardRow,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: palette.onSurface }]}>
                    {language === 'zh' ? '刷新页面保持登录' : 'Keep Logged In on Refresh'}
                  </Text>
                  <Text style={[styles.rowSub, { color: palette.onSurfaceVariant }]}>
                    {language === 'zh'
                      ? '开启后刷新或重启页面无需重新输入主密码'
                      : 'Preserve vault session across page reloads and browser restarts'}
                  </Text>
                </View>
                <Switch
                  value={persistSessionOnReload}
                  onValueChange={setPersistSessionOnReload}
                  thumbColor={persistSessionOnReload ? palette.primary : '#ccc'}
                  trackColor={{ false: '#767577', true: palette.secondaryContainer }}
                />
              </View>

              {/* Lock Vault Immediately */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={lockVault}
                style={[
                  styles.cardRow,
                  styles.clickableRow,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View style={styles.rowLeftGroup}>
                  <Icon name="lock" size={20} color={palette.primary} />
                  <Text style={[styles.rowTitle, { color: palette.onSurface }]}>
                    {t('navLockVault', language)}
                  </Text>
                </View>
                <Icon name="chevron_right" size={20} color={palette.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Section 3: Cloudflare D1 Sync & Data */}
            <View style={styles.section}>
              <Text style={[styles.sectionHeading, { color: palette.primary }]}>
                {t('cloudSection', language)}
              </Text>

              {/* Server Endpoint URL Configuration */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/server-config')}
                style={[
                  styles.cardRow,
                  styles.clickableRow,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: palette.onSurface }]}>
                    {language === 'zh' ? '服务端域名地址' : 'Server Endpoint URL'}
                  </Text>
                  <Text style={[styles.rowSub, { color: palette.onSurfaceVariant }]} numberOfLines={1}>
                    {serverUrl || (language === 'zh' ? '未配置 (纯本地模式)' : 'Not configured (Local mode)')}
                  </Text>
                </View>
                <Icon name="chevron_right" size={20} color={palette.onSurfaceVariant} />
              </TouchableOpacity>

              {/* D1 Sync Status */}
              <View
                style={[
                  styles.cardRow,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: palette.onSurface }]}>
                    {t('cloudSyncLabel', language)}
                  </Text>
                  <View style={styles.statusBadgeRow}>
                    <View style={styles.greenPulseDot} />
                    <Text style={[styles.statusText, { color: '#00875a' }]}>
                      {t('cloudSyncStatus', language)}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={cloudSyncEnabled}
                  onValueChange={setCloudSyncEnabled}
                  thumbColor={cloudSyncEnabled ? palette.primary : '#ccc'}
                  trackColor={{ false: '#767577', true: palette.secondaryContainer }}
                />
              </View>

              {/* Auto Sync Interval Selector */}
              <View
                style={[
                  styles.cardColumn,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <Text style={[styles.rowTitle, { color: palette.onSurface, marginBottom: 10 }]}>
                  {language === 'zh' ? '密钥列表定时同步频率' : 'Key List Auto-sync Interval'}
                </Text>
                <View style={styles.autoLockRow}>
                  {syncIntervalOptions.map((opt) => {
                    const isSelected = syncIntervalSeconds === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setSyncIntervalSeconds(opt.value)}
                        style={[
                          styles.autoLockPill,
                          {
                            backgroundColor: isSelected
                              ? palette.primaryContainer
                              : palette.surfaceContainerLow,
                            borderColor: isSelected ? palette.primary : palette.outlineVariant,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.autoLockPillText,
                            { color: isSelected ? '#ffffff' : palette.onSurface },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Tokens Count */}
              <View
                style={[
                  styles.cardRow,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <Text style={[styles.rowTitle, { color: palette.onSurface }]}>
                  {t('storageUsed', language)}
                </Text>
                <Text style={[styles.badgeNumber, { color: palette.primary }]}>
                  {tokens.length} 项
                </Text>
              </View>

              {/* Reset Vault Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setClearModalVisible(true)}
                style={[
                  styles.cardRow,
                  styles.clickableRow,
                  { backgroundColor: palette.errorContainer, borderColor: palette.error },
                ]}
              >
                <View style={styles.rowLeftGroup}>
                  <Icon name="delete_forever" size={20} color={palette.error} />
                  <Text style={[styles.rowTitle, { color: palette.onErrorContainer }]}>
                    {t('clearAllData', language)}
                  </Text>
                </View>
                <Icon name="chevron_right" size={20} color={palette.error} />
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogout}
              style={[styles.logoutBtn, { borderColor: palette.outlineVariant }]}
            >
              <Icon name="logout" size={18} color={palette.error} />
              <Text style={[styles.logoutText, { color: palette.error }]}>
                安全退出登录
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Mobile Bottom Nav */}
          {!isDesktop && <FortressBottomNav />}
        </View>
      </View>

      {/* Clear Vault Confirmation Modal */}
      <Modal
        visible={clearModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setClearModalVisible(false)}
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
              {t('clearAllData', language)}
            </Text>
            <Text style={[styles.confirmMsg, { color: palette.onSurfaceVariant }]}>
              {t('clearConfirm', language)}
            </Text>

            <View style={styles.confirmFooter}>
              <TouchableOpacity
                onPress={() => setClearModalVisible(false)}
                style={[styles.confirmCancel, { borderColor: palette.outlineVariant }]}
              >
                <Text style={[styles.confirmCancelText, { color: palette.onSurfaceVariant }]}>
                  {t('cancelButton', language)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleResetVault}
                style={[styles.confirmDelete, { backgroundColor: palette.error }]}
              >
                <Text style={styles.confirmDeleteText}>确认重置</Text>
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
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
    gap: 10,
  },
  sectionHeading: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardColumn: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  clickableRow: {
    cursor: 'pointer',
  },
  rowLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    cursor: 'pointer',
  },
  modePillText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    cursor: 'pointer',
    width: '48%',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 9999,
    marginRight: 8,
  },
  colorName: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    flex: 1,
  },
  autoLockRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  autoLockPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    cursor: 'pointer',
  },
  autoLockPillText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: '#00875a',
  },
  statusText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeNumber: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    cursor: 'pointer',
  },
  logoutText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
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
  confirmTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
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
  confirmCancel: {
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
  confirmDelete: {
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
