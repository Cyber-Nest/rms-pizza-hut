export interface OptionSizePrice {
  sizeCode: string;
  price: number;
}

export interface ModifierOption {
  id: string;
  name: string;
  image?: string;
  price: number;
  isDefault?: boolean;
  pricesPerSize?: OptionSizePrice[];
  availableForSizes?: string[];
  modifierGroups?: ModifierGroup[];
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

