export interface User {
  id: string;
  name: string;
  email: string;
  securityLevel: 'High' | 'Standard' | 'Maximum';
  avatarUrl: string;
  biometricsEnabled: boolean;
  autoLockMinutes: number;
  createdAt: string;
}

export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  lastActiveTime: number;
}
