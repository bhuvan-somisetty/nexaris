'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Header } from '../../../components/Header';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import {
  Loader2,
  Calendar,
  Download,
  TrendingUp,
  ShoppingBag,
  Users,
  Percent,
  DollarSign,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  Info,
  Search
} from 'lucide-react';

export default function SellerAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Data States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [healthScoreData, setHealthScoreData] = useState<any>(null);
  const [forecastingData, setForecastingData] = useState<any>(null);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time auto-refresh timer state
  const [refreshCountdown, setRefreshCountdown] = useState<number>(30);

  // Authenticate user check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'SELLER') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  // Fetch core analytics function
  const fetchAnalytics = useCallback(async (start?: string, end?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let query = '';
      if (start && end) {
        query = `?startDate=${start}&endDate=${end}`;
      }

      const [dashRes, prodRes, custRes, trendsRes, healthRes, forecastRes] = await Promise.all([
        api.get(`/analytics/seller/dashboard${query}`),
        api.get(`/analytics/seller/products${query}`),
        api.get(`/analytics/seller/customers${query}`),
        api.get(`/analytics/seller/trends${query}`),
        api.get(`/analytics/seller/health-score`),
        api.get(`/analytics/seller/forecasting`)
      ]);

      setDashboardData(dashRes.data);
      setProductData(prodRes.data);
      setCustomerData(custRes.data);
      setTrendsData(trendsRes.data);
      setHealthScoreData(healthRes.data);
      setForecastingData(forecastRes.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to retrieve business intelligence reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch real-time metrics separately (avoid spinner blocks)
  const fetchRealTime = useCallback(async () => {
    try {
      const res = await api.get('/analytics/seller/realtime');
      setRealtimeData(res.data);
    } catch (err) {
      console.error('Real-time data retrieve failed:', err);
    }
  }, []);

  // Initial loads
  useEffect(() => {
    if (user && user.role === 'SELLER') {
      // Default to past 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      setStartDate(startStr);
      setEndDate(endStr);
      
      fetchAnalytics(startStr, endStr);
      fetchRealTime();
    }
  }, [user, fetchAnalytics, fetchRealTime]);

  // Auto-refresh loops (30s)
  useEffect(() => {
    if (!user || user.role !== 'SELLER') return;

    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchRealTime();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user, fetchRealTime]);

  // Set preset ranges
  const applyPresetRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    setStartDate(startStr);
    setEndDate(endStr);
    fetchAnalytics(startStr, endStr);
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      fetchAnalytics(startDate, endDate);
    }
  };

  const handleExportCSV = async () => {
    try {
      const query = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
      const response = await api.get(`/analytics/seller/export${query}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nexaris_seller_report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV report:', err);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  // Generate SVG Line Chart Path programmatically
  const renderSVGLineChart = (dataPoints: number[], colorClass: string) => {
    if (!dataPoints || dataPoints.length === 0) return null;
    const maxVal = Math.max(...dataPoints, 1);
    const width = 500;
    const height = 150;
    const padding = 10;
    const chartHeight = height - padding * 2;
    const step = width / (dataPoints.length - 1 || 1);

    const points = dataPoints.map((val, idx) => {
      const x = idx * step;
      const y = height - padding - (val / maxVal) * chartHeight;
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

    return (
      <svg className="w-full h-36" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${colorClass}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorClass === 'indigo' ? '#6366f1' : '#10b981'} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={colorClass === 'indigo' ? '#6366f1' : '#10b981'} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${colorClass})`} />
        <path d={pathD} fill="none" stroke={colorClass === 'indigo' ? '#6366f1' : '#10b981'} strokeWidth="2.5" />
      </svg>
    );
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          
          {/* Header & Date picker controls */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-indigo-500" />
                <span>Business Intelligence</span>
              </h1>
              <p className="text-sm text-slate-400">Analyze performance, conversion ratios, and 30-day forecast models.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => applyPresetRange(7)} className="px-3 py-1.5 rounded-lg border border-slate-900 bg-slate-900/40 text-xs hover:border-slate-800 transition-colors">7D</button>
              <button onClick={() => applyPresetRange(30)} className="px-3 py-1.5 rounded-lg border border-slate-900 bg-slate-900/40 text-xs hover:border-slate-800 transition-colors">30D</button>
              <button onClick={() => applyPresetRange(90)} className="px-3 py-1.5 rounded-lg border border-slate-900 bg-slate-900/40 text-xs hover:border-slate-800 transition-colors">90D</button>
              
              <form onSubmit={handleApplyFilters} className="flex items-center gap-2">
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-slate-650 text-xs">to</span>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button type="submit" className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-650 rounded-lg text-xs font-semibold transition-colors">Apply</button>
              </form>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-lg text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>

              <Link
                href="/seller/analytics/search"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all cursor-pointer animate-pulse"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search Performance</span>
              </Link>
            </div>
          </div>

          {/* Real-time Widget Ticker */}
          {realtimeData && (
            <div className="rounded-2xl border border-indigo-550/20 bg-indigo-950/10 p-5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Real-time Metrics Today</h4>
                  <p className="text-[10px] text-slate-550 font-mono">Last updated: {new Date(realtimeData.lastUpdated).toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-8 flex-wrap">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Live Revenue</span>
                  <span className="text-lg font-extrabold text-emerald-400">₹{realtimeData.liveRevenueToday.toLocaleString()}</span>
                </div>
                <div className="h-8 w-px bg-slate-900"></div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Live Orders</span>
                  <span className="text-lg font-extrabold text-indigo-400">{realtimeData.liveOrdersToday}</span>
                </div>
                <div className="h-8 w-px bg-slate-900"></div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Active Customers</span>
                  <span className="text-lg font-extrabold text-pink-400">{realtimeData.activeCustomers}</span>
                </div>
                <div className="h-8 w-px bg-slate-900"></div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Views (Last Hour)</span>
                  <span className="text-lg font-extrabold text-amber-400">{realtimeData.productsViewedLastHour}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-900 text-[10px] text-slate-400 font-mono">
                <Clock className="h-3 w-3 animate-spin text-slate-500" />
                <span>Refreshing in {refreshCountdown}s</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <Loader2 className="animate-spin h-10 w-10 text-indigo-500" />
            </div>
          ) : (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Dashboard KPIs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Revenue Card */}
                <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Total Revenue</span>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-extrabold text-white">₹{dashboardData.revenue.rangeTotal.toLocaleString()}</h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span className="text-emerald-400 inline-flex items-center"><ArrowUpRight className="h-3 w-3" /> YTD:</span>
                      <span>₹{dashboardData.revenue.thisYear.toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                {/* Orders Card */}
                <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Total Orders</span>
                    <ShoppingBag className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-extrabold text-white">{dashboardData.ordersCount}</h3>
                    <p className="text-[10px] text-slate-550 font-mono">In range selected</p>
                  </div>
                </div>

                {/* AOV Card */}
                <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Avg Order Value</span>
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-extrabold text-white">₹{dashboardData.averageOrderValue.toLocaleString()}</h3>
                    <p className="text-[10px] text-slate-550 font-mono">Revenue per checkout</p>
                  </div>
                </div>

                {/* Refund Rate Card */}
                <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Refund Rate</span>
                    <Percent className="h-4 w-4 text-pink-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-extrabold text-white">{dashboardData.refundRate}%</h3>
                    <p className="text-[10px] text-slate-550 font-mono">Rejections & chargebacks</p>
                  </div>
                </div>

                {/* Conversion Rate Card */}
                <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Conversion Rate</span>
                    <Users className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-extrabold text-white">{dashboardData.conversionRate}%</h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>Total Views:</span>
                      <span className="font-mono text-slate-300 font-bold">{dashboardData.totalViews}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Health Score & Forecasting Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Business Health Score Card */}
                {healthScoreData && (
                  <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-550 font-mono flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>Business Health Score</span>
                    </h3>

                    <div className="flex items-center justify-center space-x-6">
                      {/* Big Circle gauge */}
                      <div className="relative flex items-center justify-center h-28 w-28">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="56" cy="56" r="48" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                          <circle
                            cx="56"
                            cy="56"
                            r="48"
                            stroke={
                              healthScoreData.category === 'Excellent' ? '#10b981' :
                              healthScoreData.category === 'Good' ? '#6366f1' : '#ef4444'
                            }
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={301.6}
                            strokeDashoffset={301.6 - (301.6 * healthScoreData.score) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-3xl font-extrabold text-white">{healthScoreData.score}</span>
                          <span className="text-[9px] text-slate-500 uppercase font-mono">Health Index</span>
                        </div>
                      </div>

                      {/* Score description */}
                      <div className="space-y-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase font-mono border ${
                          healthScoreData.category === 'Excellent' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                          healthScoreData.category === 'Good' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                          'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                          {healthScoreData.category}
                        </span>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {healthScoreData.category === 'Excellent' ? 'Your store operations are flawless. Ensure stock limits are healthy.' :
                           healthScoreData.category === 'Good' ? 'Good overall performance. Optimize low-stock alerts to boost conversion.' :
                           'Alert: Multiple store vectors need immediate attention.'}
                        </p>
                      </div>
                    </div>

                    {/* Score Breakdown List */}
                    <div className="border-t border-slate-900 pt-4 space-y-2 text-xs font-mono text-slate-400">
                      <div className="flex justify-between">
                        <span>Revenue Growth Index:</span>
                        <span className="text-white">{healthScoreData.breakdown.revenueGrowthScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Order Completion Ratio:</span>
                        <span className="text-white">{healthScoreData.breakdown.orderCompletionScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Refund Penalty Score:</span>
                        <span className="text-white">{healthScoreData.breakdown.refundPenaltyScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer Satisfaction Value:</span>
                        <span className="text-white">{healthScoreData.breakdown.customerRatingScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Inventory Health Index:</span>
                        <span className="text-white">{healthScoreData.breakdown.inventoryHealthScore}/100</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 30-Day Projections & Forecasting (2 Columns Width) */}
                {forecastingData && (
                  <div className="lg:col-span-2 rounded-2xl border border-dashed border-indigo-500/20 bg-indigo-950/5 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 font-mono flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        <span>Analytical Forecast Models (7 & 30 Days)</span>
                      </h3>
                      <span className="text-[10px] text-indigo-500 font-mono uppercase bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-550/15">Regression Predictions</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Revenue Forecast */}
                      <div className="space-y-4 rounded-xl bg-slate-950 border border-slate-900 p-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-mono">Revenue Projection</span>
                          <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-550 block font-mono">Next 7 Days:</span>
                            <span className="text-lg font-bold text-white">₹{forecastingData.revenue.totalForecast7.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-550 block font-mono">Next 30 Days:</span>
                            <span className="text-md font-semibold text-slate-350">₹{forecastingData.revenue.totalForecast30.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sales Count Forecast */}
                      <div className="space-y-4 rounded-xl bg-slate-950 border border-slate-900 p-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-mono">Sales Volume Forecast</span>
                          <ShoppingBag className="h-3.5 w-3.5 text-indigo-400" />
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-550 block font-mono">Next 7 Days:</span>
                            <span className="text-lg font-bold text-white">{forecastingData.sales.totalForecast7} orders</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-550 block font-mono">Next 30 Days:</span>
                            <span className="text-md font-semibold text-slate-350">{forecastingData.sales.totalForecast30} orders</span>
                          </div>
                        </div>
                      </div>

                      {/* Inventory Count Forecast */}
                      <div className="space-y-4 rounded-xl bg-slate-950 border border-slate-900 p-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-mono">Stock Depletion Model</span>
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-550 block font-mono">Current Stock Volume:</span>
                            <span className="text-lg font-bold text-white">{forecastingData.inventory.current} items</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-550 block font-mono">Depletion countdown:</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded font-mono ${
                              forecastingData.inventory.daysOfStockRemaining < 7 ? 'bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse' :
                              forecastingData.inventory.daysOfStockRemaining < 30 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                              'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            }`}>
                              {forecastingData.inventory.daysOfStockRemaining === 999 ? 'No depletion threat' : `${forecastingData.inventory.daysOfStockRemaining} Days Remain`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Trends Charts */}
              {trendsData && (
                <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">Store Trends (Daily timeline)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Revenue Trend */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-mono uppercase">Revenue Over Time</span>
                        <span className="text-[10px] text-slate-500 font-mono">Last 30 data points</span>
                      </div>
                      <div className="rounded-xl border border-slate-900 bg-slate-950 p-4">
                        {renderSVGLineChart(trendsData.revenueTrend, 'indigo')}
                      </div>
                    </div>

                    {/* Customer Growth Trend */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-mono uppercase">Customer Traffic / Cohorts</span>
                        <span className="text-[10px] text-slate-500 font-mono">New purchasing users</span>
                      </div>
                      <div className="rounded-xl border border-slate-900 bg-slate-950 p-4">
                        {renderSVGLineChart(trendsData.customerGrowthTrend, 'emerald')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Products & Inventory Warning Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Top Selling Products List */}
                <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">Top Selling Products</h3>
                  {productData.topSelling.length === 0 ? (
                    <div className="text-xs text-slate-550 py-12 text-center">No sales reported for range.</div>
                  ) : (
                    <div className="space-y-3">
                      {productData.topSelling.map((prod: any, idx: number) => (
                        <div key={prod.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-900">
                          <div className="flex items-center space-x-3">
                            <span className="text-xs text-slate-500 font-mono">#{idx+1}</span>
                            <div>
                              <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{prod.name}</h4>
                              <p className="text-[10px] text-slate-500 font-mono">{prod.quantity} units sold</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-white">₹{prod.revenue.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lowest Selling Products List */}
                <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">Lowest Performing</h3>
                  {productData.lowestPerforming.length === 0 ? (
                    <div className="text-xs text-slate-550 py-12 text-center">No items listed.</div>
                  ) : (
                    <div className="space-y-3">
                      {productData.lowestPerforming.slice(0, 5).map((prod: any) => (
                        <div key={prod.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-900">
                          <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{prod.name}</h4>
                          <span className="text-xs font-mono text-slate-500">{prod.quantity} sold (₹{prod.revenue})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inventory Health Alerts Panel */}
                <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">Inventory Stock Warnings</h3>
                  
                  {productData.alerts.lowStock.length === 0 && productData.alerts.outOfStock.length === 0 ? (
                    <div className="text-xs text-emerald-400 py-12 text-center font-mono">
                      ✓ All products are fully stocked.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Out of Stock (Red) */}
                      {productData.alerts.outOfStock.map((alert: any) => (
                        <div key={alert.sku} className="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-red-550/5 text-xs text-red-400">
                          <div>
                            <h4 className="font-semibold line-clamp-1">{alert.name}</h4>
                            <p className="text-[10px] text-red-500 font-mono">SKU: {alert.sku || 'N/A'}</p>
                          </div>
                          <span className="font-mono font-bold uppercase text-[9px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30">Out Of Stock</span>
                        </div>
                      ))}

                      {/* Low Stock (Amber) */}
                      {productData.alerts.lowStock.map((alert: any) => (
                        <div key={alert.sku} className="flex items-center justify-between p-3 rounded-xl border border-amber-500/20 bg-amber-550/5 text-xs text-amber-400">
                          <div>
                            <h4 className="font-semibold line-clamp-1">{alert.name}</h4>
                            <p className="text-[10px] text-amber-550 font-mono">SKU: {alert.sku || 'N/A'}</p>
                          </div>
                          <span className="font-mono font-bold text-[9px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">Low Stock: {alert.stock} remaining</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Cohort Stats Card */}
              {customerData && (
                <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">Customer Base Insights</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* New vs Returning */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                      <span className="text-[10px] text-slate-550 uppercase font-mono tracking-wider block">New vs Returning (in range)</span>
                      <div className="text-md font-bold text-slate-200">
                        <span className="text-emerald-400">{customerData.newCustomers}</span> New / <span className="text-indigo-400">{customerData.returningCustomers}</span> Returning
                      </div>
                    </div>

                    {/* Retention Rate */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                      <span className="text-[10px] text-slate-550 uppercase font-mono tracking-wider block">Customer Retention Rate</span>
                      <div className="text-md font-bold text-white flex items-center gap-1.5">
                        <span>{customerData.retentionRate}%</span>
                        <span className="text-[10px] text-slate-500 font-mono">(60-Day Cohort)</span>
                      </div>
                    </div>

                    {/* Repeat Purchase Rate */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                      <span className="text-[10px] text-slate-550 uppercase font-mono tracking-wider block">Repeat Purchase Rate</span>
                      <div className="text-md font-bold text-white">{customerData.repeatPurchaseRate}%</div>
                    </div>

                    {/* CLV */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                      <span className="text-[10px] text-slate-550 uppercase font-mono tracking-wider block">Customer Lifetime Value (CLV)</span>
                      <div className="text-md font-bold text-emerald-400">₹{customerData.customerLifetimeValue.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
