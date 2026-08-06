import { ModifierGroup } from '../types';

export const chickenPieceModifier: ModifierGroup = {
  id: 'chicken-piece',
  name: 'Chicken Piece',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'thigh', name: 'Thigh', price: 0, isDefault: true },
    { id: 'breast', name: 'Breast', price: 0.50 },
    { id: 'leg', name: 'Leg', price: 0 },
    { id: 'wing', name: 'Wing', price: 0 },
  ],
};

export const friesModifier: ModifierGroup = {
  id: 'fries-size',
  name: 'Fries Size',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'card',
  options: [
    { id: 'regular-fries', name: 'Regular Fries', price: 0, isDefault: true },
    { id: 'large-fries', name: 'Large Fries (+0.75)', price: 0.75 },
  ],
};

export const dippingSauceModifier: ModifierGroup = {
  id: 'dipping-sauces',
  name: 'Dipping Sauces',
  required: false,
  minSelection: 0,
  maxSelection: 2,
  displayType: 'checkbox',
  options: [
    { id: 'bbq-sauce', name: 'BBQ Sauce', price: 0 },
    { id: 'honey-dill', name: 'Honey Dill', price: 0 },
    { id: 'honey-mustard', name: 'Honey Mustard', price: 0 },
    { id: 'ranch', name: 'Ranch', price: 0 },
    { id: 'sweet-sour', name: 'Sweet & Sour', price: 0 },
    { id: 'ghost-pepper', name: 'Ghost Pepper Ranch (+0.25)', price: 0.25 },
  ],
};

export const drinkModifier: ModifierGroup = {
  id: 'drink',
  name: 'Beverage Choice',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'coke', name: 'Coke', price: 0, isDefault: true },
    { id: 'sprite', name: 'Sprite', price: 0 },
    { id: 'pepsi', name: 'Pepsi', price: 0 },
    { id: 'fanta', name: 'Fanta', price: 0 },
    { id: 'water', name: 'Bottled Water', price: 0 },
  ],
};

export const cateringDrinkModifier: ModifierGroup = {
  id: 'catering-drinks',
  name: 'Catering Beverage Choice (Select 4)',
  required: true,
  minSelection: 4,
  maxSelection: 4,
  displayType: 'checkbox',
  options: [
    { id: 'coke-4', name: '4x Coke', price: 0, isDefault: true },
    { id: 'sprite-4', name: '4x Sprite', price: 0 },
    { id: 'pepsi-4', name: '4x Pepsi', price: 0 },
    { id: 'fanta-4', name: '4x Fanta', price: 0 },
    { id: 'water-4', name: '4x Bottled Water', price: 0 },
  ],
};

export const burgerToppingsModifier: ModifierGroup = {
  id: 'burger-toppings',
  name: 'Add Extra Toppings',
  required: false,
  minSelection: 0,
  maxSelection: 4,
  displayType: 'checkbox',
  options: [
    { id: 'extra-cheese', name: 'Extra Cheese', price: 0.99 },
    { id: 'bacon', name: 'Crispy Bacon', price: 1.49 },
    { id: 'pickles', name: 'Extra Pickles', price: 0.25 },
    { id: 'jalapenos', name: 'Sliced Jalapeños', price: 0.50 },
  ],
};

export const dessertFlavorsModifier: ModifierGroup = {
  id: 'dessert-flavors',
  name: 'Pie Flavor',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'apple-flavor', name: 'Apple Pie', price: 0, isDefault: true },
    { id: 'cherry-flavor', name: 'Cherry Pie', price: 0.50 },
    { id: 'blueberry-flavor', name: 'Blueberry Pie', price: 0.50 },
  ],
};

export const dinnerMeatModifier: ModifierGroup = {
  id: 'dinner-meat',
  name: 'Choose Your Meat',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'simply-chicken-20', name: 'Simply Chicken - 20 Pieces', price: 0, isDefault: true },
    { id: 'mix-white-dark', name: 'Mix Of White & Dark Meat (Standard)', price: 0 },
    { id: 'all-white-meat', name: 'Simply Chicken - All White Meat (+5.00)', price: 5.00 },
    { id: 'all-dark-meat', name: 'Simply Chicken - All Dark Meat (+3.00)', price: 3.00 }
  ]
};

export const dinnerMedFriesModifier: ModifierGroup = {
  id: 'dinner-med-fries',
  name: 'Choose Medium Fries',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'fries-med-box', name: 'Fries - Medium Box', price: 0, isDefault: true },
    { id: 'sweet-potato-med-box', name: 'Sweet Potato Fries - Medium Box (+1.50)', price: 1.50 },
    { id: 'poutine-med-box', name: 'Poutine - Medium Box (+3.00)', price: 3.00 }
  ]
};

export const dinnerLargeFriesModifier: ModifierGroup = {
  id: 'dinner-large-fries',
  name: 'Choose Large Fries',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'fries-large-box', name: 'Fries - Large Box', price: 0, isDefault: true },
    { id: 'sweet-potato-large-box', name: 'Sweet Potato Fries - Large Box (+2.50)', price: 2.50 },
    { id: 'poutine-large-box', name: 'Poutine - Large Box (+4.00)', price: 4.00 }
  ]
};

export const dinnerMedSaladModifier: ModifierGroup = {
  id: 'dinner-med-salad',
  name: 'Choose Medium Salad',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'coleslaw-med', name: 'Coleslaw Salad - Medium', price: 0, isDefault: true },
    { id: 'macaroni-med', name: 'Macaroni Salad - Medium (+1.00)', price: 1.00 },
    { id: 'potato-med', name: 'Potato Salad - Medium (+1.00)', price: 1.00 }
  ]
};

export const dinnerLargeSaladModifier: ModifierGroup = {
  id: 'dinner-large-salad',
  name: 'Choose Large Salad',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'card',
  options: [
    { id: 'coleslaw-large', name: 'Coleslaw Salad', price: 0, isDefault: true },
    { id: 'macaroni-large', name: 'Macaroni Salad', price: 0 },
    { id: 'potato-large', name: 'Potato Salad', price: 0 },
    { id: 'gravy-large-opt', name: 'Handcrafted Gravy', price: 0 },
    { id: 'large-opt', name: 'Large', price: 0 },
    { id: 'caesar-large-premium', name: 'Premium Caesar Salad (+3.00)', price: 3.00 },
    { id: 'greek-large-premium', name: 'Premium Greek Salad (+3.50)', price: 3.50 }
  ]
};

export const dinnerLargeGravyModifier: ModifierGroup = {
  id: 'dinner-large-gravy',
  name: 'Choose Large Gravy',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'gravy-large', name: 'Handcrafted Gravy - Large', price: 0, isDefault: true },
    { id: 'spicy-gravy-large', name: 'Spicy Gravy - Large (+1.50)', price: 1.50 },
    { id: 'mushroom-gravy-large', name: 'Mushroom Gravy - Large (+2.00)', price: 2.00 }
  ]
};

export const dinnerRollsModifier: ModifierGroup = {
  id: 'dinner-rolls',
  name: 'Dinner Rolls',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'roll-6', name: '6 - Dinner Roll', price: 0, isDefault: true },
    { id: 'roll-12', name: '12 - Dinner Rolls (+3.00)', price: 3.00 },
    { id: 'roll-18', name: '18 - Dinner Rolls (+5.50)', price: 5.50 },
    { id: 'roll-24', name: '24 - Dinner Rolls (+7.00)', price: 7.00 }
  ]
};

