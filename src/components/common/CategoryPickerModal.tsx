import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getColorPalette } from '../../theme/colors';
import { t } from '../../utils/i18n';
import { Icon } from './Icon';

interface CategoryPickerModalProps {
  visible: boolean;
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  visible,
  selectedCategoryId,
  onSelect,
  onClose,
}) => {
  const categories = useCategoryStore((s) => s.categories);
  const addCategory = useCategoryStore((s) => s.addCategory);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const getDisplayName = (cat: any) => {
    if (cat.nameKey) return t(cat.nameKey as any, language);
    return cat.name;
  };

  // Fuzzy filter
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter((c) => getDisplayName(c).toLowerCase().includes(q));
  }, [categories, searchQuery, language]);

  const handleCreateAndSelect = async () => {
    if (!newCatName.trim()) return;
    const created = await addCategory({ name: newCatName.trim(), icon: 'folder', color: palette.primary });
    setNewCatName('');
    setShowAddForm(false);
    onSelect(created.id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Icon name="folder" size={20} color={palette.primary} />
              <Text style={[styles.title, { color: palette.onSurface }]}>
                {language === 'zh' ? '选择分类' : 'Select Category'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={palette.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Fuzzy Search Bar */}
          <View style={styles.searchBox}>
            <View
              style={[
                styles.searchInputWrapper,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.outlineVariant,
                },
              ]}
            >
              <Icon name="search" size={18} color={palette.onSurfaceVariant} />
              <TextInput
                style={[styles.searchInput, { color: palette.onSurface }]}
                placeholder={language === 'zh' ? '输入模糊搜索分类...' : 'Search categories...'}
                placeholderTextColor={palette.outline}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={16} color={palette.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Create Category Section */}
          {showAddForm ? (
            <View style={[styles.createForm, { backgroundColor: palette.surfaceContainerLow }]}>
              <Text style={[styles.createLabel, { color: palette.onSurface }]}>
                {language === 'zh' ? '添加自定义分类' : 'Add Custom Category'}
              </Text>
              <View style={styles.createRow}>
                <TextInput
                  style={[
                    styles.createInput,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.outlineVariant,
                      color: palette.onSurface,
                    },
                  ]}
                  placeholder={language === 'zh' ? '输入分类名称' : 'Category Name'}
                  placeholderTextColor={palette.outline}
                  value={newCatName}
                  onChangeText={setNewCatName}
                />
                <TouchableOpacity
                  onPress={handleCreateAndSelect}
                  style={[styles.createBtn, { backgroundColor: palette.primary }]}
                >
                  <Text style={styles.createBtnText}>
                    {language === 'zh' ? '创建并选择' : 'Add'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowAddForm(false)}
                  style={[styles.cancelCreateBtn, { borderColor: palette.outlineVariant }]}
                >
                  <Text style={[styles.cancelCreateBtnText, { color: palette.onSurfaceVariant }]}>
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowAddForm(true)}
              style={[styles.addNewTrigger, { backgroundColor: palette.surfaceContainerLow }]}
            >
              <Icon name="add" size={18} color={palette.primary} />
              <Text style={[styles.addNewTriggerText, { color: palette.primary }]}>
                {language === 'zh' ? '+ 新建自定义分类' : '+ Add Custom Category'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Categories List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((c) => {
                const isSelected = selectedCategoryId === c.id;

                return (
                  <TouchableOpacity
                    key={c.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect(c.id);
                      onClose();
                    }}
                    style={[
                      styles.itemRow,
                      {
                        backgroundColor: isSelected
                          ? palette.secondaryContainer
                          : palette.surfaceContainerLow,
                        borderColor: isSelected ? palette.primary : palette.outlineVariant,
                      },
                    ]}
                  >
                    <View style={styles.itemLeft}>
                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: c.color || palette.primary },
                        ]}
                      >
                        <Icon name={c.icon || 'folder'} size={18} color="#ffffff" fill />
                      </View>
                      <Text
                        style={[
                          styles.itemName,
                          {
                            color: palette.onSurface,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {getDisplayName(c)}
                      </Text>
                    </View>
                    {isSelected && <Icon name="check" size={20} color={palette.primary} />}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '未找到相关分类' : 'No categories found'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setNewCatName(searchQuery);
                    setShowAddForm(true);
                  }}
                  style={[styles.quickAddBtn, { backgroundColor: palette.primary }]}
                >
                  <Text style={styles.quickAddBtnText}>
                    {language === 'zh'
                      ? `直接添加 "${searchQuery}" 为分类`
                      : `Add "${searchQuery}" as new category`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 17,
    fontWeight: '700',
  },
  searchBox: {
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    paddingVertical: 0,
  },
  addNewTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 10,
    cursor: 'pointer',
  },
  addNewTriggerText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '600',
  },
  createForm: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  createLabel: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '700',
  },
  createRow: {
    flexDirection: 'row',
    gap: 6,
  },
  createInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  createBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelCreateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  cancelCreateBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    maxHeight: 320,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    cursor: 'pointer',
  },
  itemLeft: {
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
  itemName: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  emptyText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
  },
  quickAddBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  quickAddBtnText: {
    color: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    fontWeight: '700',
  },
});
