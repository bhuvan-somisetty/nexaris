'use client';

import React, { useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star, Sparkles, TrendingUp, Eye, ShoppingCart } from 'lucide-react';
import { RecommendedProduct, logRecommendationEvent } from '../lib/api';

interface RecommendationShelfProps {
  title: string;
  subtitle?: string;
  products: RecommendedProduct[];
  recommendationType: string;
  icon?: 'sparkles' | 'trending' | 'eye';
  accentColor?: 'indigo' | 'purple' | 'emerald' | 'rose' | 'amber';
  loading?: boolean;
  onAddToCart?: (product: RecommendedProduct) => void;
}

const ICONS = {
  sparkles: Sparkles,
  trending: TrendingUp,
  eye: Eye,
};

const ACCENT_STYLES = {
  indigo: {
    badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    btn: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/20',
    icon: 'text-indigo-400',
    glow: 'from-indigo-500/5',
    scrollBtn: 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 text-indigo-300',
  },
  purple: {
    badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    btn: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/20',
    icon: 'text-purple-400',
    glow: 'from-purple-500/5',
    scrollBtn: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 text-purple-300',
  },
  emerald: {
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    btn: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
    icon: 'text-emerald-400',
    glow: 'from-emerald-500/5',
    scrollBtn: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-300',
  },
  rose: {
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    btn: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/20',
    icon: 'text-rose-400',
    glow: 'from-rose-500/5',
    scrollBtn: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-300',
  },
  amber: {
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    btn: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20',
    icon: 'text-amber-400',
    glow: 'from-amber-500/5',
    scrollBtn: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-300',
  },
};

function ProductCard({
  product,
  recommendationType,
  accent,
  onAddToCart,
}: {
  product: RecommendedProduct;
  recommendationType: string;
  accent: typeof ACCENT_STYLES['indigo'];
  onAddToCart?: (p: RecommendedProduct) => void;
}) {
  const handleClick = useCallback(() => {
    logRecommendationEvent(recommendationType, product.id, 'CLICK');
  }, [recommendationType, product.id]);

  return (
    <Link
      href={`/products/${product.slug}`}
      onClick={handleClick}
      className="flex-shrink-0 w-48 sm:w-56 group relative rounded-2xl border border-slate-800/60 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-300 overflow-hidden backdrop-blur-sm"
    >
      {/* Product image */}
      <div className="relative h-40 bg-slate-800/50 overflow-hidden">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <ShoppingCart className="h-10 w-10 opacity-30" />
          </div>
        )}
        {/* Reason badge */}
        <div className={`absolute bottom-2 left-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full border backdrop-blur-sm truncate ${accent.badge}`}>
          {product.reason}
        </div>
      </div>

      {/* Product info */}
      <div className="p-3 space-y-1">
        <p className="text-[10px] text-slate-500 truncate">{product.category.name}</p>
        <h4 className="text-sm font-semibold text-slate-200 leading-tight line-clamp-2 group-hover:text-white transition-colors">
          {product.name}
        </h4>

        {/* Rating */}
        {product.rating !== undefined && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            <span className="text-[11px] text-slate-400">{product.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Price and add to cart */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-bold text-slate-100">
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          {onAddToCart && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product);
              }}
              className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all duration-200 ${accent.btn}`}
            >
              + Cart
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-48 sm:w-56 rounded-2xl border border-slate-800/40 bg-slate-900/30 overflow-hidden animate-pulse">
      <div className="h-40 bg-slate-800/50" />
      <div className="p-3 space-y-2">
        <div className="h-2 w-16 bg-slate-800 rounded" />
        <div className="h-3 w-full bg-slate-800 rounded" />
        <div className="h-3 w-3/4 bg-slate-800 rounded" />
        <div className="h-4 w-20 bg-slate-800 rounded" />
      </div>
    </div>
  );
}

export function RecommendationShelf({
  title,
  subtitle,
  products,
  recommendationType,
  icon = 'sparkles',
  accentColor = 'indigo',
  loading = false,
  onAddToCart,
}: RecommendationShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const accent = ACCENT_STYLES[accentColor];
  const Icon = ICONS[icon];

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' });
  };

  if (!loading && products.length === 0) return null;

  return (
    <section className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700/50 ${accent.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>

        {/* Scroll buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-all duration-200 ${accent.scrollBtn}`}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-all duration-200 ${accent.scrollBtn}`}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable track */}
      <div className="relative">
        {/* Left fade gradient */}
        <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r ${accent.glow} to-transparent z-10 pointer-events-none`} />
        {/* Right fade gradient */}
        <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l ${accent.glow} to-transparent z-10 pointer-events-none`} />

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  recommendationType={recommendationType}
                  accent={accent}
                  onAddToCart={onAddToCart}
                />
              ))}
        </div>
      </div>
    </section>
  );
}
