'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Header } from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Star, Flag, ShieldAlert, Check, X, ArrowLeft, Loader2, MessageSquare, AlertTriangle, EyeOff, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminReviewsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Navigation Guard
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'flagged' | 'reports'>('flagged');

  // Flagged reviews state
  const [flaggedReviews, setFlaggedReviews] = useState<any[]>([]);
  const [flaggedPage, setFlaggedPage] = useState<number>(1);
  const [flaggedTotalPages, setFlaggedTotalPages] = useState<number>(1);
  const [flaggedLoading, setFlaggedLoading] = useState<boolean>(true);

  // Reports state
  const [reports, setReports] = useState<any[]>([]);
  const [reportsPage, setReportsPage] = useState<number>(1);
  const [reportsTotalPages, setReportsTotalPages] = useState<number>(1);
  const [reportsLoading, setReportsLoading] = useState<boolean>(true);

  // Success/error messages
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchFlaggedReviews = async () => {
    try {
      setFlaggedLoading(true);
      const res = await api.get(`/admin/reviews/flagged?page=${flaggedPage}&limit=10`);
      setFlaggedReviews(res.data.reviews);
      setFlaggedTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setFlaggedLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const res = await api.get(`/admin/reviews/reports?page=${reportsPage}&limit=10`);
      setReports(res.data.reports);
      setReportsTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      if (activeTab === 'flagged') {
        fetchFlaggedReviews();
      } else {
        fetchReports();
      }
    }
  }, [user, activeTab, flaggedPage, reportsPage]);

  // Moderation Actions
  const handleModerateReview = async (reviewId: string, status: 'PUBLISHED' | 'HIDDEN') => {
    try {
      setActionSuccess(null);
      await api.patch(`/admin/reviews/${reviewId}/status`, { status });
      setActionSuccess(status === 'HIDDEN' ? 'Review successfully hidden from store!' : 'Review approved and restored.');
      setTimeout(() => setActionSuccess(null), 4000);
      
      if (activeTab === 'flagged') {
        fetchFlaggedReviews();
      } else {
        fetchReports();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Action failed.');
    }
  };

  const handleResolveReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      setActionSuccess(null);
      await api.patch(`/admin/reviews/reports/${reportId}/resolve`, { status });
      setActionSuccess(`Report successfully marked as ${status.toLowerCase()}.`);
      setTimeout(() => setActionSuccess(null), 4000);
      
      if (activeTab === 'flagged') {
        fetchFlaggedReviews();
      } else {
        fetchReports();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Action failed.');
    }
  };

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-5">
            <div className="space-y-1">
              <Link href="/admin/dashboard" className="text-xs text-slate-500 hover:text-indigo-400 flex items-center mb-1">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Back to Admin Dashboard</span>
              </Link>
              <h1 className="text-3xl font-extrabold text-slate-100">Review Moderation Control</h1>
            </div>
            <div className="flex bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('flagged')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'flagged' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Flagged Content Queue
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'reports' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Reports Log
              </button>
            </div>
          </div>

          {actionSuccess && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-450 flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-emerald-455 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {activeTab === 'flagged' ? (
            /* FLAGGED QUEUE */
            <div className="space-y-6">
              {flaggedLoading ? (
                <div className="py-24 flex justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                </div>
              ) : flaggedReviews.length === 0 ? (
                <div className="py-20 border border-dashed border-slate-900 text-center rounded-3xl">
                  <ShieldAlert className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-300">Clean Slate</h3>
                  <p className="text-slate-500 text-sm mt-1">There are no flagged customer reviews in the moderation queue.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {flaggedReviews.map((r) => {
                    const reporterDetails = r.reports?.[0]
                      ? `Reason: "${r.reports[0].reason}" (Reported by: ${r.reports[0].customer?.email})`
                      : 'Flagged for moderation.';

                    return (
                      <div key={r.id} className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-yellow-400 bg-yellow-500/5 border border-yellow-500/15 rounded-md px-2 py-0.5 uppercase tracking-wider">
                              Flagged Review
                            </span>
                            <div className="flex items-center space-x-1.5 mt-2">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-3.5 w-3.5 ${
                                    s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-800'
                                  }`}
                                />
                              ))}
                              <span className="text-xs text-slate-400">
                                for <strong>{r.product?.name}</strong>
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-200 mt-2">{r.title}</h4>
                            <p className="text-sm text-slate-400">{r.content}</p>
                          </div>

                          {/* Quick Admin Actions */}
                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => handleModerateReview(r.id, 'HIDDEN')}
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/25 px-4 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all space-x-1.5"
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                              <span>Hide Review</span>
                            </button>
                            <button
                              onClick={() => handleModerateReview(r.id, 'PUBLISHED')}
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 text-xs font-bold text-emerald-450 hover:bg-emerald-500 hover:text-white transition-all space-x-1.5"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Keep / Approve</span>
                            </button>
                          </div>
                        </div>

                        {/* Report Reason banner */}
                        <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/15 p-3 text-xs text-yellow-500 flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{reporterDetails}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  {flaggedTotalPages > 1 && (
                    <div className="flex items-center justify-center space-x-4 pt-6">
                      <button
                        onClick={() => setFlaggedPage(Math.max(1, flaggedPage - 1))}
                        disabled={flaggedPage === 1}
                        className="px-4 py-2 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-800 text-xs disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-slate-500 font-mono">
                        Page {flaggedPage} of {flaggedTotalPages}
                      </span>
                      <button
                        onClick={() => setFlaggedPage(Math.min(flaggedTotalPages, flaggedPage + 1))}
                        disabled={flaggedPage === flaggedTotalPages}
                        className="px-4 py-2 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-800 text-xs disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* REPORTS LOG */
            <div className="space-y-6">
              {reportsLoading ? (
                <div className="py-24 flex justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                </div>
              ) : reports.length === 0 ? (
                <div className="py-20 border border-dashed border-slate-900 text-center rounded-3xl">
                  <Flag className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-300">No Reports Filed</h3>
                  <p className="text-slate-500 text-sm mt-1">All reports submitted by customers will be logged in this section.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => {
                    const date = new Date(report.createdAt).toLocaleDateString();
                    const isPending = report.status === 'PENDING';

                    return (
                      <div key={report.id} className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-400">
                                Report ID: <span className="font-mono text-slate-500">{report.id.substring(0, 8)}</span>
                              </span>
                              <span className={`text-[10px] font-bold rounded px-1.5 py-0.2 uppercase tracking-wide border ${
                                isPending
                                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                  : report.status === 'RESOLVED'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}>
                                {report.status}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-250">
                              Reporter: <span className="text-slate-400">{report.customer?.email}</span>
                            </p>
                            <div className="rounded-xl bg-slate-950 border border-slate-900 p-3 text-xs text-slate-400 mt-1">
                              <strong className="text-slate-500 block uppercase mb-1">Reason:</strong>
                              {report.reason}
                            </div>
                          </div>

                          {/* Action panel for this specific report */}
                          {isPending && (
                            <div className="flex flex-col gap-2 shrink-0">
                              <button
                                onClick={() => handleResolveReport(report.id, 'RESOLVED')}
                                className="inline-flex h-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3.5 text-[11px] font-bold text-emerald-450 hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                Mark Resolved
                              </button>
                              <button
                                onClick={() => handleResolveReport(report.id, 'DISMISSED')}
                                className="inline-flex h-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 px-3.5 text-[11px] font-bold text-slate-400 hover:bg-slate-800"
                              >
                                Dismiss Report
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Associated Review Summary */}
                        {report.review && (
                          <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-4 space-y-2">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-mono">Reported Content</span>
                            <div className="flex items-center space-x-1.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-3 w-3 ${
                                    s <= report.review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-800'
                                  }`}
                                />
                              ))}
                              <span className="text-xs text-slate-450 font-semibold">
                                &quot;{report.review.title}&quot; on {report.review.product?.name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 italic">
                              &quot;{report.review.content}&quot;
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1">
                              <span>Author: {report.review.customer?.email}</span>
                              <span>Review Status: <strong className="uppercase">{report.review.status}</strong></span>
                            </div>
                            {report.review.status === 'PUBLISHED' && (
                              <button
                                onClick={() => handleModerateReview(report.review.id, 'HIDDEN')}
                                className="text-[10px] font-bold text-red-400 hover:text-red-350 flex items-center space-x-1 mt-1"
                              >
                                <EyeOff className="h-3 w-3" />
                                <span>Moderate & Hide This Review</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  {reportsTotalPages > 1 && (
                    <div className="flex items-center justify-center space-x-4 pt-6">
                      <button
                        onClick={() => setReportsPage(Math.max(1, reportsPage - 1))}
                        disabled={reportsPage === 1}
                        className="px-4 py-2 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-800 text-xs disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-slate-500 font-mono">
                        Page {reportsPage} of {reportsTotalPages}
                      </span>
                      <button
                        onClick={() => setReportsPage(Math.min(reportsTotalPages, reportsPage + 1))}
                        disabled={reportsPage === reportsTotalPages}
                        className="px-4 py-2 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-800 text-xs disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
