'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Store, Package, ChevronRight, BadgeCheck } from 'lucide-react';
import { searchProducts } from '../../lib/api';

interface SellerCard {
  id: string;
  name: string;
  productCount: number;
  categories: string[];
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<SellerCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await searchProducts({ limit: 200 });
        const map = new Map<string, { id: string; name: string; count: number; cats: Set<string> }>();
        for (const item of res.products) {
          const s = item.product.seller;
          if (!s) continue;
          const name = s.sellerProfile?.storeName || 'Nexaris Seller';
          const key = s.id || name;
          if (!map.has(key)) map.set(key, { id: s.id, name, count: 0, cats: new Set() });
          const entry = map.get(key)!;
          entry.count += 1;
          if (item.product.category?.name) entry.cats.add(item.product.category.name);
        }
        const list = Array.from(map.values())
          .map((e) => ({ id: e.id, name: e.name, productCount: e.count, categories: Array.from(e.cats).slice(0, 3) }))
          .sort((a, b) => b.productCount - a.productCount);
        setSellers(list);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight">Our Sellers</h1>
            <p className="mt-2 text-slate-400">Trusted stores powering the Nexaris marketplace.</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-900/60" />)}
            </div>
          ) : sellers.length === 0 ? (
            <p className="text-slate-500">No sellers found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sellers.map((s) => (
                <Link
                  key={s.id}
                  href={`/products?sellerId=${s.id}`}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-2xl font-extrabold text-indigo-300">
                      {s.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-1.5 text-lg font-bold text-slate-100 group-hover:text-white truncate">
                        {s.name}
                        <BadgeCheck className="h-4 w-4 shrink-0 text-indigo-400" />
                      </h3>
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Package className="h-3.5 w-3.5" /> {s.productCount}+ products
                      </p>
                    </div>
                  </div>

                  {s.categories.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {s.categories.map((c) => (
                        <span key={c} className="rounded-full border border-slate-700/60 bg-slate-800/40 px-2.5 py-0.5 text-[11px] text-slate-300">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-slate-800/60 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                      <Store className="h-3.5 w-3.5 text-indigo-400" /> Verified Store
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-indigo-400 group-hover:text-indigo-300">
                      Visit store <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
