'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, Clock } from 'lucide-react';
import { getAutocompleteSuggestions, getTrendingSearches } from '../lib/api';

export const SearchBar: React.FC<{ className?: string }> = ({ className = '' }) => {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // Trending searches (shown when the box is empty)
  useEffect(() => {
    getTrendingSearches()
      .then((r) => setTrending((r.queries || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      getAutocompleteSuggestions(q.trim())
        .then((r) => setSuggestions((r.suggestions || []).slice(0, 8)))
        .catch(() => setSuggestions([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (term: string) => {
    const v = term.trim();
    setOpen(false);
    setActive(-1);
    router.push(v ? `/products?q=${encodeURIComponent(v)}` : '/products');
  };

  const list = q.trim() ? suggestions : trending;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(active >= 0 && list[active] ? list[active] : q); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form
        onSubmit={(e) => { e.preventDefault(); go(active >= 0 && list[active] ? list[active] : q); }}
        className="flex items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900/80 focus-within:border-indigo-500 transition-colors"
      >
        <Search className="ml-3 h-4 w-4 shrink-0 text-slate-500" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search products, brands and categories…"
          className="w-full bg-transparent px-2.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        <button type="submit" className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-700 transition-colors">
          Search
        </button>
      </form>

      {open && list.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
          {!q.trim() && (
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Trending searches</div>
          )}
          <ul className="max-h-80 overflow-y-auto py-1">
            {list.map((s, i) => (
              <li key={s + i}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); go(s); }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${i === active ? 'bg-slate-900 text-white' : 'text-slate-300 hover:bg-slate-900'}`}
                >
                  {q.trim() ? <Search className="h-3.5 w-3.5 text-slate-500" /> : <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />}
                  <span className="truncate">{s}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
