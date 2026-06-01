'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { CheckCircle2, ShoppingBag, ArrowRight, Loader2, FileText, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  variantName?: string | null;
  price: string;
  quantity: number;
  productImage?: string | null;
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
}

interface Order {
  id: string;
  status: string;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
  createdAt: string;
  items: OrderItem[];
  shippingAddress?: OrderAddress | null;
}

function ConfirmationContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'CUSTOMER') {
        router.push('/');
        return;
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided.');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/orders/${orderId}`);
        setOrder(res.data);
      } catch (err: any) {
        console.error('Failed to load order', err);
        setError(err.response?.data?.message || 'Failed to retrieve order confirmation details.');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'CUSTOMER') {
      fetchOrder();
    }
  }, [orderId, user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm font-mono">Generating order receipt...</p>
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
            <h2 className="text-xl font-bold text-red-400">Order Confirmation Error</h2>
            <p className="text-slate-400 text-sm">{error || 'Unable to load order details.'}</p>
            <div className="pt-4 flex flex-col gap-2">
              <Link href="/products" className="w-full inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold hover:bg-slate-800 transition-colors">
                Return to Shop
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Header Success Section */}
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Order Confirmed!
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Thank you for your purchase. Your order has been placed successfully. A summary is detailed below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Receipt Summary Details */}
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                <h3 className="text-md font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2 font-mono uppercase tracking-wide">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  <span>Order Receipt</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-slate-900/50 pb-4">
                  <div>
                    <span className="text-slate-500 block mb-1">ORDER ID</span>
                    <span className="text-slate-200 break-all select-all font-bold">{order.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">DATE & TIME</span>
                    <span className="text-slate-200 font-bold">{formattedDate}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-900/60">
                  {order.items.map((item) => {
                    const price = parseFloat(item.price);
                    return (
                      <div key={item.id} className="flex py-3 gap-4 items-center">
                        <div className="h-12 w-12 rounded-lg bg-slate-900 border border-slate-900 overflow-hidden shrink-0 relative flex items-center justify-center">
                          {item.productImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.productImage} alt={item.productName} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-200 truncate">{item.productName}</h4>
                          {item.variantName && (
                            <span className="text-[10px] text-indigo-400 font-semibold">{item.variantName}</span>
                          )}
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Qty: {item.quantity} × ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <span className="text-sm font-bold font-mono text-slate-300">
                          ₹{(price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal, tax, shipping */}
                <div className="border-t border-slate-900 pt-4 space-y-2 text-xs font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-slate-200">₹{parseFloat(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%)</span>
                    <span className="text-slate-200">₹{parseFloat(order.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Charges</span>
                    <span className="text-slate-200">
                      {parseFloat(order.shipping) === 0 ? (
                        <span className="text-emerald-400 font-bold uppercase text-[10px]">Free</span>
                      ) : (
                        `₹${parseFloat(order.shipping).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      )}
                    </span>
                  </div>
                  <div className="border-t border-slate-900 pt-3 flex justify-between text-sm font-extrabold">
                    <span className="text-slate-200 font-bold">Grand Total</span>
                    <span className="text-indigo-400">₹{parseFloat(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Details: Delivery Address + Actions */}
            <div className="space-y-6">
              {order.shippingAddress && (
                <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <MapPin className="h-4 w-4 text-indigo-400" />
                    <span>Shipping Details</span>
                  </h3>
                  <div className="text-xs text-slate-350 leading-relaxed font-mono">
                    <p className="font-bold text-slate-200 text-sm mb-1">
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </p>
                    <p>{order.shippingAddress.street1}</p>
                    {order.shippingAddress.street2 && <p>{order.shippingAddress.street2}</p>}
                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}</p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Actions
                </h3>
                <div className="flex flex-col gap-2.5">
                  <Link
                    href={`/orders/${order.id}`}
                    className="w-full inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-xl shadow-indigo-600/10 hover:bg-indigo-500 transition-all text-xs"
                  >
                    <span>Track Order Status</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>

                  <Link
                    href="/products"
                    className="w-full inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs"
                  >
                    <span>Back to Shopping</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
