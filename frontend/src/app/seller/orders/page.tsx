'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Package, Clock, Truck, CheckCircle, Search, RefreshCw, AlertCircle, ShoppingBag, Eye, Edit3, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  orderId: string;
  productName: string;
  variantName?: string | null;
  price: string;
  quantity: number;
  productImage?: string | null;
  fulfillmentStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  sellerId: string;
}

interface OrderAddress {
  firstName: string;
  lastName: string;
  street1: string;
  city: string;
  state: string;
  postalCode: string;
}

interface Order {
  id: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  shippingAddress?: OrderAddress | null;
  customer: {
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    } | null;
  };
}

export default function SellerOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fulfillment update states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('PROCESSING');
  const [notes, setNotes] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchSellerOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/orders');
      setOrders(res.data.orders || []);
    } catch (err: any) {
      console.error('Failed to load seller orders', err);
      setError(err.response?.data?.message || 'Failed to retrieve seller orders dashboard.');
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
        fetchSellerOrders();
      }
    }
  }, [user, authLoading, router]);

  const handleUpdateFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemId) return;

    try {
      setUpdating(true);
      setError(null);
      await api.patch(`/orders/items/${editingItemId}/fulfillment`, {
        status: newStatus,
        notes: notes || `Fulfillment updated to ${newStatus} by seller.`,
      });
      setEditingItemId(null);
      setNotes('');
      await fetchSellerOrders();
    } catch (err: any) {
      console.error('Fulfillment update error', err);
      setError(err.response?.data?.message || 'Failed to update item fulfillment.');
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || (loading && orders.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  // Flatten orders into items for line-item style tracking (since sellers manage item-level status)
  const allSellerItems = orders.flatMap((order) =>
    order.items.map((item) => ({
      ...item,
      orderCreatedAt: order.createdAt,
      customerEmail: order.customer.email,
      customerName: order.customer.profile
        ? `${order.customer.profile.firstName} ${order.customer.profile.lastName}`
        : 'Customer',
      shippingAddress: order.shippingAddress,
      parentOrderStatus: order.status,
    }))
  );

  // Filter items
  const filteredItems = allSellerItems.filter((item) => {
    const matchesStatus = filterStatus === 'ALL' || item.fulfillmentStatus === filterStatus;
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getFulfillmentBadgeColor = (status: OrderItem['fulfillmentStatus']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'PROCESSING':
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
      case 'SHIPPED':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      case 'DELIVERED':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'CANCELLED':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-6 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Store Fulfillment</h1>
              <p className="text-sm text-slate-400 mt-1">Manage shipping statuses, add carrier notes, and monitor order queues.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchSellerOrders}
                disabled={loading}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 text-slate-400 hover:text-white transition-colors"
                title="Refresh queue"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Filter & Search Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/10 border border-slate-900 p-4 rounded-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by order ID, product or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full bg-slate-900 border border-slate-850 rounded-xl text-xs focus:outline-none placeholder-slate-500"
              />
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3.5 py-2 w-full bg-slate-900 border border-slate-850 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Item Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center justify-end text-xs font-mono text-slate-500">
              Showing {filteredItems.length} matching item(s)
            </div>
          </div>

          {/* Data Table */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl">
              <ShoppingBag className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-400">No shipments found</h3>
              <p className="text-xs text-slate-500 mt-1">Orders awaiting dispatch or matching current search filters will appear here.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 font-mono uppercase border-b border-slate-900">
                      <th className="p-4 font-semibold">Ordered On</th>
                      <th className="p-4 font-semibold">Order / Item ID</th>
                      <th className="p-4 font-semibold">Product Name</th>
                      <th className="p-4 font-semibold">Customer</th>
                      <th className="p-4 font-semibold">Quantity / Revenue</th>
                      <th className="p-4 font-semibold">Fulfillment Status</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40">
                    {filteredItems.map((item) => {
                      const itemDate = new Date(item.orderCreatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                      const revenue = parseFloat(item.price) * item.quantity;

                      return (
                        <tr key={item.id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="p-4 text-slate-350 font-mono">{itemDate}</td>
                          <td className="p-4">
                            <span className="text-slate-300 font-mono font-bold select-all break-all">{item.orderId.slice(0, 8)}...</span>
                            <span className="block text-[9px] text-slate-500 font-mono">Item: {item.id.slice(0, 8)}...</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-slate-900 border border-slate-850 overflow-hidden relative shrink-0 flex items-center justify-center">
                                {item.productImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                                ) : (
                                  <ShoppingBag className="h-4 w-4 text-slate-700" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-200 block truncate max-w-[150px]">{item.productName}</span>
                                {item.variantName && (
                                  <span className="text-[10px] text-indigo-400 font-semibold">{item.variantName}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-300 font-bold block">{item.customerName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{item.customerEmail}</span>
                          </td>
                          <td className="p-4 font-mono">
                            <span className="text-slate-300 block">{item.quantity} units</span>
                            <span className="text-slate-500 text-[10px]">₹{revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold font-mono tracking-wide uppercase ${getFulfillmentBadgeColor(item.fulfillmentStatus)}`}>
                              {item.fulfillmentStatus}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.fulfillmentStatus !== 'CANCELLED' && item.fulfillmentStatus !== 'DELIVERED' && (
                                <button
                                  onClick={() => {
                                    setEditingItemId(item.id);
                                    setNewStatus(
                                      item.fulfillmentStatus === 'PENDING'
                                        ? 'PROCESSING'
                                        : item.fulfillmentStatus === 'PROCESSING'
                                        ? 'SHIPPED'
                                        : 'DELIVERED'
                                    );
                                  }}
                                  className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-lg transition-all"
                                  title="Change shipment state"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              )}

                              <Link
                                href={`/orders/${item.orderId}`}
                                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-white transition-colors"
                                title="View Customer Receipt"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Status edit modal overlay */}
          {editingItemId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-200">Update Fulfillment Tracking</h3>
                  <p className="text-xs text-slate-500 mt-1">Provide cargo updates, transport notes or tracking ID details.</p>
                </div>

                <form onSubmit={handleUpdateFulfillment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Fulfillment Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none cursor-pointer"
                    >
                      <option value="PROCESSING">Processing (Preparing Package)</option>
                      <option value="SHIPPED">Shipped (Dispatched to Courier)</option>
                      <option value="DELIVERED">Delivered (Handed to Customer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Status Notes (Optional)</label>
                    <textarea
                      placeholder="e.g. Dispatched via BlueDart tracking ID BLD-9000123"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none resize-none placeholder-slate-600"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingItemId(null)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-4 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updating}
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-xl shadow-indigo-600/10 hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {updating ? (
                        <Loader2 className="animate-spin h-3.5 w-3.5" />
                      ) : (
                        'Save Update'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
