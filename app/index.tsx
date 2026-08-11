import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { useTokenStore } from '../src/store/useTokenStore';
import { useCategoryStore } from '../src/store/useCategoryStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getColorPalette } from '../src/theme/colors';
import { t } from '../src/utils/i18n';
import { TokenCard } from '../src/components/token/TokenCard';
import { FortressHeader } from '../src/components/common/FortressHeader';
import { FortressSidebar } from '../src/components/common/FortressSidebar';
import { FortressBottomNav } from '../src/components/common/FortressBottomNav';
import { CategoryChips } from '../src/components/common/CategoryChips';
import { AddTokenModal } from '../src/components/token/AddTokenModal';
import { AddCategoryModal } from '../src/components/category/AddCategoryModal';
import { TokenDetailModal } from '../src/components/token/TokenDetailModal';
import { Icon } from '../src/components/common/Icon';
import { Token } from '../src/types/token';

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 840;

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const tokens = useTokenStore((s) => s.tokens);
  const searchQuery = useTokenStore((s) => s.searchQuery);
  const selectedProvider = useTokenStore((s) => s.selectedProvider);
  const remainingSeconds = useTokenStore((s) => s.remainingSeconds);
  const selectedCategoryId = useCategoryStore((s) => s.selectedCategoryId);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [addTokenVisible, setAddTokenVisible] = useState(false);
  const [addCategoryVisible, setAddCategoryVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDetailToken, setSelectedDetailToken] = useState<Token | null>(null);

  // Check auth and redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/login');
    }
  }, [isAuthenticated, user]);

  // Filtered tokens by Category, Provider/Issuer, and Search Query
  const filteredTokens = useMemo(() => {
    return tokens.filter((tok) => {
      // Category filter
      if (selectedCategoryId !== 'all' && tok.categoryId !== selectedCategoryId) {
        return false;
      }
      // Provider / Issuer filter
      if (
        selectedProvider !== 'all' &&
        tok.issuer.toLowerCase().trim() !== selectedProvider.toLowerCase().trim()
      ) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const issuerMatch = tok.issuer.toLowerCase().includes(q);
        const accountMatch = tok.accountName.toLowerCase().includes(q);
        const notesMatch = (tok.notes || '').toLowerCase().includes(q);
        return issuerMatch || accountMatch || notesMatch;
      }
      return true;
    });
  }, [tokens, selectedCategoryId, selectedProvider, searchQuery]);

  const handleOpenDetail = (tok: Token) => {
    setSelectedDetailToken(tok);
    setDetailModalVisible(true);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <View style={[styles.screenContainer, { backgroundColor: palette.background }]}>
      <View style={styles.layoutWrapper}>
        {/* Desktop Sidebar Navigation */}
        {isDesktop && (
          <FortressSidebar onOpenAddModal={() => setAddTokenVisible(true)} />
        )}

        {/* Main Content Area */}
        <View style={styles.mainContentWrapper}>
          {/* Header with Search and Add Token Button */}
          <FortressHeader onOpenAddModal={() => setAddTokenVisible(true)} />

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Category & Provider Filter Chips */}
            <CategoryChips onOpenAddCategory={() => setAddCategoryVisible(true)} />

            {/* Token Cards Grid */}
            {filteredTokens.length > 0 ? (
              <View style={[styles.cardsGrid, isDesktop && styles.desktopGrid]}>
                {filteredTokens.map((tok) => (
                  <View key={tok.id} style={isDesktop ? styles.gridCardCol : undefined}>
                    <TokenCard
                      token={tok}
                      remainingSeconds={remainingSeconds}
                      onOpenDetail={handleOpenDetail}
                    />
                  </View>
                ))}

                {/* Desktop Add Key Card */}
                {isDesktop && (
                  <View style={styles.gridCardCol}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setAddTokenVisible(true)}
                      style={[
                        styles.addPlaceholderCard,
                        {
                          backgroundColor: palette.surfaceContainerLow,
                          borderColor: palette.outlineVariant,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.addPlaceholderIcon,
                          { backgroundColor: palette.secondaryContainer },
                        ]}
                      >
                        <Icon name="add" size={28} color={palette.onSecondaryContainer} />
                      </View>
                      <Text style={[styles.addPlaceholderTitle, { color: palette.onSurface }]}>
                        {language === 'zh' ? '新增密钥' : 'Add 2FA Key'}
                      </Text>
                      <Text style={[styles.addPlaceholderSub, { color: palette.onSurfaceVariant }]}>
                        {t('scanOrEnterKey', language)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              /* Empty State (Clean zero mock data) */
              <View style={styles.emptyContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAddTokenVisible(true)}
                  style={[
                    styles.addPlaceholderCard,
                    styles.emptyFullCard,
                    {
                      backgroundColor: palette.surfaceContainerLow,
                      borderColor: palette.outlineVariant,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.addPlaceholderIcon,
                      { backgroundColor: palette.secondaryContainer },
                    ]}
                  >
                    <Icon name="add" size={32} color={palette.onSecondaryContainer} />
                  </View>
                  <Text style={[styles.addPlaceholderTitle, { color: palette.onSurface }]}>
                    {language === 'zh' ? '暂无 2FA 密钥' : 'No 2FA Tokens Yet'}
                  </Text>
                  <Text style={[styles.addPlaceholderSub, { color: palette.onSurfaceVariant }]}>
                    {language === 'zh'
                      ? '点击此处或顶部“新增密钥”按钮，添加您的第一个两步验证密钥'
                      : 'Click here or top "+ Add Token" button to create your first 2FA secret key'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Spacing */}
            <View style={{ height: 90 }} />
          </ScrollView>

          {/* Mobile Bottom Navigation */}
          {!isDesktop && <FortressBottomNav />}
        </View>
      </View>

      {/* Floating Action Button (FAB) on Mobile */}
      {!isDesktop && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setAddTokenVisible(true)}
          style={[
            styles.fab,
            {
              backgroundColor: palette.primaryContainer,
              shadowColor: palette.primary,
            },
          ]}
        >
          <Icon name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Add Token Modal */}
      <AddTokenModal
        visible={addTokenVisible}
        onClose={() => setAddTokenVisible(false)}
      />

      {/* Add Category Modal */}
      <AddCategoryModal
        visible={addCategoryVisible}
        onClose={() => setAddCategoryVisible(false)}
      />

      {/* Token Detail Modal (Modal view on click) */}
      <TokenDetailModal
        visible={detailModalVisible}
        token={selectedDetailToken}
        onClose={() => setDetailModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  layoutWrapper: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  mainContentWrapper: {
    flex: 1,
    flexDirection: 'column',
    height: '100%',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  cardsGrid: {
    marginTop: 8,
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridCardCol: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  addPlaceholderCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    cursor: 'pointer',
  },
  emptyContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFullCard: {
    width: '100%',
    maxWidth: 420,
    minHeight: 200,
  },
  addPlaceholderIcon: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  addPlaceholderTitle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  addPlaceholderSub: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 74,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    cursor: 'pointer',
    zIndex: 90,
  },
});
