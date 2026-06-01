'use client';

import React, { useEffect, useState, use } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, MapPin, Calendar, CreditCard, ShoppingBag, CheckCircle, Clock, Truck, ShieldCheck, XCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface OrderTimeline {
  id: string;
  status: string;
  notes?: string | null;
  createdAt: string;
}

interface OrderItem {
  id: string;
  productId?: string | null;
  productName: string;
  productSlug: string;
  variantName?: string | null;
  price: string;
  quantity: number;
  productImage?: string | null;
  fulfillmentStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}

interface OrderAddress {
  firstName: string;
  lastName: string;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
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
  shippingAddress?: OrderAddress | null;
  timeline: OrderTimeline[];
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (err: any) {
      console.error('Failed to load order detail', err);
      setError(err.response?.data?.message || 'Order could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchOrderDetail();
      }
    }
  }, [user, authLoading, id, router]);

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order? All items will be returned to store inventory.')) {
      return;
    }

    try {
      setCancelling(true);
      setError(null);
      await api.post(`/orders/${id}/cancel`, { notes: 'Cancelled by customer from details page.' });
      await fetchOrderDetail();
    } catch (err: any) {
      console.error('Failed to cancel order', err);
      setError(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm font-mono">Fetching status tracker...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <>
        <Header />
        <div className="flex-1 bg-slate-950 text-white flex flex-col items-center justify-center py-20 px-4">
          <div className="max-w-md w-full bg-slate-900/30 border border-slate-900 rounded-2xl p-6 text-center space-y-4">
            <h2 className="text-xl font-bold text-red-400">Order Inquiry Failed</h2>
            <p className="text-slate-400 text-sm">{error || 'Order detail details could not be retrieved.'}</p>
            <div className="pt-4 flex flex-col gap-2">
              <Link href="/orders" className="w-full inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold hover:bg-slate-800 transition-colors">
                Back to Orders List
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Calculate order progress steps
  const steps = [
    { label: 'Confirmed', status: 'CONFIRMED', icon: ShieldCheck },
    { label: 'Processing', status: 'PROCESSING', icon: Clock },
    { label: 'Shipped', status: 'SHIPPED', icon: Truck },
    { label: 'Delivered', status: 'DELIVERED', icon: CheckCircle },
  ];

  const getStepState = (stepStatus: string) => {
    const statusSequence = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const currentIdx = statusSequence.indexOf(order.status);
    const stepIdx = statusSequence.indexOf(stepStatus);

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      return 'cancelled';
    }

    if (currentIdx >= stepIdx) {
      return currentIdx === stepIdx ? 'active' : 'completed';
    }
    return 'upcoming';
  };

  const getFulfillmentItemColor = (status: OrderItem['fulfillmentStatus']) => {
    switch (status) {
      case 'PENDING':
        return 'text-amber-400 bg-amber-400/5 border-amber-500/20';
      case 'PROCESSING':
        return 'text-indigo-400 bg-indigo-400/5 border-indigo-500/20';
      case 'SHIPPED':
        return 'text-purple-400 bg-purple-400/5 border-purple-500/20';
      case 'DELIVERED':
        return 'text-emerald-400 bg-emerald-400/5 border-emerald-500/20';
      case 'CANCELLED':
        return 'text-rose-400 bg-rose-400/5 border-rose-500/20';
    }
  };

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          
          {/* Top navigation */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-5">
            <div className="flex items-center space-x-3">
              <Link
                href="/orders"
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 hover:text-white text-slate-400 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Order Tracking</h1>
                <p className="text-[10px] font-mono text-indigo-400 mt-0.5 select-all">{order.id}</p>
              </div>
            </div>

            {(order.status === 'CONFIRMED' || order.status === 'PENDING') && (
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-xs font-semibold text-rose-400 hover:text-white px-4 transition-all disabled:opacity-50"
              >
                {cancelling ? (
                  <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                )}
                <span>Cancel Order</span>
              </button>
            )}
          </div>

          {/* Stepper Tracking Visual Timeline */}
          {order.status === 'CANCELLED' || order.status === 'REFUNDED' ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-400">Order Cancelled</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  This order has been cancelled and refunded. All items and quantities have been successfully restored to the product inventories.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-8">
              <div className="relative flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4">
                {/* Horizontal progress bar */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-900 -translate-y-1/2 hidden md:block z-0" />
                
                {steps.map((step, idx) => {
                  const state = getStepState(step.status);
                  const Icon = step.icon;

                  let colorClasses = '';
                  let badgeClasses = '';

                  if (state === 'completed') {
                    colorClasses = 'text-emerald-400';
                    badgeClasses = 'bg-emerald-500/10 border-emerald-500 text-emerald-400';
                  } else if (state === 'active') {
                    colorClasses = 'text-indigo-400';
                    badgeClasses = 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/20 animate-pulse';
                  } else {
                    colorClasses = 'text-slate-500';
                    badgeClasses = 'bg-slate-900 border-slate-800 text-slate-500';
                  }

                  return (
                    <div key={idx} className="flex flex-col items-center text-center z-10 space-y-3 flex-1">
                      <div className={`h-11 w-11 rounded-full border flex items-center justify-center transition-all duration-300 ${badgeClasses}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className={`text-xs font-bold ${colorClasses}`}>{step.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Shipment items and billing */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Order Items Snapshot */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-4">
                <h3 className="text-md font-bold text-slate-200 border-b border-slate-900 pb-3 font-mono uppercase tracking-wide">
                  Order Items
                </h3>

                <div className="divide-y divide-slate-900/60">
                  {order.items.map((item) => {
                    const price = parseFloat(item.price);
                    return (
                      <div key={item.id} className="flex flex-col sm:flex-row py-4 gap-4 sm:items-center">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="h-12 w-12 rounded-lg bg-slate-900 border border-slate-900 overflow-hidden shrink-0 relative flex items-center justify-center">
                            {item.productImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                            ) : (
                              <ShoppingBag className="h-5 w-5 text-slate-700" />
                            )}
                          </div>
                          <div className="min-w-0">
                            {item.productId ? (
                              <Link href={`/products/${item.productSlug}`} className="text-sm font-bold text-slate-200 hover:text-indigo-400 transition-colors truncate block">
                                {item.productName}
                              </Link>
                            ) : (
                              <span className="text-sm font-bold text-slate-400 truncate block">
                                {item.productName} (Deleted)
                              </span>
                            )}
                            
                            {item.variantName && (
                              <span className="text-[10px] text-indigo-400 font-semibold">{item.variantName}</span>
                            )}
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              Qty: {item.quantity} × ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                          <span className="text-sm font-bold font-mono text-slate-250">
                            ₹{(price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          
                          <span className={`text-[9px] font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded border ${getFulfillmentItemColor(item.fulfillmentStatus)}`}>
                            {item.fulfillmentStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Timeline History */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-4">
                <h3 className="text-md font-bold text-slate-200 border-b border-slate-900 pb-3 font-mono uppercase tracking-wide">
                  Fulfillment Timeline
                </h3>

                <div className="relative pl-6 border-l border-slate-900 space-y-6 py-2 ml-3">
                  {order.timeline.map((entry) => {
                    const entryDate = new Date(entry.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={entry.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 border border-slate-950 ring-4 ring-indigo-500/10" />
                        <div>
                          <span className="text-[10px] font-mono text-slate-500">{entryDate}</span>
                          <h4 className="text-xs font-bold text-slate-250 mt-0.5">{entry.status}</h4>
                          {entry.notes && (
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed bg-slate-900/30 border border-slate-900 p-2.5 rounded-lg font-mono">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Billing & Delivery summary */}
            <div className="space-y-6">
              {/* Delivery Details */}
              {order.shippingAddress && (
                <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <MapPin className="h-4 w-4 text-indigo-400" />
                    <span>Shipping Address</span>
                  </h3>
                  <div className="text-xs text-slate-350 leading-relaxed font-mono">
                    <p className="font-bold text-slate-200 text-sm mb-1.5">
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </p>
                    <p>{order.shippingAddress.street1}</p>
                    {order.shippingAddress.street2 && <p>{order.shippingAddress.street2}</p>}
                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}</p>
                    <p>{order.shippingAddress.country}</p>
                    {order.shippingAddress.phone && (
                      <p className="text-[10px] text-slate-500 mt-3 border-t border-slate-900/50 pt-2 font-mono">
                        Phone: {order.shippingAddress.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Billing breakdown */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <CreditCard className="h-4 w-4 text-indigo-400" />
                  <span>Cost Summary</span>
                </h3>

                <div className="space-y-3.5 text-xs font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-slate-200">₹{parseFloat(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%)</span>
                    <span className="font-semibold text-slate-200">₹{parseFloat(order.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Charges</span>
                    <span className="font-semibold text-slate-200 font-mono">
                      {parseFloat(order.shipping) === 0 ? (
                        <span className="text-emerald-400 font-bold uppercase text-[10px]">Free</span>
                      ) : (
                        `₹${parseFloat(order.shipping).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      )}
                    </span>
                  </div>

                  <div className="border-t border-slate-900 pt-4 flex justify-between text-sm font-extrabold">
                    <span className="text-slate-200 font-bold">Grand Total</span>
                    <span className="text-indigo-400 font-bold">₹{parseFloat(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-4 text-[10px] text-slate-500 font-mono space-y-1">
                  <p>Ordered on: {orderDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
