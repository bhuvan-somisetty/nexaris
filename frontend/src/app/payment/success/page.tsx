'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { CheckCircle2, Package, ArrowRight, Home, Loader2 } from 'lucide-react';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) { router.push('/orders'); return; }
    api.get(`/orders/${orderId}`)
      .then(res => setOrder(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId, router]);

  const fmt = (n: number) => `₹${parseFloat(n?.toString() || '0').toFixed(2)}`;

  return (
    <main style={{ maxWidth: '560px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '32px' }}>
        <div style={{
          width: '100px', height: '100px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.2) 0%, rgba(52,211,153,0.05) 70%)',
          border: '2px solid rgba(52,211,153,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 2s ease-in-out infinite',
          boxShadow: '0 0 40px rgba(52,211,153,0.3)'
        }}>
          <CheckCircle2 size={52} color="#34d399" />
        </div>
      </div>

      <h1 style={{ color: '#ffffff', fontSize: '2.2rem', fontWeight: 800, margin: '0 0 12px' }}>
        Payment Successful! 🎉
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '1.05rem', margin: '0 0 40px', lineHeight: 1.6 }}>
        Your order has been confirmed and is being processed. You'll receive updates as it progresses.
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <Loader2 size={28} color="#34d399" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : order && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '20px', padding: '24px', marginBottom: '32px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Order ID</span>
            <span style={{ color: '#34d399', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>
              #{order.id?.slice(-10).toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Status</span>
            <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600 }}>CONFIRMED</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Amount Paid</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>{fmt(order.total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Items</span>
            <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link href={`/orders/${orderId}`} style={{ textDecoration: 'none' }}>
          <button style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
            color: '#fff', fontWeight: 700, fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 8px 25px rgba(52,211,153,0.35)'
          }}>
            <Package size={18} /> Track Your Order <ArrowRight size={16} />
          </button>
        </Link>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            <Home size={18} /> Continue Shopping
          </button>
        </Link>
      </div>

      <p style={{ color: '#475569', fontSize: '0.8rem', marginTop: '32px' }}>
        A confirmation has been logged to your order history.
      </p>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1f0d 50%, #0a0f1e 100%)', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <Loader2 size={40} color="#34d399" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      }>
        <PaymentSuccessContent />
      </Suspense>
      <style jsx global>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 40px rgba(52,211,153,0.3)} 50%{box-shadow:0 0 60px rgba(52,211,153,0.5)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
