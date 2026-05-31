'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { User, Store, Mail, KeyRound, AlertTriangle, Loader2, Info } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'SELLER'>('CUSTOMER');
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(
        email,
        password,
        role,
        firstName,
        lastName,
        role === 'SELLER' ? storeName : undefined,
        role === 'SELLER' ? storeDescription : undefined,
      );
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Failed to register account. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="flex-1 bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Glow bg */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
          <div className="bg-slate-900/40 backdrop-blur-md py-8 px-6 border border-slate-800/80 shadow-2xl rounded-2xl sm:px-10">
            {error && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 flex items-start space-x-2 animate-pulse">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">I want to register as a:</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('CUSTOMER')}
                    className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border font-semibold transition-all duration-200 ${
                      role === 'CUSTOMER'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/5'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span>Customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('SELLER')}
                    className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border font-semibold transition-all duration-200 ${
                      role === 'SELLER'
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/5'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Store className="h-5 w-5" />
                    <span>Seller</span>
                  </button>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300">First name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300">Last name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1.5 block w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300">Email address</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-200"
                    placeholder="jane.doe@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Seller details section */}
              {role === 'SELLER' && (
                <div className="border-t border-slate-800 pt-6 space-y-4 animate-fadeIn">
                  <div className="flex items-center space-x-2 text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 text-xs mb-4">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Seller applications are subject to administrator approval before product placement.</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Store Name</label>
                    <input
                      type="text"
                      required={role === 'SELLER'}
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-200"
                      placeholder="Jane's Tech Boutique"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Store Description</label>
                    <textarea
                      rows={3}
                      value={storeDescription}
                      onChange={(e) => setStoreDescription(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all duration-200"
                      placeholder="Briefly describe what items your boutique will offer..."
                    />
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-lg font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
