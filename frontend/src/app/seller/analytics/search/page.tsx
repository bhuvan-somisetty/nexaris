'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { getSellerSearchAnalytics, api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  TrendingUp,
  Search,
  Eye,
  MousePointer,
  ShoppingBag,
  CheckCircle,
  Sparkles,
  SearchX,
  Compass
} from 'lucide-react';

interface FunnelData {
  impressions: number;
  clicks: number;
  cartAdds: number;
  purchases: number;
}

interface KeywordItem {
  query: string;
  count: number;
}

interface SearchAnalyticsData {
  impressions: number;
  ctr: number;
  conversionRate: number;
  funnel: FunnelData;
  topKeywords: KeywordItem[];
  zeroResultKeywords: KeywordItem[];
}

export default function SellerSearchAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<SearchAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'SELLER') {
        router.push('/');
        return;
      }
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await getSellerSearchAnalytics();
        setData(res);
      } catch (err: any) {
        console.error('Failed to retrieve search analytics:', err);
        setError(err.response?.data?.message || 'Failed to load search performance analytics.');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'SELLER') {
      fetchAnalytics();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
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
          <h2 className="text-xl font-bold">Failed to load analytics</h2>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
          <Link
            href="/seller/dashboard"
            className="mt-6 px-4 py-2 bg-slate-900 hover:bg-slate-850 rounded-xl text-xs font-semibold"
          >
            Back to Dashboard
          </Link>
        </div>
      </>
    );
  }

  const funnel = data?.funnel || { impressions: 0, clicks: 0, cartAdds: 0, purchases: 0 };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Glow Rings */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="mx-auto max-w-6xl space-y-8 relative z-10">
          {/* Back controls */}
          <div className="flex items-center gap-4">
            <Link
              href="/seller/analytics"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Business Intelligence</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
              <Search className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100">Search Catalog Intelligence</h1>
              <p className="text-sm text-slate-500">
                Discover CTR, keyword demand trends, and search-to-purchase conversions.
              </p>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              {
                icon: Eye,
                title: 'Search Impressions',
                value: data?.impressions.toLocaleString() || '0',
                desc: 'Searches displaying your products',
                color: 'indigo'
              },
              {
                icon: MousePointer,
                title: 'Click-through Rate (CTR)',
                value: `${data?.ctr.toFixed(2) || '0.00'}%`,
                desc: 'Impressions resulting in views',
                color: 'emerald'
              },
              {
                icon: ShoppingBag,
                title: 'Search Conversion',
                value: `${data?.conversionRate.toFixed(2) || '0.00'}%`,
                desc: 'Clicks resulting in purchases',
                color: 'purple'
              },
              {
                icon: CheckCircle,
                title: 'Search Purchases',
                value: funnel.purchases.toLocaleString() || '0',
                desc: 'Successful orders from search clicks',
                color: 'pink'
              }
            ].map(({ icon: Icon, title, value, desc, color }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-900 bg-slate-900/10 p-5 space-y-2 hover:border-slate-800 transition-colors"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${color}-500/15 text-${color}-400 mb-2`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
                  {title}
                </span>
                <h3 className="text-2xl font-extrabold text-white font-mono">{value}</h3>
                <span className="text-[10px] text-slate-550 block font-mono">{desc}</span>
              </div>
            ))}
          </div>

          {/* Discovery funnel section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  <span>Search Conversion Funnel</span>
                </h3>
                <span className="text-[9px] font-mono text-slate-550 uppercase">Session Funnel</span>
              </div>

              {/* Visual Funnel Steps */}
              <div className="space-y-4 pt-2">
                {[
                  {
                    step: '1. Impressions',
                    count: funnel.impressions,
                    pct: 100,
                    color: 'bg-indigo-500/30 text-indigo-300 border-indigo-500/20'
                  },
                  {
                    step: '2. Clicks',
                    count: funnel.clicks,
                    pct: funnel.impressions > 0 ? Math.round((funnel.clicks / funnel.impressions) * 100) : 0,
                    color: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/20'
                  },
                  {
                    step: '3. Cart Adds',
                    count: funnel.cartAdds,
                    pct: funnel.clicks > 0 ? Math.round((funnel.cartAdds / funnel.clicks) * 100) : 0,
                    color: 'bg-purple-500/30 text-purple-300 border-purple-500/20'
                  },
                  {
                    step: '4. Purchases',
                    count: funnel.purchases,
                    pct: funnel.cartAdds > 0 ? Math.round((funnel.purchases / funnel.cartAdds) * 100) : 0,
                    color: 'bg-pink-500/30 text-pink-300 border-pink-500/20'
                  }
                ].map((item, idx) => (
                  <div key={item.step} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 font-semibold">{item.step}</span>
                      <span className="text-slate-450">
                        {item.count.toLocaleString()} units{' '}
                        {idx > 0 && <span className="text-indigo-400">({item.pct}% of prev)</span>}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-900 border border-slate-850 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-indigo-500`}
                        style={{ width: `${Math.max(item.pct, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Keyword gaps (zero results searches) */}
            <section className="rounded-2xl border border-dashed border-rose-500/20 bg-rose-500/5 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-rose-500/10 pb-3">
                <SearchX className="h-4.5 w-4.5 text-rose-400" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono">
                    Catalog Keyword Gaps
                  </h3>
                  <p className="text-[10px] text-slate-550">
                    Search terms returning zero results (Stock Opportunities)
                  </p>
                </div>
              </div>

              {data?.zeroResultKeywords.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
                  <p className="text-xs text-slate-550">No search query gaps reported.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {data?.zeroResultKeywords.map((gap, idx) => (
                    <div
                      key={gap.query}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-900"
                    >
                      <div>
                        <span className="text-xs text-slate-300 font-bold">&ldquo;{gap.query}&rdquo;</span>
                        <span className="text-[10px] text-slate-550 block font-mono">Rank #{idx + 1}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
                        {gap.count} hits
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Keywords search counts */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Compass className="h-4.5 w-4.5 text-indigo-400" />
                <span>Top Customer Keyword Matches</span>
              </h3>
              <span className="text-[9px] font-mono text-slate-550 uppercase">Impressions</span>
            </div>

            {data?.topKeywords.length === 0 ? (
              <div className="text-center py-12 text-slate-550 text-xs font-mono">
                No matching keyword searches logged yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data?.topKeywords.map((kw, i) => (
                  <div
                    key={kw.query}
                    className="flex items-center justify-between rounded-xl p-4 bg-slate-950 border border-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">#{i + 1}</span>
                      <span className="text-xs font-semibold text-slate-200">&ldquo;{kw.query}&rdquo;</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-550/15">
                      {kw.count} queries
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AI Tips for inventory optimization */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 flex items-start gap-4">
            <Sparkles className="h-6 w-6 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-slate-200">Catalog Conversion Actions</h4>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-400 list-disc list-inside">
                <li>
                  Check the <strong className="text-rose-400 font-medium">Catalog Keyword Gaps</strong> list:
                  these represent items customers searched for but could not find. Adding matching inventory will drive direct sales.
                </li>
                <li>
                  If <strong className="text-indigo-400 font-medium">CTR is low</strong>, consider upgrading product photos, enhancing search tags, or adjusting pricing thresholds.
                </li>
                <li>
                  Use high-converting keywords in your product titles and descriptions to boost match relevance scoring.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
