'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, trackUserActivity } from '@/lib/api';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { Search, SlidersHorizontal, ChevronRight, ArrowUpDown, ChevronLeft, Loader2, PackageX, Sparkles, Heart } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  sku?: string;
  status: string;
  images: Array<{ url: string; altText?: string }>;
  category: { name: string };
  seller: { sellerProfile?: { storeName: string } };
  inventory?: { quantity: number };
}

export default function DiscoveryPage() {
  const { user } = useAuth();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [wishlistTogglingId, setWishlistTogglingId] = useState<string | null>(null);

  const handleWishlistToggle = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please sign in to save items to your wishlist.');
      return;
    }
    const wishlistItem = wishlist?.items.find(item => item.productId === productId);
    setWishlistTogglingId(productId);
    if (wishlistItem) {
      await removeFromWishlist(wishlistItem.id);
    } else {
      await addToWishlist(productId, null);
    }
    setTimeout(() => setWishlistTogglingId(null), 300);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // UI States
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 8,
        sortBy,
        sortOrder,
      };

      if (search) params.search = search;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const res = await api.get('/products', { params });
      setProducts(res.data.products);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages || 1);

      if (search) {
        trackUserActivity('SEARCH', undefined, { query: search });
      }
      if (selectedCategory) {
        trackUserActivity('VIEW', undefined, { categoryId: selectedCategory });
      }

      // Count active filters
      let count = 0;
      if (selectedCategory) count++;
      if (minPrice) count++;
      if (maxPrice) count++;
      setActiveFiltersCount(count);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, search, selectedCategory, minPrice, maxPrice]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleClearFilters = () => {
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSearch('');
    setPage(1);
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId === selectedCategory ? '' : catId);
    setPage(1);
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Page Title & Intro */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-slate-900 pb-6">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono mb-2 uppercase tracking-widest">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Nexaris Marketplace</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Explore Catalog
              </h1>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="md:hidden flex items-center space-x-1 border border-slate-800 bg-slate-900 rounded-xl px-4 py-2 text-sm font-semibold"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
              </button>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar Filters - Desktop */}
            <aside className="hidden md:block w-64 shrink-0 space-y-6">
              {/* Filter Clean trigger */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="w-full py-1.5 px-3 rounded-lg border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-400 hover:text-white transition-all text-center block"
                >
                  Clear Active Filters ({activeFiltersCount})
                </button>
              )}

              {/* Categories Navigation */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono border-b border-slate-900 pb-2">
                  Categories
                </h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="space-y-1">
                      <button
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                          selectedCategory === cat.id
                            ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        <span>{cat.name}</span>
                        {selectedCategory === cat.id && <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      
                      {/* Subcategories (if selected parent or direct child check) */}
                      {cat.children && cat.children.length > 0 && (
                        <div className="pl-4 space-y-0.5 border-l border-slate-900 ml-3">
                          {cat.children.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => handleCategorySelect(sub.id)}
                              className={`w-full text-left px-2 py-1 rounded-md text-xs block transition-colors ${
                                selectedCategory === sub.id
                                  ? 'text-indigo-400 font-bold'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Filter Box */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono border-b border-slate-900 pb-2">
                  Price Limits
                </h3>
                <form onSubmit={handlePriceApply} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min $"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Max $"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold border border-slate-800 text-slate-200 transition-colors"
                  >
                    Apply Price
                  </button>
                </form>
              </div>
            </aside>

            {/* Catalog Grid */}
            <div className="flex-1 space-y-6">
              {/* Sorting Options */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-900 px-4 py-3 rounded-2xl">
                <span className="text-xs text-slate-500 font-mono">
                  Showing {products.length} of {total} products
                </span>
                
                <div className="flex items-center space-x-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [by, order] = e.target.value.split('-');
                      setSortBy(by);
                      setSortOrder(order as any);
                      setPage(1);
                    }}
                    className="bg-slate-900 border border-slate-850 rounded-lg text-xs text-slate-300 py-1 px-2.5 focus:outline-none"
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Grid content */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                  <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
                  <span>Loading catalog items...</span>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl">
                  <PackageX className="mx-auto h-12 w-12 text-slate-700 mb-4" />
                  <h3 className="font-bold text-slate-350">No Products Found</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    Try modifying your search keywords or broadening your category and price filters.
                  </p>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-4 inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      Clear all filters and search
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((p) => {
                    const priceVal = parseFloat(p.price).toFixed(2);
                    const isOutOfStock = p.inventory && p.inventory.quantity === 0;

                    return (
                      <Link
                        href={`/products/${p.slug}`}
                        key={p.id}
                        className="group flex flex-col rounded-2xl border border-slate-900 bg-slate-950/60 overflow-hidden hover:border-slate-800 hover:bg-slate-950 transition-all duration-300 hover:shadow-lg shadow-black/20 relative"
                      >
                        {/* Image panel */}
                        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                          {p.images && p.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.images[0].url}
                              alt={p.images[0].altText || p.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-650 text-xs">
                              No Image Provided
                            </div>
                          )}
                          
                          {isOutOfStock && (
                            <span className="absolute top-3 right-3 rounded-lg bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                              Out of Stock
                            </span>
                          )}

                          {/* Wishlist Heart Toggle */}
                          {user && user.role === 'CUSTOMER' && (
                            <button
                              onClick={(e) => handleWishlistToggle(e, p.id)}
                              disabled={wishlistTogglingId === p.id}
                              className="absolute top-3 left-3 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-450 hover:text-red-400 hover:bg-slate-950 transition-colors z-20 focus:outline-none"
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
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block font-mono">
                              {p.category.name}
                            </span>
                            <h3 className="font-bold text-slate-100 group-hover:text-white line-clamp-1">
                              {p.name}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {p.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-900/60 pt-3 mt-1">
                            <span className="text-lg font-extrabold text-indigo-400 font-mono">
                              ${priceVal}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              By {p.seller.sellerProfile?.storeName || 'Verified Seller'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Pagination footer */}
              {totalPages > 1 && (
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
