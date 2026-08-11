import { Category } from '../types/category';
import { Token } from '../types/token';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'all',
    name: '全部账号',
    nameKey: 'catAll',
    slug: 'all',
    icon: 'apps',
    color: '#005ac1',
    isDefault: true,
  },
  {
    id: 'work',
    name: '工作办公',
    nameKey: 'catWork',
    slug: 'work',
    icon: 'business_center',
    color: '#535f70',
    isDefault: true,
  },
  {
    id: 'finance',
    name: '金融资产',
    nameKey: 'catFinance',
    slug: 'finance',
    icon: 'account_balance',
    color: '#b45309',
    isDefault: true,
  },
  {
    id: 'social',
    name: '社交媒体',
    nameKey: 'catSocial',
    slug: 'social',
    icon: 'forum',
    color: '#7e22ce',
    isDefault: true,
  },
];

// Pure empty initial token state (No fake data)
export const DEFAULT_TOKENS: Token[] = [];
