import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useCategoryStore } from '../src/store/useCategoryStore';
import { useTokenStore } from '../src/store/useTokenStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getColorPalette } from '../src/theme/colors';
import { t } from '../src/utils/i18n';
import { Icon } from '../src/components/common/Icon';
import { useToast } from '../src/components/common/Toast';
import { AddCategoryModal } from '../src/components/category/AddCategoryModal';
import { FortressSidebar } from '../src/components/common/FortressSidebar';
import { FortressBottomNav } from '../src/components/common/FortressBottomNav';

export default function CategoriesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 840;
  const { showToast } = useToast();

  const categories = useCategoryStore((s) => s.categories);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);
  const tokens = useTokenStore((s) => s.tokens);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const getCount = (catId: string) => {
    if (catId === 'all') return tokens.length;
    return tokens.filter((t) => t.categoryId === catId).length;
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    await deleteCategory(deleteTargetId);
    setDeleteTargetId(null);
    showToast('分类已删除', 'delete');
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.layoutWrapper}>
        {/* Desktop Sidebar */}
        {isDesktop && <FortressSidebar />}

        {/* Content Area */}
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
                {t('navCategories', language)}
              </Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(true)}
                style={[styles.addBtn, { backgroundColor: palette.primary }]}
              >
                <Icon name="add" size={18} color="#ffffff" />
                <Text style={styles.addBtnText}>{t('addCategory', language)}</Text>
              </TouchableOpacity>
            </View>

            {/* Category List */}
            <View style={styles.list}>
              {categories.map((cat) => {
                const count = getCount(cat.id);
                const isDefault = cat.id === 'all';

                return (
                  <View
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: palette.surfaceContainer,
                        borderColor: palette.outlineVariant,
                      },
                    ]}
                  >
                    <View style={styles.catLeft}>
                      <View style={[styles.iconBox, { backgroundColor: cat.color || palette.primary }]}>
                        <Icon name={cat.icon || 'folder'} size={20} color="#ffffff" fill />
                      </View>
                      <View style={styles.catInfo}>
                        <Text style={[styles.catName, { color: palette.onSurface }]}>
                          {cat.nameKey ? t(cat.nameKey as any, language) : cat.name}
                        </Text>
                        <Text style={[styles.catCount, { color: palette.onSurfaceVariant }]}>
                          {count} 个账号
                        </Text>
                      </View>
                    </View>

                    <View style={styles.catRight}>
                      {!isDefault && (
                        <TouchableOpacity
                          onPress={() => setDeleteTargetId(cat.id)}
                          style={[styles.deleteBtn, { backgroundColor: palette.surfaceContainerLow }]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon name="delete" size={18} color={palette.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Mobile Bottom Nav */}
          {!isDesktop && <FortressBottomNav />}
        </View>
      </View>

      {/* Add Category Modal */}
      <AddCategoryModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!deleteTargetId}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTargetId(null)}
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
            <Icon name="warning" size={32} color={palette.error} />
            <Text style={[styles.confirmTitle, { color: palette.onSurface }]}>
              {t('deleteCategory', language)}
            </Text>
            <Text style={[styles.confirmMsg, { color: palette.onSurfaceVariant }]}>
              {t('deleteCategoryConfirm', language)}
            </Text>

            <View style={styles.confirmFooter}>
              <TouchableOpacity
                onPress={() => setDeleteTargetId(null)}
                style={[styles.confirmCancel, { borderColor: palette.outlineVariant }]}
              >
                <Text style={[styles.confirmCancelText, { color: palette.onSurfaceVariant }]}>
                  {t('cancelButton', language)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                style={[styles.confirmDelete, { backgroundColor: palette.error }]}
              >
                <Text style={styles.confirmDeleteText}>{t('confirmDeleteButton', language)}</Text>
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
    justifyContent: 'space-between',
    marginBottom: 24,
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
    flex: 1,
    marginLeft: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  addBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catInfo: {
    gap: 2,
  },
  catName: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: '600',
  },
  catCount: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
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
