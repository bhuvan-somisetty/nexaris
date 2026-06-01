'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Header } from '@/components/Header';
import { ChevronLeft, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, ShoppingCart, Tag, ArrowRight, Loader2, Clock, Heart, Minus, Plus, Star, Flag, Trash2, Edit, MessageSquare, Award } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

interface Inventory {
  id: string;
  quantity: number;
  lowStockThreshold: number;
}

interface ProductVariant {
  id: string;
  sku: string;
  price?: string | null;
  name: string;
  options: any; // JSON e.g. { Color: "Red", Size: "M" }
  inventory?: Inventory | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  sku?: string | null;
  status: string;
  images: Array<{ id: string; url: string; altText?: string }>;
  category: { id: string; name: string };
  seller: { id: string; email: string; sellerProfile?: { storeName: string; storeDescription?: string } };
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  inventory?: Inventory | null;
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Variant Selection State
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Cart & Wishlist Actions State
  const [quantity, setQuantity] = useState<number>(1);
  const [adding, setAdding] = useState<boolean>(false);
  const [wishlistToggling, setWishlistToggling] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reviews & Ratings state
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ average: 0, totalReviews: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(true);
  const [reviewsPage, setReviewsPage] = useState<number>(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState<number>(1);
  const [reviewsSort, setReviewsSort] = useState<string>('recent');
  const [reviewsRatingFilter, setReviewsRatingFilter] = useState<number | null>(null);
  const [reviewsVerifiedFilter, setReviewsVerifiedFilter] = useState<boolean>(false);

  // Write/Edit Review Form state
  const [eligibleToReview, setEligibleToReview] = useState<boolean>(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState<boolean>(false);
  const [eligibilityReason, setEligibilityReason] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewContent, setReviewContent] = useState<string>('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  
  // Voting & Reporting state
  const [votingId, setVotingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setAdding(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    const res = await addToCart(product.id, selectedVariant?.id, quantity);
    setAdding(false);
    
    if (res.success) {
      setSuccessMessage(res.message || 'Item added to cart!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(res.message || 'Failed to add item to cart.');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleWishlistToggle = async () => {
    if (!product) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    const wishlistItem = wishlist?.items.find(
      (item) => item.productId === product.id && item.variantId === (selectedVariant?.id || null)
    );
    
    setWishlistToggling(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    if (wishlistItem) {
      await removeFromWishlist(wishlistItem.id);
      setSuccessMessage('Removed item from wishlist');
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      const res = await addToWishlist(product.id, selectedVariant?.id || null);
      if (res.success) {
        setSuccessMessage(res.message || 'Saved item to wishlist');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(res.message || 'Failed to save to wishlist.');
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
    setWishlistToggling(false);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/products/${slug}`);
        setProduct(res.data);
        
        // If product has variants, select the first variant by default
        if (res.data.variants && res.data.variants.length > 0) {
          setSelectedVariant(res.data.variants[0]);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || 'Product not found.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const fetchReviews = async (prodId: string) => {
    try {
      setReviewsLoading(true);
      let url = `/reviews/products/${prodId}?page=${reviewsPage}&limit=5&sortBy=${reviewsSort}`;
      if (reviewsRatingFilter) {
        url += `&rating=${reviewsRatingFilter}`;
      }
      if (reviewsVerifiedFilter) {
        url += `&verifiedOnly=true`;
      }
      const res = await api.get(url);
      setReviews(res.data.reviews);
      setStats(res.data.stats);
      setReviewsTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchEligibility = async (prodId: string) => {
    if (!user || user.role !== 'CUSTOMER') return;
    try {
      const res = await api.get(`/reviews/eligibility/${prodId}`);
      setEligibleToReview(res.data.eligible);
      setAlreadyReviewed(res.data.alreadyReviewed);
      setEligibilityReason(res.data.reason || '');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (product?.id) {
      fetchReviews(product.id);
    }
  }, [product?.id, reviewsPage, reviewsSort, reviewsRatingFilter, reviewsVerifiedFilter]);

  useEffect(() => {
    if (product?.id && user) {
      fetchEligibility(product.id);
    }
  }, [product?.id, user]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmittingReview(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (editingReviewId) {
        await api.put(`/reviews/${editingReviewId}`, {
          rating: reviewRating,
          title: reviewTitle,
          content: reviewContent,
        });
        setSuccessMessage('Review updated successfully!');
      } else {
        await api.post('/reviews', {
          productId: product.id,
          rating: reviewRating,
          title: reviewTitle,
          content: reviewContent,
        });
        setSuccessMessage('Review posted successfully!');
      }
      
      // Reset form
      setReviewTitle('');
      setReviewContent('');
      setReviewRating(5);
      setEditingReviewId(null);

      // Refresh data
      await fetchReviews(product.id);
      await fetchEligibility(product.id);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEditReviewClick = (review: any) => {
    setEditingReviewId(review.id);
    setReviewRating(review.rating);
    setReviewTitle(review.title);
    setReviewContent(review.content);
    
    // Scroll to the review form
    const formElement = document.getElementById('review-form-anchor');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!product || !confirm('Are you sure you want to delete your review?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setSuccessMessage('Review deleted successfully!');
      await fetchReviews(product.id);
      await fetchEligibility(product.id);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to delete review.');
    }
  };

  const handleToggleVote = async (reviewId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      alert('Only customers can upvote reviews.');
      return;
    }
    setVotingId(reviewId);
    try {
      await api.post(`/reviews/${reviewId}/vote`);
      if (product) {
        await fetchReviews(product.id);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to upvote.');
    } finally {
      setVotingId(null);
    }
  };

  const handleOpenReport = (reviewId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    setSelectedReportId(reviewId);
    setReportReason('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedReportId || !reportReason) return;
    setSubmittingReport(true);
    try {
      await api.post(`/reviews/${selectedReportId}/report`, {
        reason: reportReason,
      });
      alert('Review reported. Thank you for keeping Nexaris safe.');
      setShowReportModal(false);
      if (product) {
        await fetchReviews(product.id);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <>
        <Header />
        <div className="min-h-[70vh] bg-slate-950 text-white flex flex-col items-center justify-center px-4">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold">Failed to load product</h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">{error || 'The product you are trying to view does not exist.'}</p>
          <Link href="/products" className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 px-6 text-sm font-semibold hover:bg-slate-800 transition-colors">
            Back to Marketplace
          </Link>
        </div>
      </>
    );
  }

  // Determine pricing and stock messages
  const basePrice = parseFloat(product.price).toFixed(2);
  const currentPrice = selectedVariant && selectedVariant.price 
    ? parseFloat(selectedVariant.price).toFixed(2) 
    : basePrice;
    
  const currentSku = selectedVariant ? selectedVariant.sku : (product.sku || 'N/A');
  
  const currentInventory = selectedVariant ? selectedVariant.inventory : product.inventory;
  const stockCount = currentInventory ? currentInventory.quantity : 0;
  const isLowStock = currentInventory ? stockCount > 0 && stockCount <= currentInventory.lowStockThreshold : false;
  const isOutOfStock = stockCount === 0;

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Link href="/products" className="hover:text-slate-300 flex items-center">
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              <span>Catalog</span>
            </Link>
            <span>/</span>
            <span>{product.category.name}</span>
            <span>/</span>
            <span className="text-slate-350 truncate max-w-xs">{product.name}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left Column: Product Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square w-full rounded-3xl bg-slate-900 overflow-hidden border border-slate-900 relative">
                {product.images && product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0].url}
                    alt={product.images[0].altText || product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-650">
                    No image available
                  </div>
                )}
                
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="rounded-xl bg-red-500/10 border border-red-500/40 px-4 py-2 text-sm font-bold text-red-400 uppercase tracking-widest font-mono">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order Details */}
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-0.5 text-xs text-indigo-400 font-mono tracking-widest uppercase">
                  {product.category.name}
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">{product.name}</h1>
                <p className="text-xs text-slate-500">
                  Seller: <span className="font-semibold text-slate-400">{product.seller.sellerProfile?.storeName || 'Verified Store'}</span>
                </p>
              </div>

              {successMessage && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-450 flex items-start space-x-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Price Panel */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-mono uppercase block">Product Price</span>
                  <span className="text-3xl font-extrabold text-indigo-400 font-mono">${currentPrice}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-mono uppercase block">Model/SKU</span>
                  <span className="text-xs text-slate-350 font-mono">{currentSku}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">Details</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{product.description}</p>
              </div>

              {/* Variant Selectors */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">Select Option</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 ${
                          selectedVariant?.id === v.id
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                            : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-200">{v.name}</span>
                        {v.price && (
                          <span className="text-[10px] text-slate-500 mt-1 font-mono">
                            Price: ${parseFloat(v.price).toFixed(2)}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                          SKU: {v.sku}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Level Message */}
              <div className="pt-2 border-t border-slate-900">
                {isOutOfStock ? (
                  <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Out of stock. Check back later or select another model.</span>
                  </div>
                ) : isLowStock ? (
                  <div className="flex items-center space-x-2 text-yellow-400 text-sm bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Only {stockCount} items left in stock - order soon!</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-emerald-400 text-sm bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>In Stock (Quantity: {stockCount} available)</span>
                  </div>
                )}
              </div>

              {/* Quantity Adjuster */}
              {!isOutOfStock && user?.role === 'CUSTOMER' && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider">Quantity:</span>
                  <div className="flex items-center rounded-xl bg-slate-900 border border-slate-850 p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-805 text-slate-400 hover:text-white"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold font-mono">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(stockCount, quantity + 1))}
                      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-805 text-slate-400 hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || adding || !!(user && user.role !== 'CUSTOMER')}
                  className="flex-1 inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold text-white shadow-xl shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? (
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  ) : (
                    <ShoppingCart className="h-5 w-5 mr-2" />
                  )}
                  <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                </button>

                {user && user.role === 'CUSTOMER' && (
                  <button
                    onClick={handleWishlistToggle}
                    disabled={wishlistToggling}
                    className="h-12 w-12 flex items-center justify-center rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-400 hover:text-red-400 transition-all focus:outline-none"
                    title="Toggle Wishlist"
                  >
                    {wishlistToggling ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                      <Heart
                        className={`h-5 w-5 ${
                          isInWishlist(product.id, selectedVariant?.id || null)
                            ? 'text-red-500 fill-red-500'
                            : 'text-slate-400'
                        }`}
                      />
                    )}
                  </button>
                )}
              </div>

              {/* Trust Badge */}
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-6 justify-center">
                <ShieldCheck className="h-4 w-4 text-slate-650" />
                <span>Nexaris Buyer Protection Verified Storefront</span>
              </div>
            </div>
          </div>

          {/* Technical Specs Section */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 pt-5">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2">
                <Tag className="h-5 w-5 text-indigo-400" />
                <span>Product Specifications</span>
              </h3>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-900">
                <table className="min-w-full divide-y divide-slate-900 text-sm">
                  <tbody className="divide-y divide-slate-900 bg-slate-950/20">
                    {product.attributes.map((attr) => (
                      <tr key={attr.id} className="hover:bg-slate-900/10">
                        <td className="px-6 py-3 font-semibold text-slate-400 font-mono text-xs uppercase w-1/3">
                          {attr.name}
                        </td>
                        <td className="px-6 py-3 text-slate-200">
                          {attr.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Reviews & Ratings Panel ─── */}
          <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 pt-5 space-y-8">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-indigo-400" />
              <span>Customer Reviews & Ratings</span>
            </h3>

            {/* Stats Summary & Rating Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-slate-900/20 border border-slate-900 p-6 rounded-2xl">
              {/* Average Score */}
              <div className="text-center md:border-r md:border-slate-900 py-2">
                <span className="text-6xl font-extrabold text-indigo-400 font-mono">{stats.average || '0.0'}</span>
                <div className="flex items-center justify-center space-x-1 mt-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-5 w-5 ${
                        s <= Math.round(stats.average || 0)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-500 block mt-2 font-mono">Based on {stats.totalReviews || 0} reviews</span>
              </div>

              {/* Progress Bars */}
              <div className="col-span-2 space-y-2">
                {[5, 4, 3, 2, 1].map((ratingVal) => {
                  const count = stats.breakdown?.[ratingVal] || 0;
                  const total = stats.totalReviews || 1;
                  const percent = Math.round((count / total) * 100);

                  return (
                    <div key={ratingVal} className="flex items-center space-x-3 text-sm">
                      <button
                        onClick={() => setReviewsRatingFilter(reviewsRatingFilter === ratingVal ? null : ratingVal)}
                        className={`w-12 text-left hover:text-indigo-400 font-semibold flex items-center space-x-1 ${
                          reviewsRatingFilter === ratingVal ? 'text-indigo-400' : 'text-slate-400'
                        }`}
                      >
                        <span className="font-mono">{ratingVal}</span>
                        <Star className="h-3 w-3 fill-current" />
                      </button>
                      <div className="flex-1 h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-slate-500 font-mono">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter & Sort Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 border border-slate-900 p-4 rounded-xl text-sm">
              <div className="flex flex-wrap items-center gap-4">
                {/* Rating Filter clear */}
                {reviewsRatingFilter && (
                  <button
                    onClick={() => setReviewsRatingFilter(null)}
                    className="rounded-full bg-indigo-500/10 border border-indigo-550 px-3 py-1 text-xs text-indigo-400 font-semibold"
                  >
                    Rating: {reviewsRatingFilter}★ (Clear)
                  </button>
                )}

                {/* Verified Purchase Checkbox */}
                <label className="flex items-center space-x-2 text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reviewsVerifiedFilter}
                    onChange={(e) => setReviewsVerifiedFilter(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>Verified Purchase Only</span>
                </label>
              </div>

              {/* Sort By selector */}
              <div className="flex items-center space-x-2 text-slate-400 ml-auto">
                <span>Sort:</span>
                <select
                  value={reviewsSort}
                  onChange={(e) => setReviewsSort(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900 text-xs px-3 py-1.5 text-slate-205 focus:outline-none focus:border-indigo-500"
                >
                  <option value="recent">Most Recent</option>
                  <option value="helpful">Most Helpful</option>
                  <option value="rating">Highest Rating</option>
                </select>
              </div>
            </div>

            {/* Reviews Feed */}
            {reviewsLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-900 text-center rounded-2xl">
                <MessageSquare className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No reviews found matching filters.</p>
              </div>
            ) : (
              <div className="space-y-6 divide-y divide-slate-900">
                {reviews.map((r, index) => {
                  const date = new Date(r.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });

                  const authorName = r.customer?.profile
                    ? `${r.customer.profile.firstName} ${r.customer.profile.lastName?.substring(0, 1) || ''}.`
                    : 'Anonymous User';

                  const isOwnReview = user?.id === r.customerId;

                  return (
                    <div key={r.id} className={`pt-6 first:pt-0 space-y-3`}>
                      {/* Review Header */}
                      <div className="flex justify-between items-start gap-4">
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
                              <span className="inline-flex items-center space-x-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-450 font-bold uppercase ml-3">
                                <Award className="h-3 w-3" />
                                <span>Verified Purchase</span>
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-100">{r.title}</h4>
                        </div>
                        <span className="text-xs text-slate-500 font-mono shrink-0">{date}</span>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-slate-400 leading-relaxed">{r.content}</p>

                      {/* Display Photos if any */}
                      {r.images && r.images.length > 0 && (
                        <div className="flex gap-2 flex-wrap pt-1">
                          {r.images.map((img: string, idx: number) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={idx}
                              src={img}
                              alt="Review attachments"
                              className="w-16 h-16 object-cover rounded-lg border border-slate-900 hover:scale-105 transition-all"
                            />
                          ))}
                        </div>
                      )}

                      {/* Actions Footer */}
                      <div className="flex justify-between items-center text-xs pt-1">
                        <div className="flex items-center space-x-4">
                          <span className="text-slate-500 font-semibold">By: {authorName}</span>
                          {!isOwnReview && (
                            <button
                              onClick={() => handleToggleVote(r.id)}
                              disabled={votingId === r.id}
                              className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-indigo-400 transition-colors"
                            >
                              <Heart className="h-3.5 w-3.5 text-slate-500 hover:text-indigo-500" />
                              <span>Helpful ({r.helpfulCount || 0})</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center space-x-3">
                          {isOwnReview ? (
                            <>
                              <button
                                onClick={() => handleEditReviewClick(r)}
                                className="inline-flex items-center space-x-1 text-indigo-400 hover:text-indigo-350 transition-colors"
                              >
                                <Edit className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteReview(r.id)}
                                className="inline-flex items-center space-x-1 text-red-400 hover:text-red-350 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenReport(r.id)}
                              className="inline-flex items-center space-x-1 text-slate-500 hover:text-yellow-400 transition-colors"
                            >
                              <Flag className="h-3 w-3" />
                              <span>Report</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Reviews Pagination Controls */}
                {reviewsTotalPages > 1 && (
                  <div className="flex items-center justify-center space-x-4 pt-6 border-t border-slate-900">
                    <button
                      onClick={() => setReviewsPage(Math.max(1, reviewsPage - 1))}
                      disabled={reviewsPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-500 font-mono">
                      Page {reviewsPage} of {reviewsTotalPages}
                    </span>
                    <button
                      onClick={() => setReviewsPage(Math.min(reviewsTotalPages, reviewsPage + 1))}
                      disabled={reviewsPage === reviewsTotalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Write/Edit Review Form Block */}
            <div id="review-form-anchor" className="border-t border-slate-900 pt-6">
              {editingReviewId ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-bold text-indigo-400">Edit Your Review</h4>
                    <button
                      onClick={() => {
                        setEditingReviewId(null);
                        setReviewTitle('');
                        setReviewContent('');
                        setReviewRating(5);
                      }}
                      className="text-xs text-slate-500 hover:text-white"
                    >
                      Cancel Edit
                    </button>
                  </div>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    {/* Star selection */}
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 block font-mono uppercase">Rating</span>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewRating(s)}
                            className="text-slate-705 hover:scale-110 transition-transform focus:outline-none"
                          >
                            <Star
                              className={`h-6 w-6 ${
                                s <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-850'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 block font-mono uppercase">Review Headline</label>
                      <input
                        type="text"
                        required
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        placeholder="e.g. Excellent build quality, highly recommend"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Comment */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 block font-mono uppercase">Review Comments</label>
                      <textarea
                        required
                        rows={4}
                        value={reviewContent}
                        onChange={(e) => setReviewContent(e.target.value)}
                        placeholder="Describe your experience with this item..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-500 px-6 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors disabled:opacity-50"
                    >
                      {submittingReview ? (
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      ) : null}
                      Save Changes
                    </button>
                  </form>
                </div>
              ) : eligibleToReview ? (
                <div className="space-y-4">
                  <h4 className="text-md font-bold text-slate-200 flex items-center space-x-1.5">
                    <span>Write a Customer Review</span>
                  </h4>
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    {/* Star selection */}
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 block font-mono uppercase">Rating</span>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewRating(s)}
                            className="text-slate-705 hover:scale-110 transition-transform focus:outline-none"
                          >
                            <Star
                              className={`h-6 w-6 ${
                                s <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-850'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 block font-mono uppercase">Review Headline</label>
                      <input
                        type="text"
                        required
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        placeholder="e.g. Excellent build quality, highly recommend"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Comment */}
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500 block font-mono uppercase">Review Comments</label>
                      <textarea
                        required
                        rows={4}
                        value={reviewContent}
                        onChange={(e) => setReviewContent(e.target.value)}
                        placeholder="Describe your experience with this item..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-500 px-6 text-sm font-semibold text-white hover:bg-indigo-600 transition-colors disabled:opacity-50"
                    >
                      {submittingReview ? (
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      ) : null}
                      Post Review
                    </button>
                  </form>
                </div>
              ) : alreadyReviewed ? (
                <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-4 text-center">
                  <span className="text-xs text-slate-500 block">You have already reviewed this product. Need to adjust your feedback?</span>
                  {reviews.find((r) => r.customerId === user?.id) && (
                    <button
                      onClick={() => handleEditReviewClick(reviews.find((r) => r.customerId === user?.id))}
                      className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-350"
                    >
                      Edit Your Existing Review
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-4 text-slate-500 text-xs text-center">
                  {eligibilityReason || 'Log in as a customer and purchase this item to share your review.'}
                </div>
              )}
            </div>
          </div>

          {/* ─── Review Report Modal ─── */}
          {showReportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px] p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-slate-200">Report Inappropriate Content</h4>
                  <p className="text-xs text-slate-500">Provide details on why this review violates platform rules.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-500 block font-mono uppercase">Reporting Reason</label>
                  <textarea
                    required
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="e.g. Spam, fake reviews, harassment, offensive language..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-205 placeholder-slate-650 focus:outline-none focus:border-indigo-500 resize-y"
                  />
                </div>

                <div className="flex justify-end gap-3 text-sm">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="h-10 rounded-xl bg-slate-900 border border-slate-800 px-4 text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={submittingReport || !reportReason.trim()}
                    className="h-10 rounded-xl bg-indigo-500 px-4 font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
