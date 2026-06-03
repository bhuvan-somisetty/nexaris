'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Menu, X, LogOut, User as UserIcon, Shield, Store, ShoppingCart, Heart, Bell } from 'lucide-react';
import { api } from '../lib/api';
import { SearchBar } from './SearchBar';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const [isOpen, setIsOpen] = useState(false);
  const [showMiniCart, setShowMiniCart] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const cartItemCount = cart?.items.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const wishlistCount = wishlist?.items.length || 0;

  const cartSubtotal = cart?.items.reduce((acc, item) => {
    const price = item.variant?.price
      ? parseFloat(item.variant.price)
      : parseFloat(item.product.price);
    return acc + price * item.quantity;
  }, 0) || 0;

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications?page=1&limit=5&archived=false');
      setNotifications(response.data.items);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setUnreadCount(0);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative flex h-10 w-10 items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <svg className="h-full w-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366F1" /> {/* Indigo-500 */}
                      <stop offset="50%" stopColor="#A855F7" /> {/* Purple-500 */}
                      <stop offset="100%" stopColor="#EC4899" /> {/* Pink-500 */}
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Outer glowing hexagon outline */}
                  <path d="M50 8 L86 28 L86 72 L50 92 L14 72 L14 28 Z" fill="url(#logo-grad)" fillOpacity="0.08" stroke="url(#logo-grad)" strokeWidth="3" filter="url(#glow)" />
                  {/* Inner stylized shopping trolley */}
                  <path
                    d="M26 32 H34 L42 62 H68 L76 38 H36"
                    stroke="url(#logo-grad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M26 32 H34 L42 62 H68 L76 38 H36"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Wheels */}
                  <circle cx="45" cy="74" r="5" fill="url(#logo-grad)" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="65" cy="74" r="5" fill="url(#logo-grad)" stroke="#FFFFFF" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-xl font-extrabold tracking-wider text-transparent uppercase transition-all duration-300 group-hover:text-white">
                Nexaris
              </span>
            </Link>
          </div>

          {/* Center search bar (desktop) */}
          <div className="hidden lg:flex flex-1 max-w-xl mx-6">
            <SearchBar className="w-full" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/products" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Products
            </Link>
            <Link href="/products" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Categories
            </Link>
            <Link href="/#deals" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Deals
            </Link>
            <Link href="/sellers" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sellers
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
                        onClick={() => { setShowMiniCart(!showMiniCart); setShowNotifications(false); }}
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

                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setShowMiniCart(false);
                      if (!showNotifications) fetchNotifications();
                    }}
                    className="relative p-1.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-900 bg-slate-950 p-4 shadow-2xl ring-1 ring-black ring-opacity-5 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                          Notifications
                        </h4>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-60 overflow-y-auto py-2 divide-y divide-slate-900/60 scrollbar-thin">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => handleMarkRead(n.id)}
                              className={`flex py-2.5 gap-2 items-start cursor-pointer hover:bg-slate-900/40 px-2 rounded-lg transition-colors ${
                                !n.isRead ? 'bg-slate-900/20' : ''
                              }`}
                            >
                              <div className={`h-1.5 w-1.5 mt-2 rounded-full shrink-0 ${!n.isRead ? 'bg-indigo-500' : 'bg-transparent'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-200 truncate">{n.title}</p>
                                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                                <span className="text-[9px] text-slate-600 mt-1 block font-mono">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-xs text-slate-500">
                            No notifications.
                          </div>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-900 flex justify-between text-[11px] font-semibold text-indigo-400">
                        <Link href="/notifications" onClick={() => setShowNotifications(false)} className="hover:text-indigo-300 transition-colors">
                          View all history
                        </Link>
                        <Link href="/profile/settings/notifications" onClick={() => setShowNotifications(false)} className="hover:text-indigo-300 transition-colors">
                          Settings
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

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
        <div className="md:hidden border-t border-slate-900 bg-slate-950 px-4 pb-4 pt-3 space-y-2">
          <div className="pb-1">
            <SearchBar />
          </div>
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
            Products
          </Link>
          <Link
            href="/products"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/#deals"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
          >
            Deals
          </Link>
          <Link
            href="/sellers"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
          >
            Sellers
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
