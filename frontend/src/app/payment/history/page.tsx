'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Package, CheckCircle2, XCircle, Clock,
  AlertCircle, RefreshCw, Loader2, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface PaymentRecord {
  id: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  paymentMethod: string | null;
  createdAt: string;
  attempts: { attemptNumber: number; status: string; createdAt: string }[];
  refunds: { id: string; amount: number; status: string; reason: string | null }[];
  order: {
    id: string;
    status: string;
    total: number;
    createdAt: string;
    items: { productName: string; productImage: string | null }[];
  };
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: '#34d399', FAILED: '#ef4444', PENDING: '#f59e0b',
  PROCESSING: '#60a5fa', REFUNDED: '#a78bfa', PARTIALLY_REFUNDED: '#c084fc',
};
const STATUS_BG: Record<string, string> = {
  SUCCESS: 'rgba(52,211,153,0.12)', FAILED: 'rgba(239,68,68,0.12)', PENDING: 'rgba(245,158,11,0.12)',
  PROCESSING: 'rgba(96,165,250,0.12)', REFUNDED: 'rgba(167,139,250,0.12)', PARTIALLY_REFUNDED: 'rgba(192,132,252,0.12)',
};

export default function PaymentHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/payments/history');
      setPayments(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user) fetchHistory();
  }, [authLoading, user, fetchHistory, router]);

  const fmt = (n: number) => `₹${parseFloat(n?.toString() || '0').toFixed(2)}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const StatusBadge = ({ status }: { status: string }) => (
    <span style={{
      background: STATUS_BG[status] || 'rgba(100,116,139,0.12)',
      color: STATUS_COLORS[status] || '#94a3b8',
      padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
      border: `1px solid ${STATUS_COLORS[status] || '#94a3b8'}30`
    }}>{status.replace('_', ' ')}</span>
  );

  if (authLoading || loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      <Header />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Loader2 size={40} color="#a855f7" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', fontFamily: 'Inter, sans-serif' }}>
      <Header />
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} color="#a855f7" />
            </div>
            <h1 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>Payment History</h1>
          </div>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>{payments.length} payment{payments.length !== 1 ? 's' : ''} found</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <AlertCircle size={18} color="#ef4444" /><p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
          </div>
        )}

        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <CreditCard size={48} color="#334155" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#64748b', fontSize: '1rem' }}>No payments yet. Start shopping to see your payment history here.</p>
            <Link href="/products" style={{ color: '#a855f7', fontSize: '0.9rem' }}>Browse Products →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {payments.map((p) => (
              <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                {/* Main Row */}
                <div
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
                >
                  {/* Product thumbnails */}
                  <div style={{ display: 'flex', flexShrink: 0 }}>
                    {p.order.items.slice(0, 2).map((item, i) => (
                      <div key={i} style={{ width: '44px', height: '44px', borderRadius: '10px', marginLeft: i > 0 ? '-10px' : 0, background: item.productImage ? `url(${item.productImage}) center/cover` : 'rgba(168,85,247,0.15)', border: '2px solid rgba(15,12,41,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!item.productImage && <Package size={16} color="#a855f7" />}
                      </div>
                    ))}
                    {p.order.items.length > 2 && (
                      <div style={{ width: '44px', height: '44px', borderRadius: '10px', marginLeft: '-10px', background: 'rgba(100,116,139,0.3)', border: '2px solid rgba(15,12,41,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700 }}>
                        +{p.order.items.length - 2}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <p style={{ color: '#e2e8f0', fontWeight: 600, margin: 0, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Order #{p.order.id.slice(-8).toUpperCase()}
                      </p>
                      <StatusBadge status={p.status} />
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                      {fmtDate(p.createdAt)} · {p.provider} · {p.paymentMethod || 'MOCK'} · {p.attempts.length} attempt{p.attempts.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: '#a855f7', fontWeight: 700, fontSize: '1.05rem', margin: '0 0 4px' }}>{fmt(p.amount)}</p>
                    <ChevronRight size={16} color="#475569" style={{ transform: expanded === p.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                </div>

                {/* Expanded Detail */}
                {expanded === p.id && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', background: 'rgba(0,0,0,0.2)' }}>
                    {/* Attempt history */}
                    {p.attempts.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Attempt History</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {p.attempts.map((a) => (
                            <div key={a.attemptNumber} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                              {a.status === 'SUCCESS' ? <CheckCircle2 size={14} color="#34d399" /> : a.status === 'FAILED' ? <XCircle size={14} color="#ef4444" /> : <Clock size={14} color="#f59e0b" />}
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Attempt #{a.attemptNumber}</span>
                              <StatusBadge status={a.status} />
                              <span style={{ color: '#475569', fontSize: '0.75rem', marginLeft: 'auto' }}>{fmtDate(a.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Refunds */}
                    {p.refunds.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Refunds</p>
                        {p.refunds.map((r) => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(167,139,250,0.06)', borderRadius: '8px' }}>
                            <RefreshCw size={14} color="#a78bfa" />
                            <span style={{ color: '#c4b5fd', fontSize: '0.85rem' }}>{fmt(r.amount)} refund</span>
                            <StatusBadge status={r.status} />
                            {r.reason && <span style={{ color: '#475569', fontSize: '0.78rem' }}>— {r.reason}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    <Link href={`/orders/${p.order.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#a855f7', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
                      View Order <ChevronRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <style jsx global>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
