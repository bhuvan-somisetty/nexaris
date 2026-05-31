'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LogOut, User as UserIcon, Shield, Store } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

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
                  <Link href="/profile" className="flex items-center space-x-1 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                    <UserIcon className="h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
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
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 rounded-lg px-3 py-2 text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                >
                  <UserIcon className="h-5 w-5" />
                  <span>My Profile</span>
                </Link>
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
