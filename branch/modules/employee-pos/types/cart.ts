import { SelectedModifier } from './modifier';

export interface CartItem {
  id: string; // unique composite key (menuItemId + optionIds joined)
  menuItemId: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  image?: string;
  basePrice: number;
  selectedSize?: {
    sizeCode: string;
    sizeName: string;
    price: number;
  };
  selectedModifiers: SelectedModifier[];
  quantity: number;
  totalPrice: number; // (basePrice + sum of modifier prices) * quantity
  note?: string;
  kitchenLabel?: 'make_table' | 'wings_station' | 'cut_station' | 'chicken' | 'pizza';
}
