import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { getColorPalette } from '../src/theme/colors';
import { Icon } from '../src/components/common/Icon';
import { FortressSidebar } from '../src/components/common/FortressSidebar';
import { useToast } from '../src/components/common/Toast';
import { getApiUrl, fetchEncrypted } from '../src/api/client';

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  securityLevel: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  createdAt: string;
  tokensCount: number;
}

interface AdminStats {
  totalUsers: number;
  totalTokens: number;
  totalCategories: number;
  totalProviders: number;
}

export default function AdminScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 840;
  const { showToast } = useToast();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthReady = useAuthStore((s) => s.isAuthReady);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTokens: 0,
    totalCategories: 0,
    totalProviders: 0,
  });
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Access Control: Only admin allowed
  useEffect(() => {
    if (isAuthReady) {
      if (!isAuthenticated || !user) {
        router.replace('/login');
      } else if (user.role !== 'admin' && !user.isAdmin) {
        showToast('无权访问管理员控制台', 'shield_lock');
        router.replace('/');
      }
    }
  }, [isAuthReady, isAuthenticated, user]);

  const loadAdminData = async () => {
    try {
      setRefreshing(true);
      // Fetch Users
      const usersRes = await fetchEncrypted(getApiUrl('/api/admin/users'));
      if (usersRes.ok) {
        const data = await usersRes.json();
        if (Array.isArray(data)) {
          setUsers(data);
        }
      }

      // Fetch Stats
      const statsRes = await fetchEncrypted(getApiUrl('/api/admin/stats'));
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch Settings
      const settingsRes = await fetchEncrypted(getApiUrl('/api/admin/settings'));
      if (settingsRes.ok) {
        const setts = await settingsRes.json();
        setAllowRegistration(Boolean(setts.allowRegistration));
      }
    } catch (err: any) {
      showToast('加载管理数据失败，已降级', 'info');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleRegistration = async (value: boolean) => {
    setAllowRegistration(value);
    try {
      await fetchEncrypted(getApiUrl('/api/admin/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowRegistration: value }),
      });
      showToast(value ? '已开放新用户公开注册' : '已关闭公开注册，仅管理员可分配', 'tune');
    } catch (_) {
      showToast('设置更新失败', 'error');
    }
  };

  const handleToggleUserStatus = async (targetUser: AdminUserItem) => {
    if (targetUser.role === 'admin' || targetUser.id === 'admin_root') {
      showToast('超级管理员账号不可禁用', 'info');
      return;
    }

    const nextStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetchEncrypted(getApiUrl('/api/admin/toggle-status'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUser.id, status: nextStatus }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
        );
        showToast(
          nextStatus === 'active' ? `已解封账号 ${targetUser.name}` : `已冻结账号 ${targetUser.name}`,
          'shield_lock'
        );
      }
    } catch (_) {
      showToast('修改账号状态失败', 'error');
    }
  };

  const handleOpenResetModal = (targetUser: AdminUserItem) => {
    setSelectedUser(targetUser);
    setNewPassword('');
    setResetModalVisible(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUser || !newPassword.trim()) {
      showToast('请输入新密码', 'info');
      return;
    }

    try {
      setSubmittingReset(true);
      const res = await fetchEncrypted(getApiUrl('/api/admin/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          newPassword: newPassword.trim(),
        }),
      });

      if (res.ok) {
        showToast(`已成功将 ${selectedUser.name} 的密码重置`, 'vpn_key');
        setResetModalVisible(false);
        setSelectedUser(null);
        setNewPassword('');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || '重置密码失败', 'error');
      }
    } catch (_) {
      showToast('网络请求异常', 'error');
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleOpenDeleteModal = (targetUser: AdminUserItem) => {
    if (targetUser.role === 'admin' || targetUser.id === 'admin_root') {
      showToast('超级管理员账号不可删除', 'info');
      return;
    }
    setSelectedUser(targetUser);
    setDeleteModalVisible(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setSubmittingDelete(true);
      const res = await fetchEncrypted(getApiUrl(`/api/admin/users/${selectedUser.id}`), {
        method: 'DELETE',
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
        setStats((prev) => ({ ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) }));
        showToast(`已彻底删除用户 ${selectedUser.name} 及其所有数据`, 'delete');
        setDeleteModalVisible(false);
        setSelectedUser(null);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || '删除失败', 'error');
      }
    } catch (_) {
      showToast('网络请求异常', 'error');
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Search filter
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.layoutWrapper}>
        {/* Desktop Sidebar */}
        {isDesktop && <FortressSidebar />}

        {/* Main Content Area */}
        <View style={styles.contentWrapper}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Bar */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={[styles.backBtn, { backgroundColor: palette.surfaceContainerLow }]}
                >
                  <Icon name="arrow_back" size={22} color={palette.onSurfaceVariant} />
                </TouchableOpacity>
                <View>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: palette.onSurface }]}>
                      {language === 'zh' ? '系统管理控制台' : 'Admin Console'}
                    </Text>
                    <View style={[styles.adminPill, { backgroundColor: palette.primary }]}>
                      <Icon name="shield_lock" size={13} color="#ffffff" />
                      <Text style={styles.adminPillText}>ROOT</Text>
                    </View>
                  </View>
                  <Text style={[styles.subTitle, { color: palette.onSurfaceVariant }]}>
                    {language === 'zh'
                      ? '统一管理注册用户、重置用户密码、控制系统开放策略'
                      : 'Manage registered users, reset passwords, and system registration policies'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={loadAdminData}
                disabled={refreshing}
                style={[
                  styles.refreshBtn,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={palette.primary} />
                ) : (
                  <Icon name="refresh" size={18} color={palette.onSurfaceVariant} />
                )}
                <Text style={[styles.refreshBtnText, { color: palette.onSurface }]}>
                  {language === 'zh' ? '刷新数据' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Statistics Cards */}
            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View style={[styles.statIconWrapper, { backgroundColor: palette.primaryContainer }]}>
                  <Icon name="person" size={20} color={palette.onPrimaryContainer} />
                </View>
                <Text style={[styles.statNumber, { color: palette.onSurface }]}>
                  {stats.totalUsers}
                </Text>
                <Text style={[styles.statLabel, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '总注册用户' : 'Total Users'}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View style={[styles.statIconWrapper, { backgroundColor: palette.secondaryContainer }]}>
                  <Icon name="vpn_key" size={20} color={palette.onSecondaryContainer} />
                </View>
                <Text style={[styles.statNumber, { color: palette.onSurface }]}>
                  {stats.totalTokens}
                </Text>
                <Text style={[styles.statLabel, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '托管 2FA 密钥总数' : 'Total 2FA Keys'}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View style={[styles.statIconWrapper, { backgroundColor: palette.tertiaryContainer }]}>
                  <Icon name="hub" size={20} color={palette.onTertiaryContainer} />
                </View>
                <Text style={[styles.statNumber, { color: palette.onSurface }]}>
                  {stats.totalProviders}
                </Text>
                <Text style={[styles.statLabel, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '可用提供商' : 'Providers'}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                ]}
              >
                <View
                  style={[
                    styles.statIconWrapper,
                    { backgroundColor: allowRegistration ? '#e6f4ea' : '#fce8e6' },
                  ]}
                >
                  <Icon
                    name={allowRegistration ? 'check_circle' : 'lock'}
                    size={20}
                    color={allowRegistration ? '#137333' : '#c5221f'}
                  />
                </View>
                <Text
                  style={[
                    styles.statNumber,
                    { color: allowRegistration ? '#137333' : '#c5221f', fontSize: 18 },
                  ]}
                >
                  {allowRegistration ? (language === 'zh' ? '开放注册' : 'Open') : (language === 'zh' ? '关闭注册' : 'Closed')}
                </Text>
                <Text style={[styles.statLabel, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh' ? '公开注册状态' : 'Registration Policy'}
                </Text>
              </View>
            </View>

            {/* Global Settings Section */}
            <View
              style={[
                styles.settingCard,
                { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
              ]}
            >
              <View style={styles.settingInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="tune" size={20} color={palette.primary} />
                  <Text style={[styles.settingTitle, { color: palette.onSurface }]}>
                    {language === 'zh' ? '允许新用户公开注册' : 'Allow Public Registration'}
                  </Text>
                </View>
                <Text style={[styles.settingSub, { color: palette.onSurfaceVariant }]}>
                  {language === 'zh'
                    ? '关闭后，外部访客无法自行注册新账号，仅超级管理员可登录使用'
                    : 'When disabled, public user registration is locked for strict enterprise privacy.'}
                </Text>
              </View>
              <Switch
                value={allowRegistration}
                onValueChange={handleToggleRegistration}
                thumbColor={allowRegistration ? palette.primary : '#ccc'}
                trackColor={{ false: '#767577', true: palette.secondaryContainer }}
              />
            </View>

            {/* User Directory Section */}
            <View style={styles.usersSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="group" size={20} color={palette.primary} />
                  <Text style={[styles.sectionTitle, { color: palette.onSurface }]}>
                    {language === 'zh' ? '全员用户列表' : 'User Directory'} ({filteredUsers.length})
                  </Text>
                </View>

                {/* Search Box */}
                <View
                  style={[
                    styles.searchBox,
                    {
                      backgroundColor: palette.surfaceContainerLow,
                      borderColor: palette.outlineVariant,
                    },
                  ]}
                >
                  <Icon name="search" size={18} color={palette.onSurfaceVariant} />
                  <TextInput
                    style={[styles.searchInput, { color: palette.onSurface }]}
                    placeholder={language === 'zh' ? '搜索姓名、邮箱或 ID...' : 'Search users...'}
                    placeholderTextColor={palette.onSurfaceVariant}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Icon name="close" size={16} color={palette.onSurfaceVariant} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Users List Cards */}
              {loading ? (
                <View style={styles.loadingWrapper}>
                  <ActivityIndicator size="large" color={palette.primary} />
                </View>
              ) : filteredUsers.length > 0 ? (
                <View style={styles.userList}>
                  {filteredUsers.map((item) => {
                    const isSuperAdmin = item.role === 'admin' || item.id === 'admin_root';
                    const isDisabled = item.status === 'disabled';

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.userCard,
                          {
                            backgroundColor: palette.surfaceContainer,
                            borderColor: palette.outlineVariant,
                            opacity: isDisabled ? 0.75 : 1,
                          },
                        ]}
                      >
                        {/* User Avatar + Base Info */}
                        <View style={styles.userMainRow}>
                          <Image
                            source={{
                              uri:
                                item.avatarUrl ||
                                `https://api.dicebear.com/7.x/identicon/png?seed=${encodeURIComponent(item.email)}`,
                            }}
                            style={styles.userAvatar}
                          />

                          <View style={styles.userInfoCol}>
                            <View style={styles.userNameRow}>
                              <Text style={[styles.userNameText, { color: palette.onSurface }]}>
                                {item.name}
                              </Text>

                              {isSuperAdmin && (
                                <View
                                  style={[
                                    styles.badgePill,
                                    { backgroundColor: palette.primaryContainer },
                                  ]}
                                >
                                  <Text style={[styles.badgeText, { color: palette.onPrimaryContainer }]}>
                                    管理员
                                  </Text>
                                </View>
                              )}

                              {isDisabled && (
                                <View style={[styles.badgePill, { backgroundColor: '#fce8e6' }]}>
                                  <Text style={[styles.badgeText, { color: '#c5221f' }]}>
                                    已封禁
                                  </Text>
                                </View>
                              )}
                            </View>

                            <Text style={[styles.userEmailText, { color: palette.onSurfaceVariant }]}>
                              {item.email}
                            </Text>

                            <View style={styles.userMetaRow}>
                              <Text style={[styles.metaItem, { color: palette.onSurfaceVariant }]}>
                                🔑 {item.tokensCount || 0} 个密钥
                              </Text>
                              <Text style={[styles.metaItem, { color: palette.onSurfaceVariant }]}>
                                📅 {item.createdAt ? item.createdAt.slice(0, 10) : '未知日期'}
                              </Text>
                              <Text style={[styles.metaItem, { color: palette.onSurfaceVariant }]}>
                                ID: {item.id}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Action Buttons Row */}
                        <View style={styles.userActionRow}>
                          {/* Reset Password Button */}
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleOpenResetModal(item)}
                            style={[
                              styles.actionBtn,
                              {
                                backgroundColor: palette.primaryContainer,
                              },
                            ]}
                          >
                            <Icon name="vpn_key" size={16} color={palette.onPrimaryContainer} />
                            <Text
                              style={[
                                styles.actionBtnText,
                                { color: palette.onPrimaryContainer },
                              ]}
                            >
                              重置密码
                            </Text>
                          </TouchableOpacity>

                          {/* Toggle Status (Active / Disabled) */}
                          {!isSuperAdmin && (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleToggleUserStatus(item)}
                              style={[
                                styles.actionBtn,
                                {
                                  backgroundColor: isDisabled ? '#e6f4ea' : '#fff0eb',
                                },
                              ]}
                            >
                              <Icon
                                name={isDisabled ? 'lock_open' : 'lock'}
                                size={16}
                                color={isDisabled ? '#137333' : '#d93025'}
                              />
                              <Text
                                style={[
                                  styles.actionBtnText,
                                  { color: isDisabled ? '#137333' : '#d93025' },
                                ]}
                              >
                                {isDisabled ? '解冻账号' : '冻结账号'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {/* Delete User Button */}
                          {!isSuperAdmin && (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleOpenDeleteModal(item)}
                              style={[
                                styles.actionBtn,
                                { backgroundColor: palette.surfaceContainerLow },
                              ]}
                            >
                              <Icon name="delete" size={16} color={palette.error} />
                              <Text style={[styles.actionBtnText, { color: palette.error }]}>
                                删除
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
                  ]}
                >
                  <Icon name="person_off" size={36} color={palette.onSurfaceVariant} />
                  <Text style={[styles.emptyText, { color: palette.onSurfaceVariant }]}>
                    {searchQuery ? '没有找到符合条件的用户' : '暂无其他注册用户'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Reset Password Modal */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="vpn_key" size={22} color={palette.primary} />
                <Text style={[styles.modalTitle, { color: palette.onSurface }]}>
                  重置用户密码
                </Text>
              </View>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <Icon name="close" size={20} color={palette.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: palette.onSurfaceVariant }]}>
              正在为用户 <Text style={{ fontWeight: '700', color: palette.primary }}>{selectedUser?.name}</Text> ({selectedUser?.email}) 重新设置主密码。
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.inputLabel, { color: palette.onSurface }]}>新主密码</Text>
              <View
                style={[
                  styles.passwordInputWrapper,
                  { backgroundColor: palette.surfaceContainerLow, borderColor: palette.outlineVariant },
                ]}
              >
                <TextInput
                  style={[styles.passwordInput, { color: palette.onSurface }]}
                  placeholder="请输入新密码（建议 8 位以上）"
                  placeholderTextColor={palette.onSurfaceVariant}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={generateRandomPassword}
                  style={[styles.genPasswordBtn, { backgroundColor: palette.secondaryContainer }]}
                >
                  <Icon name="autorenew" size={16} color={palette.onSecondaryContainer} />
                  <Text style={[styles.genPasswordBtnText, { color: palette.onSecondaryContainer }]}>
                    随机生成
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                onPress={() => setResetModalVisible(false)}
                style={[styles.modalCancelBtn, { backgroundColor: palette.surfaceContainerLow }]}
              >
                <Text style={[styles.modalCancelText, { color: palette.onSurface }]}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleConfirmResetPassword}
                disabled={submittingReset}
                style={[styles.modalSubmitBtn, { backgroundColor: palette.primary }]}
              >
                {submittingReset ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>确认修改密码</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: palette.surfaceContainer, borderColor: palette.outlineVariant },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="warning" size={22} color={palette.error} />
                <Text style={[styles.modalTitle, { color: palette.error }]}>
                  确认删除该用户？
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Icon name="close" size={20} color={palette.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: palette.onSurfaceVariant }]}>
              此操作将永久注销用户 <Text style={{ fontWeight: '700', color: palette.onSurface }}>{selectedUser?.name}</Text> ({selectedUser?.email})，并彻底清空其名下的所有 2FA 密钥与自定义分类，该操作无法撤销！
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={[styles.modalCancelBtn, { backgroundColor: palette.surfaceContainerLow }]}
              >
                <Text style={[styles.modalCancelText, { color: palette.onSurface }]}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleConfirmDeleteUser}
                disabled={submittingDelete}
                style={[styles.modalSubmitBtn, { backgroundColor: palette.error }]}
              >
                {submittingDelete ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>确认彻底删除</Text>
                )}
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
  },
  layoutWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  contentWrapper: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 1080,
    alignSelf: 'center',
    width: '100%',
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  adminPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  subTitle: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    cursor: 'pointer',
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
    gap: 4,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  usersSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    minWidth: 220,
  },
  searchInput: {
    fontSize: 13,
    flex: 1,
    paddingVertical: 2,
  },
  loadingWrapper: {
    padding: 40,
    alignItems: 'center',
  },
  userList: {
    gap: 12,
  },
  userCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  userMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#e3e2e6',
  },
  userInfoCol: {
    flex: 1,
    gap: 2,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  userEmailText: {
    fontSize: 13,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    fontSize: 11,
  },
  userActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    cursor: 'pointer',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 16,
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
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalInputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  genPasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  genPasswordBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
