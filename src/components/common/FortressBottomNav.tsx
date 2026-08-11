import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { t } from '../../utils/i18n';
import { Icon } from './Icon';

export const FortressBottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const navItems = [
    { label: t('navHome', language), path: '/', icon: 'home' },
    { label: t('navCategories', language), path: '/categories', icon: 'folder' },
    { label: t('navSettings', language), path: '/settings', icon: 'settings' },
  ];

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: palette.surfaceContainerLow,
          borderTopColor: palette.surfaceVariant,
        },
      ]}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <TouchableOpacity
            key={item.path}
            activeOpacity={0.7}
            onPress={() => router.push(item.path as any)}
            style={[
              styles.navTab,
              isActive && [styles.activeTab, { backgroundColor: palette.secondaryContainer }],
            ]}
          >
            <Icon
              name={item.icon}
              size={22}
              color={isActive ? palette.onSecondaryContainer : palette.onSurfaceVariant}
              fill={isActive}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? palette.onSecondaryContainer : palette.onSurfaceVariant,
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
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  navTab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 9999,
    cursor: 'pointer',
  },
  activeTab: {
    paddingHorizontal: 20,
  },
  tabLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
  },
});
