const crypto = require('crypto');

function rotl(a, b) {
  return ((a << b) | (a >>> (32 - b))) >>> 0;
}

function chacha20Block(key, nonce, counter) {
  // key: 32 bytes (8 uint32), nonce: 12 bytes (3 uint32), counter: uint32
  const state = new Uint32Array(16);
  // Constants "expand 32-byte k"
  state[0] = 0x61707865;
  state[1] = 0x3320646e;
  state[2] = 0x79622d32;
  state[3] = 0x6b206574;

  const keyView = new DataView(key.buffer, key.byteOffset, key.byteLength);
  for (let i = 0; i < 8; i++) {
    state[4 + i] = keyView.getUint32(i * 4, true); // Little endian
  }

  state[12] = counter >>> 0;

  const nonceView = new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength);
  for (let i = 0; i < 3; i++) {
    state[13 + i] = nonceView.getUint32(i * 4, true); // Little endian
  }

  const working = new Uint32Array(state);

  function qr(a, b, c, d) {
    working[a] = (working[a] + working[b]) >>> 0; working[d] = rotl(working[d] ^ working[a], 16);
    working[c] = (working[c] + working[d]) >>> 0; working[b] = rotl(working[b] ^ working[c], 12);
    working[a] = (working[a] + working[b]) >>> 0; working[d] = rotl(working[d] ^ working[a], 8);
    working[c] = (working[c] + working[d]) >>> 0; working[b] = rotl(working[b] ^ working[c], 7);
  }

  for (let i = 0; i < 10; i++) {
    // Column round
    qr(0, 4, 8, 12);
    qr(1, 5, 9, 13);
    qr(2, 6, 10, 14);
    qr(3, 7, 11, 15);
    // Diagonal round
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

function chacha20Process(key, nonce, inputBytes, initialCounter = 1) {
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

// Test ChaCha20 against Node crypto
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16); // In node, iv is 16 bytes: 4-byte counter + 12-byte nonce
const nonce = iv.subarray(4);
const initialCounter = iv.readUInt32LE(0);
const plaintext = Buffer.from(JSON.stringify({ email: 'admin@mimir.app', password: 'admin', msg: '测试全平台双向加解密 2FA' }));

// Node chacha20
const cipher = crypto.createCipheriv('chacha20', key, iv);
const expectedCiphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

// Pure JS ChaCha20
const actualCiphertext = Buffer.from(chacha20Process(key, nonce, plaintext, initialCounter));

console.log('ChaCha20 Matches Node Crypto:', expectedCiphertext.equals(actualCiphertext));

// Decrypt using pure JS
const decrypted = chacha20Process(key, nonce, actualCiphertext, initialCounter);
console.log('Decrypted matches original:', Buffer.from(decrypted).equals(plaintext));
console.log('Decrypted JSON:', Buffer.from(decrypted).toString());
