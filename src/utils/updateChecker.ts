import { Platform } from 'react-native';

export interface UpdateInfo {
  hasUpdate: boolean;
  isForce: boolean;
  appId: string;
  appName: string;
  iconUrl?: string;
  currentVersionCode: number;
  latestVersionCode: number;
  latestVersionName: string;
  minVersionCode: number;
  channel: string;
  changelog: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  fileMd5?: string;
  releaseTime?: string;
}

// Current App Version Constants (Synchronized across build.gradle, app.json, package.json)
export const APP_VERSION_NAME = '1.0.3';
export const APP_VERSION_CODE = 4;
export const APP_PACKAGE_ID = 'com.anonymous.mimir2faauth';

// Yggdrasil API Server URL
export const DEFAULT_UPDATE_SERVER_URL =
  process.env.EXPO_PUBLIC_UPDATE_SERVER_URL || 'https://ygg.krm.cc.cd';

export const DEFAULT_APK_DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_APK_DOWNLOAD_URL || 'https://ygg.krm.cc.cd/api/v1/app/download?app_id=com.anonymous.mimir2faauth';

export async function checkAppUpdate(
  currentVersionCode: number = APP_VERSION_CODE,
  token?: string
): Promise<UpdateInfo | null> {
  try {
    const baseUrl = DEFAULT_UPDATE_SERVER_URL.replace(/\/+$/, '');
    const url = `${baseUrl}/api/v1/app/latest?app_id=${APP_PACKAGE_ID}&version_code=${currentVersionCode}&channel=default`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['X-Ygg-Token'] = token;
    }

    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      return null;
    }

    const resJson = await resp.json();
    if (resJson && resJson.code === 0 && resJson.data) {
      const data = resJson.data;
      return {
        hasUpdate: Boolean(data.has_update),
        isForce: Boolean(data.is_force),
        appId: data.app_id || APP_PACKAGE_ID,
        appName: data.app_name || 'Mimir',
        iconUrl: data.icon_url,
        currentVersionCode: data.current_version_code || currentVersionCode,
        latestVersionCode: data.latest_version_code || currentVersionCode,
        latestVersionName: data.latest_version_name || APP_VERSION_NAME,
        minVersionCode: data.min_version_code || 1,
        channel: data.channel || 'default',
        changelog: data.changelog || '',
        downloadUrl: data.download_url || `${baseUrl}/api/v1/app/download?app_id=${APP_PACKAGE_ID}`,
        fileName: data.file_name || 'mimir-2fa.apk',
        fileSize: data.file_size || 0,
        fileMd5: data.file_md5,
        releaseTime: data.release_time,
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}
