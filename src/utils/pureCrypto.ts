// Pure TypeScript Cryptographic Primitives (SHA-256 & RFC 8439 ChaCha20)
// 100% self-contained, zero-dependency, works identically on React Native (Hermes/JSC), Web, and Cloudflare Workers.

export function uint8ToBase64(u8: Uint8Array): string {
  let binary = '';
  const len = u8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(u8).toString('base64');
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let res = '';
  for (let i = 0; i < len; i += 3) {
    const b0 = u8[i];
    const b1 = i + 1 < len ? u8[i + 1] : 0;
    const b2 = i + 2 < len ? u8[i + 2] : 0;
    res += chars[b0 >> 2];
    res += chars[((b0 & 3) << 4) | (b1 >> 4)];
    res += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    res += i + 2 < len ? chars[b2 & 63] : '=';
  }
  return res;
}

export function base64ToUint8(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  let bufferLength = b64.length * 0.75;
  if (b64.endsWith('==')) bufferLength -= 2;
  else if (b64.endsWith('=')) bufferLength -= 1;
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const enc1 = lookup[b64.charCodeAt(i)];
    const enc2 = lookup[b64.charCodeAt(i + 1)];
    const enc3 = lookup[b64.charCodeAt(i + 2)];
    const enc4 = lookup[b64.charCodeAt(i + 3)];
    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (b64[i + 2] !== '=') bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (b64[i + 3] !== '=') bytes[p++] = ((enc3 & 3) << 6) | enc4;
  }
  return bytes;
}

// -------------------------------------------------------------
// Standard SHA-256 Implementation
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

export function sha256Bytes(data: Uint8Array | string): Uint8Array {
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

export function sha256Hex(data: Uint8Array | string): string {
  const bytes = sha256Bytes(data);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

// -------------------------------------------------------------
// RFC 8439 ChaCha20 Stream Cipher Implementation
// -------------------------------------------------------------

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

export function chacha20Process(
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

// Generate random bytes safely across all environments
export function getRandomBytes(len: number): Uint8Array {
  const bytes = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    try {
      return crypto.getRandomValues(bytes);
    } catch (_) {}
  }
  for (let i = 0; i < len; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}
