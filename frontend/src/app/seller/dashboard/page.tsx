'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Header } from '../../../components/Header';
import { useRouter } from 'next/navigation';
import { Store, CheckCircle, Clock, ShoppingBag, BarChart3, Package, Loader2, MessageSquare, ArrowRight } from 'lucide-react';

export default function SellerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'SELLER') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const isApproved = user.sellerProfile?.status === 'APPROVED';

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          
          {/* Banner alert if pending or rejected */}
          {!isApproved ? (
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-8 backdrop-blur-md text-center max-w-2xl mx-auto space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-400">
                <Clock className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold text-white">Seller Registration Pending</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Your store <span className="text-yellow-400 font-semibold">&quot;{user.sellerProfile?.storeName}&quot;</span> is awaiting administrator approval.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  To safeguard the Nexaris marketplace ecosystem, all new sellers are verified by admins. We are reviewing your registration details.
                </p>
              </div>

              <div className="border-t border-slate-900 pt-6 text-left max-w-md mx-auto">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">Submitted Store Details</h4>
                <div className="rounded-xl bg-slate-950 border border-slate-900 p-4 space-y-2 text-sm text-slate-300">
                  <p><strong className="text-slate-500">Store Name:</strong> {user.sellerProfile?.storeName}</p>
                  <p><strong className="text-slate-500">Description:</strong> {user.sellerProfile?.storeDescription || 'None provided'}</p>
                  <p><strong className="text-slate-500">Verification Status:</strong> <span className="font-mono text-yellow-400 font-bold uppercase">{user.sellerProfile?.status}</span></p>
                </div>
              </div>
            </div>
          ) : (
            // Approved Seller Dashboard
            <div className="space-y-8">
              {/* Profile Card Header */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-8 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                    <Store className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-white">{user.sellerProfile?.storeName}</h1>
                    <p className="text-sm text-slate-400">{user.sellerProfile?.storeDescription || 'No description provided'}</p>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle className="h-3 w-3" />
                    <span>Approved Store</span>
                  </span>
                </div>
              </div>

              {/* Dashboard Navigation Cards */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">Store Operations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Products */}
                  <button
                    onClick={() => router.push('/seller/products')}
                    className="flex items-center justify-between p-6 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800 transition-all text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                        <Package className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200">Product Management</h4>
                        <p className="text-xs text-slate-500">List, edit, and moderate catalog items.</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-650" />
                  </button>

                  {/* Inventory */}
                  <button
                    onClick={() => router.push('/seller/inventory')}
                    className="flex items-center justify-between p-6 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800 transition-all text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200">Inventory Logs</h4>
                        <p className="text-xs text-slate-500">Track and adjust stock levels.</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-650" />
                  </button>

                  {/* Orders */}
                  <button
                    onClick={() => router.push('/seller/orders')}
                    className="flex items-center justify-between p-6 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800 transition-all text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200">Fulfillment & Orders</h4>
                        <p className="text-xs text-slate-500">View and dispatch sold items.</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-650" />
                  </button>

                  {/* Reviews */}
                  <button
                    onClick={() => router.push('/seller/reviews')}
                    className="flex items-center justify-between p-6 rounded-2xl border border-slate-900 bg-slate-900/10 hover:border-slate-800 transition-all text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200">Customer Reviews</h4>
                        <p className="text-xs text-slate-500">Monitor store feedback & ratings.</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-650" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
