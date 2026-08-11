import React from 'react';
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
  const language = useSettingsStore((s) => s.language);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

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
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
