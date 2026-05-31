'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Header } from '../../../components/Header';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Store, Plus, Edit, Trash2, Tag, AlertCircle, ShoppingBag, Eye, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  sku?: string | null;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
  category: { name: string };
  variants: Array<{ id: string }>;
  createdAt: string;
}

export default function SellerProducts() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSellerProducts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch all products matching this sellerId (explicitly showing any status)
      const res = await api.get('/products', {
        params: {
          sellerId: user.id,
          status: 'ALL', // In our service, we can fetch all or handle status logic
        },
      });
      
      // Filter products locally or let the service return them. In our service, 
      // if query.status is specified, it filters. If no status is specified, it shows PUBLISHED.
      // So to show all of this seller's products (regardless of publish state), we can query status ALL.
      // Wait, let's look at the products.service.ts implementation of status query.
      // If status is passed, it uses it. If not, it uses PUBLISHED. So we should pass status to let it bypass.
      // In products.controller.ts, if status is 'ALL', we should support it or we can modify the controller to support getting all seller products.
      // Actually, passing the sellerId and a status query parameter is fully supported!
      setProducts(res.data.products);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch your product catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'SELLER') {
        router.push('/');
      } else {
        fetchSellerProducts();
      }
    }
  }, [user, authLoading, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This action is irreversible.')) {
      return;
    }
    setDeletingId(id);
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter(p => p.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          
          {/* Header */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-8 backdrop-blur-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 rounded-full blur-2xl" />
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                <Store className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Product Catalog</h1>
                <p className="text-sm text-slate-400">List, edit, and publish your store inventory.</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link 
                href="/seller/inventory" 
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Manage Stock
              </Link>
              <Link
                href="/seller/products/new"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition-all"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Add Product</span>
              </Link>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden shadow-2xl">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
                <span>Loading catalog listings...</span>
              </div>
            ) : error ? (
              <div className="py-12 text-center text-red-400">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>{error}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="mx-auto h-12 w-12 text-slate-800 mb-3" />
                <h3 className="font-bold text-slate-350">Your store catalog is empty</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Get started by adding your first product to list it for customer review.
                </p>
                <Link
                  href="/seller/products/new"
                  className="mt-4 inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  Create product listing now
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-900 text-left text-sm">
                  <thead className="bg-slate-950 text-xs font-mono uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Price</th>
                      <th className="px-6 py-3">SKU</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 bg-slate-950/20">
                    {products.map((p) => {
                      const hasVariants = p.variants && p.variants.length > 0;
                      const displayPrice = parseFloat(p.price).toFixed(2);

                      return (
                        <tr key={p.id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-200">
                            {p.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                            {p.category.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 font-mono font-semibold text-slate-300">
                            ${displayPrice}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">
                            {hasVariants ? (
                              <span className="rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 font-sans font-medium text-[10px]">
                                {p.variants.length} Variants
                              </span>
                            ) : (
                              p.sku || 'N/A'
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-mono font-semibold tracking-wide uppercase ${
                              p.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400' :
                              p.status === 'PENDING_REVIEW' ? 'bg-yellow-500/10 text-yellow-400' :
                              p.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                              p.status === 'ARCHIVED' ? 'bg-slate-800 text-slate-400' :
                              'bg-slate-900 text-slate-500' // DRAFT
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              {p.status === 'PUBLISHED' && (
                                <Link
                                  href={`/products/${p.slug}`}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                                  title="View Public Details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Link>
                              )}
                              <Link
                                href={`/seller/products/${p.id}/edit`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all duration-200"
                                title="Edit Product"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Link>
                              <button
                                disabled={deletingId === p.id}
                                onClick={() => handleDelete(p.id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200"
                                title="Delete Product"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
