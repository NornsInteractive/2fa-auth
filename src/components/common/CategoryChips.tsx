import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useTokenStore } from '../../store/useTokenStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { t } from '../../utils/i18n';
import { Icon } from './Icon';

interface CategoryChipsProps {
  onOpenAddCategory?: () => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({ onOpenAddCategory }) => {
  const categories = useCategoryStore((s) => s.categories);
  const selectedCategoryId = useCategoryStore((s) => s.selectedCategoryId);
  const setSelectedCategoryId = useCategoryStore((s) => s.setSelectedCategoryId);

  const tokens = useTokenStore((s) => s.tokens);
  const selectedProvider = useTokenStore((s) => s.selectedProvider);
  const setSelectedProvider = useTokenStore((s) => s.setSelectedProvider);

  const language = useSettingsStore((s) => s.language);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  // Dynamic unique providers from tokens
  const providers = useMemo(() => {
    const map = new Map<string, number>();
    tokens.forEach((t) => {
      const issuer = (t.issuer || '').trim();
      if (issuer) {
        map.set(issuer, (map.get(issuer) || 0) + 1);
      }
    });

    const list = Array.from(map.entries()).map(([issuer, count]) => ({
      issuer,
      count,
    }));

    return [{ issuer: 'all', count: tokens.length }, ...list];
  }, [tokens]);

  const getCategoryCount = (catId: string) => {
    if (catId === 'all') return tokens.length;
    return tokens.filter((t) => t.categoryId === catId).length;
  };

  const getCategoryDisplayName = (cat: any) => {
    if (cat.nameKey) {
      return t(cat.nameKey as any, language);
    }
    return cat.name;
  };

  return (
    <View style={styles.container}>
      {/* Category Chips Row */}
      <View style={styles.filterSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.filterTitle, { color: palette.onSurfaceVariant }]}>
            {language === 'zh' ? '分类筛选' : 'Categories'}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const count = getCategoryCount(cat.id);

            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.7}
                onPress={() => setSelectedCategoryId(cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? palette.primaryContainer
                      : palette.surfaceContainerLow,
                    borderColor: isSelected ? palette.primary : palette.outlineVariant,
                  },
                ]}
              >
                {cat.icon && (
                  <Icon
                    name={cat.icon}
                    size={16}
                    color={isSelected ? palette.onPrimaryContainer : palette.onSurfaceVariant}
                    fill={isSelected}
                  />
                )}
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected
                        ? palette.onPrimaryContainer
                        : palette.onSurfaceVariant,
                      fontWeight: isSelected ? '600' : '500',
                    },
                  ]}
                >
                  {getCategoryDisplayName(cat)}
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.25)'
                        : palette.surfaceContainerHighest,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      {
                        color: isSelected
                          ? palette.onPrimaryContainer
                          : palette.onSurfaceVariant,
                      },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Add Category Button */}
          {onOpenAddCategory && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onOpenAddCategory}
              style={[
                styles.addChip,
                {
                  borderColor: palette.outlineVariant,
                  backgroundColor: palette.surfaceContainerLow,
                },
              ]}
            >
              <Icon name="add" size={16} color={palette.primary} />
              <Text style={[styles.addChipText, { color: palette.primary }]}>
                {t('addCategory', language)}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Provider / Issuer Filter Row (If multiple providers exist) */}
      {providers.length > 1 && (
        <View style={[styles.filterSection, { marginTop: 8 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.filterTitle, { color: palette.onSurfaceVariant }]}>
              {language === 'zh' ? '提供商筛选' : 'Providers'}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {providers.map((p) => {
              const isSelected = selectedProvider === p.issuer;
              return (
                <TouchableOpacity
                  key={p.issuer}
                  activeOpacity={0.7}
                  onPress={() => setSelectedProvider(p.issuer)}
                  style={[
                    styles.providerChip,
                    {
                      backgroundColor: isSelected
                        ? palette.secondaryContainer
                        : palette.surfaceContainerLow,
                      borderColor: isSelected ? palette.primary : palette.outlineVariant,
                    },
                  ]}
                >
                  <Icon
                    name={p.issuer === 'all' ? 'hub' : 'shield'}
                    size={14}
                    color={isSelected ? palette.onSecondaryContainer : palette.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.providerChipText,
                      {
                        color: isSelected
                          ? palette.onSecondaryContainer
                          : palette.onSurfaceVariant,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {p.issuer === 'all'
                      ? language === 'zh'
                        ? '全部提供商'
                        : 'All Providers'
                      : p.issuer}
                  </Text>
                  <View
                    style={[
                      styles.providerCountBadge,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(255,255,255,0.3)'
                          : palette.surfaceContainerHighest,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        {
                          color: isSelected
                            ? palette.onSecondaryContainer
                            : palette.onSurfaceVariant,
                        },
                      ]}
                    >
                      {p.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    gap: 4,
  },
  filterSection: {
    gap: 4,
  },
  sectionHeader: {
    paddingHorizontal: 6,
  },
  filterTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    cursor: 'pointer',
  },
  chipText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
    marginLeft: 2,
  },
  countText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: '600',
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    cursor: 'pointer',
  },
  providerChipText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
  },
  providerCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 9999,
    marginLeft: 2,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderStyle: 'dashed',
    cursor: 'pointer',
  },
  addChipText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '600',
  },
});
