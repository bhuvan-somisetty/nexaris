'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Header } from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Star, MessageSquare, ShieldAlert, Award, ArrowLeft, Loader2, ListFilter, Users } from 'lucide-react';
import Link from 'next/link';

export default function SellerReviewsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Navigation Guard
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'SELLER')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Tabs
  const [activeTab, setActiveTab] = useState<'products' | 'store'>('products');

  // Product reviews state
  const [prodReviews, setProdReviews] = useState<any[]>([]);
  const [prodPage, setProdPage] = useState<number>(1);
  const [prodTotalPages, setProdTotalPages] = useState<number>(1);
  const [prodLoading, setProdLoading] = useState<boolean>(true);

  // Storefront ratings state
  const [storeRatings, setStoreRatings] = useState<any[]>([]);
  const [storeStats, setStoreStats] = useState<any>({ average: 0, totalRatings: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [storePage, setStorePage] = useState<number>(1);
  const [storeTotalPages, setStoreTotalPages] = useState<number>(1);
  const [storeLoading, setStoreLoading] = useState<boolean>(true);

  // Fetch product reviews
  const fetchProductReviews = async () => {
    try {
      setProdLoading(true);
      const res = await api.get(`/reviews/seller?page=${prodPage}&limit=10`);
      setProdReviews(res.data.reviews);
      setProdTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setProdLoading(false);
    }
  };

  // Fetch store ratings
  const fetchStoreRatings = async () => {
    try {
      setStoreLoading(true);
      const res = await api.get(`/seller-ratings/me?page=${storePage}&limit=10`);
      setStoreRatings(res.data.ratings);
      setStoreStats(res.data.stats);
      setStoreTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setStoreLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'SELLER') {
      if (activeTab === 'products') {
        fetchProductReviews();
      } else {
        fetchStoreRatings();
      }
    }
  }, [user, activeTab, prodPage, storePage]);

  if (authLoading || !user || user.role !== 'SELLER') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Breadcrumbs */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-5">
            <div className="space-y-1">
              <Link href="/seller/dashboard" className="text-xs text-slate-500 hover:text-indigo-400 flex items-center mb-1">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-3xl font-extrabold text-slate-100">Store Reviews & Feedback</h1>
            </div>
            <div className="flex bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'products' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Product Feedback
              </button>
              <button
                onClick={() => setActiveTab('store')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'store' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Storefront Ratings
              </button>
            </div>
          </div>

          {activeTab === 'products' ? (
            /* PRODUCT FEEDBACK PANEL */
            <div className="space-y-6">
              {prodLoading ? (
                <div className="py-24 flex justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                </div>
              ) : prodReviews.length === 0 ? (
                <div className="py-20 border border-dashed border-slate-950/20 bg-slate-900/5 text-center rounded-3xl">
                  <MessageSquare className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-300">No Product Reviews Yet</h3>
                  <p className="text-slate-500 text-sm mt-1">Feedback will appear here once customers place orders and leave reviews.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {prodReviews.map((r) => {
                      const date = new Date(r.createdAt).toLocaleDateString();
                      const authorName = r.customer?.profile
                        ? `${r.customer.profile.firstName} ${r.customer.profile.lastName?.substring(0, 1) || ''}.`
                        : 'Anonymous User';

                      return (
                        <div key={r.id} className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-3">
                          <div className="flex flex-wrap justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`h-3.5 w-3.5 ${
                                      s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-800'
                                    }`}
                                  />
                                ))}
                                {r.verified && (
                                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 text-[9px] text-emerald-450 font-bold uppercase ml-3">
                                    Verified Purchase
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-slate-200 mt-1">{r.title}</h4>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-slate-500 font-mono">{date}</span>
                              <Link
                                href={`/products/${r.product.slug}`}
                                className="block text-[11px] text-indigo-400 hover:text-indigo-350 mt-1"
                              >
                                View Product: {r.product.name}
                              </Link>
                            </div>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed">{r.content}</p>
                          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-900/50 pt-2.5">
                            <span>By customer: {authorName} ({r.customer.email})</span>
                            <span className="font-mono">Helpfulness Votes: {r.helpfulCount || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {prodTotalPages > 1 && (
                    <div className="flex items-center justify-center space-x-4 pt-6">
                      <button
                        onClick={() => setProdPage(Math.max(1, prodPage - 1))}
                        disabled={prodPage === 1}
                        className="px-4 py-2 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-800 text-xs disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-slate-500">
                        Page {prodPage} of {prodTotalPages}
                      </span>
                      <button
                        onClick={() => setProdPage(Math.min(prodTotalPages, prodPage + 1))}
                        disabled={prodPage === prodTotalPages}
                        className="px-4 py-2 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-800 text-xs disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* STOREFRONT RATINGS PANEL */
            <div className="space-y-8">
              {/* Scorecard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-slate-900/10 border border-slate-900 p-6 rounded-2xl">
                <div className="text-center md:border-r md:border-slate-900 py-2">
                  <span className="text-6xl font-extrabold text-indigo-400 font-mono">{storeStats.average || '0.0'}</span>
                  <div className="flex items-center justify-center space-x-1 mt-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-5 w-5 ${
                          s <= Math.round(storeStats.average || 0)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 block mt-2 font-mono">Storefront Rating ({storeStats.totalRatings || 0} reviews)</span>
                </div>

                <div className="col-span-2 space-y-2">
                  {[5, 4, 3, 2, 1].map((ratingVal) => {
                    const count = storeStats.breakdown?.[ratingVal] || 0;
                    const total = storeStats.totalRatings || 1;
                    const percent = Math.round((count / total) * 100);

                    return (
                      <div key={ratingVal} className="flex items-center space-x-3 text-sm">
                        <span className="w-12 text-slate-400 font-semibold flex items-center space-x-1">
                          <span className="font-mono">{ratingVal}</span>
                          <Star className="h-3 w-3 fill-current text-slate-500" />
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-900 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs text-slate-500 font-mono">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feed */}
              {storeLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                </div>
              ) : storeRatings.length === 0 ? (
                <div className="py-20 border border-dashed border-slate-950/20 bg-slate-900/5 text-center rounded-3xl">
                  <Users className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-300">No Storefront Ratings</h3>
                  <p className="text-slate-500 text-sm mt-1">Customers will be able to rate your service after receiving their items.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {storeRatings.map((r) => {
                    const date = new Date(r.createdAt).toLocaleDateString();
                    const authorName = r.customer?.profile
                      ? `${r.customer.profile.firstName} ${r.customer.profile.lastName?.substring(0, 1) || ''}.`
                      : 'Anonymous User';

                    return (
                      <div key={r.id} className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-2">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3.5 w-3.5 ${
                                  s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-slate-500 font-mono">{date}</span>
                        </div>
                        {r.comment ? (
                          <p className="text-sm text-slate-400 leading-relaxed italic">"{r.comment}"</p>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No comment provided.</p>
                        )}
                        <div className="text-xs text-slate-500 border-t border-slate-900/50 pt-2 mt-2">
                          <span>By customer: {authorName} ({r.customer.email})</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  {storeTotalPages > 1 && (
                    <div className="flex items-center justify-center space-x-4 pt-6">
                      <button
                        onClick={() => setStorePage(Math.max(1, storePage - 1))}
                        disabled={storePage === 1}
                        className="px-4 py-2 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-800 text-xs disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-slate-500 font-mono">
                        Page {storePage} of {storeTotalPages}
                      </span>
                      <button
                        onClick={() => setStorePage(Math.min(storeTotalPages, storePage + 1))}
                        disabled={storePage === storeTotalPages}
                        className="px-4 py-2 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-800 text-xs disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
