'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Header } from '../../../components/Header';
import { ChevronLeft, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, ShoppingCart, Tag, ArrowRight, Loader2, Clock } from 'lucide-react';
import Link from 'next/link';

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
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Variant Selection State
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

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

              {/* Action Buttons (Mock Checkout) */}
              <div className="pt-4 flex gap-4">
                <button
                  disabled
                  className="flex-1 inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 font-semibold text-slate-500 opacity-50 cursor-not-allowed"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  <span>Cart (Unlocks in Phase 3)</span>
                </button>
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
        </div>
      </main>
    </>
  );
}
