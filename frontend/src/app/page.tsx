'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { RecommendationShelf } from '../components/RecommendationShelf';
import {
  Search, Smartphone, Laptop, Shirt, BookOpen, Headphones,
  ShoppingBag, ChevronRight, ArrowRight, Star, Clock, Zap, Truck,
} from 'lucide-react';
import {
  getHomeRecommendations, getCategoryRecommendations, searchProducts,
  RecommendedProduct,
} from '../lib/api';

interface CategoryRec {
  categoryId: string;
  name: string;
  slug: string;
  reason: string;
  score: number;
}

interface DealProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  category: string;
  brand: string;
  rating: number | null;
  reviewCount: number;
}

// ── Rotating hero promo slides ──────────────────────────────────────────────
const HERO_SLIDES = [
  { tag: 'Electronics Sale', title: 'Top tech, unreal prices', subtitle: 'Phones, laptops & gadgets up to 40% off', cta: 'Shop Electronics', href: '/products?q=electronics' },
  { tag: 'Fashion Week', title: 'Style that speaks for you', subtitle: 'New-season apparel, footwear & accessories', cta: 'Explore Fashion', href: '/products?q=fashion' },
  { tag: 'Home & Kitchen', title: 'Upgrade every corner', subtitle: 'Furniture, appliances & décor deals', cta: 'Shop Home', href: '/products?q=home' },
  { tag: 'Mega Deals', title: 'Save big, every day', subtitle: 'Thousands of products from ₹1 to ₹5,00,000', cta: 'Browse All', href: '/products' },
];

// ── Map a category name to an icon ──────────────────────────────────────────
function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('phone') || n.includes('mobile')) return Smartphone;
  if (n.includes('laptop') || n.includes('computer')) return Laptop;
  if (n.includes('book')) return BookOpen;
  if (n.includes('fashion') || n.includes('apparel') || n.includes('men') || n.includes('cloth')) return Shirt;
  if (n.includes('electronic') || n.includes('audio')) return Headphones;
  return ShoppingBag;
}

function inr(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// ── Countdown to end of day for Deals of the Day ────────────────────────────
function useEndOfDayCountdown() {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      let diff = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(diff / 3.6e6); diff -= h * 3.6e6;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1000);
      setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return remaining;
}

function deliveryEstimate(seed: string) {
  // Deterministic 2–4 day estimate so SSR/CSR agree
  const days = 2 + (seed.charCodeAt(0) % 3);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function DealCard({ p }: { p: DealProduct }) {
  const hasDiscount = p.originalPrice !== null && p.originalPrice > p.price;
  const discount = hasDiscount ? Math.round((1 - p.price / (p.originalPrice as number)) * 100) : 0;
  return (
    <Link
      href={`/products/${p.slug}`}
      className="flex-shrink-0 w-52 sm:w-60 group rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:shadow-xl hover:shadow-black/30 transition-all duration-200 overflow-hidden"
    >
      <div className="relative h-44 bg-slate-800/40 overflow-hidden">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-600"><ShoppingBag className="h-10 w-10 opacity-30" /></div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            {discount}% OFF
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-slate-500 truncate">{p.brand} · {p.category}</p>
        <h4 className="text-sm font-semibold text-slate-100 leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-white">{p.name}</h4>
        {p.rating !== null && (
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {p.rating.toFixed(1)} <Star className="h-2.5 w-2.5 fill-white" />
            </span>
            <span className="text-[10px] text-slate-500">({p.reviewCount.toLocaleString('en-IN')})</span>
          </div>
        )}
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-base font-bold text-slate-100">{inr(p.price)}</span>
          {hasDiscount && <span className="text-xs text-slate-500 line-through">{inr(p.originalPrice as number)}</span>}
        </div>
        <p className="flex items-center gap-1 text-[10px] text-slate-400"><Truck className="h-3 w-3 text-emerald-400" /> Free delivery by {deliveryEstimate(p.id)}</p>
      </div>
    </Link>
  );
}

export default function Home() {
  const router = useRouter();
  const [personalized, setPersonalized] = useState<RecommendedProduct[]>([]);
  const [trending, setTrending] = useState<RecommendedProduct[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecommendedProduct[]>([]);
  const [categories, setCategories] = useState<CategoryRec[]>([]);
  const [deals, setDeals] = useState<DealProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [query, setQuery] = useState('');
  const dealsRef = useRef<HTMLDivElement>(null);
  const countdown = useEndOfDayCountdown();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [home, cats, search] = await Promise.all([
          getHomeRecommendations(),
          getCategoryRecommendations(8),
          searchProducts({ limit: 50 }),
        ]);
        setPersonalized(home.personalized);
        setTrending(home.trending);
        setRecentlyViewed(home.recentlyViewed);
        setCategories(cats);

        const seen = new Set<string>();
        const mapped: DealProduct[] = [];
        for (const item of search.products) {
          const pr = item.product;
          const op = pr.originalPrice ? Number(pr.originalPrice) : null;
          const price = Number(pr.price);
          if (!op || op <= price) continue;
          const key = (pr.images?.[0]?.url || pr.name).toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          const reviews = pr.reviews || [];
          const avg = reviews.length ? reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length : null;
          mapped.push({
            id: pr.id,
            name: pr.name,
            slug: pr.slug,
            price,
            originalPrice: op,
            image: pr.images?.[0]?.url || null,
            category: pr.category?.name || '',
            brand: pr.attributes?.find((a: any) => a.name === 'Brand')?.value || 'Nexaris',
            rating: avg,
            reviewCount: reviews.length,
          });
        }
        mapped.sort((a, b) => (1 - a.price / (a.originalPrice as number) < 1 - b.price / (b.originalPrice as number) ? 1 : -1));
        setDeals(mapped.slice(0, 12));
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-rotate hero slides
  useEffect(() => {
    const id = setInterval(() => setHeroIndex((i) => (i + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  // De-duplicated, distinct rows for the two recommendation shelves
  const { personalizedRow, trendingRow } = useMemo(() => {
    const keyOf = (p: RecommendedProduct) => (p.image || p.name.split(' - ')[0] || p.name).trim().toLowerCase();
    const seen = new Set<string>();
    const pool: RecommendedProduct[] = [];
    for (const p of [...personalized, ...trending]) {
      const k = keyOf(p);
      if (!seen.has(k)) { seen.add(k); pool.push(p); }
    }
    const half = Math.ceil(pool.length / 2);
    return { personalizedRow: pool.slice(0, half), trendingRow: pool.slice(half) };
  }, [personalized, trending]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/products?q=${encodeURIComponent(query.trim())}` : '/products');
  };

  const slide = HERO_SLIDES[heroIndex];

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white">

        {/* ── Hero with looping video background + rotating promos ── */}
        <section className="relative h-[78vh] min-h-[520px] w-full overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay muted loop playsInline preload="auto"
          >
            <source src="/hero-loop.mp4" type="video/mp4" />
          </video>
          {/* Lighter overlays: keep text readable on the left, let the video show on the right */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/25 to-transparent" />

          <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5 text-amber-400" /> {slide.tag}
              </span>
              <h1 key={slide.title} className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl animate-in fade-in slide-in-from-bottom-3 duration-500">
                {slide.title}
              </h1>
              <p className="mt-4 max-w-xl text-lg text-slate-300">{slide.subtitle}</p>

              {/* Search bar */}
              <form onSubmit={submitSearch} className="mt-8 flex max-w-xl items-center overflow-hidden rounded-xl bg-white shadow-2xl">
                <Search className="ml-4 h-5 w-5 shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for phones, laptops, fashion and more…"
                  className="w-full bg-transparent px-3 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                <button type="submit" className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 font-semibold text-white hover:from-indigo-700 hover:to-purple-700 transition-colors">
                  Search
                </button>
              </form>

              <div className="mt-5 flex items-center gap-3">
                <Link href={slide.href} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-amber-300 transition-colors">
                  {slide.cta} <ArrowRight className="h-4 w-4" />
                </Link>
                {/* Slide indicators */}
                <div className="flex gap-1.5">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setHeroIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === heroIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">

          {/* ── Categories grid ── */}
          <section>
            <h2 className="mb-5 text-xl font-bold text-slate-100">Shop by Category</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-900/60" />)
                : categories.map((cat) => {
                    const Icon = categoryIcon(cat.name);
                    return (
                      <Link
                        key={cat.categoryId}
                        href={`/products?categoryId=${cat.categoryId}`}
                        className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-center hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-200"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-medium text-slate-200 line-clamp-2 leading-tight">{cat.name}</span>
                      </Link>
                    );
                  })}
            </div>
          </section>

          {/* ── Deals of the Day ── */}
          {(loading || deals.length > 0) && (
            <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950 p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Deals of the Day</h2>
                    <p className="text-xs text-slate-500">Limited-time offers — grab them before they’re gone</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Ends in</span>
                  <span className="rounded-md bg-slate-800 px-2.5 py-1 font-mono font-bold tracking-widest text-amber-400">{countdown || '00:00:00'}</span>
                </div>
              </div>
              <div ref={dealsRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 w-52 shrink-0 animate-pulse rounded-xl bg-slate-900/60 sm:w-60" />)
                  : deals.map((p) => <DealCard key={p.id} p={p} />)}
              </div>
            </section>
          )}

          {/* ── Explore Categories chips ── */}
          {(loading || categories.length > 0) && (
            <section>
              <div className="flex flex-wrap gap-2">
                {!loading && categories.map((cat) => (
                  <Link
                    key={cat.categoryId}
                    href={`/products?categoryId=${cat.categoryId}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/50 bg-slate-900/50 px-4 py-1.5 text-sm text-slate-300 hover:border-indigo-500/40 hover:bg-slate-800 hover:text-white transition-all duration-200 group"
                  >
                    {cat.name}
                    <ChevronRight className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Trending Now ── */}
          <RecommendationShelf
            title="Trending Now"
            subtitle="Most popular products across Nexaris this week"
            products={trendingRow}
            recommendationType="TRENDING"
            icon="trending"
            accentColor="purple"
            loading={loading}
          />

          {/* ── Recommended For You ── */}
          <RecommendationShelf
            title="Recommended For You"
            subtitle="Picked for you based on what shoppers love"
            products={personalizedRow}
            recommendationType="PERSONALIZED"
            icon="sparkles"
            accentColor="indigo"
            loading={loading}
          />

          {/* ── Recently Viewed ── */}
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

      <footer className="w-full border-t border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <h4 className="mb-3 text-sm font-bold text-slate-200">Shop</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/products" className="hover:text-slate-300">All Products</Link></li>
                <li><Link href="/products?q=electronics" className="hover:text-slate-300">Electronics</Link></li>
                <li><Link href="/products?q=fashion" className="hover:text-slate-300">Fashion</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-slate-200">Account</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/profile" className="hover:text-slate-300">My Account</Link></li>
                <li><Link href="/orders" className="hover:text-slate-300">My Orders</Link></li>
                <li><Link href="/wishlist" className="hover:text-slate-300">Wishlist</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-slate-200">Help</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/cart" className="hover:text-slate-300">Your Cart</Link></li>
                <li><span className="cursor-default">Shipping &amp; Returns</span></li>
                <li><span className="cursor-default">Customer Support</span></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-bold text-slate-200">Sell</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/register" className="hover:text-slate-300">Become a Seller</Link></li>
                <li><Link href="/seller/dashboard" className="hover:text-slate-300">Seller Portal</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-900 pt-6 text-center text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Nexaris Commerce — Your trusted online marketplace.
          </div>
        </div>
      </footer>
    </>
  );
}
