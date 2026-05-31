'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ChevronLeft, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export default function EditProduct() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = useParams();

  // Categories list
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED'>('DRAFT');

  // Attributes State
  const [attributes, setAttributes] = useState<Array<{ name: string; value: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await api.get('/categories');
      
      const flatList: Category[] = [];
      const flatten = (cats: any[]) => {
        cats.forEach(c => {
          flatList.push({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId });
          if (c.children && c.children.length > 0) {
            flatten(c.children);
          }
        });
      };
      flatten(res.data);
      setCategories(flatList);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products/by-id/${id}`);
      const p = res.data;
      
      // Enforce ownership
      if (user && user.role === 'SELLER' && p.sellerId !== user.id) {
        router.push('/seller/products');
        return;
      }

      setName(p.name);
      setDescription(p.description);
      setPrice(p.price.toString());
      setCategoryId(p.categoryId);
      setSku(p.sku || '');
      setStatus(p.status);
      
      if (p.images && p.images.length > 0) {
        setImageUrl(p.images[0].url);
      }
      
      if (p.attributes) {
        setAttributes(p.attributes.map((a: any) => ({ name: a.name, value: a.value })));
      }

      if (p.inventory) {
        setQuantity(p.inventory.quantity.toString());
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load product details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
        router.push('/');
      } else {
        fetchCategories();
        fetchProductDetails();
      }
    }
  }, [user, authLoading, id, router]);

  const handleAddAttribute = () => {
    setAttributes([...attributes, { name: '', value: '' }]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAttributeChange = (index: number, field: 'name' | 'value', val: string) => {
    const updated = [...attributes];
    updated[index][field] = val;
    setAttributes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!categoryId) {
      setError('Please select a category.');
      setSubmitting(false);
      return;
    }

    const payload: any = {
      name,
      description,
      price: parseFloat(price),
      categoryId,
      sku: sku || null,
      status,
      images: imageUrl ? [{ url: imageUrl, isMain: true }] : [],
      attributes: attributes.filter(a => a.name && a.value),
      quantity: Number(quantity),
    };

    try {
      await api.put(`/products/${id}`, payload);
      router.push('/seller/products');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update product.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
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
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Back Action */}
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Link href="/seller/products" className="hover:text-slate-350 flex items-center">
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              <span>Cancel</span>
            </Link>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-white">Edit Product</h1>
            <p className="text-sm text-slate-400 mt-1">Modify your listed product details.</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Info */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono border-b border-slate-900 pb-2">
                Product Details
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300">Product Title</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300">Product Description</label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Category</label>
                  {categoriesLoading ? (
                    <div className="mt-2 text-xs text-slate-500">Loading categories...</div>
                  ) : (
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 focus:outline-none"
                    >
                      <option value="">Select category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parentId ? `└─ ${c.name}` : c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Product Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-350 focus:outline-none"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    {user?.role === 'ADMIN' && (
                      <>
                        <option value="PUBLISHED">Published</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="ARCHIVED">Archived</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Media Image */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono border-b border-slate-900 pb-2">
                Product Image
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-300">Main Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Attributes Specs */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono">
                  Specifications
                </h3>
                <button
                  type="button"
                  onClick={handleAddAttribute}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  + Add Spec
                </button>
              </div>

              {attributes.length === 0 ? (
                <p className="text-xs text-slate-600 py-2">No specifications added yet.</p>
              ) : (
                <div className="space-y-3">
                  {attributes.map((attr, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="text"
                        required
                        value={attr.name}
                        onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                      />
                      <input
                        type="text"
                        required
                        value={attr.value}
                        onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttribute(index)}
                        className="text-red-400 hover:text-red-350 px-1 py-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Simple stock adjustments */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono border-b border-slate-900 pb-2">
                Inventory Stock Setup
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Store SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none"
                    placeholder="e.g. MODEL-HEADPHONE-BLK"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300">Quantity In Stock</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Block */}
            <div className="flex justify-end gap-4">
              <Link
                href="/seller/products"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-6 font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 font-semibold text-white shadow-xl shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
