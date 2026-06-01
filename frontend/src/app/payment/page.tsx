'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CreditCard, ShieldCheck, Clock, Loader2, AlertCircle,
  Package, ChevronRight, Zap, Lock
} from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  productImage: string | null;
  variantName: string | null;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  items: OrderItem[];
}

interface Payment {
  id: string;
  status: string;
  amount: number;
  expiresAt: string;
  providerOrderId: string | null;
}

function PaymentPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams.get('orderId');
  const paymentId = searchParams.get('paymentId');

  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes in seconds

  const fetchOrderAndPayment = useCallback(async () => {
    if (!orderId || !paymentId) return;
    try {
      setLoading(true);
      const [orderRes, paymentRes] = await Promise.all([
        api.get(`/orders/${orderId}`),
        api.get(`/payments/orders/${orderId}`),
      ]);
      setOrder(orderRes.data);
      setPayment(paymentRes.data);

      // Calculate time remaining from expiresAt
      const expiresAt = new Date(paymentRes.data.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(remaining);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load payment details.');
    } finally {
      setLoading(false);
    }
  }, [orderId, paymentId]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user) fetchOrderAndPayment();
  }, [authLoading, user, fetchOrderAndPayment, router]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handlePay = async () => {
    if (!payment || !orderId) return;
    setProcessing(true);
    setError(null);
    try {
      const result = await api.post(`/payments/${payment.id}/verify`, {
        providerPaymentId: `mock_pay_${Date.now()}`,
        paymentMethod: 'MOCK',
        simulateFailure: false,
      });

      const status = result.data?.status;
      if (status === 'SUCCESS') {
        router.push(`/payment/success?orderId=${orderId}`);
      } else {
        router.push(`/payment/failed?paymentId=${payment.id}&orderId=${orderId}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Payment processing failed. Please try again.');
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={48} color="#a855f7" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#c4b5fd', fontSize: '1.1rem' }}>Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!orderId || !paymentId || !order || !payment) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <div style={{ textAlign: 'center', color: '#f87171' }}>
            <AlertCircle size={48} style={{ margin: '0 auto 16px' }} />
            <p>Invalid payment session. <Link href="/orders" style={{ color: '#a855f7' }}>View your orders</Link></p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = timeLeft === 0;
  const fmt = (n: number) => `₹${parseFloat(n.toString()).toFixed(2)}`;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', fontFamily: 'Inter, sans-serif' }}>
      <Header />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '100px', padding: '8px 20px', marginBottom: '16px' }}>
            <Lock size={14} color="#a855f7" />
            <span style={{ color: '#a855f7', fontSize: '0.85rem', fontWeight: 600 }}>Secure Payment</span>
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '2rem', fontWeight: 700, margin: '0 0 8px' }}>Complete Your Payment</h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>Order #{order.id.slice(-8).toUpperCase()}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>

          {/* Left — Payment Form */}
          <div>
            {/* Timer */}
            <div style={{
              background: isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(168,85,247,0.1)',
              border: `1px solid ${isExpired ? 'rgba(239,68,68,0.3)' : 'rgba(168,85,247,0.3)'}`,
              borderRadius: '16px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px'
            }}>
              <Clock size={20} color={isExpired ? '#ef4444' : '#a855f7'} />
              <div>
                <p style={{ color: isExpired ? '#ef4444' : '#c4b5fd', fontWeight: 600, margin: 0, fontSize: '0.9rem' }}>
                  {isExpired ? 'Payment window expired' : `Payment window: ${formatTime(timeLeft)}`}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                  {isExpired ? 'Please retry from your orders page.' : 'Complete payment before the session expires.'}
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <AlertCircle size={18} color="#ef4444" />
                <p style={{ color: '#fca5a5', margin: 0, fontSize: '0.9rem' }}>{error}</p>
              </div>
            )}

            {/* Mock Payment Card */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <CreditCard size={22} color="#a855f7" />
                <h2 style={{ color: '#fff', fontWeight: 600, margin: 0, fontSize: '1.1rem' }}>Mock Payment Provider</h2>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: '14px', padding: '24px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(168,85,247,0.2)' }} />
                <div style={{ position: 'absolute', bottom: '-30px', left: '30%', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)' }} />
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '2px', margin: '0 0 12px', textTransform: 'uppercase' }}>Mock Card</p>
                <p style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 600, letterSpacing: '4px', margin: '0 0 16px', fontFamily: 'monospace' }}>•••• •••• •••• 4242</p>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#c4b5fd', fontSize: '0.85rem' }}>TEST USER</span>
                  <span style={{ color: '#c4b5fd', fontSize: '0.85rem' }}>12/99</span>
                </div>
              </div>

              <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 20px', lineHeight: 1.5 }}>
                This is a mock payment environment. No real transaction will occur.
                In production, this will be replaced by the Razorpay payment widget.
              </p>

              <button
                onClick={handlePay}
                disabled={processing || isExpired}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px', border: 'none', cursor: processing || isExpired ? 'not-allowed' : 'pointer',
                  background: processing || isExpired ? 'rgba(100,116,139,0.3)' : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                  color: '#fff', fontSize: '1rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'all 0.2s', boxShadow: processing || isExpired ? 'none' : '0 8px 25px rgba(168,85,247,0.4)'
                }}
              >
                {processing ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing payment...</>
                ) : isExpired ? (
                  <>Session Expired</>
                ) : (
                  <><Zap size={18} /> Pay {fmt(order.total)}</>
                )}
              </button>

              {isExpired && (
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <Link href={`/payment/failed?paymentId=${payment.id}&orderId=${orderId}&expired=true`} style={{ color: '#a855f7', fontSize: '0.9rem' }}>
                    Retry payment →
                  </Link>
                </div>
              )}
            </div>

            {/* Security Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem' }}>
              <ShieldCheck size={14} />
              <span>256-bit SSL encryption · PCI DSS Compliant architecture</span>
            </div>
          </div>

          {/* Right — Order Summary */}
          <div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px', position: 'sticky', top: '20px' }}>
              <h3 style={{ color: '#fff', fontWeight: 600, margin: '0 0 20px', fontSize: '1rem' }}>Order Summary</h3>

              {/* Items */}
              <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {order.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: item.productImage ? `url(${item.productImage}) center/cover` : 'rgba(168,85,247,0.15)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!item.productImage && <Package size={18} color="#a855f7" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#e2e8f0', fontWeight: 500, margin: '0 0 2px', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</p>
                      {item.variantName && <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>{item.variantName}</p>}
                      <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>Qty: {item.quantity}</p>
                    </div>
                    <span style={{ color: '#c4b5fd', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {fmt(parseFloat(item.price.toString()) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Subtotal', value: fmt(order.subtotal) },
                  { label: 'GST (18%)', value: fmt(order.tax) },
                  { label: 'Shipping', value: parseFloat(order.shipping.toString()) === 0 ? 'FREE' : fmt(order.shipping) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{row.label}</span>
                    <span style={{ color: row.value === 'FREE' ? '#34d399' : '#e2e8f0', fontSize: '0.85rem' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Total</span>
                  <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '1.1rem' }}>{fmt(order.total)}</span>
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Link href="/orders" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', textDecoration: 'none' }}>
                  <ChevronRight size={14} /> View all orders
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <Loader2 size={48} color="#a855f7" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}
