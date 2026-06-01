'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Menu, X, LogOut, User as UserIcon, Shield, Store, ShoppingCart, Heart } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const [isOpen, setIsOpen] = useState(false);
  const [showMiniCart, setShowMiniCart] = useState(false);

  const cartItemCount = cart?.items.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const wishlistCount = wishlist?.items.length || 0;

  const cartSubtotal = cart?.items.reduce((acc, item) => {
    const price = item.variant?.price
      ? parseFloat(item.variant.price)
      : parseFloat(item.product.price);
    return acc + price * item.quantity;
  }, 0) || 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 font-bold text-white shadow-lg shadow-indigo-500/20">
                N
              </div>
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                Nexaris
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/products" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Shop
            </Link>
            
            {user ? (
              <>
                {user.role === 'ADMIN' && (
                  <Link href="/admin/dashboard" className="flex items-center space-x-1 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">
                    <Shield className="h-4 w-4" />
                    <span>Admin Portal</span>
                  </Link>
                )}
                {user.role === 'SELLER' && (
                  <Link href="/seller/dashboard" className="flex items-center space-x-1 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                    <Store className="h-4 w-4" />
                    <span>Seller Portal</span>
                  </Link>
                )}
                {user.role === 'CUSTOMER' && (
                  <>
                    <Link
                      href="/wishlist"
                      className="relative p-1.5 text-slate-400 hover:text-white transition-colors"
                      title="My Wishlist"
                    >
                      <Heart className="h-5 w-5" />
                      {wishlistCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>

                    <div className="relative">
                      <button
                        onClick={() => setShowMiniCart(!showMiniCart)}
                        className="relative p-1.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                        title="Shopping Cart"
                      >
                        <ShoppingCart className="h-5 w-5" />
                        {cartItemCount > 0 && (
                          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-[9px] font-bold text-white">
                            {cartItemCount}
                          </span>
                        )}
                      </button>

                      {/* Mini Cart Slideout Dropdown */}
                      {showMiniCart && (
                        <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-900 bg-slate-950 p-4 shadow-2xl ring-1 ring-black ring-opacity-5 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono pb-2 border-b border-slate-900">
                            Cart Preview
                          </h4>
                          {cart?.items && cart.items.length > 0 ? (
                            <>
                              <div className="max-h-60 overflow-y-auto py-2 divide-y divide-slate-900/60">
                                {cart.items.slice(0, 3).map((item) => {
                                  const price = item.variant?.price
                                    ? parseFloat(item.variant.price)
                                    : parseFloat(item.product.price);
                                  const img = item.product.images?.[0]?.url;
                                  return (
                                    <div key={item.id} className="flex py-2.5 gap-3 items-center">
                                      <div className="h-10 w-10 rounded-lg bg-slate-900 overflow-hidden border border-slate-900 shrink-0 relative">
                                        {img ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={img} alt={item.product.name} className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="h-full w-full flex items-center justify-center text-[8px] text-slate-650 font-mono">
                                            No Img
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-200 truncate">
                                          {item.product.name}
                                        </p>
                                        {item.variant && (
                                          <p className="text-[9px] text-indigo-400 font-semibold truncate">
                                            {item.variant.name}
                                          </p>
                                        )}
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                          {item.quantity} × ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                                {cart.items.length > 3 && (
                                  <div className="text-[10px] text-center text-slate-500 py-1.5 font-mono">
                                    + {cart.items.length - 3} more items in cart
                                  </div>
                                )}
                              </div>
                              <div className="border-t border-slate-900 pt-3 mt-1 space-y-3">
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Total Items</span>
                                  <span className="font-bold text-slate-200 font-mono">{cartItemCount}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Subtotal</span>
                                  <span className="font-bold text-indigo-400 font-mono">
                                    ₹{cartSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                                  <Link
                                    href="/cart"
                                    onClick={() => setShowMiniCart(false)}
                                    className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-350 hover:text-white transition-colors"
                                  >
                                    View Cart
                                  </Link>
                                  <Link
                                    href="/checkout"
                                    onClick={() => setShowMiniCart(false)}
                                    className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all"
                                  >
                                    Checkout
                                  </Link>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="py-8 text-center text-xs text-slate-500 font-mono">
                              Your cart is empty
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Link href="/profile" className="flex items-center space-x-1 text-sm font-medium text-slate-350 hover:text-white transition-colors">
                      <UserIcon className="h-4 w-4" />
                      <span>My Profile</span>
                    </Link>
                  </>
                )}

                <div className="h-4 w-px bg-slate-800" />
                
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-semibold text-slate-200">
                      {user.profile?.firstName} {user.profile?.lastName}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900 px-3 h-9 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
                >
                  Get Started
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-900 bg-slate-950 px-4 pb-4 pt-2 space-y-2">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
          >
            Home
          </Link>
          <Link
            href="/products"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
          >
            Shop
          </Link>
          
          {user ? (
            <>
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 rounded-lg px-3 py-2 text-base font-medium text-purple-400 hover:bg-slate-900 transition-colors"
                >
                  <Shield className="h-5 w-5" />
                  <span>Admin Portal</span>
                </Link>
              )}
              {user.role === 'SELLER' && (
                <Link
                  href="/seller/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 rounded-lg px-3 py-2 text-base font-medium text-indigo-400 hover:bg-slate-900 transition-colors"
                >
                  <Store className="h-5 w-5" />
                  <span>Seller Portal</span>
                </Link>
              )}
              {user.role === 'CUSTOMER' && (
                <>
                  <Link
                    href="/wishlist"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-2 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                  >
                    <Heart className="h-5 w-5" />
                    <span>My Wishlist ({wishlistCount})</span>
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-2 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>My Cart ({cartItemCount})</span>
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-2 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                  >
                    <UserIcon className="h-5 w-5" />
                    <span>My Profile</span>
                  </Link>
                </>
              )}
              <div className="border-t border-slate-900 pt-2 mt-2">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-slate-200">
                    {user.profile?.firstName} {user.profile?.lastName}
                  </p>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-base font-medium text-red-400 hover:bg-slate-900 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <div className="border-t border-slate-900 pt-4 mt-2 flex flex-col space-y-2">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex h-10 items-center justify-center rounded-lg border border-slate-800 text-base font-medium text-slate-300 hover:bg-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-base font-medium text-white shadow-lg shadow-indigo-500/25 transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
