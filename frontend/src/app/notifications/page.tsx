'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import {
  Bell,
  Archive,
  CheckCheck,
  Trash2,
  Inbox,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  archived: boolean;
  metadata: any;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  // Success / Delivered / Approved
  PAYMENT_SUCCESS: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  ORDER_DELIVERED: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  PRODUCT_APPROVED: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  
  // Informational / Processes
  ORDER_CREATED: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  ORDER_CONFIRMED: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  ORDER_SHIPPED: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  
  // Warnings / Refunds
  REFUND_CREATED: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  SYSTEM_ALERT: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  
  // Alerts / Cancelled / Rejections / Flags
  PAYMENT_FAILED: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  ORDER_CANCELLED: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  PRODUCT_REJECTED: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  REVIEW_REPORTED: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  
  // Community / Interactive
  REVIEW_RECEIVED: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  PROMOTION: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
};

const TYPE_LABELS: Record<string, string> = {
  ORDER_CREATED: 'Order Placed',
  ORDER_CONFIRMED: 'Confirmed',
  ORDER_SHIPPED: 'Shipped',
  ORDER_DELIVERED: 'Delivered',
  ORDER_CANCELLED: 'Cancelled',
  PAYMENT_SUCCESS: 'Payment Success',
  PAYMENT_FAILED: 'Payment Failed',
  REFUND_CREATED: 'Refund Issued',
  REVIEW_RECEIVED: 'New Review',
  REVIEW_REPORTED: 'Review Flagged',
  PRODUCT_APPROVED: 'Product Approved',
  PRODUCT_REJECTED: 'Product Rejected',
  SYSTEM_ALERT: 'System Alert',
  PROMOTION: 'Promotional',
};

export default function NotificationHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [archivedTab, setArchivedTab] = useState(false); // false = active inbox, true = archived logs
  const [isReadFilter, setIsReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let url = `/notifications?page=${page}&limit=15&archived=${archivedTab}`;
      if (isReadFilter === 'READ') {
        url += '&isRead=true';
      } else if (isReadFilter === 'UNREAD') {
        url += '&isRead=false';
      }

      const response = await api.get(url);
      setNotifications(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Failed to load notifications history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchHistory();
  }, [user, page, archivedTab, isReadFilter]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      // Update local state to save refetching
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleArchive = async (id: string, archiveVal: boolean) => {
    try {
      await api.patch(`/notifications/${id}/archive`, { archived: archiveVal });
      // Remove from current list view
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error('Failed to set archive status:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-10 right-10 h-96 w-96 bg-indigo-500/5 rounded-full blur-3xl" />
        
        <div className="mx-auto max-w-4xl space-y-8 relative z-10">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
                <Bell className="text-indigo-500 h-8 w-8" />
                <span>Notification Center</span>
              </h1>
              <p className="text-sm text-slate-400">
                Track payments, checkout events, seller listings status, and reviews.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchHistory}
                className="flex items-center justify-center p-2 rounded-lg border border-slate-900 bg-slate-950/40 text-slate-400 hover:text-white transition-colors"
                title="Refresh Feed"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <button
                onClick={() => router.push('/profile/settings/notifications')}
                className="text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 rounded-xl text-indigo-400 hover:bg-indigo-500/20 transition-all duration-200"
              >
                Preference Settings
              </button>
            </div>
          </div>

          {/* Controls Tabs & Filter Matrix */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-4">
            {/* Inbox vs Archive Tab */}
            <div className="flex rounded-lg bg-slate-900/60 p-1 border border-slate-900">
              <button
                onClick={() => {
                  setArchivedTab(false);
                  setPage(1);
                }}
                className={`flex items-center space-x-2 rounded-md px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  !archivedTab
                    ? 'bg-slate-950 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Inbox className="h-3.5 w-3.5" />
                <span>Active Feed</span>
              </button>
              <button
                onClick={() => {
                  setArchivedTab(true);
                  setPage(1);
                }}
                className={`flex items-center space-x-2 rounded-md px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  archivedTab
                    ? 'bg-slate-950 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archived Logs</span>
              </button>
            </div>

            {/* Filters and Actions */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-slate-500">Filter:</span>
                <select
                  value={isReadFilter}
                  onChange={(e) => {
                    setIsReadFilter(e.target.value as any);
                    setPage(1);
                  }}
                  className="bg-slate-950 border border-slate-900 text-slate-300 rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="UNREAD">Unread Only</option>
                  <option value="READ">Read Only</option>
                </select>
              </div>

              {!archivedTab && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* List display */}
          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-medium">Gathering updates...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              <div className="divide-y divide-slate-900 border border-slate-900 rounded-2xl bg-slate-950/40 backdrop-blur-md overflow-hidden">
                {notifications.map((notification) => {
                  const tagColorClass = TYPE_COLORS[notification.type] || 'bg-slate-800/40 border-slate-800 text-slate-400';
                  const tagLabel = TYPE_LABELS[notification.type] || notification.type;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => !notification.isRead && handleMarkRead(notification.id)}
                      className={`p-5 flex gap-4 items-start hover:bg-slate-900/10 cursor-pointer transition-colors relative ${
                        !notification.isRead ? 'bg-indigo-500/[0.02]' : ''
                      }`}
                    >
                      {/* Unread marker bar */}
                      {!notification.isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500" />
                      )}

                      {/* Icon status indicator */}
                      <div className={`p-2 rounded-xl border shrink-0 ${tagColorClass}`}>
                        <Bell className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h3 className="text-sm font-bold text-slate-200">
                              {notification.title}
                            </h3>
                            <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider border uppercase ${tagColorClass}`}>
                              {tagLabel}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                          {notification.message}
                        </p>
                      </div>

                      {/* Actions Column */}
                      <div className="shrink-0 flex items-center space-x-2">
                        {archivedTab ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(notification.id, false);
                            }}
                            className="p-1.5 rounded-lg border border-slate-900 bg-slate-950/45 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all duration-200"
                            title="Unarchive Notification"
                          >
                            <FolderOpen className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(notification.id, true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-900 bg-slate-950/45 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all duration-200"
                            title="Archive Notification"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-xs text-slate-500 font-mono">
                    Showing {(page - 1) * 15 + 1} - {Math.min(page * 15, total)} of {total} items
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-slate-900 bg-slate-950/40 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold px-3 py-1 bg-slate-900/50 rounded border border-slate-800 font-mono">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-slate-900 bg-slate-950/40 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-900 bg-slate-950/40 backdrop-blur-md p-16 text-center">
              <Inbox className="mx-auto h-12 w-12 text-slate-700 mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-slate-300">
                {archivedTab ? 'No Archived Logs' : 'All caught up!'}
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {archivedTab
                  ? 'Your archived logs directory is empty.'
                  : 'You have no active notifications. Critical alerts will appear here.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
