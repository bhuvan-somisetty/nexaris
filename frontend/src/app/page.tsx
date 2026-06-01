'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { RecommendationShelf } from '../components/RecommendationShelf';
import {
  Shield, Key, Database, RefreshCw, ArrowRight, CheckCircle2, User, Store,
  ChevronRight, Layers,
} from 'lucide-react';
import {
  getHomeRecommendations, getCategoryRecommendations, RecommendedProduct,
} from '../lib/api';

interface CategoryRec {
  categoryId: string;
  name: string;
  slug: string;
  reason: string;
  score: number;
}

export default function Home() {
  const { user } = useAuth();
  const [personalized, setPersonalized] = useState<RecommendedProduct[]>([]);
  const [trending, setTrending] = useState<RecommendedProduct[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecommendedProduct[]>([]);
  const [categories, setCategories] = useState<CategoryRec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const [home, cats] = await Promise.all([
          getHomeRecommendations(),
          getCategoryRecommendations(8),
        ]);
        setPersonalized(home.personalized);
        setTrending(home.trending);
        setRecentlyViewed(home.recentlyViewed);
        setCategories(cats);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-16 sm:py-24 relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center space-x-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-3 py-1 text-xs text-indigo-400 font-mono tracking-wider uppercase mb-6 shadow-sm shadow-indigo-500/10">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Phase 11 — AI Recommendation Engine Active</span>
          </div>

          <h1 className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent leading-none">
            Nexaris Ecosystem
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
            A highly-scalable, modular multi-vendor commerce platform with AI-powered personalized recommendations, real-time analytics, and enterprise-grade infrastructure.
          </p>

          {/* CTA / User Card */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-left">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700">
                      {user.role === 'ADMIN' && <Shield className="h-6 w-6 text-purple-400" />}
                      {user.role === 'SELLER' && <Store className="h-6 w-6 text-indigo-400" />}
                      {user.role === 'CUSTOMER' && <User className="h-6 w-6 text-emerald-400" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100">
                        {user.profile?.firstName} {user.profile?.lastName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono tracking-wide">{user.email}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-800/60 border border-slate-700 px-2.5 py-0.5 text-[10px] font-mono tracking-widest text-slate-300 uppercase">
                    {user.role}
                  </span>
                </div>
                <div className="mt-6 border-t border-slate-800/60 pt-4 flex justify-between items-center">
                  <Link href="/products" className="inline-flex items-center space-x-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Browse Products</span>
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link href="/admin/dashboard" className="inline-flex items-center space-x-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                      <span>Enter Admin Portal</span><ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                  {user.role === 'SELLER' && (
                    <Link href="/seller/dashboard" className="inline-flex items-center space-x-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                      <span>Enter Seller Portal</span><ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                  {user.role === 'CUSTOMER' && (
                    <Link href="/profile" className="inline-flex items-center space-x-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                      <span>View My Profile</span><ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link href="/register" className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 font-semibold text-white shadow-xl shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200">
                  Create Account
                </Link>
                <Link href="/login" className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 px-6 font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mx-auto max-w-6xl mt-24 grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10 px-4 sm:px-6">
          {[
            { icon: Shield, color: 'indigo', label: 'Modular Monolith', desc: 'Clean directory separation using npm workspaces, allowing decoupled frontend and backend modules.' },
            { icon: Database, color: 'emerald', label: 'PostgreSQL & Prisma', desc: 'Highly relational database schema supporting users, addresses, audit logs, and notifications.' },
            { icon: Key, color: 'purple', label: 'JWT & Encryption', desc: 'Passwords securely hashed via bcrypt. Safe access JWTs passed through authorization headers.' },
            { icon: RefreshCw, color: 'rose', label: 'Token Rotation', desc: 'Persisted refresh token flow with automatic sliding-window rotation and secure revocation on log out.' },
          ].map(({ icon: Icon, color, label, desc }) => (
            <div key={label} className="rounded-2xl border border-slate-900 bg-slate-950 p-6 shadow-sm hover:border-slate-800 transition-all duration-200 group">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-500/10 border border-${color}-500/20 text-${color}-400 mb-4 group-hover:bg-${color}-500/20 transition-all duration-200`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">{label}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Recommendation Sections ── */}
        <div className="mx-auto max-w-7xl mt-20 w-full space-y-14 relative z-10 px-4 sm:px-6">

          {/* Recommended Categories */}
          {(loading || categories.length > 0) && (
            <section>
              <h2 className="text-lg font-bold text-slate-100 mb-4">Explore Categories</h2>
              <div className="flex flex-wrap gap-2">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-8 w-24 bg-slate-800/50 rounded-full animate-pulse" />
                    ))
                  : categories.map((cat) => (
                      <Link
                        key={cat.categoryId}
                        href={`/products?category=${cat.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/50 bg-slate-900/50 px-4 py-1.5 text-sm text-slate-300 hover:border-indigo-500/40 hover:text-white hover:bg-slate-800 transition-all duration-200 group"
                      >
                        {cat.name}
                        <ChevronRight className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
              </div>
            </section>
          )}

          {/* Personalized For You */}
          <RecommendationShelf
            title="Recommended For You"
            subtitle="Personalized based on your browsing history"
            products={personalized}
            recommendationType="PERSONALIZED"
            icon="sparkles"
            accentColor="indigo"
            loading={loading}
          />

          {/* Trending Now */}
          <RecommendationShelf
            title="Trending Now"
            subtitle="Most popular products across Nexaris this week"
            products={trending}
            recommendationType="TRENDING"
            icon="trending"
            accentColor="purple"
            loading={loading}
          />

          {/* Recently Viewed */}
          {(recentlyViewed.length > 0 || loading) && (
            <RecommendationShelf
              title="Recently Viewed"
              subtitle="Pick up where you left off"
              products={recentlyViewed}
              recommendationType="RECENTLY_VIEWED"
              icon="eye"
              accentColor="emerald"
              loading={loading}
            />
          )}
        </div>
      </main>

      <footer className="w-full border-t border-slate-900 py-6 text-center text-xs text-slate-600 bg-slate-950">
        <p>&copy; {new Date().getFullYear()} Nexaris Commerce Inc. Built with Next.js 15 & NestJS.</p>
      </footer>
    </>
  );
}
