export interface Category {
  id: string;
  name: string;
  nameKey?: string; // for i18n built-in categories
  slug: string;
  icon: string; // Material symbol or Lucide icon name
  color: string; // hex color code
  isDefault?: boolean;
}

export interface NewCategoryInput {
  name: string;
  icon: string;
  color: string;
}
