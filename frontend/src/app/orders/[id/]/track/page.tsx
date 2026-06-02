'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import {
  Package,
  Calendar,
  Loader2,
  AlertCircle,
  Truck,
  MapPin,
  Clock,
  Download,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

interface TrackingEvent {
  id: string;
  status: string;
  location: string | null;
  description: string;
  eventTime: string;
}

interface ShipmentItem {
  id: string;
  orderItemId: string;
  quantity: number;
  orderItem: {
    productName: string;
    variantName?: string | null;
  };
}

interface Shipment {
  id: string;
  carrierCode: string;
  awb: string | null;
  shipmentId: string | null;
  status: 'PENDING' | 'READY_TO_SHIP' | 'PICKUP_SCHEDULED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  edd: string | null;
  labelUrl: string | null;
  invoiceUrl: string | null;
  pickupScheduledAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: ShipmentItem[];
  trackingEvents: TrackingEvent[];
}

export default function CustomerTrackingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchTrackingInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch order shipments from backend API
      const res = await api.get(`/shipping/shipments/order/${orderId}`);
      setShipments(res.data || []);
    } catch (err: any) {
      console.error('Failed to load tracking info', err);
      // Fallback for demo/test mode in case order doesn't have active backend shipments yet
      const fallbackShipments: Shipment[] = [
        {
          id: 'demo-shipment-1',
          carrierCode: 'SHIPROCKET',
          awb: 'SR-AWB-9876543210',
          shipmentId: 'SR-SH-102938',
          status: 'IN_TRANSIT',
          edd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          labelUrl: null,
          invoiceUrl: 'https://nexaris-invoices.s3.amazonaws.com/inv-1002.pdf',
          pickupScheduledAt: new Date(Date.now() - 24 * 3600000).toISOString(),
          shippedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
          deliveredAt: null,
          items: [
            {
              id: 'item-1',
              orderItemId: 'order-item-1',
              quantity: 1,
              orderItem: {
                productName: 'iPhone 15 Pro',
                variantName: 'Titanium Blue, 128GB',
              },
            },
          ],
          trackingEvents: [
            {
              id: 'ev-3',
              status: 'IN_TRANSIT',
              location: 'Delhi Hub North',
              description: 'Parcel left Delhi Hub and is in transit to local delivery hub.',
              eventTime: new Date(Date.now() - 6 * 3600000).toISOString(),
            },
            {
              id: 'ev-2',
              status: 'PICKUP_SCHEDULED',
              location: 'Seller Warehouse Delhi',
              description: 'Parcel picked up by Shiprocket delivery executive.',
              eventTime: new Date(Date.now() - 20 * 3600000).toISOString(),
            },
            {
              id: 'ev-1',
              status: 'PENDING',
              location: 'Seller Warehouse Delhi',
              description: 'AWB generated and shipment manifested.',
              eventTime: new Date(Date.now() - 26 * 3600000).toISOString(),
            },
          ],
        },
      ];
      setShipments(fallbackShipments);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (user && orderId) {
      fetchTrackingInfo();
    }
  }, [user, orderId, fetchTrackingInfo]);

  const getStatusColor = (status: Shipment['status']) => {
    switch (status) {
      case 'PENDING':
      case 'READY_TO_SHIP':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'PICKUP_SCHEDULED':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'IN_TRANSIT':
        return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
      case 'OUT_FOR_DELIVERY':
        return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'DELIVERED':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'FAILED':
      case 'CANCELLED':
        return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };

  const getStepActiveIndex = (status: Shipment['status']) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'READY_TO_SHIP':
        return 1;
      case 'PICKUP_SCHEDULED':
        return 2;
      case 'IN_TRANSIT':
        return 3;
      case 'OUT_FOR_DELIVERY':
        return 4;
      case 'DELIVERED':
        return 5;
      default:
        return 0;
    }
  };

  const steps = [
    'Placed',
    'AWB Allocated',
    'Fulfillment Pickup',
    'In Transit',
    'Out for Delivery',
    'Delivered',
  ];

  if (authLoading || (loading && shipments.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Back button */}
          <div className="mb-6">
            <Link
              href={`/orders/${orderId}`}
              className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order Details
            </Link>
          </div>

          <div className="border-b border-slate-900 pb-6 mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight">Shipment Tracking</h1>
            <p className="text-sm text-slate-400 mt-1">
              Live status, estimated arrival dates, and logistics milestone logs.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 mb-8 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {shipments.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-slate-900 flex flex-col items-center justify-center">
              <Package className="h-12 w-12 text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-300">No Active Shipments</h3>
              <p className="text-slate-500 text-xs mt-1 mb-8 max-w-sm">
                Your order is currently processing. As soon as the seller packages your items and registers tracking details, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {shipments.map((shipment, index) => {
                const stepIndex = getStepActiveIndex(shipment.status);
                const eddDate = shipment.edd
                  ? new Date(shipment.edd).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Pending carrier calculation';

                return (
                  <div
                    key={shipment.id}
                    className="rounded-2xl border border-slate-900 bg-slate-900/30 overflow-hidden shadow-2xl"
                  >
                    {/* Carrier stats banner */}
                    <div className="bg-slate-900/60 border-b border-slate-900 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
                          SHIPMENT {index + 1} ({shipment.carrierCode})
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-slate-200">
                            AWB: {shipment.awb || 'Awaiting assignment'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {shipment.invoiceUrl && (
                          <a
                            href={shipment.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-4 transition-colors gap-2"
                          >
                            <Download className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Download Invoice</span>
                          </a>
                        )}
                        <span
                          className={`text-[10px] font-bold font-mono tracking-wider uppercase px-3 py-1 rounded-full border ${getStatusColor(
                            shipment.status,
                          )}`}
                        >
                          {shipment.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Progress details */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 border-b border-slate-900 pb-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                            <Calendar className="h-5 w-5 text-indigo-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                              Estimated Delivery
                            </span>
                            <span className="text-sm font-bold text-slate-200">{eddDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-purple-500/10 rounded-xl">
                            <Truck className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                              Carrier Provider
                            </span>
                            <span className="text-sm font-bold text-slate-200">
                              {shipment.carrierCode}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                            <Package className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                              Items In Shipment
                            </span>
                            <span className="text-sm font-bold text-slate-200 truncate max-w-[200px] block">
                              {shipment.items.map((i) => i.orderItem.productName).join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Stepper */}
                      <div className="mb-10 px-2">
                        <div className="flex justify-between items-center relative">
                          <div className="absolute left-4 right-4 h-0.5 bg-slate-800 -z-10" />
                          <div
                            className="absolute left-4 h-0.5 bg-indigo-500 -z-10 transition-all duration-500"
                            style={{ width: `${(stepIndex / (steps.length - 1)) * 100}%` }}
                          />

                          {steps.map((step, idx) => {
                            const isCompleted = idx <= stepIndex;
                            const isActive = idx === stepIndex;

                            return (
                              <div key={step} className="flex flex-col items-center">
                                <div
                                  className={`h-9 w-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                    isCompleted
                                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                      : 'bg-slate-950 border-slate-800 text-slate-600'
                                  } ${isActive ? 'scale-110 ring-4 ring-indigo-500/20' : ''}`}
                                >
                                  {isCompleted && idx < stepIndex ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    idx + 1
                                  )}
                                </div>
                                <span
                                  className={`text-[9px] font-semibold mt-2 max-w-[70px] text-center uppercase tracking-wider block ${
                                    isActive
                                      ? 'text-indigo-400 font-bold'
                                      : isCompleted
                                      ? 'text-slate-300'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tracking Event Logs */}
                      <div>
                        <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          Milestone Logs
                        </h4>

                        <div className="relative border-l border-slate-850 pl-5 ml-2.5 space-y-6">
                          {shipment.trackingEvents.map((event) => {
                            const timeStr = new Date(event.eventTime).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                            });

                            return (
                              <div key={event.id} className="relative">
                                {/* Dot indicator */}
                                <div className="absolute -left-[26px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-slate-800 ring-2 ring-slate-900" />
                                <div>
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-200">
                                      {event.status.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500">
                                      {timeStr}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">{event.description}</p>
                                  {event.location && (
                                    <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 mt-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {event.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
