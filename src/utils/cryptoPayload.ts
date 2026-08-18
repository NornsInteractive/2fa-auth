// Cross-Platform Encrypted Transmission (Frontend <-> Cloudflare Worker)
// Powered by Pure TypeScript RFC 8439 ChaCha20 + SHA-256

import {
  sha256Bytes,
  chacha20Process,
  uint8ToBase64,
  base64ToUint8,
  getRandomBytes,
} from './pureCrypto';

const PAYLOAD_SECRET = 'fortress_payload_secret_2026_v1';
const KEY_BYTES = sha256Bytes(PAYLOAD_SECRET);

export async function encryptPayload(data: any): Promise<any> {
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

export async function decryptPayload(envelope: any): Promise<any> {
  if (
    !envelope ||
    typeof envelope !== 'object' ||
    !envelope.encrypted ||
    !envelope.payload ||
    !envelope.iv
  ) {
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
