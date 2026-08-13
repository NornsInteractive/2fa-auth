import { create } from 'zustand';
import { AppSettings, Language, ThemeColorKey, ThemeMode } from '../types/settings';
import { storage } from '../utils/storage';

interface SettingsState extends AppSettings {
  setLanguage: (lang: Language) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeColor: (color: ThemeColorKey) => void;
  setAutoLockMinutes: (mins: number) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  setCloudSyncEnabled: (enabled: boolean) => void;
  setPersistSessionOnReload: (enabled: boolean) => void;
  setServerUrl: (url: string) => void;
  loadSettings: () => Promise<void>;
}

const SETTINGS_STORAGE_KEY = 'fortress_settings_v1';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'zh',
  themeMode: 'light',
  themeColor: 'blue',
  autoLockMinutes: 5,
  biometricsEnabled: true,
  cloudSyncEnabled: true,
  persistSessionOnReload: true,
  hideCodesByDefault: false,
  hapticsEnabled: true,
  serverUrl: '',
  serverConfigured: false,

  setLanguage: (language) => {
    set({ language });
    storage.set(SETTINGS_STORAGE_KEY, { ...get(), language });
  },

  setThemeMode: (themeMode) => {
    set({ themeMode });
    storage.set(SETTINGS_STORAGE_KEY, { ...get(), themeMode });
  },

  setThemeColor: (themeColor) => {
    set({ themeColor });
    storage.set(SETTINGS_STORAGE_KEY, { ...get(), themeColor });
  },

  setAutoLockMinutes: (autoLockMinutes) => {
    set({ autoLockMinutes });
    storage.set(SETTINGS_STORAGE_KEY, { ...get(), autoLockMinutes });
  },

  setBiometricsEnabled: (biometricsEnabled) => {
    set({ biometricsEnabled });
    storage.set(SETTINGS_STORAGE_KEY, { ...get(), biometricsEnabled });
  },

  setCloudSyncEnabled: (cloudSyncEnabled) => {
    set({ cloudSyncEnabled });
    storage.set(SETTINGS_STORAGE_KEY, { ...get(), cloudSyncEnabled });
  },

  setPersistSessionOnReload: (persistSessionOnReload) => {
    set({ persistSessionOnReload });
    storage.set(SETTINGS_STORAGE_KEY, { ...get(), persistSessionOnReload });
  },

  setServerUrl: (serverUrl) => {
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    set({ serverUrl: cleanUrl, serverConfigured: true });
    storage.set(SETTINGS_STORAGE_KEY, { ...get(), serverUrl: cleanUrl, serverConfigured: true });
  },

  loadSettings: async () => {
    const saved = await storage.get<Partial<AppSettings>>(SETTINGS_STORAGE_KEY, {});
    if (saved && Object.keys(saved).length > 0) {
      set((state) => ({ ...state, ...saved }));
    }
  },
}));
