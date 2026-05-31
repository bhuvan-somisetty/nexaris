'use client';

import React, { useState } from 'react';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Heart, Trash2, ShoppingCart, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { wishlist, loading: wishlistLoading, removeFromWishlist, moveToCart } = useWishlist();
  const [actionItemId, setActionItemId] = useState<string | null>(null);
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
            Please log in with a customer account to access your personal wishlist.
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

  const items = wishlist?.items || [];

  const handleMoveToCart = async (itemId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setActionItemId(itemId);
    const res = await moveToCart(itemId);
    setActionItemId(null);

    if (res.success && res.message) {
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(null), 5000);
    } else if (!res.success && res.message) {
      setErrorMsg(res.message);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleRemove = async (itemId: string) => {
    setActionItemId(itemId);
    await removeFromWishlist(itemId);
    setActionItemId(null);
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="border-b border-slate-900 pb-6 mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center space-x-2">
              <Heart className="h-8 w-8 text-indigo-500 fill-indigo-500/10" />
              <span>My Wishlist</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Store and track items you are interested in.
            </p>
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

          {wishlistLoading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
              <p className="text-sm text-slate-500 mt-2 font-mono">Loading wishlist...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed border-slate-900 bg-slate-950/20 px-4">
              <div className="rounded-2xl bg-slate-900/60 p-4 border border-slate-800 text-slate-500 mb-4">
                <Heart className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-350">Your wishlist is empty</h3>
              <p className="text-sm text-slate-500 text-center max-w-sm mt-1 mb-8">
                Save products and variations to your wishlist to keep track of their pricing and availability.
              </p>
              <Link
                href="/products"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 px-6 text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {items.map((item) => {
                const itemPrice = item.variant?.price
                  ? parseFloat(item.variant.price)
                  : parseFloat(item.product.price);
                const isProcessing = actionItemId === item.id;
                const itemImg = item.product.images?.[0]?.url;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-900 bg-slate-900/10 p-5 flex gap-4 sm:gap-6 items-center relative hover:border-slate-800/80 transition-all duration-200"
                  >
                    {/* Thumbnail Image */}
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

                    {/* Details and Actions */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                          {item.product.category.name}
                        </span>
                        <h3 className="text-sm font-bold text-white truncate">
                          <Link href={`/products/${item.product.slug}`} className="hover:text-indigo-400 transition-colors">
                            {item.product.name}
                          </Link>
                        </h3>

                        {item.variant && (
                          <div className="mt-1">
                            <span className="inline-block rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                              {item.variant.name}
                            </span>
                          </div>
                        )}

                        <div className="text-sm font-bold text-indigo-400 font-mono mt-1">
                          ${itemPrice.toFixed(2)}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-900/40">
                        <button
                          disabled={isProcessing}
                          onClick={() => handleMoveToCart(item.id)}
                          className="flex-1 inline-flex h-9 items-center justify-center rounded-xl bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/25 hover:border-indigo-500/40 text-xs font-semibold text-indigo-450 hover:text-indigo-400 transition-all duration-200"
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                          <span>Add to Cart</span>
                        </button>

                        <button
                          disabled={isProcessing}
                          onClick={() => handleRemove(item.id)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-400 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                        <Loader2 className="animate-spin h-5 w-5 text-indigo-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
