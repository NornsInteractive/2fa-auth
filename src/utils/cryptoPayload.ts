// Cross-Platform AES-GCM Encrypted Transmission (Frontend <-> Cloudflare Worker)

async function getCryptoKey(secretStr = 'fortress_payload_secret_2026_v1'): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secretStr);
  const hash = await crypto.subtle.digest('SHA-256', keyData);
  return await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function uint8ToBase64(u8: Uint8Array): string {
  let binary = '';
  const len = u8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(u8).toString('base64');
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptPayload(data: any): Promise<any> {
  if (data === null || data === undefined) return data;
  try {
    const key = await getCryptoKey();
    const jsonStr = JSON.stringify(data);
    const enc = new TextEncoder();
    const encoded = enc.encode(jsonStr);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      encoded
    );

    return {
      payload: uint8ToBase64(new Uint8Array(encryptedBuffer)),
      iv: uint8ToBase64(iv),
      encrypted: true,
    };
  } catch (err) {
    return data;
  }
}

export async function decryptPayload(envelope: any): Promise<any> {
  if (!envelope || typeof envelope !== 'object' || !envelope.encrypted || !envelope.payload || !envelope.iv) {
    return envelope;
  }

  try {
    const key = await getCryptoKey();
    const iv = base64ToUint8(envelope.iv);
    const encryptedBytes = base64ToUint8(envelope.payload);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      key,
      encryptedBytes as any
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBuffer);
    return JSON.parse(jsonStr);
  } catch (err) {
    return envelope;
  }
}
