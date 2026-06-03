'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import {
  searchProducts,
  getAutocompleteSuggestions,
  getTrendingSearches,
  getSearchHistory,
  deleteSearchHistory,
  logSearchClick,
  getSearchRecovery,
  trackUserActivity,
  api
} from '@/lib/api';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  ArrowUpDown,
  ChevronLeft,
  Loader2,
  PackageX,
  Sparkles,
  Heart,
  TrendingUp,
  History,
  X,
  Check,
  Trash2,
  Star,
  CheckSquare,
  Square
} from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  originalPrice?: string | null;
  images: Array<{ url: string; altText?: string }>;
  category: { name: string };
  seller: { sellerProfile?: { storeName: string } };
  inventory?: { quantity: number };
  attributes?: Array<{ name: string; value: string }>;
  reviews?: Array<{ rating: number }>;
}

interface ScoredProduct {
  product: Product;
  score: number;
  stockMultiplier: number;
}

interface Facets {
  brands: Array<{ name: string; count: number }>;
  categories: Array<{ name: string; count: number }>;
  priceRange: { min: number; max: number };
  availabilityCount: number;
}

function DiscoveryContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  // Search Param Inputs
  const initialQ = searchParams.get('q') || '';
  const initialCategory = searchParams.get('categoryId') || '';
  const initialBrand = searchParams.get('brand') || '';
  const initialMinPrice = searchParams.get('minPrice') || '';
  const initialMaxPrice = searchParams.get('maxPrice') || '';
  const initialInStock = searchParams.get('inStock') === 'true';
  const initialRating = searchParams.get('rating') ? Number(searchParams.get('rating')) : 0;
  const initialPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;

  // Primary States
  const [search, setSearch] = useState(initialQ);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQ);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? initialCategory.split(',').filter(Boolean) : []
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    initialBrand ? initialBrand.split(',').filter(Boolean) : []
  );
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [inStockOnly, setInStockOnly] = useState(initialInStock);
  const [selectedRating, setSelectedRating] = useState(initialRating);
  const [page, setPage] = useState(initialPage);
  const [sortBy, setSortBy] = useState('relevance');

  // API Responses
  const [products, setProducts] = useState<ScoredProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Facets>({
    brands: [],
    categories: [],
    priceRange: { min: 0, max: 0 },
    availabilityCount: 0
  });
  const [isFuzzyFallback, setIsFuzzyFallback] = useState(false);
  const [noResultsRecovery, setNoResultsRecovery] = useState(false);
  const [searchQueryLogId, setSearchQueryLogId] = useState<string | null>(null);

  // Recovery Feed Data
  const [recoveryData, setRecoveryData] = useState<{
    trendingProducts: any[];
    categories: any[];
    recommendations: any[];
  } | null>(null);

  // Suggestions Overlay
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trendingQueries, setTrendingQueries] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [wishlistTogglingId, setWishlistTogglingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync Search Query Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Autocomplete Suggestions
  useEffect(() => {
    if (debouncedSearch.trim().length >= 2) {
      getAutocompleteSuggestions(debouncedSearch.trim())
        .then((res) => setSuggestions(res.suggestions))
        .catch(() => setSuggestions([]));
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearch]);

  // Load History and Trending terms
  const loadHistoryAndTrending = useCallback(async () => {
    try {
      const trendingRes = await getTrendingSearches();
      setTrendingQueries(trendingRes.queries);
      if (user) {
        const histRes = await getSearchHistory();
        setSearchHistory(histRes.history);
      }
    } catch (err) {
      console.warn('Failed to load history or trending items:', err);
    }
  }, [user]);

  useEffect(() => {
    loadHistoryAndTrending();
  }, [loadHistoryAndTrending]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update URL Query Parameters
  const updateUrlParams = useCallback((updated: Record<string, any>) => {
    const nextParams = new URLSearchParams(window.location.search);
    Object.entries(updated).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '' || val === false || (Array.isArray(val) && val.length === 0)) {
        nextParams.delete(key);
      } else if (Array.isArray(val)) {
        nextParams.set(key, val.join(','));
      } else {
        nextParams.set(key, String(val));
      }
    });
    router.push(`/products?${nextParams.toString()}`, { scroll: false });
  }, [router]);

  // Query search API
  const fetchSearchResults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await searchProducts({
        q: debouncedSearch,
        categoryId: selectedCategories.join(','),
        brand: selectedBrands.join(','),
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        inStock: inStockOnly,
        rating: selectedRating || undefined,
        page,
        limit: 9
      });

      setProducts(res.products);
      setTotal(res.total);
      setFacets(res.facets);
      setIsFuzzyFallback(res.isFuzzyFallback);
      setNoResultsRecovery(res.noResultsRecovery);
      setSearchQueryLogId(res.searchQueryLogId || null);

      if (res.noResultsRecovery) {
        // Trigger recovery items load
        const recData = await getSearchRecovery();
        setRecoveryData(recData);
      } else {
        setRecoveryData(null);
      }

      // Track user search/category view analytics
      if (debouncedSearch) {
        trackUserActivity('SEARCH', undefined, { query: debouncedSearch });
      }
      if (selectedCategories.length === 1) {
        trackUserActivity('VIEW', undefined, { categoryId: selectedCategories[0] });
      }
    } catch (err) {
      console.error('Failed to query catalog search products:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategories, selectedBrands, minPrice, maxPrice, inStockOnly, selectedRating, page]);

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  // Trigger search URL parameters update
  useEffect(() => {
    updateUrlParams({
      q: debouncedSearch,
      categoryId: selectedCategories,
      brand: selectedBrands,
      minPrice,
      maxPrice,
      inStock: inStockOnly,
      rating: selectedRating || undefined,
      page
    });
  }, [debouncedSearch, selectedCategories, selectedBrands, minPrice, maxPrice, inStockOnly, selectedRating, page, updateUrlParams]);

  // Reset pagination on filter alterations
  const handleCategoryToggle = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
    setPage(1);
  };

  const handleBrandToggle = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setMinPrice('');
    setMaxPrice('');
    setSelectedRating(0);
    setInStockOnly(false);
    setSearch('');
    setPage(1);
  };

  // Autocomplete click triggers
  const handleQuerySelect = (term: string) => {
    setSearch(term);
    setIsFocused(false);
    setPage(1);
  };

  // Search history log clearing
  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteSearchHistory(id);
      loadHistoryAndTrending();
    } catch (err) {
      console.warn('Failed to delete history item:', err);
    }
  };

  // Click tracking
  const handleProductCardClick = async (productId: string) => {
    if (searchQueryLogId) {
      try {
        await logSearchClick(searchQueryLogId, productId);
      } catch (err) {
        console.warn('Conversion log tracking click fail:', err);
      }
    }
  };

  const handleWishlistToggle = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please sign in to save items to your wishlist.');
      return;
    }
    const wishlistItem = wishlist?.items.find((item) => item.productId === productId);
    setWishlistTogglingId(productId);
    if (wishlistItem) {
      await removeFromWishlist(wishlistItem.id);
    } else {
      await addToWishlist(productId, null);
    }
    setTimeout(() => setWishlistTogglingId(null), 300);
  };

  const totalPages = Math.ceil(total / 9) || 1;

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="mx-auto max-w-7xl relative z-10">
          {/* Headline & Search bar row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-slate-900 pb-6 gap-4">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono mb-2 uppercase tracking-widest">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                <span>Search & Discovery Catalog</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Discovery Center
              </h1>
            </div>

            {/* Smart Search Autocomplete input */}
            <div className="relative w-full md:w-96" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search products, brands, tech..."
                  value={search}
                  onFocus={() => setIsFocused(true)}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-lg shadow-black/20"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-3 text-slate-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Suggestions Overlay Dropdown */}
              {isFocused && (
                <div className="absolute right-0 mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {suggestions.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono pb-1 border-b border-slate-900">
                        Matching Suggestions
                      </h4>
                      <div className="space-y-1">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleQuerySelect(s)}
                            className="w-full flex items-center space-x-2 text-left px-2.5 py-2 rounded-xl text-xs hover:bg-slate-900/60 text-slate-350 hover:text-white transition-colors"
                          >
                            <Search className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{s}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Search History */}
                      {user && searchHistory.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono pb-1 border-b border-slate-900">
                            Recent Searches
                          </h4>
                          <div className="space-y-0.5 max-h-36 overflow-y-auto">
                            {searchHistory.map((item) => (
                              <div
                                key={item.id}
                                className="group/item flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-900/50"
                              >
                                <button
                                  onClick={() => handleQuerySelect(item.query)}
                                  className="flex items-center space-x-2 text-left text-slate-300 hover:text-white flex-1 transition-colors"
                                >
                                  <History className="h-3.5 w-3.5 text-slate-500" />
                                  <span>{item.query}</span>
                                </button>
                                <button
                                  onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                                  className="text-slate-650 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                  title="Delete historical term"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trending queries */}
                      {trendingQueries.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono pb-1 border-b border-slate-900">
                            Trending Queries
                          </h4>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {trendingQueries.map((term) => (
                              <button
                                key={term}
                                onClick={() => handleQuerySelect(term)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/80 text-[10px] font-mono text-slate-300 hover:border-indigo-500/40 hover:text-white hover:bg-slate-800 transition-all"
                              >
                                <TrendingUp className="h-3 w-3 text-indigo-400" />
                                <span>{term}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fuzzy correction match warning banner */}
          {isFuzzyFallback && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-3.5 rounded-2xl flex items-center space-x-3 text-sm font-medium mb-8 shadow-lg shadow-amber-500/5">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
              <span>
                No exact match results for your search. Showing typo-corrected products instead.
              </span>
            </div>
          )}

          {/* Core Page Grid */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <aside className="w-full lg:w-64 shrink-0 space-y-6">
              {/* Filter controls headers */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">
                  Filters Sidebar
                </span>
                {(selectedCategories.length > 0 ||
                  selectedBrands.length > 0 ||
                  minPrice ||
                  maxPrice ||
                  selectedRating > 0 ||
                  inStockOnly ||
                  search) && (
                  <button
                    onClick={handleClearFilters}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Categories Facets list */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono border-b border-slate-900 pb-2">
                  Category Facets
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {facets.categories.length === 0 ? (
                    <span className="text-xs text-slate-600 block">No category counts</span>
                  ) : (
                    facets.categories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.name);
                      return (
                        <button
                          key={cat.name}
                          onClick={() => handleCategoryToggle(cat.name)}
                          className="w-full flex items-center justify-between text-left py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            {isSelected ? (
                              <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                            ) : (
                              <Square className="h-3.5 w-3.5 text-slate-700" />
                            )}
                            <span className={isSelected ? 'text-indigo-400 font-semibold' : ''}>
                              {cat.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-650">({cat.count})</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Brands Checklist Facets */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono border-b border-slate-900 pb-2">
                  Brand Facets
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {facets.brands.length === 0 ? (
                    <span className="text-xs text-slate-600 block">No brand counts</span>
                  ) : (
                    facets.brands.map((brand) => {
                      const isSelected = selectedBrands.includes(brand.name);
                      return (
                        <button
                          key={brand.name}
                          onClick={() => handleBrandToggle(brand.name)}
                          className="w-full flex items-center justify-between text-left py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            {isSelected ? (
                              <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                            ) : (
                              <Square className="h-3.5 w-3.5 text-slate-700" />
                            )}
                            <span className={isSelected ? 'text-indigo-400 font-semibold' : ''}>
                              {brand.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-650">({brand.count})</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Price Limits */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono border-b border-slate-900 pb-2">
                  Price Boundaries
                </h3>
                {facets.priceRange && (
                  <div className="text-[10px] text-slate-550 font-mono">
                    Found ranges: ₹{facets.priceRange.min} - ₹{facets.priceRange.max}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-mono block mb-1">Min</span>
                    <input
                      type="number"
                      placeholder="₹ Min"
                      value={minPrice}
                      onChange={(e) => {
                        setMinPrice(e.target.value);
                        setPage(1);
                      }}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-mono block mb-1">Max</span>
                    <input
                      type="number"
                      placeholder="₹ Max"
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value);
                        setPage(1);
                      }}
                      className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Star Rating Selects */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono border-b border-slate-900 pb-2">
                  Customer Ratings
                </h3>
                <div className="space-y-1">
                  {[4, 3, 2].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => {
                        setSelectedRating(selectedRating === stars ? 0 : stars);
                        setPage(1);
                      }}
                      className="w-full flex items-center justify-between text-xs py-1.5 hover:text-white text-slate-400"
                    >
                      <div className="flex items-center space-x-2">
                        {selectedRating === stars ? (
                          <div className="h-3 w-3 rounded-full bg-indigo-500" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-slate-700" />
                        )}
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`h-3 w-3 ${
                                idx < stars ? 'fill-amber-400 text-amber-400' : 'text-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={selectedRating === stars ? 'text-indigo-400 font-semibold' : ''}>
                          & above
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock Status toggle */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300 block font-mono">In Stock Only</span>
                  <span className="text-[10px] text-slate-550 block font-mono mt-0.5">
                    Available stock: {facets.availabilityCount} products
                  </span>
                </div>
                <button
                  onClick={() => {
                    setInStockOnly(!inStockOnly);
                    setPage(1);
                  }}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    inStockOnly ? 'bg-indigo-500' : 'bg-slate-900 border border-slate-850'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      inStockOnly ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </aside>

            {/* Catalog Grid Area */}
            <div className="flex-1 space-y-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-900 px-4 py-3 rounded-2xl">
                <span className="text-xs text-slate-500 font-mono">
                  Showing {products.length} of {total} items
                </span>

                <div className="flex items-center space-x-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="relevance">Sort: Relevance</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Main Content Render */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                  <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
                  <span className="text-xs font-mono">Indexing products matching query...</span>
                </div>
              ) : noResultsRecovery ? (
                /* Recovery Flow Widget */
                <div className="space-y-10">
                  <div className="text-center py-16 bg-slate-950/60 border border-dashed border-slate-900 rounded-3xl p-6">
                    <PackageX className="mx-auto h-12 w-12 text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-200">No matching items found</h3>
                    <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                      We couldn't find matches for your filters. Here are popular products and personalized recommendations based on your preferences.
                    </p>
                    <button
                      onClick={handleClearFilters}
                      className="mt-6 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white rounded-xl text-xs font-semibold text-slate-300 transition-colors"
                    >
                      Clear active search filters
                    </button>
                  </div>

                  {recoveryData && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      {/* Popular Categories */}
                      {recoveryData.categories?.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold font-mono text-slate-400 uppercase tracking-widest">
                            Explore Categories
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {recoveryData.categories.map((cat: any) => (
                              <button
                                key={cat.id}
                                onClick={() => handleCategoryToggle(cat.name)}
                                className="px-3.5 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs font-semibold hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all"
                              >
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Personalized Feed recommendations */}
                      {recoveryData.recommendations?.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-indigo-400" />
                            <span>Recommended For You</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {recoveryData.recommendations.map((p: any) => (
                              <Link
                                href={`/products/${p.slug}`}
                                key={p.id}
                                className="group flex flex-col bg-slate-900/30 rounded-xl border border-slate-900 overflow-hidden hover:border-slate-850 transition-colors"
                              >
                                <div className="aspect-video w-full bg-slate-950 overflow-hidden relative">
                                  {p.images?.[0] ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={p.images[0].url}
                                      alt={p.name}
                                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-700">
                                      No Image
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 space-y-1">
                                  <h5 className="text-xs font-bold text-slate-200 truncate group-hover:text-white">
                                    {p.name}
                                  </h5>
                                  <span className="text-[11px] font-mono text-indigo-400 font-bold">
                                    ₹{Number(p.price).toLocaleString()}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trending Catalog Items */}
                      {recoveryData.trendingProducts?.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4 text-purple-400" />
                            <span>Trending Products Now</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {recoveryData.trendingProducts.map((p: any) => (
                              <Link
                                href={`/products/${p.slug}`}
                                key={p.id}
                                className="group flex flex-col bg-slate-900/30 rounded-xl border border-slate-900 overflow-hidden hover:border-slate-850 transition-colors"
                              >
                                <div className="aspect-video w-full bg-slate-950 overflow-hidden relative">
                                  {p.images?.[0] ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={p.images[0].url}
                                      alt={p.name}
                                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-700">
                                      No Image
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 space-y-1">
                                  <h5 className="text-xs font-bold text-slate-200 truncate group-hover:text-white">
                                    {p.name}
                                  </h5>
                                  <span className="text-[11px] font-mono text-indigo-400 font-bold">
                                    ₹{Number(p.price).toLocaleString()}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20 border border-slate-900 rounded-3xl">
                  <PackageX className="mx-auto h-12 w-12 text-slate-700 mb-4" />
                  <h3 className="font-bold text-slate-350">Zero Matches</h3>
                  <p className="text-xs text-slate-500 mt-2">Adjust your price limits or selected brands.</p>
                </div>
              ) : (
                /* Scored grid products results */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((item) => {
                    const p = item.product;
                    const priceVal = parseFloat(p.price).toFixed(2);
                    const origVal = p.originalPrice ? parseFloat(p.originalPrice) : null;
                    const hasDiscount = origVal !== null && origVal > Number(priceVal);
                    const discountPct = hasDiscount
                      ? Math.round((1 - Number(priceVal) / origVal!) * 100)
                      : 0;
                    const isOutOfStock = p.inventory && p.inventory.quantity === 0;
                    const isLowStock = p.inventory && p.inventory.quantity > 0 && p.inventory.quantity <= 10;
                    const brand = p.attributes?.find((a) => a.name === 'Brand')?.value;
                    const reviewCount = p.reviews?.length || 0;
                    const rating = reviewCount > 0
                      ? (p.reviews!.reduce((acc, r) => acc + r.rating, 0) / reviewCount)
                      : null;
                    const deliveryDate = new Date();
                    deliveryDate.setDate(deliveryDate.getDate() + 2 + (p.id.charCodeAt(0) % 3));
                    const deliveryBy = deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

                    return (
                      <Link
                        href={`/products/${p.slug}`}
                        key={p.id}
                        onClick={() => handleProductCardClick(p.id)}
                        className="group flex flex-col rounded-2xl border border-slate-900 bg-slate-950/60 overflow-hidden hover:border-slate-800 hover:bg-slate-950 transition-all duration-300 hover:shadow-lg shadow-black/25 relative"
                      >
                        {/* Image panel */}
                        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                          {p.images && p.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.images[0].url}
                              alt={p.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-650 text-xs">
                              No Image Provided
                            </div>
                          )}

                          {isOutOfStock ? (
                            <span className="absolute top-3 right-3 rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 text-[9px] font-bold text-red-400 uppercase tracking-wider">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="absolute top-3 right-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider animate-pulse">
                              Low Stock: {p.inventory?.quantity} left
                            </span>
                          ) : (
                            <span className="absolute top-3 right-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                              In Stock
                            </span>
                          )}

                          {/* Wishlist Heart Toggle */}
                          {user && user.role === 'CUSTOMER' && (
                            <button
                              onClick={(e) => handleWishlistToggle(e, p.id)}
                              disabled={wishlistTogglingId === p.id}
                              className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-950 transition-colors z-20 focus:outline-none"
                              title="Toggle Wishlist"
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  isInWishlist(p.id, null)
                                    ? 'text-red-500 fill-red-500'
                                    : 'text-slate-400 hover:text-red-400'
                                }`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Text details */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-1.5">
                            {brand && (
                              <span className="text-[11px] font-bold text-slate-300 block">
                                {brand}
                              </span>
                            )}
                            <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white line-clamp-2 leading-snug">
                              {p.name}
                            </h3>
                            {rating !== null ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {rating.toFixed(1)} ★
                                </span>
                                <span className="text-[10px] text-slate-500">({reviewCount.toLocaleString('en-IN')})</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600">No ratings yet</span>
                            )}
                          </div>

                          <div className="flex items-end justify-between border-t border-slate-900/60 pt-3 mt-1">
                            <div className="flex flex-col">
                              <div className="flex items-baseline gap-2">
                                <span className="text-lg font-extrabold text-indigo-400 font-mono">
                                  ₹{Number(priceVal).toLocaleString('en-IN')}
                                </span>
                                {hasDiscount && (
                                  <span className="text-xs text-slate-500 line-through font-mono">
                                    ₹{origVal!.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                              {hasDiscount && (
                                <span className="text-[10px] font-bold text-emerald-400">
                                  {discountPct}% OFF
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-550 font-medium text-right">
                              By {p.seller.sellerProfile?.storeName || 'Verified Seller'}
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-400/90 font-medium -mt-2">
                            Free delivery by {deliveryBy}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Pagination footer */}
              {totalPages > 1 && !noResultsRecovery && (
                <div className="flex items-center justify-center space-x-4 border-t border-slate-900 pt-6 mt-4">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-xs text-slate-500 font-mono">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function DiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
          <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
        </div>
      }
    >
      <DiscoveryContent />
    </Suspense>
  );
}
