import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, Linking } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { t } from '../../utils/i18n';
import { Icon } from './Icon';
import { GitHubIcon } from './GitHubIcon';

interface FortressSidebarProps {
  onOpenAddModal?: () => void;
}

export const FortressSidebar: React.FC<FortressSidebarProps> = ({ onOpenAddModal }) => {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const lockVault = useAuthStore((s) => s.lockVault);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const navItems = [
    { label: t('navHome', language), path: '/', icon: 'home' },
    { label: t('navCategories', language), path: '/categories', icon: 'folder' },
    { label: language === 'zh' ? '提供商' : 'Providers', path: '/providers', icon: 'hub' },
    { label: t('navSettings', language), path: '/settings', icon: 'settings' },
  ];

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: palette.surfaceContainer,
          borderRightColor: palette.surfaceVariant,
        },
      ]}
    >
      {/* Profile Header */}
      <View style={styles.profileSection}>
        <Image
          source={{
            uri:
              user?.avatarUrl ||
              `https://api.dicebear.com/7.x/identicon/png?seed=${encodeURIComponent(user?.email || 'user')}`,
          }}
          style={styles.avatar}
        />
        <View style={styles.profileInfo}>
          <Text style={[styles.userName, { color: palette.primary }]} numberOfLines={1}>
            {user?.name || 'My Vault'}
          </Text>
          <Text style={[styles.userEmail, { color: palette.onSurfaceVariant }]} numberOfLines={1}>
            {user?.email || 'secure@vault.local'}
          </Text>
          {/* Security level badge commented out per requirement */}
          {/* <View style={[styles.securityBadge, { backgroundColor: palette.secondaryContainer }]}>
            <Text style={[styles.securityBadgeText, { color: palette.onSecondaryContainer }]}>
              {t('securityLevel', language)}
            </Text>
          </View> */}
        </View>
      </View>

      {/* Navigation Links */}
      <View style={styles.navLinks}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <TouchableOpacity
              key={item.path}
              activeOpacity={0.7}
              onPress={() => router.push(item.path as any)}
              style={[
                styles.navItem,
                {
                  backgroundColor: isActive
                    ? palette.primaryContainer
                    : 'transparent',
                },
              ]}
            >
              <Icon
                name={item.icon}
                size={22}
                color={isActive ? palette.onPrimaryContainer : palette.onSurfaceVariant}
                fill={isActive}
              />
              <Text
                style={[
                  styles.navItemText,
                  {
                    color: isActive
                      ? palette.onPrimaryContainer
                      : palette.onSurfaceVariant,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomSection}>
        {onOpenAddModal && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenAddModal}
            style={[styles.addAccountButton, { backgroundColor: palette.primary }]}
          >
            <Icon name="add" size={22} color="#ffffff" />
            <Text style={styles.addAccountButtonText}>
              {language === 'zh' ? '新增密钥' : 'Add 2FA Key'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={lockVault}
          style={[styles.lockVaultButton, { backgroundColor: palette.surfaceContainerLow }]}
        >
          <Icon name="lock" size={18} color={palette.onSurfaceVariant} />
          <Text style={[styles.lockVaultText, { color: palette.onSurfaceVariant }]}>
            {t('navLockVault', language)}
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
          style={[styles.githubButton, { backgroundColor: palette.surfaceContainerLow }]}
          accessibilityLabel="GitHub Repository"
        >
          <GitHubIcon size={16} color={palette.onSurfaceVariant} />
          <Text style={[styles.lockVaultText, { color: palette.onSurfaceVariant }]}>GitHub</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    height: '100%',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    resizeMode: 'cover',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    marginTop: 2,
  },
  securityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  securityBadgeText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 10,
    fontWeight: '600',
  },
  navLinks: {
    flex: 1,
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 9999,
    cursor: 'pointer',
  },
  navItemText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 15,
  },
  bottomSection: {
    marginTop: 'auto',
    gap: 10,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    cursor: 'pointer',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addAccountButtonText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 15,
    fontWeight: '700',
  },
  lockVaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    cursor: 'pointer',
  },
  lockVaultText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '500',
  },
  githubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    cursor: 'pointer',
  },
});
