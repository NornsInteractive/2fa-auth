export interface Provider {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isDefault?: boolean;
}

export interface NewProviderInput {
  name: string;
  icon?: string;
  color?: string;
}
