import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Modal, ScrollView, Platform, Linking, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTokenStore } from '../../store/useTokenStore';
import { getColorPalette, THEME_COLOR_OPTIONS } from '../../theme/colors';
import { t } from '../../utils/i18n';
import { Icon } from './Icon';
import { GitHubIcon } from './GitHubIcon';

interface FortressHeaderProps {
  onOpenAddModal?: () => void;
}

export const FortressHeader: React.FC<FortressHeaderProps> = ({ onOpenAddModal }) => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const lockVault = useAuthStore((s) => s.lockVault);
  const searchQuery = useTokenStore((s) => s.searchQuery);
  const setSearchQuery = useTokenStore((s) => s.setSearchQuery);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const setThemeColor = useSettingsStore((s) => s.setThemeColor);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const toggleThemeMode = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const isRefreshing = useTokenStore((s) => s.isRefreshing);
  const refreshTokens = useTokenStore((s) => s.refreshTokens);

  return (
    <View style={[styles.headerContainer, { backgroundColor: palette.surface, borderColor: palette.surfaceVariant }]}>
      {/* Mobile Brand Top Row */}
      <View style={styles.topRow}>
        <View style={styles.brandGroup}>
          <View style={[styles.shieldIconWrapper, { backgroundColor: palette.primaryContainer }]}>
            <Icon name="shield_lock" size={20} color="#ffffff" fill />
          </View>
          <Text style={[styles.brandTitle, { color: palette.primary }]}>
            {t('appName', language)}
          </Text>
        </View>

        {/* Action Controls */}
        <View style={styles.headerControls}>
          {/* Theme Color Picker Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setColorPickerVisible(true)}
            style={[styles.iconButton, { backgroundColor: palette.surfaceContainerLow }]}
            accessibilityLabel="Switch Theme Color"
          >
            <View style={[styles.colorDot, { backgroundColor: palette.primary }]} />
          </TouchableOpacity>

          {/* Theme Mode Toggle (Light/Dark) */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleThemeMode}
            style={[styles.iconButton, { backgroundColor: palette.surfaceContainerLow }]}
            accessibilityLabel="Toggle Light/Dark"
          >
            <Icon
              name={isDark ? 'light_mode' : 'dark_mode'}
              size={18}
              color={palette.onSurfaceVariant}
            />
          </TouchableOpacity>

          {/* Language Switcher */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleLanguage}
            style={[styles.iconButton, { backgroundColor: palette.surfaceContainerLow }]}
            accessibilityLabel="Switch Language"
          >
            <Text style={[styles.langText, { color: palette.primary }]}>
              {language === 'zh' ? 'EN' : '中'}
            </Text>
          </TouchableOpacity>

          {/* GitHub Link */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              const url = 'https://github.com/NornsInteractive/2fa-auth';
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.open(url, '_blank');
              } else {
                Linking.openURL(url);
              }
            }}
            style={[styles.iconButton, { backgroundColor: palette.surfaceContainerLow }]}
            accessibilityLabel="GitHub Repository"
          >
            <GitHubIcon size={18} color={palette.onSurfaceVariant} />
          </TouchableOpacity>

          {/* Lock Vault Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={lockVault}
            style={[styles.iconButton, { backgroundColor: palette.surfaceContainerLow }]}
            accessibilityLabel={t('navLockVault', language)}
          >
            <Icon name="lock" size={18} color={palette.onSurfaceVariant} />
          </TouchableOpacity>

          {/* User Avatar */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/settings')}
            style={styles.avatarWrapper}
          >
            <Image
              source={{
                uri:
                  user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/identicon/png?seed=${encodeURIComponent(user?.email || 'default')}`,
              }}
              style={styles.avatarImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar + Refresh List + Add Token Button */}
      <View style={styles.searchBarRow}>
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: palette.surfaceContainer,
              borderColor: palette.outlineVariant,
            },
          ]}
        >
          <Icon name="search" size={20} color={palette.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: palette.onSurface }]}
            placeholder={t('searchPlaceholder', language)}
            placeholderTextColor={palette.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={18} color={palette.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        {/* Refresh List Button next to search input */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={refreshTokens}
          disabled={isRefreshing}
          style={[
            styles.refreshListBtn,
            {
              backgroundColor: palette.secondaryContainer,
              borderColor: palette.outlineVariant,
            },
          ]}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={palette.onSecondaryContainer} />
          ) : (
            <Icon name="refresh" size={16} color={palette.onSecondaryContainer} />
          )}
          <Text style={[styles.refreshListBtnText, { color: palette.onSecondaryContainer }]}>
            {language === 'zh' ? '刷新列表' : 'Refresh List'}
          </Text>
        </TouchableOpacity>

        {/* Add Token Button next to search input */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onOpenAddModal}
          style={[styles.addTokenBtn, { backgroundColor: palette.primary }]}
        >
          <Icon name="add" size={18} color="#ffffff" />
          <Text style={styles.addTokenBtnText}>
            {language === 'zh' ? '新增密钥' : 'Add Token'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Theme Color Picker Modal */}
      <Modal
        visible={colorPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setColorPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setColorPickerVisible(false)}
        >
          <View
            style={[
              styles.colorPickerModal,
              {
                backgroundColor: palette.surfaceContainer,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.onSurface }]}>
                {t('themeColorLabel', language)}
              </Text>
              <TouchableOpacity onPress={() => setColorPickerVisible(false)}>
                <Icon name="close" size={20} color={palette.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.colorOptionsList}>
              {THEME_COLOR_OPTIONS.map((opt) => {
                const isSelected = themeColor === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    activeOpacity={0.7}
                    onPress={() => {
                      setThemeColor(opt.key);
                      setColorPickerVisible(false);
                    }}
                    style={[
                      styles.colorOptionItem,
                      {
                        backgroundColor: isSelected
                          ? palette.secondaryContainer
                          : palette.surfaceContainerLow,
                        borderColor: isSelected ? opt.primary : palette.outlineVariant,
                      },
                    ]}
                  >
                    <View style={[styles.largeColorDot, { backgroundColor: opt.primaryContainer }]} />
                    <Text
                      style={[
                        styles.colorOptionText,
                        {
                          color: palette.onSurface,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {language === 'zh' ? opt.nameZh : opt.name}
                    </Text>
                    {isSelected && (
                      <Icon name="check" size={18} color={opt.primaryContainer} style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shieldIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 18,
    fontWeight: '700',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 9999,
  },
  langText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarWrapper: {
    width: 34,
    height: 34,
    borderRadius: 9999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e3e2e6',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    paddingVertical: 2,
  },
  refreshListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    cursor: 'pointer',
  },
  refreshListBtnText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
  },
  addTokenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    cursor: 'pointer',
  },
  addTokenBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  colorPickerModal: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 17,
    fontWeight: '700',
  },
  colorOptionsList: {
    gap: 8,
  },
  colorOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    cursor: 'pointer',
  },
  largeColorDot: {
    width: 20,
    height: 20,
    borderRadius: 9999,
    marginRight: 12,
  },
  colorOptionText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    flex: 1,
  },
  checkIcon: {
    marginLeft: 8,
  },
});
