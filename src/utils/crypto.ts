import { sha256Hex } from './pureCrypto';

/**
 * Standard SHA-256 and Password Strength Utilities
 */

export async function hashPassword(password: string, salt: string = 'fortress-auth-salt'): Promise<string> {
  return sha256Hex(password + salt);
}

export function calculatePasswordStrength(password: string): {
  score: number; // 0 to 100
  labelZh: string;
  labelEn: string;
  color: string;
} {
  if (!password) {
    return { score: 0, labelZh: '空', labelEn: 'Empty', color: '#ba1a1a' };
  }

  let score = 0;
  if (password.length >= 6) score += 25;
  if (password.length >= 10) score += 25;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  if (score < 40) {
    return { score, labelZh: '较弱', labelEn: 'Weak', color: '#ba1a1a' };
  }
  if (score < 70) {
    return { score, labelZh: '良好', labelEn: 'Fair', color: '#d97706' };
  }
  if (score < 90) {
    return { score, labelZh: '强', labelEn: 'Strong', color: '#00875a' };
  }
  return { score: 100, labelZh: '极强', labelEn: 'Very Strong', color: '#005ac1' };
}
