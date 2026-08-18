const crypto = require('crypto');

// Standard AES S-Box
const SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5e, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
]);

const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function expandKey(keyBytes) {
  // Key: 32 bytes for AES-256. 14 rounds = 15 round keys of 16 bytes = 60 words of 4 bytes = 240 bytes.
  const w = new Uint32Array(60);
  for (let i = 0; i < 8; i++) {
    w[i] = (keyBytes[4*i] << 24) | (keyBytes[4*i+1] << 16) | (keyBytes[4*i+2] << 8) | keyBytes[4*i+3];
  }

  function subWord(word) {
    return (SBOX[(word >>> 24) & 0xff] << 24) |
           (SBOX[(word >>> 16) & 0xff] << 16) |
           (SBOX[(word >>> 8) & 0xff] << 8) |
           SBOX[word & 0xff];
  }

  function rotWord(word) {
    return ((word << 8) | (word >>> 24)) >>> 0;
  }

  for (let i = 8; i < 60; i++) {
    let temp = w[i - 1];
    if (i % 8 === 0) {
      temp = (subWord(rotWord(temp)) ^ (RCON[(i / 8) - 1] << 24)) >>> 0;
    } else if (i % 8 === 4) {
      temp = subWord(temp) >>> 0;
    }
    w[i] = (w[i - 8] ^ temp) >>> 0;
  }
  return w;
}

function gmul(a, b) {
  let p = 0;
  for (let c = 0; c < 8; c++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

function encryptBlock(inBlock, w, outBlock, outOffset = 0) {
  let s = new Uint8Array(16);
  for (let i = 0; i < 16; i++) s[i] = inBlock[i];

  // AddRoundKey 0
  for (let c = 0; c < 4; c++) {
    const word = w[c];
    s[c * 4 + 0] ^= (word >>> 24) & 0xff;
    s[c * 4 + 1] ^= (word >>> 16) & 0xff;
    s[c * 4 + 2] ^= (word >>> 8) & 0xff;
    s[c * 4 + 3] ^= word & 0xff;
  }

  for (let round = 1; round <= 14; round++) {
    // SubBytes
    for (let i = 0; i < 16; i++) s[i] = SBOX[s[i]];

    // ShiftRows
    // 0 4 8 12 -> 0 4 8 12
    // 1 5 9 13 -> 5 9 13 1
    // 2 6 10 14 -> 10 14 2 6
    // 3 7 11 15 -> 15 3 7 11
    const t1 = s[1], t2 = s[2], t3 = s[3];
    const t6 = s[6], t7 = s[7], t11 = s[11];

    s[1] = s[5]; s[5] = s[9]; s[9] = s[13]; s[13] = t1;
    s[2] = s[10]; s[6] = s[14]; s[10] = t2; s[14] = t6;
    s[3] = s[15]; s[7] = t3; s[11] = t7; s[15] = t11;

    // MixColumns (rounds 1..13)
    if (round < 14) {
      for (let c = 0; c < 4; c++) {
        const i = c * 4;
        const a0 = s[i], a1 = s[i+1], a2 = s[i+2], a3 = s[i+3];
        s[i] = gmul(2, a0) ^ gmul(3, a1) ^ a2 ^ a3;
        s[i+1] = a0 ^ gmul(2, a1) ^ gmul(3, a2) ^ a3;
        s[i+2] = a0 ^ a1 ^ gmul(2, a2) ^ gmul(3, a3);
        s[i+3] = gmul(3, a0) ^ a1 ^ a2 ^ gmul(2, a3);
      }
    }

    // AddRoundKey
    for (let c = 0; c < 4; c++) {
      const word = w[round * 4 + c];
      s[c * 4 + 0] ^= (word >>> 24) & 0xff;
      s[c * 4 + 1] ^= (word >>> 16) & 0xff;
      s[c * 4 + 2] ^= (word >>> 8) & 0xff;
      s[c * 4 + 3] ^= word & 0xff;
    }
  }

  for (let i = 0; i < 16; i++) {
    outBlock[outOffset + i] = s[i];
  }
}

function aes256Ctr(keyBytes, ivBytes, dataBytes) {
  const w = expandKey(keyBytes);
  const counter = new Uint8Array(16);
  counter.set(ivBytes); // IV is 16 bytes (or 12 bytes IV + 4 bytes counter)

  const out = new Uint8Array(dataBytes.length);
  const keyStream = new Uint8Array(16);

  let blockCount = Math.ceil(dataBytes.length / 16);
  for (let b = 0; b < blockCount; b++) {
    encryptBlock(counter, w, keyStream, 0);

    const start = b * 16;
    const end = Math.min(start + 16, dataBytes.length);
    for (let i = start; i < end; i++) {
      out[i] = dataBytes[i] ^ keyStream[i - start];
    }

    // Increment 16-byte counter in big-endian
    for (let i = 15; i >= 0; i--) {
      counter[i] = (counter[i] + 1) & 0xff;
      if (counter[i] !== 0) break;
    }
  }

  return out;
}

// Test against node crypto
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const plaintext = Buffer.from(JSON.stringify({ email: 'admin@mimir.app', password: 'admin', hello: 'world 1234567890 这是一个双向加密测试' }));

// Node AES-256-CTR
const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
const expectedEncrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

// Pure JS AES-256-CTR
const actualEncrypted = Buffer.from(aes256Ctr(key, iv, plaintext));

console.log('Ciphertext Matches Node Crypto:', expectedEncrypted.equals(actualEncrypted));

// Decrypt with pure JS
const decrypted = aes256Ctr(key, iv, actualEncrypted);
console.log('Decrypted matches original:', Buffer.from(decrypted).equals(plaintext));
console.log('Decrypted text:', Buffer.from(decrypted).toString());
