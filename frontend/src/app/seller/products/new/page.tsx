'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { Header } from '../../../../components/Header';
import { useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { ChevronLeft, Info, HelpCircle, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export default function NewProduct() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Categories list
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [imageUrl, setImageUrl] = useState('');

  // Attributes State
  const [attributes, setAttributes] = useState<Array<{ name: string; value: string }>>([]);

  // Variants State
  const [useVariants, setUseVariants] = useState(false);
  const [variants, setVariants] = useState<Array<{ name: string; sku: string; price?: string; options: any; quantity: number }>>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'SELLER') {
        router.push('/');
      } else {
        fetchCategories();
      }
    }
  }, [user, authLoading, router]);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await api.get('/categories');
      
      // Flatten hierarchical categories for simple dropdown select
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

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        name: '',
        sku: '',
        price: '',
        options: { Size: '', Color: '' },
        quantity: 10,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: string, val: any) => {
    const updated = [...variants];
    if (field.startsWith('option.')) {
      const optKey = field.split('.')[1];
      updated[index].options = { ...updated[index].options, [optKey]: val };
    } else {
      (updated[index] as any)[field] = val;
    }
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Basic Validation
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
      images: imageUrl ? [{ url: imageUrl, isMain: true }] : [],
      attributes: attributes.filter(a => a.name && a.value),
    };

    if (useVariants) {
      if (variants.length === 0) {
        setError('Please add at least one variant or disable variants selection.');
        setSubmitting(false);
        return;
      }
      payload.variants = variants.map(v => ({
        name: v.name,
        sku: v.sku,
        price: v.price ? parseFloat(v.price) : undefined,
        options: v.options,
        quantity: Number(v.quantity),
      }));
    } else {
      payload.sku = sku || undefined;
      payload.quantity = Number(quantity);
    }

    try {
      await api.post('/products', payload);
      router.push('/seller/products');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to list product. Please review credentials and SKU uniqueness.');
    } finally {
      setSubmitting(false);
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
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Back Action */}
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Link href="/seller/products" className="hover:text-slate-350 flex items-center">
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              <span>Cancel</span>
            </Link>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-white">Add New Product</h1>
            <p className="text-sm text-slate-400 mt-1">List a new product inside your store directory.</p>
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
                General Details
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300">Product Title</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="e.g. Wireless Noise Canceling Headset"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300">Product Description</label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="Provide detailed specifications, features, and descriptions..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Category Selection</label>
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
                  <label className="block text-sm font-medium text-slate-300">Base Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="199.99"
                  />
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
                  className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="https://images.unsplash.com/photo-..."
                />
                <p className="text-[10px] text-slate-500 mt-1">Specify an absolute web link containing image assets.</p>
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
                <p className="text-xs text-slate-600 py-2">No specifications added yet. Add Brand, Color, or Material specs.</p>
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
                        placeholder="e.g. Brand"
                      />
                      <input
                        type="text"
                        required
                        value={attr.value}
                        onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                        placeholder="e.g. Apple"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttribute(index)}
                        className="text-red-400 hover:text-red-300 px-1 py-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Variant Setup */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono">
                  Variants & Stock Configuration
                </h3>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-slate-400">Has multiple models/sizes?</label>
                  <input
                    type="checkbox"
                    checked={useVariants}
                    onChange={(e) => setUseVariants(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              {!useVariants ? (
                /* Simple Product Setup */
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Store SKU (Item Code)</label>
                    <input
                      type="text"
                      required={!useVariants}
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none"
                      placeholder="e.g. MODEL-HEADPHONE-BLK"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Initial Stock Quantity</label>
                    <input
                      type="number"
                      required={!useVariants}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                /* Variant Product Setup */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Configure models/combinations</span>
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      + Add Model Variant
                    </button>
                  </div>

                  {variants.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-900 rounded-xl">
                      <p className="text-xs text-slate-600">No variant models configured yet. Click "Add Model Variant".</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {variants.map((v, index) => (
                        <div key={index} className="rounded-xl border border-slate-900 bg-slate-950 p-4 space-y-3 relative">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(index)}
                            className="absolute top-4 right-4 text-red-500 hover:text-red-400"
                            title="Remove Variant"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-500">Model Name (e.g. Red / M)</label>
                              <input
                                type="text"
                                required
                                value={v.name}
                                onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                                className="mt-1 block w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                                placeholder="Red / Medium"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-500">Unique SKU</label>
                              <input
                                type="text"
                                required
                                value={v.sku}
                                onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                                className="mt-1 block w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                                placeholder="MODEL-HEADPHONE-RED-M"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-500">Variant Price ($) (Optional override)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={v.price || ''}
                                onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                                className="mt-1 block w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                                placeholder="Leaves at base price"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-500">Initial Stock</label>
                              <input
                                type="number"
                                required
                                value={v.quantity}
                                onChange={(e) => handleVariantChange(index, 'quantity', e.target.value)}
                                className="mt-1 block w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                              />
                            </div>

                            {/* Option Parameters */}
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-500">Option Key (e.g. Color)</label>
                              <input
                                type="text"
                                value={v.options.Color || ''}
                                onChange={(e) => handleVariantChange(index, 'option.Color', e.target.value)}
                                className="mt-1 block w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                                placeholder="e.g. Red"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider font-mono text-slate-500">Option Key (e.g. Size)</label>
                              <input
                                type="text"
                                value={v.options.Size || ''}
                                onChange={(e) => handleVariantChange(index, 'option.Size', e.target.value)}
                                className="mt-1 block w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                                placeholder="e.g. Medium"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                  'List Product'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
