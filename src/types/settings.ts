export type Language = 'zh' | 'en';

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeColorKey = 
  | 'blue'     // Default Fortress Secure Blue (#005ac1)
  | 'purple'   // Cyber Purple (#7c3aed)
  | 'emerald'  // Emerald Green (#00875a)
  | 'crimson'  // Crimson Red (#ba1a1a)
  | 'amber'    // Sunset Amber (#d97706)
  | 'slate';   // Midnight Titanium (#334155)

export interface ThemeColorOption {
  key: ThemeColorKey;
  name: string;
  nameZh: string;
  primary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
}

export interface AppSettings {
  language: Language;
  themeMode: ThemeMode;
  themeColor: ThemeColorKey;
  autoLockMinutes: number; // 0 = never, 1, 5, 15, 30
  biometricsEnabled: boolean;
  cloudSyncEnabled: boolean;
  persistSessionOnReload: boolean; // Keep logged in on page refresh / restart
  hideCodesByDefault: boolean;
  hapticsEnabled: boolean;
  serverUrl: string; // Cloudflare Workers Server URL (e.g. https://mimir-2fa-api.workers.dev)
  serverConfigured: boolean; // Whether the user has configured/confirmed server domain
}
