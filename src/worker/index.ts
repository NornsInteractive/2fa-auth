import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface D1Database {
  prepare: (query: string) => {
    bind: (...values: any[]) => {
      all: () => Promise<{ results: any[] }>;
      run: () => Promise<any>;
      first: () => Promise<any>;
    };
    all: () => Promise<{ results: any[] }>;
    run: () => Promise<any>;
    first: () => Promise<any>;
  };
}

export interface Env {
  DB?: D1Database;
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all routes
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
);

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Mimir Authenticator Cloudflare Worker',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'production',
    dbBound: !!c.env.DB,
  });
});

// Public server configuration endpoint (exposing configured download URLs and runtime flags)
app.get('/api/config', (c) => {
  const envObj = (c.env || {}) as any;
  const apkDownloadUrl =
    envObj.EXPO_PUBLIC_APK_URL ||
    envObj.EXPO_PUBLIC_APK_DOWNLOAD_URL ||
    envObj.APK_DOWNLOAD_URL ||
    '';

  return c.json({
    code: 0,
    data: {
      apkDownloadUrl,
      environment: envObj.ENVIRONMENT || 'production',
    },
  });
});

// -------------------------------------------------------------
// Pure TypeScript RFC 8439 ChaCha20 + SHA-256 Encrypted Transmission
// -------------------------------------------------------------

const K_SHA256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(data: Uint8Array | string): Uint8Array {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    const enc = new TextEncoder();
    bytes = enc.encode(data);
  } else {
    bytes = data;
  }

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const l = bytes.length;
  const bitLen = l * 8;
  const padLen = (l % 64 < 56) ? (56 - (l % 64)) : (120 - (l % 64));
  const totalLen = l + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  padded[l] = 0x80;

  const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalLen - 4, bitLen >>> 0, false);

  const W = new Uint32Array(64);

  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K_SHA256[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const outBuf = new Uint8Array(32);
  const outView = new DataView(outBuf.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, H[i], false);
  }
  return outBuf;
}

function sha256Hex(data: Uint8Array | string): string {
  const bytes = sha256Bytes(data);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

function rotl(a: number, b: number): number {
  return ((a << b) | (a >>> (32 - b))) >>> 0;
}

function chacha20Block(key: Uint8Array, nonce: Uint8Array, counter: number): Uint8Array {
  const state = new Uint32Array(16);
  state[0] = 0x61707865;
  state[1] = 0x3320646e;
  state[2] = 0x79622d32;
  state[3] = 0x6b206574;

  const keyView = new DataView(key.buffer, key.byteOffset, key.byteLength);
  for (let i = 0; i < 8; i++) {
    state[4 + i] = keyView.getUint32(i * 4, true);
  }

  state[12] = counter >>> 0;

  const nonceView = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);
  for (let i = 0; i < 3; i++) {
    state[13 + i] = nonceView.getUint32(i * 4, true);
  }

  const working = new Uint32Array(state);

  function qr(a: number, b: number, c: number, d: number) {
    working[a] = (working[a] + working[b]) >>> 0; working[d] = rotl(working[d] ^ working[a], 16);
    working[c] = (working[c] + working[d]) >>> 0; working[b] = rotl(working[b] ^ working[c], 12);
    working[a] = (working[a] + working[b]) >>> 0; working[d] = rotl(working[d] ^ working[a], 8);
    working[c] = (working[c] + working[d]) >>> 0; working[b] = rotl(working[b] ^ working[c], 7);
  }

  for (let i = 0; i < 10; i++) {
    qr(0, 4, 8, 12);
    qr(1, 5, 9, 13);
    qr(2, 6, 10, 14);
    qr(3, 7, 11, 15);
    qr(0, 5, 10, 15);
    qr(1, 6, 11, 12);
    qr(2, 7, 8, 13);
    qr(3, 4, 9, 14);
  }

  const out = new Uint8Array(64);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 16; i++) {
    outView.setUint32(i * 4, (working[i] + state[i]) >>> 0, true);
  }
  return out;
}

function chacha20Process(
  key: Uint8Array,
  nonce: Uint8Array,
  inputBytes: Uint8Array,
  initialCounter: number = 1
): Uint8Array {
  const output = new Uint8Array(inputBytes.length);
  let counter = initialCounter;
  const numBlocks = Math.ceil(inputBytes.length / 64);

  for (let b = 0; b < numBlocks; b++) {
    const keyStream = chacha20Block(key, nonce, counter);
    const start = b * 64;
    const end = Math.min(start + 64, inputBytes.length);

    for (let i = start; i < end; i++) {
      output[i] = inputBytes[i] ^ keyStream[i - start];
    }
    counter = (counter + 1) >>> 0;
  }

  return output;
}

const PAYLOAD_SECRET = 'fortress_payload_secret_2026_v1';
const KEY_BYTES = sha256Bytes(PAYLOAD_SECRET);

function uint8ToBase64(u8: Uint8Array): string {
  let binary = '';
  const len = u8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getRandomBytes(len: number): Uint8Array {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function encryptPayload(data: any): Promise<any> {
  if (data === null || data === undefined) return data;
  try {
    const jsonStr = JSON.stringify(data);
    const enc = new TextEncoder();
    const encoded = enc.encode(jsonStr);
    const nonce = getRandomBytes(12);
    const counter = 1;

    const encrypted = chacha20Process(KEY_BYTES, nonce, encoded, counter);

    return {
      payload: uint8ToBase64(encrypted),
      iv: uint8ToBase64(nonce),
      encrypted: true,
    };
  } catch (err) {
    return data;
  }
}

async function decryptPayload(envelope: any): Promise<any> {
  if (!envelope || typeof envelope !== 'object' || !envelope.encrypted || !envelope.payload || !envelope.iv) {
    return envelope;
  }

  try {
    const nonce = base64ToUint8(envelope.iv);
    const encryptedBytes = base64ToUint8(envelope.payload);
    const decryptedBytes = chacha20Process(KEY_BYTES, nonce, encryptedBytes, 1);

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBytes);
    return JSON.parse(jsonStr);
  } catch (err) {
    return envelope;
  }
}

async function jsonEncrypted(c: any, data: any, status = 200) {
  const enc = await encryptPayload(data);
  return c.json(enc, status);
}

async function getReqBodyDecrypted(c: any) {
  const raw = await c.req.json().catch(() => ({}));
  return await decryptPayload(raw);
}

// -------------------------------------------------------------
// Auth Endpoints (Multi-user registration & login with isolation)
// -------------------------------------------------------------

app.post('/api/auth/register', async (c) => {
  try {
    const { name, email, password } = await getReqBodyDecrypted(c);
    if (!email || !password || !name) {
      return jsonEncrypted(c, { error: 'Name, email, and password are required' }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const adminEmail = (c.env.ADMIN_EMAIL || 'admin@mimir.app').toLowerCase().trim();

    if (cleanEmail === adminEmail) {
      return jsonEncrypted(c, { error: '该邮箱为系统管理员专属账号，不允许注册' }, 400);
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (c.env.DB) {
      await initDbTables(c.env.DB);

      // Check if registration is open
      const regSetting = await c.env.DB.prepare("SELECT value FROM system_settings WHERE key = 'allow_registration'")
        .first().catch(() => null);
      if (regSetting && (regSetting.value === '0' || regSetting.value === 'false')) {
        return jsonEncrypted(c, { error: '系统已由管理员关闭公开注册，请联系管理员分配账号' }, 403);
      }

      // Check if user already exists
      const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
        .bind(cleanEmail)
        .first();

      if (existing) {
        return jsonEncrypted(c, { error: '该邮箱已被注册，请直接登录' }, 409);
      }

      // Simple salted SHA-256 hash
      const passwordHash = await hashPassword(password);

      // Insert new user
      await c.env.DB.prepare(
        'INSERT INTO users (id, name, email, password_hash, security_level, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(userId, name.trim(), cleanEmail, passwordHash, 'High', 'user', 'active')
        .run();

      // Insert standard default categories for this user
      const defaultCats = [
        { id: `cat_work_${userId}`, name: 'Work', slug: 'work', icon: 'work', color: '#005ac1' },
        { id: `cat_personal_${userId}`, name: 'Personal', slug: 'personal', icon: 'person', color: '#7e22ce' },
        { id: `cat_finance_${userId}`, name: 'Finance', slug: 'finance', icon: 'account_balance', color: '#047857' },
      ];

      for (const cat of defaultCats) {
        await c.env.DB.prepare(
          'INSERT INTO categories (id, user_id, name, slug, icon, color, is_default) VALUES (?, ?, ?, ?, ?, ?, 1)'
        )
          .bind(cat.id, userId, cat.name, cat.slug, cat.icon, cat.color)
          .run();
      }
    }

    const user = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      securityLevel: 'High',
      role: 'user',
      isAdmin: false,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    return jsonEncrypted(c, { user, token: `jwt_${userId}_${Date.now()}` }, 201);
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message || 'Registration failed' }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await getReqBodyDecrypted(c);
    if (!email || !password) {
      return jsonEncrypted(c, { error: 'Email and password are required' }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const adminEmail = (c.env.ADMIN_EMAIL || 'admin@mimir.app').toLowerCase().trim();
    const adminPassword = c.env.ADMIN_PASSWORD || 'admin';

    const inputHash = await hashPassword(password);
    const legacyInputHash = await hashPasswordLegacy(password);

    // 1. Check if trying to log in as administrator by configured adminEmail
    const isAdminEmail = cleanEmail === adminEmail || cleanEmail === 'admin@mimir.app';

    if (c.env.DB) {
      await initDbTables(c.env.DB);
      const userRow = (await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
        .bind(cleanEmail)
        .first()) as any;

      if (userRow) {
        // User exists in D1
        if (userRow.status === 'disabled') {
          return jsonEncrypted(c, { error: '该账号已被管理员禁用，请联系管理员' }, 403);
        }

        const isUserAdmin = userRow.role === 'admin' || userRow.id === 'admin_root' || isAdminEmail;
        const isPasswordMatch =
          userRow.password_hash === inputHash ||
          userRow.password_hash === legacyInputHash ||
          userRow.password_hash === password ||
          (isUserAdmin && password === adminPassword);

        if (!isPasswordMatch) {
          return jsonEncrypted(c, { error: isUserAdmin ? '管理员主密码错误，请重新输入' : '主密码错误，请重新输入' }, 401);
        }

        const userObj = {
          id: userRow.id,
          name: userRow.name || (isUserAdmin ? 'Administrator' : cleanEmail.split('@')[0]),
          email: userRow.email,
          securityLevel: userRow.security_level || (isUserAdmin ? 'Maximum' : 'High'),
          avatarUrl: userRow.avatar_url,
          role: isUserAdmin ? 'admin' : (userRow.role || 'user'),
          isAdmin: isUserAdmin,
          status: userRow.status || 'active',
          createdAt: userRow.created_at || new Date().toISOString(),
        };

        return jsonEncrypted(c, { user: userObj, token: `jwt_${userRow.id}_${Date.now()}` });
      }
    }

    // If not found in DB, but matches configured adminEmail
    if (isAdminEmail) {
      if (password !== adminPassword) {
        return jsonEncrypted(c, { error: '管理员主密码错误，请重新输入' }, 401);
      }

      if (c.env.DB) {
        await initDbTables(c.env.DB);
        await c.env.DB.prepare(
          'INSERT OR REPLACE INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind('admin_root', 'Administrator', adminEmail, inputHash, 'admin', 'active')
          .run().catch(() => {});
      }

      const adminUser = {
        id: 'admin_root',
        name: 'Administrator',
        email: adminEmail,
        securityLevel: 'Maximum',
        role: 'admin',
        isAdmin: true,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      return jsonEncrypted(c, { user: adminUser, token: `jwt_admin_root_${Date.now()}` });
    }

    // Not found in DB and not admin
    if (c.env.DB) {
      return jsonEncrypted(c, { error: '账号不存在，请先注册新账号' }, 404);
    }

    // Standalone fallback if DB not bound
    const fallbackUserId = `usr_${Date.now()}`;
    return jsonEncrypted(c, {
      user: {
        id: fallbackUserId,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        securityLevel: 'High',
        role: 'user',
        isAdmin: false,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      token: `jwt_${fallbackUserId}_${Date.now()}`,
    });
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message || 'Login failed' }, 500);
  }
});

// -------------------------------------------------------------
// Admin Console Endpoints (User Directory, Password Reset, Status Toggle, Stats)
// -------------------------------------------------------------

app.get('/api/admin/users', async (c) => {
  try {
    if (!c.env.DB) return jsonEncrypted(c, []);
    await initDbTables(c.env.DB);

    const { results } = await c.env.DB.prepare(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.security_level AS securityLevel, 
        u.avatar_url AS avatarUrl, 
        u.role, 
        u.status, 
        u.created_at AS createdAt,
        (SELECT COUNT(*) FROM tokens t WHERE t.user_id = u.id) AS tokensCount
      FROM users u
      ORDER BY u.created_at DESC
    `).all();

    return jsonEncrypted(c, results || []);
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.post('/api/admin/reset-password', async (c) => {
  try {
    const { targetUserId, newPassword } = await getReqBodyDecrypted(c);
    if (!targetUserId || !newPassword) {
      return jsonEncrypted(c, { error: 'targetUserId and newPassword are required' }, 400);
    }

    if (c.env.DB) {
      await initDbTables(c.env.DB);
      const newHash = await hashPassword(newPassword);
      await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(newHash, targetUserId)
        .run();
    }

    return jsonEncrypted(c, { success: true, message: '密码已成功重置' });
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.post('/api/admin/toggle-status', async (c) => {
  try {
    const { targetUserId, status } = await getReqBodyDecrypted(c);
    if (!targetUserId || !status) {
      return jsonEncrypted(c, { error: 'targetUserId and status are required' }, 400);
    }

    if (c.env.DB) {
      await initDbTables(c.env.DB);
      await c.env.DB.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(status, targetUserId)
        .run();
    }

    return jsonEncrypted(c, { success: true, status });
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.delete('/api/admin/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!id || id === 'admin_root') {
      return jsonEncrypted(c, { error: '不允许删除超级管理员账号' }, 400);
    }

    if (c.env.DB) {
      await initDbTables(c.env.DB);
      await c.env.DB.prepare('DELETE FROM tokens WHERE user_id = ?').bind(id).run().catch(() => {});
      await c.env.DB.prepare('DELETE FROM categories WHERE user_id = ?').bind(id).run().catch(() => {});
      await c.env.DB.prepare('DELETE FROM providers WHERE user_id = ?').bind(id).run().catch(() => {});
      await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    }

    return jsonEncrypted(c, { success: true });
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.get('/api/admin/settings', async (c) => {
  try {
    if (!c.env.DB) return jsonEncrypted(c, { allowRegistration: true });
    await initDbTables(c.env.DB);

    const setting = await c.env.DB.prepare("SELECT value FROM system_settings WHERE key = 'allow_registration'")
      .first().catch(() => null);

    const allowRegistration = setting ? setting.value === '1' || setting.value === 'true' : true;
    return jsonEncrypted(c, { allowRegistration });
  } catch (err: any) {
    return jsonEncrypted(c, { allowRegistration: true });
  }
});

app.post('/api/admin/settings', async (c) => {
  try {
    const { allowRegistration } = await getReqBodyDecrypted(c);
    const valStr = allowRegistration ? '1' : '0';

    if (c.env.DB) {
      await initDbTables(c.env.DB);
      await c.env.DB.prepare(`
        INSERT INTO system_settings (key, value, updated_at) VALUES ('allow_registration', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `)
        .bind(valStr)
        .run();
    }

    return jsonEncrypted(c, { success: true, allowRegistration });
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.get('/api/admin/stats', async (c) => {
  try {
    if (!c.env.DB) {
      return jsonEncrypted(c, { totalUsers: 0, totalTokens: 0, totalCategories: 0, totalProviders: 0 });
    }
    await initDbTables(c.env.DB);

    const usersCount = (await c.env.DB.prepare('SELECT COUNT(*) AS count FROM users').first())?.count || 0;
    const tokensCount = (await c.env.DB.prepare('SELECT COUNT(*) AS count FROM tokens').first())?.count || 0;
    const categoriesCount = (await c.env.DB.prepare('SELECT COUNT(*) AS count FROM categories').first())?.count || 0;
    const providersCount = (await c.env.DB.prepare('SELECT COUNT(*) AS count FROM providers').first())?.count || 0;

    return jsonEncrypted(c, {
      totalUsers: usersCount,
      totalTokens: tokensCount,
      totalCategories: categoriesCount,
      totalProviders: providersCount,
    });
  } catch (err: any) {
    return jsonEncrypted(c, { totalUsers: 0, totalTokens: 0, totalCategories: 0, totalProviders: 0 });
  }
});

// -------------------------------------------------------------
// Categories Endpoints (Isolated by userId)
// -------------------------------------------------------------

app.get('/api/categories', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!c.env.DB) {
      return jsonEncrypted(c, []);
    }

    let results: any[] = [];
    if (userId) {
      const queryRes = await c.env.DB.prepare(
        'SELECT * FROM categories WHERE user_id = ? OR is_default = 1 ORDER BY created_at ASC'
      )
        .bind(userId)
        .all();
      results = queryRes.results || [];
    } else {
      const queryRes = await c.env.DB.prepare(
        'SELECT * FROM categories ORDER BY created_at ASC'
      ).all();
      results = queryRes.results || [];
    }

    const formatted = (results || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id || row.userId,
      name: row.name,
      slug: row.slug,
      icon: row.icon || 'folder',
      color: row.color || '#005ac1',
      isDefault: Boolean(row.is_default ?? row.isDefault),
    }));

    return jsonEncrypted(c, formatted);
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.post('/api/categories', async (c) => {
  try {
    const body = await getReqBodyDecrypted(c);
    const userId = body.userId || body.user_id || c.req.query('userId') || 'usr_guest';

    const id = body.id || body._id || `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const name = body.name || 'New Category';
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const icon = body.icon || 'folder';
    const color = body.color || '#005ac1';

    if (c.env.DB) {
      await initDbTables(c.env.DB);
      // Auto-ensure user row exists to satisfy foreign key constraint
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)'
      )
        .bind(userId, 'User', `${userId}@fortress.app`, 'hash_placeholder')
        .run().catch(() => {});

      await c.env.DB.prepare(
        `INSERT OR REPLACE INTO categories (id, user_id, name, slug, icon, color, is_default) VALUES (?, ?, ?, ?, ?, ?, 0)`
      )
        .bind(id, userId, name, slug, icon, color)
        .run();
    }

    return jsonEncrypted(c, { id, userId, name, slug, icon, color, isDefault: false }, 201);
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.delete('/api/categories/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.req.query('userId');

    if (c.env.DB) {
      if (userId) {
        await c.env.DB.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')
          .bind(id, userId)
          .run();
      } else {
        await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
      }
    }
    return jsonEncrypted(c, { success: true });
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

// -------------------------------------------------------------
// Tokens Endpoints (Isolated strictly by userId)
// -------------------------------------------------------------

app.get('/api/tokens', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!c.env.DB || !userId) {
      return jsonEncrypted(c, []);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM tokens WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(userId)
      .all();

    const formatted = (results || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id || row.userId,
      categoryId: row.category_id || row.categoryId || 'all',
      issuer: row.issuer || '',
      accountName: row.account_name || row.accountName || '',
      secretKey: row.secret_key || row.secretKey || '',
      algorithm: row.algorithm || 'SHA1',
      digits: row.digits || 6,
      period: row.period || 30,
      iconType: row.icon_type || row.iconType || 'shield',
      notes: row.notes || '',
      backupCodes: typeof row.backup_codes === 'string'
        ? (JSON.parse(row.backup_codes || '[]'))
        : (row.backupCodes || []),
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
    }));

    return jsonEncrypted(c, formatted);
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.post('/api/tokens', async (c) => {
  try {
    const body = await getReqBodyDecrypted(c);
    const userId = body.userId || body.user_id || c.req.query('userId') || 'usr_guest';

    const id = body.id || body._id || `token_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const rawCategoryId = body.categoryId || body.category_id || 'all';
    const issuer = body.issuer || 'Unknown Service';
    const accountName = body.accountName || body.account_name || '';
    const secretKey = body.secretKey || body.secret_key || '';
    const algorithm = body.algorithm || 'SHA1';
    const digits = body.digits || 6;
    const period = body.period || 30;
    const iconType = body.iconType || body.icon_type || 'shield';
    const notes = body.notes || '';
    const backupCodes = JSON.stringify(body.backupCodes || body.backup_codes || []);

    if (c.env.DB) {
      await initDbTables(c.env.DB);
      // Auto-ensure user row exists to satisfy foreign key constraint
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)'
      )
        .bind(userId, 'User', `${userId}@fortress.app`, 'hash_placeholder')
        .run().catch(() => {});

      // Validate category_id foreign key constraint
      let validCategoryId: string | null = null;
      if (rawCategoryId && rawCategoryId !== 'all') {
        const catCheck = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?')
          .bind(rawCategoryId)
          .first().catch(() => null);
        if (catCheck) {
          validCategoryId = rawCategoryId;
        }
      }

      await c.env.DB.prepare(
        `INSERT OR REPLACE INTO tokens (id, user_id, category_id, issuer, account_name, secret_key, algorithm, digits, period, icon_type, notes, backup_codes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          userId,
          validCategoryId,
          issuer,
          accountName,
          secretKey,
          algorithm,
          digits,
          period,
          iconType,
          notes,
          backupCodes
        )
        .run();
    }

    return jsonEncrypted(
      c,
      {
        id,
        userId,
        categoryId: rawCategoryId,
        issuer,
        accountName,
        secretKey,
        algorithm,
        digits,
        period,
        iconType,
        notes,
        backupCodes: body.backupCodes || [],
      },
      201
    );
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.put('/api/tokens/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await getReqBodyDecrypted(c);
    const userId = body.userId || body.user_id || c.req.query('userId');

    if (c.env.DB) {
      await initDbTables(c.env.DB);
      let validCategoryId: string | null = null;
      if (body.categoryId && body.categoryId !== 'all') {
        const catCheck = await c.env.DB.prepare('SELECT id FROM categories WHERE id = ?')
          .bind(body.categoryId)
          .first().catch(() => null);
        if (catCheck) {
          validCategoryId = body.categoryId;
        }
      }

      // Fetch existing token to preserve unchanged fields
      const existing = await c.env.DB.prepare('SELECT * FROM tokens WHERE id = ?')
        .bind(id)
        .first().catch(() => null);

      if (existing) {
        const issuer = body.issuer !== undefined ? body.issuer : existing.issuer;
        const accountName = body.accountName !== undefined ? body.accountName : (body.account_name !== undefined ? body.account_name : existing.account_name);
        const secretKey = body.secretKey !== undefined ? body.secretKey : (body.secret_key !== undefined ? body.secret_key : existing.secret_key);
        const iconType = body.iconType !== undefined ? body.iconType : (body.icon_type !== undefined ? body.icon_type : existing.icon_type);
        const notes = body.notes !== undefined ? body.notes : existing.notes;
        const backupCodes = body.backupCodes !== undefined 
          ? JSON.stringify(body.backupCodes)
          : (body.backup_codes !== undefined ? JSON.stringify(body.backup_codes) : existing.backup_codes);
        const algorithm = body.algorithm !== undefined ? body.algorithm : existing.algorithm;
        const digits = body.digits !== undefined ? body.digits : existing.digits;
        const period = body.period !== undefined ? body.period : existing.period;
        const categoryId = body.categoryId !== undefined ? validCategoryId : existing.category_id;

        await c.env.DB.prepare(
          `UPDATE tokens SET 
             issuer = ?, 
             account_name = ?, 
             secret_key = ?, 
             icon_type = ?, 
             category_id = ?, 
             notes = ?, 
             backup_codes = ?, 
             algorithm = ?, 
             digits = ?, 
             period = ?, 
             updated_at = CURRENT_TIMESTAMP
           WHERE id = ? ${userId ? 'AND user_id = ?' : ''}`
        )
          .bind(
            issuer,
            accountName,
            secretKey,
            iconType,
            categoryId,
            notes,
            backupCodes,
            algorithm,
            digits,
            period,
            id,
            ...(userId ? [userId] : [])
          )
          .run();
      }
    }
    return jsonEncrypted(c, { success: true, ...body });
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.delete('/api/tokens/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.req.query('userId');

    if (c.env.DB) {
      if (userId) {
        await c.env.DB.prepare('DELETE FROM tokens WHERE id = ? AND user_id = ?')
          .bind(id, userId)
          .run();
      } else {
        await c.env.DB.prepare('DELETE FROM tokens WHERE id = ?').bind(id).run();
      }
    }
    return jsonEncrypted(c, { success: true });
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

// Helper function to auto-initialize D1 SQLite tables if missing
async function initDbTables(db: any) {
  if (!db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        security_level TEXT DEFAULT 'High',
        avatar_url TEXT,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run().catch(() => {});

    // Try adding missing columns if table already existed in older versions
    await db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").run().catch(() => {});
    await db.prepare("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'").run().catch(() => {});

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run().catch(() => {});

    await db.prepare(`
      INSERT OR IGNORE INTO system_settings (key, value) VALUES ('allow_registration', '1')
    `).run().catch(() => {});

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        icon TEXT DEFAULT 'folder',
        color TEXT DEFAULT '#005ac1',
        is_default BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run().catch(() => {});

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category_id TEXT,
        issuer TEXT NOT NULL,
        account_name TEXT NOT NULL,
        secret_key TEXT NOT NULL,
        algorithm TEXT DEFAULT 'SHA1',
        digits INTEGER DEFAULT 6,
        period INTEGER DEFAULT 30,
        icon_type TEXT DEFAULT 'shield',
        icon_url TEXT,
        backup_codes TEXT,
        notes TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run().catch(() => {});

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'shield',
        color TEXT DEFAULT '#005ac1',
        is_default BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run().catch(() => {});
  } catch (_) {}
}

// -------------------------------------------------------------
// Providers Endpoints
// -------------------------------------------------------------

app.get('/api/providers', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!c.env.DB || !userId) {
      return jsonEncrypted(c, []);
    }

    await initDbTables(c.env.DB);

    const queryRes = await c.env.DB.prepare(
      'SELECT * FROM providers WHERE user_id = ? ORDER BY created_at ASC'
    )
      .bind(userId)
      .all()
      .catch(() => ({ results: [] }));

    const results = queryRes.results || [];
    const formatted = results.map((row: any) => ({
      id: row.id,
      userId: row.user_id || row.userId,
      name: row.name,
      icon: row.icon || 'shield',
      color: row.color || '#005ac1',
      isDefault: Boolean(row.is_default ?? row.isDefault),
    }));

    return jsonEncrypted(c, formatted);
  } catch (err: any) {
    return jsonEncrypted(c, []);
  }
});

app.post('/api/providers', async (c) => {
  try {
    const body = await getReqBodyDecrypted(c);
    const userId = body.userId || body.user_id || c.req.query('userId') || 'usr_guest';

    const id = body.id || body._id || `prov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const name = body.name || 'New Provider';
    const icon = body.icon || 'shield';
    const color = body.color || '#005ac1';

    if (c.env.DB) {
      await initDbTables(c.env.DB);
      // Auto-ensure user row exists to satisfy foreign key constraint
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)'
      )
        .bind(userId, 'User', `${userId}@fortress.app`, 'hash_placeholder')
        .run().catch(() => {});

      await c.env.DB.prepare(
        'INSERT OR REPLACE INTO providers (id, user_id, name, icon, color, is_default) VALUES (?, ?, ?, ?, ?, 0)'
      )
        .bind(id, userId, name, icon, color)
        .run();
    }

    return jsonEncrypted(c, { id, userId, name, icon, color, isDefault: false }, 201);
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

app.delete('/api/providers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.req.query('userId');

    if (c.env.DB && userId) {
      await c.env.DB.prepare('DELETE FROM providers WHERE id = ? AND user_id = ?')
        .bind(id, userId)
        .run();
    }
    return jsonEncrypted(c, { success: true });
  } catch (err: any) {
    return jsonEncrypted(c, { error: err.message }, 500);
  }
});

// Helper password hashing using pure SHA-256 (Matching frontend salt)
async function hashPassword(password: string): Promise<string> {
  return sha256Hex(password + 'fortress-auth-salt');
}

async function hashPasswordLegacy(password: string): Promise<string> {
  return sha256Hex(`fortress_salt_2026_${password}`);
}

export default app;
