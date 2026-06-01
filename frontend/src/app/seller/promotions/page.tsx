'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Gift,
  Plus,
  Loader2,
  TrendingUp,
  Percent,
  Calendar,
  AlertCircle,
  Eye,
  CheckCircle,
  BarChart3,
  Users,
  DollarSign
} from 'lucide-react';

export default function SellerPromotionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'coupons' | 'campaigns'>('overview');

  // Coupon Form State
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState('PERCENTAGE');
  const [couponValue, setCouponValue] = useState('');
  const [couponMinOrder, setCouponMinOrder] = useState('');
  const [couponMaxDiscount, setCouponMaxDiscount] = useState('');
  const [couponStartDate, setCouponStartDate] = useState('');
  const [couponEndDate, setCouponEndDate] = useState('');
  const [couponUsageLimit, setCouponUsageLimit] = useState('');
  const [couponPerUserLimit, setCouponPerUserLimit] = useState('1');

  // Campaign Form State
  const [campName, setCampName] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campCategoryId, setCampCategoryId] = useState('');
  const [campDiscountType, setCampDiscountType] = useState('PERCENTAGE');
  const [campValueA, setCampValueA] = useState('');
  const [campValueB, setCampValueB] = useState('');
  const [campStartDate, setCampStartDate] = useState('');
  const [campEndDate, setCampEndDate] = useState('');

  const [submittingCoupon, setSubmittingCoupon] = useState(false);
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoadingData(true);
      const [dashRes, catRes] = await Promise.all([
        api.get('/promotions/seller/dashboard'),
        api.get('/categories')
      ]);
      setDashboardData(dashRes.data);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to load seller dashboard details:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'SELLER') {
        router.push('/');
      } else {
        fetchDashboard();
      }
    }
  }, [user, loading, router]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmittingCoupon(true);

    const payload = {
      code: couponCode,
      discountType: couponDiscountType,
      value: parseFloat(couponValue),
      minOrderValue: parseFloat(couponMinOrder || '0'),
      maxDiscountAmount: couponMaxDiscount ? parseFloat(couponMaxDiscount) : null,
      startDate: new Date(couponStartDate).toISOString(),
      endDate: new Date(couponEndDate).toISOString(),
      usageLimit: couponUsageLimit ? parseInt(couponUsageLimit) : null,
      perUserLimit: parseInt(couponPerUserLimit || '1'),
    };

    try {
      await api.post('/promotions/coupons', payload);
      setSuccessMsg('Coupon created successfully!');
      // Reset form
      setCouponCode('');
      setCouponValue('');
      setCouponMinOrder('');
      setCouponMaxDiscount('');
      setCouponStartDate('');
      setCouponEndDate('');
      setCouponUsageLimit('');
      fetchDashboard();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create coupon.');
    } finally {
      setSubmittingCoupon(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmittingCampaign(true);

    const payload = {
      name: campName,
      description: campDesc,
      categoryId: campCategoryId || null,
      discountType: campDiscountType,
      valueA: parseFloat(campValueA),
      valueB: parseFloat(campValueB),
      startDate: new Date(campStartDate).toISOString(),
      endDate: new Date(campEndDate).toISOString(),
    };

    try {
      await api.post('/promotions/campaigns/ab', payload);
      setSuccessMsg('A/B Campaign variants initialized!');
      // Reset form
      setCampName('');
      setCampDesc('');
      setCampCategoryId('');
      setCampValueA('');
      setCampValueB('');
      setCampStartDate('');
      setCampEndDate('');
      fetchDashboard();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create campaign.');
    } finally {
      setSubmittingCampaign(false);
    }
  };

  if (loading || !user || loadingData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  // Find A/B Testing campaigns
  const campaigns = dashboardData?.campaigns || [];
  const parentCampaigns = campaigns.filter((c: any) => c.abTest && !c.parentCampaignId);
  const childCampaigns = campaigns.filter((c: any) => c.parentCampaignId);

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="border-b border-slate-900 pb-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Marketing & Promotions</h1>
              <p className="text-sm text-slate-400 mt-1">Design discount coupons and schedule A/B testing campaign variants.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/seller/dashboard')}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-4 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 mb-8 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-400 mb-8 flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Performance Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Promo Clicks</span>
                <Eye className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold">{dashboardData?.summary?.totalClicks || 0}</p>
            </div>
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Conversions</span>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold">{dashboardData?.summary?.totalConversions || 0}</p>
            </div>
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Conversion Rate</span>
                <TrendingUp className="h-4 w-4 text-purple-400" />
              </div>
              <p className="text-2xl font-extrabold">{dashboardData?.summary?.conversionRate || 0}%</p>
            </div>
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Promo Revenue</span>
                <DollarSign className="h-4 w-4 text-pink-400" />
              </div>
              <p className="text-2xl font-extrabold text-indigo-400">₹{(dashboardData?.summary?.revenueGenerated || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-900 flex space-x-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'overview' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview & A/B Tests
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'coupons' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Coupons Console
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'campaigns' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Campaigns Wizard
            </button>
          </div>

          {/* Tab 1: Overview & A/B Campaign Performance */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-indigo-400" />
                  <span>A/B Campaign Variance Analytics</span>
                </h3>

                {parentCampaigns.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/10 rounded-xl border border-dashed border-slate-900">
                    <p className="text-sm text-slate-500">No active A/B testing campaigns running yet.</p>
                    <p className="text-xs text-slate-650 mt-1">Design one in the Campaigns Wizard tab to compare performance metrics.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {parentCampaigns.map((parent: any) => {
                      const variants = childCampaigns.filter((c: any) => c.parentCampaignId === parent.id);
                      const varA = variants.find((v: any) => v.variant === 'A') || { clicks: 0, conversions: 0, revenue: 0, value: 0 };
                      const varB = variants.find((v: any) => v.variant === 'B') || { clicks: 0, conversions: 0, revenue: 0, value: 0 };

                      const convRateA = varA.clicks > 0 ? ((varA.conversions / varA.clicks) * 100).toFixed(1) : '0';
                      const convRateB = varB.clicks > 0 ? ((varB.conversions / varB.clicks) * 100).toFixed(1) : '0';

                      return (
                        <div key={parent.id} className="border border-slate-900 rounded-xl p-5 bg-slate-950/40 space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-900/60 pb-3">
                            <div>
                              <h4 className="font-bold text-slate-200 text-base">{parent.name}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{parent.description}</p>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 text-[10px] text-indigo-400 font-bold tracking-wider font-mono">
                              A/B SPLIT RUNNING
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            {/* Variant A Card */}
                            <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 relative overflow-hidden space-y-3">
                              <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-500/20 border-b border-l border-indigo-500/30 rounded-bl-lg font-bold text-xs text-indigo-300">
                                Variant A ({varA.value}%)
                              </div>
                              <h5 className="font-bold text-sm text-slate-350 pt-2">Performance Metrics</h5>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-900">
                                  <span className="text-[9px] text-slate-500 block uppercase font-mono">Clicks</span>
                                  <span className="text-sm font-bold">{varA.clicks}</span>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-900">
                                  <span className="text-[9px] text-slate-500 block uppercase font-mono">Convs</span>
                                  <span className="text-sm font-bold">{varA.conversions}</span>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-900">
                                  <span className="text-[9px] text-slate-500 block uppercase font-mono">Rate</span>
                                  <span className="text-sm font-bold text-indigo-400">{convRateA}%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-900/60">
                                <span className="text-slate-500">Revenue Converted:</span>
                                <span className="font-bold font-mono text-emerald-400">₹{Number(varA.revenue).toLocaleString('en-IN')}</span>
                              </div>
                            </div>

                            {/* Variant B Card */}
                            <div className="p-4 rounded-xl border border-purple-500/10 bg-purple-500/5 relative overflow-hidden space-y-3">
                              <div className="absolute top-0 right-0 px-3 py-1 bg-purple-500/20 border-b border-l border-purple-500/30 rounded-bl-lg font-bold text-xs text-purple-300">
                                Variant B ({varB.value}%)
                              </div>
                              <h5 className="font-bold text-sm text-slate-350 pt-2">Performance Metrics</h5>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-900">
                                  <span className="text-[9px] text-slate-500 block uppercase font-mono">Clicks</span>
                                  <span className="text-sm font-bold">{varB.clicks}</span>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-900">
                                  <span className="text-[9px] text-slate-500 block uppercase font-mono">Convs</span>
                                  <span className="text-sm font-bold">{varB.conversions}</span>
                                </div>
                                <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-900">
                                  <span className="text-[9px] text-slate-500 block uppercase font-mono">Rate</span>
                                  <span className="text-sm font-bold text-purple-400">{convRateB}%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-900/60">
                                <span className="text-slate-500">Revenue Converted:</span>
                                <span className="font-bold font-mono text-emerald-400">₹{Number(varB.revenue).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Dynamic ROI analysis comparison info */}
                          <div className="rounded-xl border border-slate-900 bg-slate-950 p-3.5 text-xs text-slate-400 flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                            <span>
                              {parseFloat(convRateA) > parseFloat(convRateB) ? (
                                <><strong>Variant A</strong> is performing better with a <strong>{((parseFloat(convRateA) - parseFloat(convRateB))).toFixed(1)}% higher</strong> conversion rate. We recommend routing traffic to A.</>
                              ) : parseFloat(convRateB) > parseFloat(convRateA) ? (
                                <><strong>Variant B</strong> is performing better with a <strong>{((parseFloat(convRateB) - parseFloat(convRateA))).toFixed(1)}% higher</strong> conversion rate. We recommend routing traffic to B.</>
                              ) : (
                                <>Both variants show identical conversion performance. Let the test gather more clicks to establish statistically significant outcomes.</>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Manage Coupons Form and Listing */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Coupons List */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2">
                  <Gift className="h-5 w-5 text-indigo-400" />
                  <span>Your Coupon Inventory</span>
                </h3>

                {(!dashboardData?.coupons || dashboardData.coupons.length === 0) ? (
                  <div className="text-center py-12 bg-slate-900/10 rounded-xl border border-dashed border-slate-900">
                    <p className="text-sm text-slate-500">No promo coupons issued yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-900/60 space-y-4">
                    {dashboardData.coupons.map((coupon: any) => (
                      <div key={coupon.id} className="pt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-extrabold text-indigo-400 bg-indigo-500/5 border border-indigo-500/25 rounded-lg px-2.5 py-0.5">
                              {coupon.code}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({coupon.discountType.replace('_', ' ')})
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            Discount: <span className="font-semibold text-slate-200">{coupon.discountType === 'PERCENTAGE' ? `${coupon.value}%` : `₹${coupon.value}`}</span>
                            {coupon.maxDiscountAmount && ` (Capped at ₹${coupon.maxDiscountAmount})`}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Min Order: ₹{coupon.minOrderValue} | Expiry: {new Date(coupon.endDate).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono text-slate-400">
                            Redemptions: {coupon.usedCount} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : '(Unlimited)'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Coupon Card Form */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-indigo-400" />
                  <span>Issue New Coupon</span>
                </h3>

                <form onSubmit={handleCreateCoupon} className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Coupon Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FESTIVAL20"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Discount Type</label>
                    <select
                      value={couponDiscountType}
                      onChange={(e) => setCouponDiscountType(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none text-slate-350"
                    >
                      <option value="PERCENTAGE">Percentage Discount (%)</option>
                      <option value="FIXED_AMOUNT">Fixed Value Discount (₹)</option>
                      <option value="FREE_SHIPPING">Free Shipping Coupons</option>
                    </select>
                  </div>

                  {couponDiscountType !== 'FREE_SHIPPING' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Discount Value</label>
                      <input
                        type="number"
                        required
                        placeholder={couponDiscountType === 'PERCENTAGE' ? 'e.g. 10 (%)' : 'e.g. 250 (₹)'}
                        value={couponValue}
                        onChange={(e) => setCouponValue(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Min Order (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={couponMinOrder}
                        onChange={(e) => setCouponMinOrder(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Max Discount (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 200"
                        value={couponMaxDiscount}
                        disabled={couponDiscountType !== 'PERCENTAGE'}
                        onChange={(e) => setCouponMaxDiscount(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Start Date</label>
                      <input
                        type="date"
                        required
                        value={couponStartDate}
                        onChange={(e) => setCouponStartDate(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">End Date</label>
                      <input
                        type="date"
                        required
                        value={couponEndDate}
                        onChange={(e) => setCouponEndDate(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Usage Limit</label>
                      <input
                        type="number"
                        placeholder="Unlimited if blank"
                        value={couponUsageLimit}
                        onChange={(e) => setCouponUsageLimit(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Limit Per User</label>
                      <input
                        type="number"
                        value={couponPerUserLimit}
                        onChange={(e) => setCouponPerUserLimit(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingCoupon}
                    className="w-full inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-650 px-6 font-bold text-white shadow-xl shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
                  >
                    {submittingCoupon ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Gift className="h-4 w-4 mr-2" />}
                    <span>Activate Offer Code</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 3: Campaigns Wizard with A/B splitting */}
          {activeTab === 'campaigns' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Campaign Instructions Info panel */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2">
                  <Percent className="h-5 w-5 text-indigo-400" />
                  <span>Active Marketing Campaigns</span>
                </h3>

                {parentCampaigns.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/10 rounded-xl border border-dashed border-slate-900">
                    <p className="text-sm text-slate-500">No campaigns launched yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-900/60 space-y-4">
                    {parentCampaigns.map((parent: any) => (
                      <div key={parent.id} className="pt-4 flex justify-between items-center gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold text-slate-200">{parent.name}</h4>
                          <p className="text-xs text-slate-400">{parent.description}</p>
                          <p className="text-[10px] text-slate-500">
                            Active: {new Date(parent.startDate).toLocaleDateString()} - {new Date(parent.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 text-[9px] font-bold text-purple-400 font-mono tracking-wider">
                          A/B TEST
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create A/B Campaign card */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-indigo-400" />
                  <span>Launch A/B Testing Campaign</span>
                </h3>

                <form onSubmit={handleCreateCampaign} className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Campaign Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Diwali Flash Sale"
                      value={campName}
                      onChange={(e) => setCampName(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Description</label>
                    <textarea
                      required
                      placeholder="Enter marketing copy details..."
                      value={campDesc}
                      onChange={(e) => setCampDesc(e.target.value)}
                      rows={2}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none text-slate-350"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Target Category</label>
                    <select
                      value={campCategoryId}
                      onChange={(e) => setCampCategoryId(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none text-slate-400"
                    >
                      <option value="">All Categories (Store-wide)</option>
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Discount Type</label>
                    <select
                      value={campDiscountType}
                      onChange={(e) => setCampDiscountType(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none text-slate-400"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED_AMOUNT">Fixed Value (₹)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Value Variant A</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 10"
                        value={campValueA}
                        onChange={(e) => setCampValueA(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Value Variant B</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 15"
                        value={campValueB}
                        onChange={(e) => setCampValueB(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Start Date</label>
                      <input
                        type="date"
                        required
                        value={campStartDate}
                        onChange={(e) => setCampStartDate(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">End Date</label>
                      <input
                        type="date"
                        required
                        value={campEndDate}
                        onChange={(e) => setCampEndDate(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingCampaign}
                    className="w-full inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-indigo-650 px-6 font-bold text-white shadow-xl shadow-indigo-500/20 hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50"
                  >
                    {submittingCampaign ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Percent className="h-4 w-4 mr-2" />}
                    <span>Launch Variants Test</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
