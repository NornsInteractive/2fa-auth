export type OTPAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface CustomField {
  id: string;
  key: string;
  value: string;
}

export interface Token {
  id: string;
  userId: string;
  categoryId: string;
  issuer: string;
  accountName: string;
  secretKey: string;
  algorithm: OTPAlgorithm;
  digits: number;
  period: number;
  iconType?: string;
  iconUrl?: string;
  backupCodes: string[];
  notes?: string;
  customFields?: CustomField[];
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
  customFields?: CustomField[];
}
