export interface Category {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  displayOrder: number;
  isActive?: boolean;
  disabledBranches?: string[];
}

export interface OptionSizePrice {
  sizeCode: string;
  price: number;
}

export interface ModifierOption {
  id?: string;
  _id?: string;
  name: string;
  price: number;
  isDefault: boolean;
  image?: string;
  pricesPerSize?: OptionSizePrice[];
  availableForSizes?: string[];
  modifierGroups?: string[];
  productId?: string;
  includedToppings?: { groupId: string; optionId: string }[];
}

export interface ModifierGroup {
  id?: string;
  _id?: string;
  name: string;
  required: boolean;
  minSelection: number;
  maxSelection: number;
  freeSelectionLimit?: number;
  displayType: "radio" | "checkbox" | "card";
  options: ModifierOption[];
}

export interface ProductVariant {
  sizeCode: string;
  sizeName: string;
  price: number;
  isDefault?: boolean;
  isEnabled?: boolean;
}

export interface Product {
  id?: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  itemType: "simple" | "combo";
  hasVariants?: boolean;
  isHalfAndHalf?: boolean;
  variants?: ProductVariant[];
  includedToppings?: { groupId: string; optionId: string }[];
  categoryId: string | any;
  modifierGroups: string[] | any[];
  badge?: "Popular" | "Best Seller" | "New" | null;
  productId?: string;
  isActive?: boolean;
  kitchenLabel?: "make_table" | "wings_station" | "chicken" | "pizza";
  modifierKitchenLabels?: { groupId: string; kitchenLabel: "make_table" | "wings_station" }[];
  modifierSizeCodes?: { groupId: string; sizeCode: string }[];
  displayOrder?: number;
  disabledBranches?: string[];
}
