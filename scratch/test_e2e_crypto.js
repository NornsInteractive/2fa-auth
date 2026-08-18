const { sha256Bytes, sha256Hex, chacha20Process, uint8ToBase64, base64ToUint8, getRandomBytes } = require('./src/utils/pureCrypto');

const PAYLOAD_SECRET = 'fortress_payload_secret_2026_v1';
const KEY_BYTES = sha256Bytes(PAYLOAD_SECRET);

function encrypt(data) {
  const jsonStr = JSON.stringify(data);
  const enc = new TextEncoder();
  const encoded = enc.encode(jsonStr);
  const nonce = getRandomBytes(12);
  const encrypted = chacha20Process(KEY_BYTES, nonce, encoded, 1);
  return {
    payload: uint8ToBase64(encrypted),
    iv: uint8ToBase64(nonce),
    encrypted: true,
  };
}

function decrypt(envelope) {
  const nonce = base64ToUint8(envelope.iv);
  const encryptedBytes = base64ToUint8(envelope.payload);
  const decryptedBytes = chacha20Process(KEY_BYTES, nonce, encryptedBytes, 1);
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decryptedBytes));
}

// 1. Frontend sends login request
const clientReq = { email: 'norns.soft@gmail.com', password: 'admin' };
const encryptedReq = encrypt(clientReq);
console.log('Encrypted Req from Client (APK/Web):', encryptedReq);

// 2. Server decrypts request
const serverReceivedReq = decrypt(encryptedReq);
console.log('Server Decrypted Req:', serverReceivedReq);

// 3. Server generates response
const serverRes = {
  user: {
    id: 'admin_root',
    name: 'Administrator',
    email: 'norns.soft@gmail.com',
    role: 'admin',
    isAdmin: true,
    status: 'active'
  },
  token: 'jwt_admin_root_123456'
};
const encryptedRes = encrypt(serverRes);
console.log('Server Encrypted Res:', encryptedRes);

// 4. Client (APK) decrypts response
const clientReceivedRes = decrypt(encryptedRes);
console.log('Client Decrypted Res:', clientReceivedRes);
console.log('Client User Exists & Matches:', clientReceivedRes.user?.id === 'admin_root');
