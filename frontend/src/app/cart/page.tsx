'use client';

import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const { cart, loading: cartLoading, updateQuantity, removeItem, clearCart } = useCart();
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (!user || user.role !== 'CUSTOMER') {
    return (
      <>
        <Header />
        <div className="flex-1 bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-20">
          <AlertCircle className="h-12 w-12 text-indigo-400 mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold">Access Restricted</h2>
          <p className="text-slate-400 text-sm mt-2 mb-6 max-w-md text-center">
            Please log in with a customer account to access your personal shopping cart.
          </p>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 text-sm font-semibold text-white shadow-xl shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all"
          >
            Sign In
          </Link>
        </div>
      </>
    );
  }

  const items = cart?.items || [];
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const calculateSubtotal = () => {
    return items.reduce((acc, item) => {
      const price = item.variant?.price
        ? parseFloat(item.variant.price)
        : parseFloat(item.product.price);
      return acc + price * item.quantity;
    }, 0);
  };

  const subtotal = calculateSubtotal();

  const handleQtyChange = async (itemId: string, currentQty: number, change: number) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const targetQty = currentQty + change;
    if (targetQty <= 0) {
      setUpdatingItemId(itemId);
      await removeItem(itemId);
      setUpdatingItemId(null);
      return;
    }

    setUpdatingItemId(itemId);
    const res = await updateQuantity(itemId, targetQty);
    setUpdatingItemId(null);

    if (res.success && res.message) {
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(null), 5000);
    } else if (!res.success && res.message) {
      setErrorMsg(res.message);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleRemove = async (itemId: string) => {
    setUpdatingItemId(itemId);
    await removeItem(itemId);
    setUpdatingItemId(null);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-6 mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight flex items-center space-x-2">
                <ShoppingBag className="h-8 w-8 text-indigo-500" />
                <span>Shopping Cart</span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Manage your active items and prepare for checkout.
              </p>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors flex items-center space-x-1 py-2 px-3 rounded-lg border border-slate-900 hover:bg-slate-900/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All Items</span>
              </button>
            )}
          </div>

          {successMsg && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-400 mb-6 flex items-start space-x-2">
              <Sparkles className="h-5 w-5 shrink-0 animate-bounce" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 mb-6 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {cartLoading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
              <p className="text-sm text-slate-500 mt-2 font-mono">Loading cart contents...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-slate-900 bg-slate-950/20 px-4">
              <div className="rounded-2xl bg-slate-900/60 p-4 border border-slate-800 text-slate-500 mb-4">
                <ShoppingBag className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-350">Your cart is empty</h3>
              <p className="text-sm text-slate-500 text-center max-w-sm mt-1 mb-8">
                Explore the Nexaris marketplace and discover premium multi-vendor items.
              </p>
              <Link
                href="/products"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 px-6 text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Cart List */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => {
                  const itemPrice = item.variant?.price
                    ? parseFloat(item.variant.price)
                    : parseFloat(item.product.price);
                  const isUpdating = updatingItemId === item.id;
                  const itemImg = item.product.images?.[0]?.url;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-900 bg-slate-900/10 p-4 sm:p-5 flex gap-4 sm:gap-6 items-center relative hover:border-slate-800/80 transition-all duration-200"
                    >
                      {/* Image Thumbnail */}
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-slate-900 overflow-hidden border border-slate-900 shrink-0 relative">
                        {itemImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={itemImg} alt={item.product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-650 font-mono">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                          {item.product.category.name}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                          <Link href={`/products/${item.product.slug}`} className="hover:text-indigo-400 transition-colors">
                            {item.product.name}
                          </Link>
                        </h3>

                        {item.variant && (
                          <span className="inline-block rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                            {item.variant.name}
                          </span>
                        )}

                        <div className="text-sm font-bold text-slate-400 font-mono mt-1">
                          ${itemPrice.toFixed(2)} each
                        </div>
                      </div>

                      {/* Qty Manager */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 shrink-0">
                        <div className="flex items-center rounded-xl bg-slate-950 border border-slate-900 p-1">
                          <button
                            disabled={isUpdating}
                            onClick={() => handleQtyChange(item.id, item.quantity, -1)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white disabled:opacity-50"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold font-mono">
                            {item.quantity}
                          </span>
                          <button
                            disabled={isUpdating}
                            onClick={() => handleQtyChange(item.id, item.quantity, 1)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-slate-500 uppercase font-mono block">Subtotal</span>
                          <span className="text-sm font-extrabold text-indigo-400 font-mono">
                            ${(itemPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        <button
                          disabled={isUpdating}
                          onClick={() => handleRemove(item.id)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {isUpdating && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                          <Loader2 className="animate-spin h-5 w-5 text-indigo-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-6">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 font-mono uppercase tracking-wide">
                  Order Summary
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Items</span>
                    <span className="font-semibold text-slate-200 font-mono">{itemCount}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Shipping</span>
                    <span className="font-semibold text-emerald-400 uppercase font-mono text-xs">Free</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Tax</span>
                    <span className="font-semibold text-slate-200 font-mono">$0.00</span>
                  </div>
                  <div className="border-t border-slate-900 pt-3 flex justify-between text-base font-extrabold">
                    <span>Subtotal</span>
                    <span className="text-indigo-400 font-mono">${subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    disabled
                    className="w-full inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 font-semibold text-white shadow-xl shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all opacity-50 cursor-not-allowed"
                  >
                    <span>Checkout (Unlocks in Phase 4)</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                  <span className="text-[10px] text-center text-slate-500 block mt-2 leading-relaxed">
                    Cart checkout security handled by Nexaris Buyer Protection.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
