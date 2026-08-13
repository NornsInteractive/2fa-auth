import React from 'react';
import { TextStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  fill?: boolean;
  style?: TextStyle;
}

// Comprehensive mapping from Google Material Symbols snake_case names to @expo/vector-icons glyph names
const ICON_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  add: 'add',
  lock: 'lock',
  lock_open: 'lock-open',
  key: 'vpn-key',
  vpn_key: 'vpn-key',
  dns: 'dns',
  link: 'link',
  check_circle: 'check-circle',
  phone_iphone: 'phone-iphone',
  info: 'info',
  warning: 'warning',
  error: 'error',
  search: 'search',
  close: 'close',
  delete: 'delete',
  delete_forever: 'delete-forever',
  edit: 'edit',
  check: 'check',
  arrow_back: 'arrow-back',
  arrow_forward: 'arrow-forward',
  arrow_drop_down: 'arrow-drop-down',
  logout: 'logout',
  person: 'person',
  mail: 'email',
  email: 'email',
  fingerprint: 'fingerprint',
  shield: 'security',
  shield_lock: 'security',
  security: 'security',
  chevron_right: 'chevron-right',
  chevron_left: 'chevron-left',
  content_copy: 'content-copy',
  visibility: 'visibility',
  visibility_off: 'visibility-off',
  content_paste: 'content-paste',
  qr_code_scanner: 'qr-code-scanner',
  qr_code: 'qr-code',
  history: 'history',
  category: 'category',
  settings: 'settings',
  refresh: 'refresh',
  star: 'star',
  work: 'work',
  account_balance: 'account-balance',
  folder: 'folder',
  hub: 'hub',
  more_vert: 'more-vert',
  more_horiz: 'more-horiz',
  restore_page: 'restore-page',
  inventory_2: 'inventory',
  light_mode: 'light-mode',
  dark_mode: 'dark-mode',
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000000',
  fill = false,
  style,
}) => {
  const iconColor = color === 'currentColor' ? '#333333' : color;
  const mappedName = ICON_MAP[name] || (name.replace(/_/g, '-') as any);

  return (
    <MaterialIcons
      name={mappedName}
      size={size}
      color={iconColor}
      style={style}
    />
  );
};
