export type OTPAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface Token {
  id: string;
  userId: string;
  categoryId: string; // e.g. 'all', 'work', 'finance', 'social', or custom category id
  issuer: string;
  accountName: string;
  secretKey: string;
  algorithm: OTPAlgorithm;
  digits: number; // 6 or 8
  period: number; // usually 30s
  iconType?: string; // e.g. 'security', 'account_balance', 'code', 'language', 'hub', 'cloud'
  iconUrl?: string;
  backupCodes: string[];
  notes?: string;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewTokenInput {
  issuer: string;
  accountName: string;
  secretKey: string;
  categoryId?: string;
  algorithm?: OTPAlgorithm;
  digits?: number;
  period?: number;
  iconType?: string;
  notes?: string;
  backupCodes?: string[];
}
