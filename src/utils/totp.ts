/**
 * RFC 6238 / RFC 4226 TOTP & HOTP Implementation in Pure TypeScript
 * Works on React Native, Web, Node.js, and Cloudflare Workers
 */

// Base32 Character map
const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32ToBytes(base32: string): Uint8Array {
  // Normalize string: uppercase, remove spaces, padding, and hyphens
  const clean = base32.toUpperCase().replace(/[\s\-=]/g, '');
  const length = clean.length;
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((length * 5) / 8));

  for (let i = 0; i < length; i++) {
    const val = RFC4648_ALPHABET.indexOf(clean[i]);
    if (val === -1) {
      continue; // Skip invalid chars
    }
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return output.slice(0, index);
}

export function bytesToBase32(bytes: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      result += RFC4648_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += RFC4648_ALPHABET[(value << (5 - bits)) & 31];
  }
  return result;
}

// Pure JS SHA-1 Implementation
function sha1(message: Uint8Array): Uint8Array {
  const ml = message.length * 8;
  const numBlocks = Math.ceil((message.length + 9) / 64);
  const blocks = new Uint8Array(numBlocks * 64);
  blocks.set(message);
  blocks[message.length] = 0x80;

  const view = new DataView(blocks.buffer);
  view.setUint32(blocks.length - 4, ml, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);

  for (let i = 0; i < blocks.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 80; j++) {
      const n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (n << 1) | (n >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f: number;
      let k: number;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const result = new Uint8Array(20);
  const resView = new DataView(result.buffer);
  resView.setUint32(0, h0, false);
  resView.setUint32(4, h1, false);
  resView.setUint32(8, h2, false);
  resView.setUint32(12, h3, false);
  resView.setUint32(16, h4, false);
  return result;
}

// Pure JS HMAC-SHA1
function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let formattedKey = key;
  if (formattedKey.length > blockSize) {
    formattedKey = sha1(formattedKey);
  }
  if (formattedKey.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(formattedKey);
    formattedKey = padded;
  }

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = formattedKey[i] ^ 0x5c;
    iKeyPad[i] = formattedKey[i] ^ 0x36;
  }

  const inner = new Uint8Array(blockSize + message.length);
  inner.set(iKeyPad, 0);
  inner.set(message, blockSize);
  const innerHash = sha1(inner);

  const outer = new Uint8Array(blockSize + 20);
  outer.set(oKeyPad, 0);
  outer.set(innerHash, blockSize);
  return sha1(outer);
}

export interface TOTPOptions {
  digits?: number;
  period?: number;
  timestamp?: number;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
}

/**
 * Generates an RFC 6238 TOTP code
 */
export function generateTOTP(secretKey: string, options: TOTPOptions = {}): string {
  try {
    const { digits = 6, period = 30, timestamp = Date.now() } = options;
    const keyBytes = base32ToBytes(secretKey);
    if (keyBytes.length === 0) {
      return '000000'.slice(0, digits);
    }

    const epochSeconds = Math.floor(timestamp / 1000);
    const counter = Math.floor(epochSeconds / period);

    const counterBuffer = new Uint8Array(8);
    const view = new DataView(counterBuffer.buffer);
    view.setUint32(0, Math.floor(counter / 0x100000000), false);
    view.setUint32(4, counter & 0xffffffff, false);

    const hmacResult = hmacSha1(keyBytes, counterBuffer);
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;

    const code =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    const otp = code % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
  } catch (err) {
    console.error('Error calculating TOTP:', err);
    return '000000'.slice(0, options.digits || 6);
  }
}

/**
 * Formats a 6 or 8 digit code with spaced grouping (e.g., "742 901" or "1234 5678")
 */
export function formatTOTPCode(code: string): string {
  if (!code) return '--- ---';
  if (code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }
  if (code.length === 8) {
    return `${code.slice(0, 4)} ${code.slice(4)}`;
  }
  return code;
}

/**
 * Returns remaining seconds in the current period (0..period)
 */
export function getRemainingSeconds(period: number = 30): number {
  const epoch = Math.floor(Date.now() / 1000);
  const rem = period - (epoch % period);
  return rem === 0 ? period : rem;
}

/**
 * Returns normalized progress between 0 and 1
 */
export function getProgressFraction(period: number = 30): number {
  const rem = getRemainingSeconds(period);
  return rem / period;
}

/**
 * Parses otpauth:// URI
 */
export function parseOtpAuthUri(uri: string): {
  secret: string;
  issuer: string;
  account: string;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  period?: number;
} | null {
  try {
    if (!uri.startsWith('otpauth://')) return null;
    const url = new URL(uri);
    const type = url.host; // 'totp' or 'hotp'
    if (type !== 'totp' && type !== 'hotp') return null;

    let path = decodeURIComponent(url.pathname.replace(/^\//, ''));
    let issuer = '';
    let account = path;

    if (path.includes(':')) {
      const parts = path.split(':');
      issuer = parts[0].trim();
      account = parts.slice(1).join(':').trim();
    }

    const params = url.searchParams;
    const secret = params.get('secret') || '';
    if (!secret) return null;

    if (params.get('issuer')) {
      issuer = params.get('issuer') || issuer;
    }

    const digits = params.get('digits') ? parseInt(params.get('digits')!, 10) : 6;
    const period = params.get('period') ? parseInt(params.get('period')!, 10) : 30;
    const algorithm = (params.get('algorithm') as any) || 'SHA1';

    return {
      secret,
      issuer: issuer || 'Custom Account',
      account: account || 'user@fortress.auth',
      digits,
      period,
      algorithm,
    };
  } catch {
    return null;
  }
}

/**
 * Generates a random Base32 Secret Key
 */
export function generateRandomSecret(byteLength: number = 20): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToBase32(bytes);
}

/**
 * Generates initial 10 backup recovery codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}
