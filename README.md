<div align="center">
  <img src="./icon.png" alt="Mimir Logo" width="120" height="120" />
  <h1>Mimir — 2FA Authenticator</h1>

  <p>
    <a href="#english">English</a> | <a href="#中文">中文</a>
  </p>

  <p>
    <a href="https://github.com/NornsInteractive/2fa-auth/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License" /></a>
    <a href="https://github.com/NornsInteractive/2fa-auth/stargazers"><img src="https://img.shields.io/github/stars/NornsInteractive/2fa-auth?style=social" alt="Stars" /></a>
    <a href="https://github.com/NornsInteractive/2fa-auth/releases"><img src="https://img.shields.io/github/v/release/NornsInteractive/2fa-auth?include_prereleases" alt="Release" /></a>
  </p>
</div>

---

<a id="english"></a>

## 🇬🇧 English

### Introduction

**Mimir** is a modern, secure, and responsive Two-Factor Authentication (2FA) manager built with React Native (Expo Router + Tamagui), Zustand, TanStack Query, and Cloudflare Workers + D1. It supports web, Android, and iOS platforms.

### ✨ Features

- 🔐 **RFC 6238 TOTP Engine** — Pure TypeScript TOTP (SHA-1/SHA-256), Base32 decoding, live 30s countdown ring, `otpauth://` URI parsing
- 🛡️ **Secure Local Vault** — Master password verification, biometric unlock simulation, inactivity auto-lock
- 📂 **Custom Categories & Providers** — Create, edit, delete categories and providers with custom icons and color tags
- 🌐 **Responsive UI** — Adaptive layout for mobile (bottom nav, FAB) and desktop (sidebar, multi-column grid)
- 🎨 **Themes** — Light/Dark/System, 6 color schemes (Secure Blue, Cyber Purple, Emerald Green, Crimson Red, Sunset Amber, Midnight Titanium)
- 🌍 **Internationalization** — Chinese (简体中文) / English instant switching
- ☁️ **Cloudflare Workers & D1** — Edge API powered by Hono with D1 database for cross-device sync
- 🔑 **Multi-Account Isolation** — Each user account has fully isolated data with registration and login support
- 📋 **Recovery Codes** — One-click copy of provider backup recovery codes

---

### 🚀 Deploy to Cloudflare

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/NornsInteractive/2fa-auth)

**Steps:**
1. Click the button above to fork and deploy this project to Cloudflare Workers
2. Set up a Cloudflare D1 database and update `wrangler.toml` with your database ID
3. Run database migrations: `wrangler d1 execute <DB_NAME> --file=./schema.sql`

---

### 🐳 Docker Deployment

#### Quick Start

```bash
# Clone the repository
git clone https://github.com/NornsInteractive/2fa-auth.git
cd 2fa-auth

# Build Docker image
docker build -t mimir-2fa .

# Run the container
docker run -d -p 8080:8080 --name mimir-2fa mimir-2fa
```

#### Docker Compose

```yaml
version: '3.8'
services:
  mimir:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

```bash
docker compose up -d
```

Visit `http://localhost:8080` after starting the container.

---

### 📦 Getting Started (Local Development)

```bash
# Install dependencies
npm install

# Start web dev server
npm run dev

# Build web static bundle
npm run build:web
```

#### Cloudflare Workers & D1

```bash
# Initialize local D1 database
npm run d1:init

# Start local worker dev server
npm run worker:dev

# Deploy to Cloudflare Workers
npm run worker:deploy
```

---

### 📱 Build Android APK

#### Prerequisites

- Node.js 18+
- JDK 17
- Android SDK (via Android Studio or command-line tools)
- Set `ANDROID_HOME` environment variable

#### Build Steps

```bash
# Generate native Android project
npx expo prebuild --platform android

# Build debug APK
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Build release APK
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

#### Using EAS Build (Cloud)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build
eas build:configure

# Build APK (requires Expo account)
eas build -p android --profile preview
```

---

### 🍎 Build iOS

#### Prerequisites

- macOS with Xcode 15+
- Apple Developer Account
- CocoaPods installed (`gem install cocoapods`)

#### Build Steps

```bash
# Generate native iOS project
npx expo prebuild --platform ios

# Install CocoaPods dependencies
cd ios && pod install && cd ..

# Open in Xcode and build
open ios/mimir-2fa-auth.xcworkspace
```

In Xcode:
1. Select your development team in **Signing & Capabilities**
2. Select a connected device or simulator
3. Press **Cmd + R** to build and run
4. To archive for distribution: **Product → Archive**

#### Using EAS Build (Cloud)

```bash
eas build -p ios --profile production
```

---

### 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Expo](https://expo.dev) + [React Native Web](https://necolas.github.io/react-native-web/) |
| Routing | [Expo Router](https://docs.expo.dev/router/introduction/) |
| UI | [Tamagui](https://tamagui.dev/) |
| State | [Zustand](https://zustand.docs.pmnd.rs/) |
| Data Fetching | [TanStack Query](https://tanstack.com/query/latest) |
| Backend | [Hono](https://hono.dev/) on [Cloudflare Workers](https://workers.cloudflare.com/) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) |

---

### 📄 License

This project is licensed under the [Apache License 2.0](./LICENSE).

Copyright © 2026 Norns Interactive.

---
---

<a id="中文"></a>

## 🇨🇳 中文

### 简介

**Mimir** 是一款现代化、安全且响应式的双因素认证 (2FA) 管理器，基于 React Native (Expo Router + Tamagui)、Zustand、TanStack Query 和 Cloudflare Workers + D1 构建。支持 Web、Android 和 iOS 多平台。

### ✨ 功能特性

- 🔐 **RFC 6238 TOTP 引擎** — 纯 TypeScript 实现 TOTP (SHA-1/SHA-256)，Base32 解码，实时 30 秒倒计时环，`otpauth://` URI 解析
- 🛡️ **安全本地保险库** — 主密码验证、生物识别解锁模拟、不活动自动锁定
- 📂 **自定义分类与提供商** — 创建、编辑、删除分类和提供商，支持自定义图标和颜色标签
- 🌐 **响应式界面** — 自适应布局，移动端（底部导航、FAB）和桌面端（侧边栏、多列网格）
- 🎨 **主题定制** — 浅色/深色/跟随系统，6 种配色方案（安全蓝、赛博紫、翡翠绿、绯红、日落琥珀、午夜钛）
- 🌍 **国际化** — 中文（简体中文）/ 英文即时切换
- ☁️ **Cloudflare Workers & D1 集成** — 基于 Hono 的边缘 API，D1 数据库支持跨设备同步
- 🔑 **多账号数据隔离** — 每个用户账号数据完全隔离，支持注册和登录
- 📋 **恢复码管理** — 一键复制提供商备份恢复码

---

### 🚀 一键部署到 Cloudflare

[![部署到 Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/NornsInteractive/2fa-auth)

**步骤：**
1. 点击上方按钮，Fork 并部署本项目到 Cloudflare Workers
2. 设置 Cloudflare D1 数据库，并在 `wrangler.toml` 中更新数据库 ID
3. 执行数据库迁移：`wrangler d1 execute <DB_NAME> --file=./schema.sql`

---

### 🐳 Docker 部署

#### 快速开始

```bash
# 克隆仓库
git clone https://github.com/NornsInteractive/2fa-auth.git
cd 2fa-auth

# 构建 Docker 镜像
docker build -t mimir-2fa .

# 运行容器
docker run -d -p 8080:8080 --name mimir-2fa mimir-2fa
```

#### Docker Compose

```yaml
version: '3.8'
services:
  mimir:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

```bash
docker compose up -d
```

启动容器后访问 `http://localhost:8080`。

---

### 📦 快速开始（本地开发）

```bash
# 安装依赖
npm install

# 启动 Web 开发服务器
npm run dev

# 构建 Web 静态包
npm run build:web
```

#### Cloudflare Workers & D1 设置

```bash
# 初始化本地 D1 数据库
npm run d1:init

# 启动本地 Worker 开发服务器
npm run worker:dev

# 部署到 Cloudflare Workers
npm run worker:deploy
```

---

### 📱 打包 Android APK

#### 前置条件

- Node.js 18+
- JDK 17
- Android SDK（通过 Android Studio 或命令行工具）
- 设置 `ANDROID_HOME` 环境变量

#### 构建步骤

```bash
# 生成原生 Android 项目
npx expo prebuild --platform android

# 构建 Debug APK
cd android && ./gradlew assembleDebug
# 输出路径: android/app/build/outputs/apk/debug/app-debug.apk

# 构建 Release APK
cd android && ./gradlew assembleRelease
# 输出路径: android/app/build/outputs/apk/release/app-release.apk
```

#### 使用 EAS Build（云端构建）

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 配置构建
eas build:configure

# 构建 APK（需要 Expo 账号）
eas build -p android --profile preview
```

---

### 🍎 打包 iOS

#### 前置条件

- macOS 系统，安装 Xcode 15+
- Apple 开发者账号
- 安装 CocoaPods (`gem install cocoapods`)

#### 构建步骤

```bash
# 生成原生 iOS 项目
npx expo prebuild --platform ios

# 安装 CocoaPods 依赖
cd ios && pod install && cd ..

# 在 Xcode 中打开并构建
open ios/mimir-2fa-auth.xcworkspace
```

在 Xcode 中：
1. 在 **Signing & Capabilities** 中选择开发团队
2. 选择已连接的设备或模拟器
3. 按 **Cmd + R** 构建并运行
4. 发布存档：**Product → Archive**

#### 使用 EAS Build（云端构建）

```bash
eas build -p ios --profile production
```

---

### 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Expo](https://expo.dev) + [React Native Web](https://necolas.github.io/react-native-web/) |
| 路由 | [Expo Router](https://docs.expo.dev/router/introduction/) |
| UI 组件 | [Tamagui](https://tamagui.dev/) |
| 状态管理 | [Zustand](https://zustand.docs.pmnd.rs/) |
| 数据请求 | [TanStack Query](https://tanstack.com/query/latest) |
| 后端/边缘 | [Hono](https://hono.dev/) on [Cloudflare Workers](https://workers.cloudflare.com/) |
| 数据库 | [Cloudflare D1](https://developers.cloudflare.com/d1/) |

---

### 📄 开源协议

本项目基于 [Apache License 2.0](./LICENSE) 开源。

版权所有 © 2026 Norns Interactive。
