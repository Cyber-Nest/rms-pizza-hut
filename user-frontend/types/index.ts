export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export type MenuItemType = 'simple' | 'combo' | 'modifier';

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  badge?: 'Popular' | 'Best Seller' | 'New' | null;
  isPopular?: boolean;
  itemType: MenuItemType;
  modifierGroupIds?: string[];
  modifierGroups?: ModifierGroup[];
  kitchenLabel?: 'chicken' | 'pizza';
  isOutOfStock?: boolean;
}

export interface ModifierOption {
  id: string;
  name: string;
  image?: string;
  price: number;
  isDefault?: boolean;
  modifierGroups?: ModifierGroup[];
  productId?: string;
  includedToppings?: { groupId: string; optionId: string }[];
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelection: number;
  maxSelection: number;
  displayType: 'radio' | 'checkbox' | 'card';
  options: ModifierOption[];
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
  isRoot?: boolean;
}

export interface CartItem {
  id: string; // unique composite key (menuItemId + selected option IDs)
  menuItemId: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  image?: string;
  basePrice: number;
  selectedModifiers: SelectedModifier[];
  quantity: number;
  totalPrice: number; // (basePrice + sum(selectedModifiers.price)) * quantity
  note?: string;
  kitchenLabel?: 'chicken' | 'pizza';
}
