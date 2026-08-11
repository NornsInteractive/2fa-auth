import { ThemeColorKey, ThemeColorOption } from '../types/settings';

export const THEME_COLOR_OPTIONS: ThemeColorOption[] = [
  {
    key: 'blue',
    name: 'Secure Blue (Default)',
    nameZh: '安全蓝 (默认)',
    primary: '#004394',
    primaryContainer: '#005ac1',
    onPrimaryContainer: '#c8d8ff',
  },
  {
    key: 'purple',
    name: 'Cyber Purple',
    nameZh: '赛博紫',
    primary: '#6b21a8',
    primaryContainer: '#7e22ce',
    onPrimaryContainer: '#f3e8ff',
  },
  {
    key: 'emerald',
    name: 'Emerald Green',
    nameZh: '翡翠绿',
    primary: '#065f46',
    primaryContainer: '#047857',
    onPrimaryContainer: '#d1fae5',
  },
  {
    key: 'crimson',
    name: 'Crimson Red',
    nameZh: '绯红警戒',
    primary: '#991b1b',
    primaryContainer: '#b91c1c',
    onPrimaryContainer: '#fee2e2',
  },
  {
    key: 'amber',
    name: 'Sunset Amber',
    nameZh: '落日琥珀',
    primary: '#92400e',
    primaryContainer: '#b45309',
    onPrimaryContainer: '#fef3c7',
  },
  {
    key: 'slate',
    name: 'Midnight Titanium',
    nameZh: '午夜钛金',
    primary: '#334155',
    primaryContainer: '#475569',
    onPrimaryContainer: '#f1f5f9',
  },
];

export interface ColorPalette {
  background: string;
  surface: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceVariant: string;
  onSurface: string;
  onSurfaceVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  outline: string;
  outlineVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  primaryFixed: string;
  primaryFixedDim: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  success: string;
  onSuccess: string;
}

export function getColorPalette(colorKey: ThemeColorKey, isDark: boolean): ColorPalette {
  const themeOpt = THEME_COLOR_OPTIONS.find((t) => t.key === colorKey) || THEME_COLOR_OPTIONS[0];

  if (isDark) {
    return {
      background: '#121316',
      surface: '#121316',
      surfaceDim: '#121316',
      surfaceBright: '#38393c',
      surfaceContainerLowest: '#0d0e11',
      surfaceContainerLow: '#1a1c1e',
      surfaceContainer: '#1e2023',
      surfaceContainerHigh: '#292a2d',
      surfaceContainerHighest: '#333538',
      surfaceVariant: '#424753',
      onSurface: '#e2e2e5',
      onSurfaceVariant: '#c2c6d5',
      inverseSurface: '#e2e2e5',
      inverseOnSurface: '#2f3033',
      outline: '#8c919e',
      outlineVariant: '#424753',
      primary: themeOpt.primaryContainer,
      onPrimary: '#ffffff',
      primaryContainer: themeOpt.primary,
      onPrimaryContainer: themeOpt.onPrimaryContainer,
      primaryFixed: '#d8e2ff',
      primaryFixedDim: '#adc6ff',
      secondary: '#bbc7db',
      onSecondary: '#253140',
      secondaryContainer: '#3b4858',
      onSecondaryContainer: '#d7e3f8',
      tertiary: '#dcbce1',
      onTertiary: '#3c2941',
      tertiaryContainer: '#543f58',
      onTertiaryContainer: '#f9d8fe',
      error: '#ffb4ab',
      onError: '#690005',
      errorContainer: '#93000a',
      onErrorContainer: '#ffdad6',
      success: '#81c995',
      onSuccess: '#003919',
    };
  }

  // Light mode (default Material 3 Secure Blue / selected color)
  return {
    background: '#faf9fd',
    surface: '#faf9fd',
    surfaceDim: '#dad9dd',
    surfaceBright: '#faf9fd',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f4f3f7',
    surfaceContainer: '#eeedf1',
    surfaceContainerHigh: '#e8e8ec',
    surfaceContainerHighest: '#e3e2e6',
    surfaceVariant: '#e3e2e6',
    onSurface: '#1a1c1e',
    onSurfaceVariant: '#424753',
    inverseSurface: '#2f3033',
    inverseOnSurface: '#f1f0f4',
    outline: '#727784',
    outlineVariant: '#c2c6d5',
    primary: themeOpt.primary,
    onPrimary: '#ffffff',
    primaryContainer: themeOpt.primaryContainer,
    onPrimaryContainer: themeOpt.onPrimaryContainer,
    primaryFixed: '#d8e2ff',
    primaryFixedDim: '#adc6ff',
    secondary: '#535f70',
    onSecondary: '#ffffff',
    secondaryContainer: '#d7e3f8',
    onSecondaryContainer: '#596576',
    tertiary: '#563e5c',
    onTertiary: '#ffffff',
    tertiaryContainer: '#6f5575',
    onTertiaryContainer: '#eecdf3',
    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
    success: '#1e8e3e',
    onSuccess: '#ffffff',
  };
}
