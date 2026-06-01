'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { XCircle, RefreshCw, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');
  const isExpired = searchParams.get('expired') === 'true';

  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    if (!paymentId || !orderId) return;
    setRetrying(true);
    setError(null);
    try {
      const res = await api.post(`/payments/${paymentId}/retry`);
      const updatedPaymentId = res.data.id;
      router.push(`/payment?orderId=${orderId}&paymentId=${updatedPaymentId}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to initiate retry. Please try again.');
      setRetrying(false);
    }
  };

  const handleCancel = async () => {
    if (!orderId) return;
    setCancelling(true);
    setError(null);
    try {
      await api.post(`/orders/${orderId}/cancel`, { notes: 'Cancelled by customer after payment failure.' });
      router.push('/orders');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to cancel order.');
      setCancelling(false);
    }
  };

  return (
    <main style={{ maxWidth: '520px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '32px' }}>
        <div style={{
          width: '100px', height: '100px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.05) 70%)',
          border: '2px solid rgba(239,68,68,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse-red 2s ease-in-out infinite',
          boxShadow: '0 0 40px rgba(239,68,68,0.3)'
        }}>
          <XCircle size={52} color="#ef4444" />
        </div>
      </div>

      <h1 style={{ color: '#ffffff', fontSize: '2.2rem', fontWeight: 800, margin: '0 0 12px' }}>
        Payment {isExpired ? 'Expired' : 'Failed'}
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '1rem', margin: '0 0 12px', lineHeight: 1.6 }}>
        {isExpired
          ? 'Your 15-minute payment window has expired. Your cart items are still reserved.'
          : 'Your payment could not be processed. Your order remains pending and no charges were made.'}
      </p>
      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 36px' }}>
        Inventory reservation is still active. You can retry without re-filling your cart.
      </p>

      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '28px', display: 'flex', alignItems: 'flex-start', gap: '12px', textAlign: 'left' }}>
        <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ color: '#fca5a5', fontWeight: 600, margin: '0 0 4px', fontSize: '0.9rem' }}>
            {isExpired ? 'Session Timeout' : 'Payment Declined'}
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
            {isExpired
              ? 'The 15-minute payment window has passed. Click Retry to get a fresh payment session.'
              : 'The mock payment provider rejected the transaction. This may happen in test mode with specific failure flags.'}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
          <p style={{ color: '#fca5a5', margin: 0, fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={handleRetry}
          disabled={retrying || cancelling}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: retrying || cancelling ? 'not-allowed' : 'pointer',
            background: retrying || cancelling ? 'rgba(100,116,139,0.3)' : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
            color: '#fff', fontWeight: 700, fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: retrying || cancelling ? 'none' : '0 8px 25px rgba(168,85,247,0.35)'
          }}
        >
          {retrying ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Retrying...</> : <><RefreshCw size={18} /> Retry Payment</>}
        </button>

        <button
          onClick={handleCancel}
          disabled={retrying || cancelling}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            border: '1px solid rgba(239,68,68,0.3)', cursor: retrying || cancelling ? 'not-allowed' : 'pointer',
            background: 'rgba(239,68,68,0.08)', color: '#f87171', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          {cancelling ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Cancelling...</> : <><Trash2 size={18} /> Cancel Order</>}
        </button>

        <Link href="/orders" style={{ textDecoration: 'none' }}>
          <button style={{
            width: '100%', padding: '12px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
            background: 'transparent', color: '#64748b', fontWeight: 500, fontSize: '0.9rem'
          }}>
            View My Orders
          </button>
        </Link>
      </div>
    </main>
  );
}

export default function PaymentFailedPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #1a0505 50%, #0f0c29 100%)', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <Loader2 size={40} color="#ef4444" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      }>
        <PaymentFailedContent />
      </Suspense>
      <style jsx global>{`
        @keyframes pulse-red { 0%,100%{box-shadow:0 0 40px rgba(239,68,68,0.3)} 50%{box-shadow:0 0 60px rgba(239,68,68,0.5)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
