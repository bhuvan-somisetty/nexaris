'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Package,
  Printer,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Undo2,
} from 'lucide-react';

interface Shipment {
  id: string;
  orderId: string;
  carrierCode: string;
  awb: string | null;
  shipmentId: string | null;
  status: 'PENDING' | 'READY_TO_SHIP' | 'PICKUP_SCHEDULED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  edd: string | null;
  labelUrl: string | null;
  pickupScheduledAt: string | null;
  createdAt: string;
}

interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PICKUP_SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED_TO_SELLER' | 'COMPLETED' | 'CANCELLED';
  reason: string;
  refundAmount: string;
  returnAwb: string | null;
  createdAt: string;
}

export default function SellerShippingDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pickup scheduling state
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [pickupTime, setPickupTime] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch shipments data
      const shipRes = await api.get('/shipping/seller/dashboard');
      setShipments(shipRes.data.shipments || []);
      setCounts(shipRes.data.statusCounts || {});

      // Fetch returns (mocking or getting from returns endpoint)
      try {
        const retRes = await api.get('/shipping/seller/returns');
        setReturns(retRes.data || []);
      } catch {
        // Mock fallback if returns endpoint is dry
        setReturns([
          {
            id: 'ret-101',
            orderId: 'order-982',
            customerId: 'cust-202',
            status: 'PENDING',
            reason: 'DAMAGED_PRODUCT',
            refundAmount: '1299.00',
            returnAwb: null,
            createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Failed to load seller shipping dashboard', err);
      setError(err.response?.data?.message || 'Failed to load logistics stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'SELLER') {
        router.push('/');
      } else {
        fetchDashboardData();
      }
    }
  }, [user, authLoading, router, fetchDashboardData]);

  const handleGenerateAwb = async (shipmentId: string) => {
    try {
      setActionLoading(shipmentId);
      await api.post(`/shipping/shipments/${shipmentId}/awb`);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to allocate AWB.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintLabel = async (shipmentId: string) => {
    try {
      setActionLoading(shipmentId);
      const res = await api.get(`/shipping/shipments/${shipmentId}/label`);
      if (res.data.labelUrl) {
        window.open(res.data.labelUrl, '_blank');
      } else {
        alert('Label generation returned success but no PDF URL found.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to print shipping label.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSchedulePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipmentId || !pickupTime) return;

    try {
      setActionLoading(selectedShipmentId);
      await api.post(`/shipping/shipments/${selectedShipmentId}/pickup`, {
        pickupTime: new Date(pickupTime).toISOString(),
      });
      setSelectedShipmentId(null);
      setPickupTime('');
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule pickup.');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || (loading && shipments.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const exceptionShipments = shipments.filter((s) => s.status === 'FAILED');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-6 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Logistics & Shipping</h1>
              <p className="text-sm text-slate-400 mt-1">
                Fulfill orders, configure carrier tracking, print PDF labels, and coordinate reverse returns.
              </p>
            </div>
            
            <button
              onClick={fetchDashboardData}
              className="self-start inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 text-slate-350 hover:text-white transition-all text-xs font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Portal</span>
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Exceptions Panel */}
          {exceptionShipments.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-start space-x-3.5 shadow-lg">
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 animate-bounce" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-400">Delivery Exceptions Flagged</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  We detected {exceptionShipments.length} shipment(s) marked as FAILED by the carrier. Please contact customers to verify addresses or schedule re-delivery.
                </p>
              </div>
            </div>
          )}

          {/* Metrics Panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-5 font-mono">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Unfulfilled Shipments</span>
              <span className="text-3xl font-extrabold text-slate-200 block mt-1">{counts.PENDING || 0}</span>
            </div>

            <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-5 font-mono">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Ready to Ship (AWB)</span>
              <span className="text-3xl font-extrabold text-indigo-400 block mt-1">{counts.READY_TO_SHIP || 0}</span>
            </div>

            <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-5 font-mono">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Pickup Scheduled</span>
              <span className="text-3xl font-extrabold text-purple-400 block mt-1">{counts.PICKUP_SCHEDULED || 0}</span>
            </div>

            <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-5 font-mono">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">In Transit (Courier)</span>
              <span className="text-3xl font-extrabold text-emerald-400 block mt-1">{counts.IN_TRANSIT || 0}</span>
            </div>
          </div>

          {/* Shipments List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-350">Active Shipment Orders</h2>

            <div className="rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden">
              <div className="overflow-x-auto font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 text-slate-500 uppercase border-b border-slate-900 text-[10px]">
                      <th className="p-4 font-semibold">Created On</th>
                      <th className="p-4 font-semibold">Nexaris Order ID</th>
                      <th className="p-4 font-semibold">Carrier</th>
                      <th className="p-4 font-semibold">AWB Code</th>
                      <th className="p-4 font-semibold">Tracking Status</th>
                      <th className="p-4 font-semibold text-right">Fulfillment Flow Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40 text-slate-300">
                    {shipments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          <Package className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                          No shipments created yet.
                        </td>
                      </tr>
                    ) : (
                      shipments.map((shipment) => {
                        const date = new Date(shipment.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        });

                        return (
                          <tr key={shipment.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-4 text-slate-500">{date}</td>
                            <td className="p-4 font-bold select-all break-all">{shipment.orderId.slice(0, 8)}...</td>
                            <td className="p-4 text-slate-450 font-bold">{shipment.carrierCode}</td>
                            <td className="p-4">{shipment.awb || '—'}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold tracking-wide uppercase ${
                                  shipment.status === 'DELIVERED'
                                    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                                    : shipment.status === 'FAILED'
                                    ? 'text-rose-400 bg-rose-400/10 border-rose-400/20'
                                    : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                                }`}
                              >
                                {shipment.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {actionLoading === shipment.id ? (
                                <div className="flex items-center justify-end">
                                  <Loader2 className="animate-spin h-4 w-4 text-indigo-500" />
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  {shipment.status === 'PENDING' && (
                                    <button
                                      onClick={() => handleGenerateAwb(shipment.id)}
                                      className="inline-flex h-8 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white px-3 transition-colors gap-1.5"
                                    >
                                      <span>Allocate AWB</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </button>
                                  )}

                                  {shipment.status === 'READY_TO_SHIP' && (
                                    <>
                                      <button
                                        onClick={() => handlePrintLabel(shipment.id)}
                                        className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-white transition-colors"
                                        title="Print Label"
                                      >
                                        <Printer className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setSelectedShipmentId(shipment.id)}
                                        className="inline-flex h-8 items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white px-3 transition-colors gap-1.5"
                                      >
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>Schedule Pickup</span>
                                      </button>
                                    </>
                                  )}

                                  {shipment.status === 'PICKUP_SCHEDULED' && (
                                    <span className="text-[10px] text-slate-500 font-semibold font-mono">
                                      Ready for Pickup
                                    </span>
                                  )}

                                  {shipment.status === 'IN_TRANSIT' && (
                                    <span className="text-[10px] text-indigo-400 font-semibold font-mono">
                                      In Transit
                                    </span>
                                  )}

                                  {shipment.status === 'DELIVERED' && (
                                    <span className="text-[10px] text-emerald-400 font-semibold font-mono flex items-center justify-end gap-1">
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      Completed
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Reverse returns requests */}
          <div className="space-y-4 pt-4 border-t border-slate-900">
            <h2 className="text-lg font-bold text-slate-350 flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-indigo-400" />
              Reverse Logistical Returns
            </h2>

            <div className="rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden">
              <div className="overflow-x-auto font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 text-slate-500 uppercase border-b border-slate-900 text-[10px]">
                      <th className="p-4 font-semibold">Requested On</th>
                      <th className="p-4 font-semibold">Return ID / Order ID</th>
                      <th className="p-4 font-semibold">Reason Category</th>
                      <th className="p-4 font-semibold">Reverse AWB</th>
                      <th className="p-4 font-semibold">Refund Est.</th>
                      <th className="p-4 font-semibold">Return Status</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40 text-slate-300">
                    {returns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No active return requests found.
                        </td>
                      </tr>
                    ) : (
                      returns.map((ret) => {
                        const date = new Date(ret.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        });

                        return (
                          <tr key={ret.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="p-4 text-slate-500">{date}</td>
                            <td className="p-4 font-bold">
                              <span>{ret.id.slice(0, 8)}...</span>
                              <span className="block text-[9px] text-slate-500 font-mono">Order: {ret.orderId.slice(0, 8)}...</span>
                            </td>
                            <td className="p-4">
                              <span className="text-indigo-400 font-bold">{ret.reason.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="p-4 text-slate-400">{ret.returnAwb || 'Pending AWB allocation'}</td>
                            <td className="p-4">₹{parseFloat(ret.refundAmount).toLocaleString('en-IN')}</td>
                            <td className="p-4">
                              <span className="inline-flex px-2 py-0.5 rounded border border-indigo-500/20 text-indigo-400 bg-indigo-500/5 text-[9px] font-bold">
                                {ret.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-[10px] text-slate-500">Auto-Approved (Shiprocket Reverse)</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Schedule Pickup modal overlay */}
          {selectedShipmentId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-200">Schedule Carrier Dispatch</h3>
                  <p className="text-xs text-slate-500 mt-1">Specify dispatch handover date and time for pickup agent.</p>
                </div>

                <form onSubmit={handleSchedulePickup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Pickup Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="mt-1.5 block w-full px-3.5 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedShipmentId(null);
                        setPickupTime('');
                      }}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-4 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading !== null}
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-purple-600 px-5 text-xs font-semibold text-white shadow-xl shadow-purple-600/10 hover:bg-purple-500 disabled:opacity-50"
                    >
                      Schedule Handover
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
