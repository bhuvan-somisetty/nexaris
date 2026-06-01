'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Package, Calendar, ChevronRight, Loader2, RefreshCw, AlertCircle, ShoppingBag, XCircle } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  variantName?: string | null;
  price: string;
  quantity: number;
  productImage?: string | null;
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
}

export default function CustomerOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'SELLER') {
        router.push('/seller/orders');
      } else if (user.role === 'ADMIN') {
        router.push('/admin/orders');
      }
    }
  }, [user, authLoading, router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/orders');
      // Backend returns { orders: [...], total: ... }
      setOrders(res.data.orders || []);
    } catch (err: any) {
      console.error('Failed to load orders', err);
      setError(err.response?.data?.message || 'Failed to retrieve order history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'CUSTOMER') {
      fetchOrders();
    }
  }, [user]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await api.post(`/orders/${orderId}/cancel`, { notes: 'Cancelled by customer.' });
      await fetchOrders();
    } catch (err: any) {
      console.error('Failed to cancel order', err);
      alert(err.response?.data?.message || 'Failed to cancel order.');
      setLoading(false);
    }
  };

  if (authLoading || (loading && orders.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  // Filter orders on client side
  const filteredOrders = filterStatus === 'ALL'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'CONFIRMED':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'PROCESSING':
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400';
      case 'SHIPPED':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      case 'DELIVERED':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      default:
        return 'bg-slate-500/10 border-slate-500/30 text-slate-400';
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-6 mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Your Orders</h1>
              <p className="text-sm text-slate-400 mt-1">Track fulfillment status, view receipts, and cancel active shipments.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3.5 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <button
                onClick={fetchOrders}
                disabled={loading}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 text-slate-400 hover:text-white transition-colors"
                title="Refresh order logs"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 mb-8 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/10 rounded-3xl border border-slate-900/60 flex flex-col items-center justify-center">
              <Package className="h-12 w-12 text-slate-600 mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-slate-300">No Orders Found</h3>
              <p className="text-slate-500 text-xs mt-1 mb-8 max-w-sm">
                {filterStatus === 'ALL'
                  ? "You haven't placed any orders yet. Head to the discovery page to make a purchase."
                  : `You don't have any orders with status "${filterStatus}".`}
              </p>
              <Link href="/products" className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 font-semibold hover:bg-indigo-500 transition-colors text-sm shadow-xl shadow-indigo-600/10">
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => {
                const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                
                const itemTotalCount = order.items.reduce((acc, it) => acc + it.quantity, 0);
                const firstItem = order.items[0];
                const displayTotal = parseFloat(order.total).toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 2,
                });

                return (
                  <div key={order.id} className="rounded-2xl border border-slate-900 bg-slate-900/20 hover:border-slate-800 transition-all duration-200 overflow-hidden">
                    {/* Header info */}
                    <div className="bg-slate-900/40 px-6 py-4 flex flex-wrap justify-between items-center gap-4 border-b border-slate-900">
                      <div className="flex items-center space-x-6">
                        <div className="text-xs font-mono">
                          <span className="text-slate-500 block mb-0.5">ORDER PLACED</span>
                          <span className="text-slate-300 font-semibold">{date}</span>
                        </div>
                        <div className="text-xs font-mono">
                          <span className="text-slate-500 block mb-0.5">TOTAL BILL</span>
                          <span className="text-slate-200 font-extrabold">{displayTotal}</span>
                        </div>
                        <div className="text-xs font-mono hidden sm:block">
                          <span className="text-slate-500 block mb-0.5">ORDER ID</span>
                          <span className="text-slate-400 select-all font-semibold break-all">{order.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold font-mono tracking-wider uppercase px-2.5 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    {/* Content info */}
                    <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-16 w-16 rounded-xl bg-slate-900 border border-slate-850 overflow-hidden shrink-0 relative flex items-center justify-center">
                          {firstItem?.productImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={firstItem.productImage} alt={firstItem.productName} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-6 w-6 text-slate-700" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-200 truncate">
                            {firstItem?.productName || 'Unknown Product'}
                          </h3>
                          {firstItem?.variantName && (
                            <span className="text-[10px] text-indigo-400 font-semibold">{firstItem.variantName}</span>
                          )}
                          <p className="text-xs text-slate-500 font-mono mt-1">
                            {itemTotalCount > 1
                              ? `And ${itemTotalCount - 1} other item(s) in this order.`
                              : `Quantity: ${firstItem?.quantity || 1}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {(order.status === 'CONFIRMED' || order.status === 'PENDING') && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-xs font-semibold text-rose-400 hover:text-white px-4 transition-all"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            <span>Cancel Order</span>
                          </button>
                        )}
                        
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white px-4 transition-all"
                        >
                          <span>Manage Order</span>
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
