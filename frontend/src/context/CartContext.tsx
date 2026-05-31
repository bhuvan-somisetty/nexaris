'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/lib/api';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: string;
    images: Array<{ id: string; url: string; altText?: string }>;
    category: { id: string; name: string };
  };
  variant: {
    id: string;
    name: string;
    sku: string;
    price?: string | null;
  } | null;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  addToCart: (productId: string, variantId: string | null | undefined, quantity: number) => Promise<{ success: boolean; message?: string }>;
  updateQuantity: (itemId: string, quantity: number) => Promise<{ success: boolean; message?: string }>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshCart = async () => {
    if (!user || user.role !== 'CUSTOMER') {
      setCart(null);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/cart');
      setCart(res.data);
    } catch (err) {
      console.error('Failed to fetch cart', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [user]);

  const addToCart = async (productId: string, variantId: string | null | undefined, quantity: number) => {
    if (!user) {
      return { success: false, message: 'Please sign in to add items to your cart.' };
    }
    if (user.role !== 'CUSTOMER') {
      return { success: false, message: 'Only customer accounts can make purchases.' };
    }

    try {
      const res = await api.post('/cart/items', { productId, variantId: variantId || null, quantity });
      setCart(res.data.cart);
      return { success: true, message: res.data.message };
    } catch (err: any) {
      console.error(err);
      return { success: false, message: err.response?.data?.message || 'Failed to add item to cart.' };
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await api.put(`/cart/items/${itemId}`, { quantity });
      setCart(res.data.cart);
      return { success: true, message: res.data.message };
    } catch (err: any) {
      console.error(err);
      return { success: false, message: err.response?.data?.message || 'Failed to update quantity.' };
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await api.delete(`/cart/items/${itemId}`);
      setCart(res.data);
    } catch (err) {
      console.error('Failed to remove cart item', err);
    }
  };

  const clearCart = async () => {
    try {
      const res = await api.delete('/cart');
      setCart(res.data);
    } catch (err) {
      console.error('Failed to clear cart', err);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
