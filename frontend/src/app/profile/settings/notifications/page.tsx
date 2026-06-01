'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { Header } from '../../../../components/Header';
import { useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import {
  Mail,
  Bell,
  MessageSquare,
  Smartphone,
  Check,
  Loader2,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';

interface Preference {
  type: string;
  channel: string;
  enabled: boolean;
}

const PRETTY_TYPES: Record<string, { title: string; desc: string; category: string }> = {
  // Orders
  ORDER_CREATED: { title: 'Order Placed', desc: 'Alert when a checkout is completed and order created.', category: 'Orders & Shopping' },
  ORDER_CONFIRMED: { title: 'Order Confirmed', desc: 'Confirmation when payment goes through.', category: 'Orders & Shopping' },
  ORDER_SHIPPED: { title: 'Order Dispatched', desc: 'Alert when order items are handed to delivery.', category: 'Orders & Shopping' },
  ORDER_DELIVERED: { title: 'Order Delivered', desc: 'Alert when shipment has reached the destination.', category: 'Orders & Shopping' },
  ORDER_CANCELLED: { title: 'Order Cancelled', desc: 'Alert when order is cancelled by customer or admin.', category: 'Orders & Shopping' },
  
  // Payments
  PAYMENT_SUCCESS: { title: 'Payment Success', desc: 'Receipts and credit confirmations.', category: 'Payments & Refunds' },
  PAYMENT_FAILED: { title: 'Payment Failed', desc: 'Alert if transaction gets declined or expires.', category: 'Payments & Refunds' },
  REFUND_CREATED: { title: 'Refund Initiated', desc: 'Refund reference confirmation details.', category: 'Payments & Refunds' },

  // Reviews
  REVIEW_RECEIVED: { title: 'Review Received', desc: 'Alert to sellers when their product gets reviewed.', category: 'Seller & Creator Hub' },
  REVIEW_REPORTED: { title: 'Review Flagged', desc: 'Admin alert when a customer reports content.', category: 'Seller & Creator Hub' },
  PRODUCT_APPROVED: { title: 'Product Approved', desc: 'Seller alerts when products pass admin review.', category: 'Seller & Creator Hub' },
  PRODUCT_REJECTED: { title: 'Product Rejected', desc: 'Detailed alerts if listing review fails.', category: 'Seller & Creator Hub' },

  // System
  SYSTEM_ALERT: { title: 'System Security Alerts', desc: 'Critical password changes and platform announcements.', category: 'System Alerts' },
  PROMOTION: { title: 'Promotional Offers', desc: 'Discounts, seasonal updates, and recommendations.', category: 'System Alerts' },
};

const CATEGORIES = ['Orders & Shopping', 'Payments & Refunds', 'Seller & Creator Hub', 'System Alerts'];

const CHANNELS = [
  { name: 'IN_APP', label: 'In-App Feed', icon: Bell },
  { name: 'EMAIL', label: 'Email Address', icon: Mail },
  { name: 'SMS', label: 'SMS Text', icon: MessageSquare },
  { name: 'PUSH', label: 'Push Notification', icon: Smartphone },
];

export default function NotificationSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const response = await api.get('/notifications/preferences');
        setPreferences(response.data);
      } catch (err) {
        console.error('Failed to load preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPrefs();
    }
  }, [user]);

  const handleToggle = async (type: string, channel: string, currentVal: boolean) => {
    const key = `${type}:${channel}`;
    setSavingKey(key);
    try {
      const newVal = !currentVal;
      await api.patch('/notifications/preferences', {
        type,
        channel,
        enabled: newVal,
      });

      // Update state local mapping
      setPreferences((prev) =>
        prev.map((p) => (p.type === type && p.channel === channel ? { ...p, enabled: newVal } : p))
      );
      
      setSuccessToast(`Saved preference for ${PRETTY_TYPES[type]?.title || type}`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error('Error toggling preference:', err);
    } finally {
      setSavingKey(null);
    }
  };

  const getPreferenceValue = (type: string, channel: string): boolean => {
    const pref = preferences.find((p) => p.type === type && p.channel === channel);
    return pref ? pref.enabled : false;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
        <p className="text-slate-400 text-sm font-medium">Configuring preference center...</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Glow Details */}
        <div className="absolute top-10 left-10 h-72 w-72 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 h-72 w-72 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="mx-auto max-w-4xl space-y-8 relative z-10">
          {/* Top navigation row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center space-x-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Profile</span>
            </button>

            {successToast && (
              <div className="flex items-center space-x-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-lg animate-in fade-in slide-in-from-top-1">
                <Check className="h-3.5 w-3.5" />
                <span>{successToast}</span>
              </div>
            )}
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
              <Smartphone className="text-indigo-500" />
              <span>Notification Preferences</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Customize how Nexaris handles communications for checkout cycles, refunds, ratings, and security alerts. Changes auto-save instantly.
            </p>
          </div>

          {/* Settings Grid Matrix */}
          <div className="space-y-12">
            {CATEGORIES.map((category) => {
              // Filter types belonging to this category
              const categoryTypes = Object.entries(PRETTY_TYPES).filter(
                ([_, val]) => val.category === category
              );

              if (categoryTypes.length === 0) return null;

              return (
                <div key={category} className="rounded-2xl border border-slate-900 bg-slate-950/40 backdrop-blur-md overflow-hidden">
                  <div className="bg-slate-900/40 py-4 px-6 border-b border-slate-900 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest font-mono">
                      {category}
                    </h2>
                  </div>

                  <div className="divide-y divide-slate-900/60">
                    {categoryTypes.map(([typeKey, typeVal]) => (
                      <div
                        key={typeKey}
                        className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
                      >
                        <div className="space-y-1 flex-1">
                          <h3 className="text-sm font-bold text-slate-200">
                            {typeVal.title}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {typeVal.desc}
                          </p>
                        </div>

                        {/* Channels matrix for this type */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
                          {CHANNELS.map((channel) => {
                            const isEnabled = getPreferenceValue(typeKey, channel.name);
                            const key = `${typeKey}:${channel.name}`;
                            const isSaving = savingKey === key;
                            const IconComponent = channel.icon;

                            return (
                              <button
                                key={channel.name}
                                onClick={() => handleToggle(typeKey, channel.name, isEnabled)}
                                disabled={isSaving}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 min-w-20 ${
                                  isEnabled
                                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                    : 'bg-slate-900/35 border-slate-900 text-slate-500 hover:border-slate-800 hover:text-slate-400'
                                }`}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500 mb-1" />
                                ) : (
                                  <IconComponent className="h-4 w-4 mb-1" />
                                )}
                                <span className="text-[10px] font-semibold font-mono tracking-wider">
                                  {channel.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
