# Mimir (2FA Auth)

A state-of-the-art, secure, and responsive 2FA Authenticator built with React Native (Expo Router + Tamagui), Zustand, TanStack Query, and Cloudflare Workers + D1.

---

## ✨ Features

- **🔐 RFC 6238 TOTP Engine**: Pure TypeScript implementation of TOTP (SHA-1 / SHA-256), Base32 decoding, live 30s countdown progress ring, `otpauth://` URI parsing, and backup code generation.
- **🛡️ Secure Local Vault**: Master Password salted hash verification, Biometric unlock (Fingerprint / Face ID simulation), and inactivity auto-lock.
- **📂 Custom Categories**: Create, edit, and delete custom account categories with custom icons and color tags. Instant category chip filtering.
- **🌐 Responsive UI (Mobile & Desktop Dashboard)**:
  - **Mobile**: Top bar, category chips, credential cards, floating action button (FAB), bottom navigation bar.
  - **Desktop**: Left navigation sidebar (profile, security level, navigation, add account), multi-column responsive grid layout.
- **🎨 Theme & Palette Customization**:
  - Theme Modes: Light / Dark / System Default.
  - 6 Theme Color Schemes: Secure Blue, Cyber Purple, Emerald Green, Crimson Red, Sunset Amber, Midnight Titanium.
- **🌍 Internationalization (i18n)**: Instant switching between Simplified Chinese (简体中文) and English.
- **⚡ Cloudflare Workers & D1 Integration**: REST API powered by Hono with Cloudflare D1 SQL schema for cross-device sync.

---

## 🚀 Tech Stack

- **Framework**: [Expo](https://expo.dev) + [React Native Web](https://necolas.github.io/react-native-web/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **UI Components**: [Tamagui](https://tamagui.dev/)
- **State Management**: [Zustand](https://zustand.docs.pmnd.rs/) with AsyncStorage persistence
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)
- **Backend / Edge**: [Hono](https://hono.dev/) on [Cloudflare Workers](https://workers.cloudflare.com/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/)

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Web Dev Server
```bash
npm run dev
# or
npx expo start --web
```

### 3. Build Web Static Bundle
```bash
npm run build:web
```

### 4. Cloudflare Workers & D1 Setup
```bash
# Initialize local D1 SQLite database
npm run d1:init

# Start local worker dev server
npm run worker:dev

# Deploy to Cloudflare Workers
npm run worker:deploy
```

---

## 📄 License
MIT
