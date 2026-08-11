import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Token } from '../../types/token';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTokenStore } from '../../store/useTokenStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { getColorPalette } from '../../theme/colors';
import { formatTOTPCode, generateTOTP } from '../../utils/totp';
import { useToast } from '../common/Toast';
import { t } from '../../utils/i18n';
import { Icon } from '../common/Icon';
import { ProgressRing } from '../common/ProgressRing';

interface TokenCardProps {
  token: Token;
  remainingSeconds: number;
}

export const TokenCard: React.FC<TokenCardProps> = ({ token, remainingSeconds }) => {
  const router = useRouter();
  const { showToast } = useToast();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const themeColor = useSettingsStore((s) => s.themeColor);
  const language = useSettingsStore((s) => s.language);
  const categories = useCategoryStore((s) => s.categories);
  const setCopiedTokenId = useTokenStore((s) => s.setCopiedTokenId);

  const isDark = themeMode === 'dark';
  const palette = getColorPalette(themeColor, isDark);

  // Generate TOTP code based on current period
  const rawCode = useMemo(() => {
    return generateTOTP(token.secretKey, {
      digits: token.digits || 6,
      period: token.period || 30,
      algorithm: token.algorithm || 'SHA1',
    });
  }, [token.secretKey, token.digits, token.period, token.algorithm, remainingSeconds]);

  const formattedCode = useMemo(() => formatTOTPCode(rawCode), [rawCode]);

  // Find category badge
  const category = categories.find((c) => c.id === token.categoryId);

  const handleCopy = (e?: any) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(rawCode);
    }
    setCopiedTokenId(token.id);
    showToast(`${t('copiedCode', language)}: ${formattedCode}`, 'content_copy');

    setTimeout(() => {
      setCopiedTokenId(null);
    }, 1500);
  };

  const handleNavigateDetail = () => {
    router.push(`/token/${token.id}`);
  };

  // Determine icon
  const getIconName = (type?: string, issuer?: string) => {
    if (type) {
      if (type === 'account_balance') return 'account_balance';
      if (type === 'code') return 'code';
      if (type === 'language') return 'language';
      if (type === 'hub') return 'hub';
      if (type === 'cloud') return 'cloud';
      if (type === 'shield') return 'shield';
      if (type === 'business_center') return 'business_center';
    }
    const iss = (issuer || '').toLowerCase();
    if (iss.includes('bank') || iss.includes('finance') || iss.includes('pay')) return 'account_balance';
    if (iss.includes('git') || iss.includes('dev') || iss.includes('code')) return 'code';
    if (iss.includes('google') || iss.includes('web') || iss.includes('domain')) return 'language';
    if (iss.includes('cloud') || iss.includes('aws') || iss.includes('azure')) return 'cloud';
    return 'shield';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handleNavigateDetail}
      style={[
        styles.card,
        {
          backgroundColor: palette.surfaceContainer,
          borderColor: palette.surfaceVariant,
        },
      ]}
    >
      {/* Header Info */}
      <View style={styles.headerRow}>
        <View style={styles.issuerInfo}>
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: palette.surfaceBright,
                borderColor: palette.surfaceVariant,
              },
            ]}
          >
            <Icon
              name={getIconName(token.iconType, token.issuer)}
              size={22}
              color={palette.primary}
              fill
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.issuerText, { color: palette.onSurface }]} numberOfLines={1}>
              {token.issuer}
            </Text>
            <Text style={[styles.accountText, { color: palette.onSurfaceVariant }]} numberOfLines={1}>
              {token.accountName}
            </Text>
          </View>
        </View>

        {/* Category tag */}
        {category && category.id !== 'all' && (
          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor: palette.secondaryContainer,
                borderColor: palette.outlineVariant,
              },
            ]}
          >
            <Text style={[styles.categoryBadgeText, { color: palette.onSecondaryContainer }]}>
              {category.nameKey ? t(category.nameKey as any, language) : category.name}
            </Text>
          </View>
        )}
      </View>

      {/* Code & Timer Row */}
      <View style={styles.codeRow}>
        <Text
          style={[
            styles.codeText,
            {
              color: remainingSeconds <= 5 ? palette.error : palette.primary,
            },
          ]}
        >
          {formattedCode}
        </Text>

        <View style={styles.actionsGroup}>
          <ProgressRing
            remainingSeconds={remainingSeconds}
            period={token.period || 30}
            size={32}
            strokeWidth={3.5}
            primaryColor={palette.primary}
            errorColor={palette.error}
            trackColor={palette.surfaceVariant}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCopy}
            style={[
              styles.copyButton,
              {
                backgroundColor: palette.surfaceContainerLow,
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="content_copy" size={18} color={palette.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
    cursor: 'pointer',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  issuerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleContainer: {
    flex: 1,
  },
  issuerText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  accountText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  categoryBadgeText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 10,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  codeText: {
    fontFamily: 'JetBrains Mono, Courier New, monospace',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 2,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
});
