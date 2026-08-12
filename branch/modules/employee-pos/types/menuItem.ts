import { ModifierGroup } from './modifier';

export type MenuItemType = 'simple' | 'combo' | 'modifier';

export interface ProductVariant {
  sizeCode: string;
  sizeName: string;
  price: number;
  isDefault?: boolean;
}

export interface MenuItem {
  _id: string;
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  badge?: 'Popular' | 'Best Seller' | 'New' | null;
  isPopular?: boolean;
  itemType: MenuItemType;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  includedToppings?: { groupId: string; optionId: string }[];
  modifierGroupIds?: string[];
  modifierGroups?: ModifierGroup[];
  kitchenLabel?: 'chicken' | 'pizza';
  displayOrder?: number;
  isOutOfStock?: boolean;
}
