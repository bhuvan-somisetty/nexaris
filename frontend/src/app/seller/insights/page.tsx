'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { RecommendationShelf } from '@/components/RecommendationShelf';
import { api, RecommendedProduct } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, Search, BarChart3, ArrowLeft, Loader2, AlertCircle,
  Package, Lightbulb, ChevronRight, Flame,
} from 'lucide-react';

interface MarketGap {
  term: string;
  count: number;
  category: string;
}

interface InsightsData {
  marketGaps: MarketGap[];
  risingDemand: RecommendedProduct[];
}

export default function SellerInsightsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'SELLER') {
      router.push('/');
      return;
    }

    const fetch = async () => {
      try {
        const res = await api.get<InsightsData>('/recommendations/seller/insights');
        setData(res.data);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        setError(error.response?.data?.message ?? 'Failed to load insights.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-[70vh] bg-slate-950 text-white flex flex-col items-center justify-center px-4">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold">Failed to load insights</h2>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-10">

          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/seller/dashboard" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <Lightbulb className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100">Seller Insights</h1>
              <p className="text-sm text-slate-500">AI-powered market intelligence for your store</p>
            </div>
          </div>

          {/* Market Gap Analysis */}
          <section className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-6 space-y-6">
            <div className="flex items-center gap-2.5">
              <Search className="h-5 w-5 text-rose-400" />
              <div>
                <h2 className="text-lg font-bold text-slate-100">Market Gap Analysis</h2>
                <p className="text-xs text-slate-500">Search terms with high demand but limited supply in your categories</p>
              </div>
            </div>

            {!data?.marketGaps || data.marketGaps.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                <Package className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No market gap data available yet. Data accumulates as customers search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.marketGaps.map((gap, i) => {
                  const intensity = i < 3 ? 'rose' : i < 6 ? 'amber' : 'slate';
                  return (
                    <div
                      key={`${gap.term}-${i}`}
                      className={`flex items-center justify-between rounded-xl p-4 border ${
                        intensity === 'rose'
                          ? 'bg-rose-500/5 border-rose-500/20'
                          : intensity === 'amber'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-slate-800/30 border-slate-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {i < 3 && <Flame className="h-4 w-4 text-rose-400 shrink-0" />}
                        <div>
                          <p className="text-sm font-semibold text-slate-200">&ldquo;{gap.term}&rdquo;</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Category: <span className="text-slate-400">{gap.category === 'all' ? 'All Categories' : gap.category}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold font-mono ${
                          intensity === 'rose' ? 'text-rose-400' : intensity === 'amber' ? 'text-amber-400' : 'text-slate-400'
                        }`}>{gap.count}</span>
                        <p className="text-[10px] text-slate-600">searches</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Opportunity Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: TrendingUp,
                label: 'Market Gaps',
                value: data?.marketGaps.length ?? 0,
                sub: 'Unmet demand opportunities',
                color: 'rose',
              },
              {
                icon: BarChart3,
                label: 'Rising Products',
                value: data?.risingDemand.length ?? 0,
                sub: 'Products trending in your categories',
                color: 'indigo',
              },
              {
                icon: Search,
                label: 'Top Search',
                value: data?.marketGaps[0]?.term ? `"${data.marketGaps[0].term}"` : '—',
                sub: `${data?.marketGaps[0]?.count ?? 0} total searches`,
                color: 'amber',
              },
            ].map(({ icon: Icon, label, value, sub, color }) => (
              <div
                key={label}
                className={`rounded-2xl border bg-slate-900/30 p-5 border-${color}-500/20`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-${color}-500/10 mb-3`}>
                  <Icon className={`h-4 w-4 text-${color}-400`} />
                </div>
                <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-extrabold text-${color}-400 mt-1 font-mono`}>{value}</p>
                <p className="text-xs text-slate-500 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Rising Demand in Your Categories */}
          <RecommendationShelf
            title="Rising Demand in Your Categories"
            subtitle="Products competitors are selling that have high platform activity"
            products={data?.risingDemand ?? []}
            recommendationType="SELLER_INSIGHTS"
            icon="trending"
            accentColor="purple"
            loading={loading}
          />

          {/* Action Card */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 shrink-0">
              <Lightbulb className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-100">How to use these insights</h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-400 list-disc list-inside">
                <li>Add products that match high-frequency search terms to fill market gaps</li>
                <li>Study rising demand products for pricing and positioning ideas</li>
                <li>Set competitive prices relative to trending items in your category</li>
                <li>Check back weekly as search trends and demand shift constantly</li>
              </ul>
              <Link
                href="/seller/products/new"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Add a new product <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
