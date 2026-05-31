'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { api } from '@/lib/api';

export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  variantId: string | null;
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

export interface Wishlist {
  id: string;
  userId: string;
  items: WishlistItem[];
}

interface WishlistContextType {
  wishlist: Wishlist | null;
  loading: boolean;
  addToWishlist: (productId: string, variantId?: string | null) => Promise<{ success: boolean; message?: string }>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  moveToCart: (itemId: string) => Promise<{ success: boolean; message?: string }>;
  isInWishlist: (productId: string, variantId?: string | null) => boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { refreshCart } = useCart();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshWishlist = async () => {
    if (!user || user.role !== 'CUSTOMER') {
      setWishlist(null);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/wishlist');
      setWishlist(res.data);
    } catch (err) {
      console.error('Failed to fetch wishlist', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWishlist();
  }, [user]);

  const addToWishlist = async (productId: string, variantId?: string | null) => {
    if (!user) {
      return { success: false, message: 'Please sign in to add items to your wishlist.' };
    }
    if (user.role !== 'CUSTOMER') {
      return { success: false, message: 'Only customer accounts can use the wishlist.' };
    }

    try {
      const res = await api.post('/wishlist/items', { productId, variantId: variantId || null });
      setWishlist(res.data);
      return { success: true, message: 'Item added to wishlist' };
    } catch (err: any) {
      console.error(err);
      return { success: false, message: err.response?.data?.message || 'Failed to add to wishlist.' };
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      const res = await api.delete(`/wishlist/items/${itemId}`);
      setWishlist(res.data);
    } catch (err) {
      console.error('Failed to remove wishlist item', err);
    }
  };

  const moveToCart = async (itemId: string) => {
    try {
      const res = await api.post(`/wishlist/items/${itemId}/move-to-cart`);
      setWishlist(res.data.wishlist);
      // Explicitly tell CartContext to update cart state
      await refreshCart();
      return { success: true, message: res.data.message };
    } catch (err: any) {
      console.error(err);
      return { success: false, message: err.response?.data?.message || 'Failed to move item to cart.' };
    }
  };

  const isInWishlist = (productId: string, variantId?: string | null) => {
    if (!wishlist) return false;
    return wishlist.items.some(
      (item) => item.productId === productId && item.variantId === (variantId || null)
    );
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        addToWishlist,
        removeFromWishlist,
        moveToCart,
        isInWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
