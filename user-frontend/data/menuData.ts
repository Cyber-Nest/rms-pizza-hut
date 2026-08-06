import { Category, MenuItem, ModifierGroup } from '../types';

export const fallbackCategories: Category[] = [
  {
    id: 'lunch-special',
    name: 'Lunch Special',
    slug: 'lunch-special',
    description: 'Fresh lunch combos served hot'
  },
  {
    id: 'chicken-burger',
    name: 'Chicken Burgers',
    slug: 'chicken-burger',
    description: 'Crispy chicken breast burgers'
  },
  {
    id: 'sides',
    name: 'Sides & Extras',
    slug: 'sides',
    description: 'Crispy golden fries, poutine & salads'
  },
  {
    id: 'beverages-desserts',
    name: 'Drinks & Desserts',
    slug: 'beverages-desserts',
    description: 'Refreshing cans and sweet treats'
  }
];

const dippingSauceModifier: ModifierGroup = {
  id: 'ds-group',
  name: 'Dipping Sauce',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'ds-bbq', name: 'BBQ Sauce Cup', price: 0 },
    { id: 'ds-ranch', name: 'Creamy Ranch Cup', price: 0 },
    { id: 'ds-honey-dill', name: 'Honey Dill Sauce Cup', price: 0, isDefault: true },
    { id: 'ds-ghost', name: 'Ghost Pepper Ranch Cup', price: 0.25 }
  ]
};

const drinkModifier: ModifierGroup = {
  id: 'dr-group',
  name: 'Choose a Beverage',
  required: true,
  minSelection: 1,
  maxSelection: 1,
  displayType: 'radio',
  options: [
    { id: 'dr-pepsi', name: 'Pepsi (Can)', price: 0, isDefault: true },
    { id: 'dr-coke', name: 'Coca Cola (Can)', price: 0 },
    { id: 'dr-sprite', name: 'Sprite (Can)', price: 0 },
    { id: 'dr-fanta', name: 'Fanta Orange (Can)', price: 0 }
  ]
};

const burgerToppingsModifier: ModifierGroup = {
  id: 'bt-group',
  name: 'Customize Toppings',
  required: false,
  minSelection: 0,
  maxSelection: 4,
  displayType: 'checkbox',
  options: [
    { id: 'to-cheese', name: 'Add Cheddar Cheese', price: 1.00 },
    { id: 'to-bacon', name: 'Add Crispy Bacon', price: 1.50 },
    { id: 'to-jalapenos', name: 'Add Jalapenos', price: 0.50 },
    { id: 'to-gravy', name: 'Add Gravy Dip', price: 1.99 }
  ]
};

export const fallbackMenuItems: MenuItem[] = [
  {
    id: 'bites-fries',
    categoryId: 'lunch-special',
    name: 'Bites & Fries Combo',
    description: 'Tender chicken breast bites served with a side of crispy golden fries and dipping sauce.',
    image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=500&auto=format&fit=crop&q=60',
    price: 9.99,
    badge: 'Popular',
    isPopular: true,
    itemType: 'combo',
    modifierGroups: [dippingSauceModifier]
  },
  {
    id: 'solo-delight',
    categoryId: 'lunch-special',
    name: 'Solo Delight Box',
    description: 'One piece of signature crispy drumstick, regular fries, a bun, and choice of soft drink.',
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=60',
    price: 6.99,
    badge: 'Best Seller',
    isPopular: true,
    itemType: 'combo',
    modifierGroups: [drinkModifier]
  },
  {
    id: 'chicken-burger-fries',
    categoryId: 'chicken-burger',
    name: 'Chicken Burger & Fries Meal',
    description: 'Crispy seasoned chicken breast patty burger with fresh lettuce, mayo, fries, and a cold soft drink.',
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=60',
    price: 11.25,
    itemType: 'combo',
    modifierGroups: [burgerToppingsModifier, drinkModifier]
  },
  {
    id: 'buffalo-chicken-burger',
    categoryId: 'chicken-burger',
    name: 'Buffalo Chicken Burger',
    description: 'Spicy buffalo chicken breast fillet, jalapenos, and pepper jack cheese on a toasted brioche bun.',
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=60',
    price: 9.49,
    badge: 'New',
    itemType: 'combo',
    modifierGroups: [burgerToppingsModifier]
  },
  {
    id: 'poutine-reg',
    categoryId: 'sides',
    name: 'Classic Poutine (Reg)',
    description: 'Golden French fries topped with rich cheddar cheese curds and warm savory hot chicken gravy.',
    image: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=500&auto=format&fit=crop&q=60',
    price: 5.49,
    badge: 'Popular',
    isPopular: true,
    itemType: 'simple'
  },
  {
    id: 'fries-large',
    categoryId: 'sides',
    name: 'Large French Fries',
    description: 'Double-fried thick-cut golden crispy french fries served with ketchup.',
    image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=60',
    price: 3.99,
    itemType: 'simple'
  },
  {
    id: 'onion-rings',
    categoryId: 'sides',
    name: 'Battered Onion Rings',
    description: 'Thick-cut sweet onion rings in a crispy golden batter.',
    image: 'https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=500&auto=format&fit=crop&q=60',
    price: 4.49,
    itemType: 'simple'
  },
  {
    id: 'lava-cake',
    categoryId: 'beverages-desserts',
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with a molten liquid fudge center, dusted with sugar.',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=60',
    price: 4.49,
    badge: 'New',
    itemType: 'simple'
  },
  {
    id: 'coke-can',
    categoryId: 'beverages-desserts',
    name: 'Coca Cola (Can)',
    description: 'Classic chilled Coke.',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60',
    price: 1.99,
    itemType: 'simple'
  }
];
