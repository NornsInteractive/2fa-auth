#!/usr/bin/env python3
import os
import sys
import json
import hashlib
import urllib.request
import urllib.parse
import re
import subprocess

YGG_BASE_URL = os.environ.get('YGG_BASE_URL', 'https://ygg.krm.cc.cd')
ADMIN_PASSWORD = os.environ.get('YGG_ADMIN_PASSWORD', '882nzggzz!')
APP_ID = 'com.anonymous.mimir2faauth'
APP_NAME = 'Mimir 2FA Authenticator'
CHANNEL = 'default'

PROJECT_ROOT = '/workspace/projects/2fa-auth'
BUILD_GRADLE_PATH = os.path.join(PROJECT_ROOT, 'android/app/build.gradle')
APP_JSON_PATH = os.path.join(PROJECT_ROOT, 'app.json')
PACKAGE_JSON_PATH = os.path.join(PROJECT_ROOT, 'package.json')
UPDATE_CHECKER_PATH = os.path.join(PROJECT_ROOT, 'src/utils/updateChecker.ts')

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def make_request(url, data=None, headers=None, method=None):
    all_headers = {**HEADERS}
    if headers:
        all_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=all_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def calc_md5(file_path):
    h = hashlib.md5()
    with open(file_path, 'rb') as f:
        while chunk := f.read(1024 * 1024 * 8):
            h.update(chunk)
    return h.hexdigest()

def sync_version_info(bump=False, target_code=None, target_name=None):
    version_code = 4
    version_name = '1.0.3'

    # Read from build.gradle
    if os.path.exists(BUILD_GRADLE_PATH):
        with open(BUILD_GRADLE_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
            vc_match = re.search(r'versionCode\s+(\d+)', content)
            vn_match = re.search(r'versionName\s+["\']([^"\']+)["\']', content)
            if vc_match:
                version_code = int(vc_match.group(1))
            if vn_match:
                version_name = vn_match.group(1)

    if target_code is not None:
        version_code = target_code
    elif bump:
        version_code += 1

    if target_name is not None:
        version_name = target_name
    elif bump:
        parts = version_name.split('.')
        if len(parts) == 3 and parts[-1].isdigit():
            parts[-1] = str(int(parts[-1]) + 1)
            version_name = '.'.join(parts)

    print(f"[*] Synchronizing version across all project files -> v{version_name} (Code: {version_code})")

    # 1. Update android/app/build.gradle
    if os.path.exists(BUILD_GRADLE_PATH):
        with open(BUILD_GRADLE_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'versionCode\s+\d+', f'versionCode {version_code}', content)
        content = re.sub(r'versionName\s+["\'][^"\']+["\']', f'versionName "{version_name}"', content)
        with open(BUILD_GRADLE_PATH, 'w', encoding='utf-8') as f:
            f.write(content)

    # 2. Update app.json
    if os.path.exists(APP_JSON_PATH):
        with open(APP_JSON_PATH, 'r', encoding='utf-8') as f:
            app_data = json.load(f)
        if 'expo' in app_data:
            app_data['expo']['version'] = version_name
        with open(APP_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(app_data, f, indent=2)

    # 3. Update package.json
    if os.path.exists(PACKAGE_JSON_PATH):
        with open(PACKAGE_JSON_PATH, 'r', encoding='utf-8') as f:
            pkg_data = json.load(f)
        pkg_data['version'] = version_name
        with open(PACKAGE_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(pkg_data, f, indent=2)

    # 4. Update src/utils/updateChecker.ts
    if os.path.exists(UPDATE_CHECKER_PATH):
        with open(UPDATE_CHECKER_PATH, 'r', encoding='utf-8') as f:
            uc_content = f.read()
        uc_content = re.sub(r"export const APP_VERSION_NAME = '[^']+';", f"export const APP_VERSION_NAME = '{version_name}';", uc_content)
        uc_content = re.sub(r"export const APP_VERSION_CODE = \d+;", f"export const APP_VERSION_CODE = {version_code};", uc_content)
        with open(UPDATE_CHECKER_PATH, 'w', encoding='utf-8') as f:
            f.write(uc_content)

    return version_code, version_name

def find_best_apk():
    candidates = [
        os.path.join(PROJECT_ROOT, 'mimir-2fa-release.apk'),
        os.path.join(PROJECT_ROOT, 'mimir-2fa.apk'),
        os.path.join(PROJECT_ROOT, 'android/app/build/outputs/apk/release/app-release.apk'),
        os.path.join(PROJECT_ROOT, 'mimir-2fa-debug.apk'),
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.getsize(c) > 1024 * 1024:
            return c
    return None

def build_production_bundle():
    print("\n🔨 Building production Web bundle & Android Release APK...")
    # 1. Export Web
    subprocess.run(["npm", "run", "build:web"], cwd=PROJECT_ROOT, check=True)
    # 2. Export JS bundle for Android
    subprocess.run([
        "npx", "expo", "export:embed",
        "--platform", "android",
        "--dev", "false",
        "--entry-file", "node_modules/expo-router/entry.js",
        "--bundle-output", "android/app/src/main/assets/index.android.bundle",
        "--assets-dest", "android/app/src/main/res"
    ], cwd=PROJECT_ROOT, check=True)
    # 3. Assemble Release APK
    subprocess.run(["./gradlew", "assembleRelease"], cwd=os.path.join(PROJECT_ROOT, "android"), check=True)
    
    release_apk = os.path.join(PROJECT_ROOT, 'android/app/build/outputs/apk/release/app-release.apk')
    if os.path.exists(release_apk):
        import shutil
        shutil.copy(release_apk, os.path.join(PROJECT_ROOT, 'mimir-2fa.apk'))
        shutil.copy(release_apk, os.path.join(PROJECT_ROOT, 'mimir-2fa-release.apk'))
        shutil.copy(release_apk, os.path.join(PROJECT_ROOT, 'mimir-2fa-debug.apk'))
        print("✅ Release APK build complete and copied.")

def main():
    bump = '--bump' in sys.argv
    do_build = '--build' in sys.argv
    
    changelog = '✨ Mimir Authenticator 企业级双因素身份验证器\n- 支持 TOTP/HOTP 实时双因素验证码生成\n- 支持应用内下载更新进度展示并自动调用系统安装器安装\n- 支持 D1 数据库端到端加密云同步与本地离线保险库\n- 支持 JSON 备份导入/导出及批量扫码\n- 支持全局自定义多主题色与深色模式'
    for i, arg in enumerate(sys.argv):
        if arg == '--changelog' and i + 1 < len(sys.argv):
            changelog = sys.argv[i + 1]

    # Sync and bump versions
    version_code, version_name = sync_version_info(bump=bump)

    if do_build or not find_best_apk():
        build_production_bundle()

    apk_path = find_best_apk()
    if not apk_path or not os.path.exists(apk_path):
        print(f"Error: APK not found at {apk_path}")
        sys.exit(1)

    file_size = os.path.getsize(apk_path)
    file_name = 'mimir-2fa-release.apk'
    file_md5 = calc_md5(apk_path)

    print(f"\n=== Publishing {APP_NAME} to Yggdrasil ===")
    print(f"APK Source: {apk_path}")
    print(f"Uploaded Filename: {file_name}")
    print(f"Size: {file_size / (1024*1024):.2f} MB, MD5: {file_md5}")
    print(f"Version: {version_name} (Code: {version_code})")

    # 1. Login
    print(f"\n1. Logging in to Yggdrasil ({YGG_BASE_URL})...")
    status, body = make_request(
        f"{YGG_BASE_URL}/api/admin/login",
        data=json.dumps({'password': ADMIN_PASSWORD}).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    if status != 200:
        print(f"Login failed! Status: {status}, Response: {body.decode()}")
        sys.exit(1)
    token = json.loads(body.decode())['data']['token']
    auth_headers = {'Authorization': f'Bearer {token}'}
    print("Login successful.")

    # 2. Ensure App Exists
    print(f"\n2. Verifying application {APP_ID}...")
    status, body = make_request(f"{YGG_BASE_URL}/api/admin/apps/{APP_ID}", headers=auth_headers)
    if status == 404:
        print("Creating app entry in Yggdrasil...")
        create_payload = {
            'app_id': APP_ID,
            'name': APP_NAME,
            'icon_url': 'https://raw.githubusercontent.com/NornsInteractive/2fa-auth/main/assets/icon.png',
            'description': '极简、安全、跨平台的企业级双因素身份验证器 (Mimir Authenticator)'
        }
        status, body = make_request(
            f"{YGG_BASE_URL}/api/admin/apps",
            data=json.dumps(create_payload).encode(),
            headers={**auth_headers, 'Content-Type': 'application/json'},
            method='POST'
        )
        print(f"App created: {body.decode()}")
    else:
        print("App exists.")

    # 3. Multipart Upload APK
    print(f"\n3. Uploading APK ({file_size / (1024*1024):.2f} MB) via Chunked Multipart...")
    init_payload = {
        'fileName': file_name,
        'category': 'apk',
        'mimeType': 'application/vnd.android.package-archive'
    }
    status, body = make_request(
        f"{YGG_BASE_URL}/api/admin/upload/multipart/init",
        data=json.dumps(init_payload).encode(),
        headers={**auth_headers, 'Content-Type': 'application/json'},
        method='POST'
    )
    if status != 200:
        print(f"Failed to init multipart upload: {body.decode()}")
        sys.exit(1)
    init_data = json.loads(body.decode())['data']
    upload_id = init_data['upload_id']
    file_key = init_data['file_key']
    print(f"Initialized upload: {file_key}, Upload ID: {upload_id[:16]}...")

    # Upload parts in 10MB chunks
    CHUNK_SIZE = 10 * 1024 * 1024
    parts = []
    part_num = 1
    total_parts = (file_size + CHUNK_SIZE - 1) // CHUNK_SIZE

    with open(apk_path, 'rb') as f:
        while True:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            print(f"Uploading part {part_num}/{total_parts} ({len(chunk) / (1024*1024):.2f} MB)...", end='', flush=True)
            part_url = f"{YGG_BASE_URL}/api/admin/upload/multipart/part?uploadId={urllib.parse.quote(upload_id)}&fileKey={urllib.parse.quote(file_key)}&partNumber={part_num}"
            status, body = make_request(
                part_url,
                data=chunk,
                headers={**auth_headers, 'Content-Type': 'application/octet-stream'},
                method='PUT'
            )
            if status != 200:
                print(f"\nPart {part_num} upload failed! Status: {status}, Response: {body.decode()}")
                sys.exit(1)
            etag = json.loads(body.decode())['data']['etag']
            parts.append({'partNumber': part_num, 'etag': etag})
            print(f" done (ETag: {etag})")
            part_num += 1

    # Complete multipart upload
    print("\nCompleting multipart upload...")
    complete_payload = {
        'upload_id': upload_id,
        'file_key': file_key,
        'parts': parts,
        'file_name': file_name,
        'file_size': file_size,
        'file_md5': file_md5
    }
    status, body = make_request(
        f"{YGG_BASE_URL}/api/admin/upload/multipart/complete",
        data=json.dumps(complete_payload).encode(),
        headers={**auth_headers, 'Content-Type': 'application/json'},
        method='POST'
    )
    if status != 200:
        print(f"Complete multipart upload failed: {body.decode()}")
        sys.exit(1)
    print("Upload completed successfully!")

    # 4. Publish Version in Yggdrasil
    print(f"\n4. Publishing version {version_name} (Code: {version_code}) to Yggdrasil...")
    version_payload = {
        'version_code': version_code,
        'version_name': version_name,
        'channel': CHANNEL,
        'file_key': file_key,
        'file_name': file_name,
        'file_size': file_size,
        'file_md5': file_md5,
        'changelog': changelog,
        'is_force_update': False,
        'min_version_code': version_code,
        'is_published': True
    }
    status, body = make_request(
        f"{YGG_BASE_URL}/api/admin/apps/{APP_ID}/versions",
        data=json.dumps(version_payload).encode(),
        headers={**auth_headers, 'Content-Type': 'application/json'},
        method='POST'
    )
    print(f"Version publish response: {body.decode()}")

    # 5. Verify Public Update API
    print("\n5. Verifying client check API...")
    check_url = f"{YGG_BASE_URL}/api/v1/app/latest?app_id={APP_ID}&version_code={version_code-1}"
    status, body = make_request(check_url)
    print(f"Client check result:\n{body.decode()}")
    print("\n🎉 Success! Release APK download URL:")
    print(f"{YGG_BASE_URL}/api/v1/app/download?app_id={APP_ID}")

if __name__ == '__main__':
    main()
