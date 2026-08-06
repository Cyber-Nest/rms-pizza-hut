'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CartItem, MenuItem, SelectedModifier } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  orderType: 'takeout' | 'delivery';
  setOrderType: (type: 'takeout' | 'delivery') => void;
  address: string;
  setAddress: (address: string) => void;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  branchDeliveryFee: number;
  setBranchDeliveryFee: (fee: number) => void;
  branchTaxRate: number;
  setBranchTaxRate: (rate: number) => void;
  addToCart: (menuItem: MenuItem, selectedModifiers: SelectedModifier[], quantity?: number, note?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  increaseQuantity: (cartItemId: string) => void;
  decreaseQuantity: (cartItemId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => boolean | void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const roundToTwo = (num: number): number =>
  Math.round((num + Number.EPSILON) * 100) / 100;

const generateCartItemId = (
  menuItemId: string,
  modifiers: SelectedModifier[]
): string => {
  const sortedOptionIds = modifiers
    .map((m) => m.optionId)
    .sort()
    .join('-');
  return sortedOptionIds ? `${menuItemId}-${sortedOptionIds}` : menuItemId;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderTypeState] = useState<'takeout' | 'delivery'>('takeout');
  const [address, setAddressState] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [branchDeliveryFee, setBranchDeliveryFee] = useState<number>(0);
  const [branchTaxRate, setBranchTaxRate] = useState<number>(5);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cd_customer_cart');
      const savedType = localStorage.getItem('cd_customer_order_type');
      const savedAddress = localStorage.getItem('cd_customer_address');
      
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (e) {
          console.error('Failed to parse cart items', e);
        }
      }
      if (savedType === 'takeout' || savedType === 'delivery') {
        setOrderTypeState(savedType);
      }
      if (savedAddress) {
        setAddressState(savedAddress);
      }
    }
  }, []);

  // Save cart to localStorage when changed
  const saveCartToStorage = (items: CartItem[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cd_customer_cart', JSON.stringify(items));
    }
  };

  const setOrderType = (type: 'takeout' | 'delivery') => {
    setOrderTypeState(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cd_customer_order_type', type);
    }
  };

  const setAddress = (addr: string) => {
    setAddressState(addr);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cd_customer_address', addr);
    }
  };

  const addToCart = (menuItem: MenuItem, selectedModifiers: SelectedModifier[], quantity = 1, note = '') => {
    const cartItemId = generateCartItemId(menuItem.id, selectedModifiers);
    const modifierSum = selectedModifiers.reduce((sum, mod) => sum + mod.price, 0);
    const itemUnitCost = menuItem.price + modifierSum;
    
    let updatedCartItems = [...cartItems];
    const existingIndex = cartItems.findIndex((item) => item.id === cartItemId);

    if (existingIndex > -1) {
      const item = updatedCartItems[existingIndex];
      const newQty = item.quantity + quantity;
      updatedCartItems[existingIndex] = {
        ...item,
        quantity: newQty,
        totalPrice: roundToTwo(itemUnitCost * newQty),
        note: note || item.note,
      };
    } else {
      const newItem: CartItem = {
        id: cartItemId,
        menuItemId: menuItem.id,
        categoryId: menuItem.categoryId,
        name: menuItem.name,
        image: menuItem.image,
        basePrice: menuItem.price,
        selectedModifiers,
        quantity,
        totalPrice: roundToTwo(itemUnitCost * quantity),
        note,
        kitchenLabel: menuItem.kitchenLabel || 'chicken',
      };
      updatedCartItems.push(newItem);
    }

    setCartItems(updatedCartItems);
    saveCartToStorage(updatedCartItems);
    toast.success(`${menuItem.name} added to cart!`);
  };

  const removeFromCart = (cartItemId: string) => {
    const item = cartItems.find((i) => i.id === cartItemId);
    const updated = cartItems.filter((i) => i.id !== cartItemId);
    setCartItems(updated);
    saveCartToStorage(updated);
    if (item) {
      toast.success(`${item.name} removed from cart`);
    }
  };

  const increaseQuantity = (cartItemId: string) => {
    const updated = cartItems.map((item) => {
      if (item.id === cartItemId) {
        const newQty = item.quantity + 1;
        const modSum = item.selectedModifiers.reduce((s, m) => s + m.price, 0);
        return {
          ...item,
          quantity: newQty,
          totalPrice: roundToTwo((item.basePrice + modSum) * newQty),
        };
      }
      return item;
    });
    setCartItems(updated);
    saveCartToStorage(updated);
  };

  const decreaseQuantity = (cartItemId: string) => {
    const existing = cartItems.find((item) => item.id === cartItemId);
    if (!existing) return;
    
    let updated: CartItem[];
    if (existing.quantity <= 1) {
      updated = cartItems.filter((item) => item.id !== cartItemId);
      toast.success(`${existing.name} removed from cart`);
    } else {
      updated = cartItems.map((item) => {
        if (item.id === cartItemId) {
          const newQty = item.quantity - 1;
          const modSum = item.selectedModifiers.reduce((s, m) => s + m.price, 0);
          return {
            ...item,
            quantity: newQty,
            totalPrice: roundToTwo((item.basePrice + modSum) * newQty),
          };
        }
        return item;
      });
    }
    setCartItems(updated);
    saveCartToStorage(updated);
  };

  const clearCart = () => {
    setCartItems([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cd_customer_cart');
    }
    toast.success('Cart cleared');
  };

  const subtotal = roundToTwo(cartItems.reduce((sum, item) => sum + item.totalPrice, 0));
  const deliveryFee = orderType === 'delivery' && subtotal > 0 ? branchDeliveryFee : 0;
  const tax = roundToTwo(subtotal * (branchTaxRate / 100));
  const total = roundToTwo(subtotal + deliveryFee + tax);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        orderType,
        setOrderType,
        address,
        setAddress,
        subtotal,
        tax,
        deliveryFee,
        total,
        branchDeliveryFee,
        setBranchDeliveryFee,
        branchTaxRate,
        setBranchTaxRate,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
