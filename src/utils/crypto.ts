/**
 * Simple portable SHA-256 and Password Strength Utilities
 */

// Simple SHA-256 for password hashing simulation
export async function hashPassword(password: string, salt: string = 'fortress-auth-salt'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback
    }
  }

  // Pure JS fallback string hash
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}_${password.length}`;
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
