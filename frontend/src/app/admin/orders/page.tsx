'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Shield, Coins, DollarSign, Calendar, Search, RefreshCw, AlertCircle, ShoppingBag, Eye, Edit3, Loader2, BarChart2 } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  price: string;
  quantity: number;
}

interface Order {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  createdAt: string;
  items: OrderItem[];
  customer: {
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    } | null;
  };
}

export default function AdminOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Status override states
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<Order['status']>('CONFIRMED');
  const [overrideNotes, setOverrideNotes] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/orders');
      setOrders(res.data.orders || []);
    } catch (err: any) {
      console.error('Failed to load admin orders', err);
      setError(err.response?.data?.message || 'Failed to retrieve admin order control center.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        router.push('/');
      } else {
        fetchAllOrders();
      }
    }
  }, [user, authLoading, router]);

  const handleAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrderId) return;

    try {
      setUpdating(true);
      setError(null);
      await api.patch(`/orders/${editingOrderId}/admin-override`, {
        status: newStatus,
        notes: overrideNotes || `Admin manually overrode order status to ${newStatus}.`,
      });
      setEditingOrderId(null);
      setOverrideNotes('');
      await fetchAllOrders();
    } catch (err: any) {
      console.error('Override status failed', err);
      setError(err.response?.data?.message || 'Failed to override order status.');
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

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
    const customerName = order.customer.profile
      ? `${order.customer.profile.firstName} ${order.customer.profile.lastName}`.toLowerCase()
      : '';
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate high-level stats
  const stats = orders.reduce(
    (acc, order) => {
      const orderTotal = parseFloat(order.total);
      if (order.status !== 'CANCELLED') {
        acc.totalGmv += orderTotal;
      }
      acc.statusCounts[order.status] = (acc.statusCounts[order.status] || 0) + 1;
      return acc;
    },
    { totalGmv: 0, statusCounts: {} as Record<string, number> }
  );

  const getOrderStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'CONFIRMED':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'PROCESSING':
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
      case 'SHIPPED':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      case 'DELIVERED':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'CANCELLED':
      case 'REFUNDED':
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
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-indigo-400" />
                <span className="text-[10px] font-bold font-mono tracking-widest text-indigo-400 uppercase">System Console</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mt-1">Orders Administration</h1>
              <p className="text-sm text-slate-400 mt-1">Global audit ledger, financial summary, and hard state overrides.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchAllOrders}
                disabled={loading}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 text-slate-400 hover:text-white transition-colors"
                title="Refresh master ledger"
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

          {/* Quick Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wide">Gross merchandise value</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold text-slate-200">₹{stats.totalGmv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <span className="text-[9px] text-slate-500 block leading-tight">Excludes active cancelled orders.</span>
            </div>
            
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wide">Pending Dispatch</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold text-amber-400">
                  {(stats.statusCounts['CONFIRMED'] || 0) + (stats.statusCounts['PROCESSING'] || 0)}
                </span>
                <span className="text-xs text-slate-500">orders</span>
              </div>
              <span className="text-[9px] text-slate-500 block leading-tight">Awaiting shipment completion.</span>
            </div>

            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wide">Delivered Shipments</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold text-emerald-400">{stats.statusCounts['DELIVERED'] || 0}</span>
                <span className="text-xs text-slate-500">orders</span>
              </div>
              <span className="text-[9px] text-slate-500 block leading-tight">Delivered successfully.</span>
            </div>

            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-5 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wide">Cancellation Rate</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold text-rose-400">
                  {orders.length > 0
                    ? `${(((stats.statusCounts['CANCELLED'] || 0) / orders.length) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
                <span className="text-xs text-slate-500">({stats.statusCounts['CANCELLED'] || 0} orders)</span>
              </div>
              <span className="text-[9px] text-slate-500 block leading-tight">Order rollback configurations activated.</span>
            </div>
          </div>

          {/* Filter & Search Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/10 border border-slate-900 p-4 rounded-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by order ID, email, or name..."
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
                <option value="ALL">All Order Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <div className="flex items-center justify-end text-xs font-mono text-slate-500">
              Showing {filteredOrders.length} of {orders.length} order(s)
            </div>
          </div>

          {/* Master Table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl">
              <ShoppingBag className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-400">No matching orders</h3>
              <p className="text-xs text-slate-500 mt-1">Adjust filters or search parameters to verify order entries.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 font-mono uppercase border-b border-slate-900">
                      <th className="p-4 font-semibold">Ordered On</th>
                      <th className="p-4 font-semibold">Order ID</th>
                      <th className="p-4 font-semibold">Customer</th>
                      <th className="p-4 font-semibold">Items Count</th>
                      <th className="p-4 font-semibold">Total Revenue</th>
                      <th className="p-4 font-semibold">State</th>
                      <th className="p-4 font-semibold text-right">Overrides</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40">
                    {filteredOrders.map((order) => {
                      const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                      const itemsCount = order.items.reduce((acc, it) => acc + it.quantity, 0);

                      return (
                        <tr key={order.id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="p-4 text-slate-350 font-mono">{orderDate}</td>
                          <td className="p-4 font-mono font-bold select-all break-all text-slate-300">
                            {order.id}
                          </td>
                          <td className="p-4">
                            <span className="text-slate-300 font-bold block">
                              {order.customer.profile
                                ? `${order.customer.profile.firstName} ${order.customer.profile.lastName}`
                                : 'Customer'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{order.customer.email}</span>
                          </td>
                          <td className="p-4 text-slate-300 font-mono">{itemsCount} items</td>
                          <td className="p-4 font-mono font-bold text-indigo-400">
                            ₹{parseFloat(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold font-mono tracking-wide uppercase ${getOrderStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingOrderId(order.id);
                                  setNewStatus(order.status);
                                }}
                                className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-lg transition-all"
                                title="Force override order status"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>

                              <Link
                                href={`/orders/${order.id}`}
                                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-white transition-colors"
                                title="Inspect order details"
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

          {/* Admin Override modal */}
          {editingOrderId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-200">Force Order Status Override</h3>
                  <p className="text-xs text-slate-500 mt-1">WARNING: Setting to CANCELLED or REFUNDED will trigger database triggers to automatically return allocated quantities to stock.</p>
                </div>

                <form onSubmit={handleAdminOverride} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Force State To</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as Order['status'])}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none cursor-pointer"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED (Stock Reversion)</option>
                      <option value="REFUNDED">REFUNDED (Stock Reversion)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Override Reason / Audit Notes</label>
                    <textarea
                      placeholder="e.g. Forced cancel due to delivery courier routing issue."
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                      rows={3}
                      required
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none resize-none placeholder-slate-600"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingOrderId(null)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-4 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updating}
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-500 px-5 text-xs font-semibold text-white shadow-xl shadow-red-600/10 disabled:opacity-50"
                    >
                      {updating ? (
                        <Loader2 className="animate-spin h-3.5 w-3.5" />
                      ) : (
                        'Force Override State'
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
