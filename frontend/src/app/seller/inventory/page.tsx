'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Header } from '../../../components/Header';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Store, ChevronLeft, Save, AlertTriangle, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Inventory {
  id: string;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
}

interface Variant {
  id: string;
  name: string;
  sku: string;
  price?: string | null;
  inventory?: Inventory | null;
}

interface Product {
  id: string;
  name: string;
  price: string;
  sku?: string | null;
  status: string;
  category: { name: string };
  variants: Variant[];
  inventory?: Inventory | null;
}

export default function SellerInventory() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Inline Edit State
  const [editedStock, setEditedStock] = useState<Record<string, { quantity: number; threshold: number }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const fetchInventoryData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get('/products', {
        params: {
          sellerId: user.id,
          status: 'ALL',
        },
      });
      setProducts(res.data.products);
      
      // Initialize edit fields
      const editMap: Record<string, { quantity: number; threshold: number }> = {};
      res.data.products.forEach((p: Product) => {
        if (p.inventory) {
          editMap[p.inventory.id] = {
            quantity: p.inventory.quantity,
            threshold: p.inventory.lowStockThreshold,
          };
        }
        p.variants.forEach((v) => {
          if (v.inventory) {
            editMap[v.inventory.id] = {
              quantity: v.inventory.quantity,
              threshold: v.inventory.lowStockThreshold,
            };
          }
        });
      });
      setEditedStock(editMap);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch inventory records.');
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
        fetchInventoryData();
      }
    }
  }, [user, authLoading, router]);

  const handleInputChange = (id: string, field: 'quantity' | 'threshold', val: string) => {
    const num = Number(val) || 0;
    setEditedStock(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: num,
      },
    }));
  };

  const handleSaveStock = async (inventoryId: string) => {
    const vals = editedStock[inventoryId];
    if (!vals) return;
    
    setSavingId(inventoryId);
    setError(null);
    setSuccessId(null);

    try {
      await api.patch(`/inventory/${inventoryId}`, {
        quantity: vals.quantity,
        lowStockThreshold: vals.threshold,
      });

      setSuccessId(inventoryId);
      // Automatically clear success state after 2 seconds
      setTimeout(() => {
        setSuccessId(null);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to save inventory adjustments.');
    } finally {
      setSavingId(null);
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
          
          {/* Back Action */}
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Link href="/seller/products" className="hover:text-slate-350 flex items-center">
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              <span>Catalog Management</span>
            </Link>
          </div>

          {/* Header */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-8 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 rounded-full blur-2xl" />
            <div className="flex items-center space-x-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                <Store className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Stock Adjustment Center</h1>
                <p className="text-sm text-slate-400">View real-time stock levels, adjust stock quantities, and configure low-stock alerts.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Catalog Listing */}
          <div className="rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden shadow-2xl">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
                <span>Loading stock information...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                No products listed. Add products first to configure inventory levels.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-900 text-left text-sm">
                  <thead className="bg-slate-950 text-xs font-mono uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Product Item</th>
                      <th className="px-6 py-3">SKU</th>
                      <th className="px-6 py-3">Status Alert</th>
                      <th className="px-6 py-3">Available Stock</th>
                      <th className="px-6 py-3">Reserved</th>
                      <th className="px-6 py-3">Alert Threshold</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 bg-slate-950/20">
                    {products.map((p) => {
                      const hasVariants = p.variants && p.variants.length > 0;
                      
                      if (hasVariants) {
                        return (
                          <React.Fragment key={p.id}>
                            {/* Product Group Header Row */}
                            <tr className="bg-slate-950/40">
                              <td colSpan={7} className="px-6 py-2.5 font-bold text-slate-400 uppercase tracking-widest text-[10px] border-y border-slate-900">
                                {p.name}
                              </td>
                            </tr>
                            
                            {/* Product Variants Rows */}
                            {p.variants.map((v) => {
                              if (!v.inventory) return null;
                              
                              const values = editedStock[v.inventory.id] || { quantity: 0, threshold: 5 };
                              const isOutOfStock = v.inventory.quantity === 0;
                              const isLowStock = v.inventory.quantity > 0 && v.inventory.quantity <= v.inventory.lowStockThreshold;

                              return (
                                <tr key={v.id} className="hover:bg-slate-900/10 transition-colors">
                                  <td className="whitespace-nowrap px-8 py-4 font-semibold text-slate-200 text-xs">
                                    {v.name}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-400">
                                    {v.sku}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider ${
                                      isOutOfStock ? 'bg-red-500/10 text-red-400' :
                                      isLowStock ? 'bg-yellow-500/10 text-yellow-400' :
                                      'bg-emerald-500/10 text-emerald-400'
                                    }`}>
                                      {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Healthy'}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    <input
                                      type="number"
                                      value={values.quantity}
                                      onChange={(e) => handleInputChange(v.inventory!.id, 'quantity', e.target.value)}
                                      className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 font-mono text-xs text-slate-200 focus:outline-none"
                                    />
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">
                                    {v.inventory.reserved}
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4">
                                    <input
                                      type="number"
                                      value={values.threshold}
                                      onChange={(e) => handleInputChange(v.inventory!.id, 'threshold', e.target.value)}
                                      className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 font-mono text-xs text-slate-200 focus:outline-none"
                                    />
                                  </td>
                                  <td className="whitespace-nowrap px-6 py-4 text-right">
                                    <button
                                      disabled={savingId === v.inventory.id}
                                      onClick={() => handleSaveStock(v.inventory!.id)}
                                      className={`inline-flex h-8 items-center justify-center px-3 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                                        successId === v.inventory.id
                                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                          : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white'
                                      }`}
                                    >
                                      {savingId === v.inventory.id ? (
                                        <Loader2 className="animate-spin h-3.5 w-3.5" />
                                      ) : successId === v.inventory.id ? (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      ) : (
                                        <>
                                          <Save className="h-3.5 w-3.5 mr-1" />
                                          <span>Save</span>
                                        </>
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      }

                      // Simple Product Row
                      if (!p.inventory) return null;
                      
                      const values = editedStock[p.inventory.id] || { quantity: 0, threshold: 5 };
                      const isOutOfStock = p.inventory.quantity === 0;
                      const isLowStock = p.inventory.quantity > 0 && p.inventory.quantity <= p.inventory.lowStockThreshold;

                      return (
                        <tr key={p.id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-200 text-xs">
                            {p.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-400">
                            {p.sku || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider ${
                              isOutOfStock ? 'bg-red-500/10 text-red-400' :
                              isLowStock ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Healthy'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <input
                              type="number"
                              value={values.quantity}
                              onChange={(e) => handleInputChange(p.inventory!.id, 'quantity', e.target.value)}
                              className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 font-mono text-xs text-slate-200 focus:outline-none"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">
                            {p.inventory.reserved}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <input
                              type="number"
                              value={values.threshold}
                              onChange={(e) => handleInputChange(p.inventory!.id, 'threshold', e.target.value)}
                              className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 font-mono text-xs text-slate-200 focus:outline-none"
                            />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <button
                              disabled={savingId === p.inventory.id}
                              onClick={() => handleSaveStock(p.inventory!.id)}
                              className={`inline-flex h-8 items-center justify-center px-3 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                                successId === p.inventory.id
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white'
                              }`}
                            >
                              {savingId === p.inventory.id ? (
                                <Loader2 className="animate-spin h-3.5 w-3.5" />
                              ) : successId === p.inventory.id ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <>
                                  <Save className="h-3.5 w-3.5 mr-1" />
                                  <span>Save</span>
                                </>
                              )}
                            </button>
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
