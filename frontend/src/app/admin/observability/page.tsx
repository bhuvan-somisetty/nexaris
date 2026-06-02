'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Header } from '../../../components/Header';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { 
  Activity, 
  Cpu, 
  Database, 
  Server, 
  Loader2, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert,
  Play,
  Terminal
} from 'lucide-react';

interface QueueInfo {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface ObservabilityStats {
  queues: {
    fulfillment: QueueInfo;
    shippingUpdate: QueueInfo;
    notification: QueueInfo;
    recommendation: QueueInfo;
  };
  system: {
    uptime: number;
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
    };
    cpu: {
      user: number;
      system: number;
    };
  };
  redis: {
    status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    uptime: number;
    connectedClients: number;
    memoryUsed: string;
  };
  database: {
    status: 'CONNECTED' | 'ERROR';
  };
}

export default function ObservabilityDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<ObservabilityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingQueue, setRetryingQueue] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ObservabilityStats>('/admin/observability');
      setStats(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch observability metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        router.push('/');
      } else {
        fetchStats();
      }
    }
  }, [user, authLoading, router]);

  const handleRetryFailed = async (queueName: string) => {
    setRetryingQueue(queueName);
    try {
      const res = await api.post(`/admin/observability/queues/${queueName}/retry-failed`);
      alert(`Successfully retried ${res.data.retriedCount} failed jobs in "${queueName}" queue.`);
      await fetchStats();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || `Failed to retry jobs in "${queueName}" queue.`);
    } finally {
      setRetryingQueue(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          
          {/* Header section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-8 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 rounded-full blur-2xl" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                  <Activity className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-white">Operational Telemetry</h1>
                  <p className="text-sm text-slate-400">Monitor system health, database latency, and BullMQ queue backlogs in real-time.</p>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-0 flex gap-3">
                <button
                  onClick={fetchStats}
                  disabled={loading}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold hover:bg-indigo-700 transition-colors space-x-2 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Telemetry</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 flex items-center space-x-3">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Infrastructure Health Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Database Status Card */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-mono">Postgres Database</span>
                <div className="flex items-center space-x-2 mt-1">
                  {stats?.database.status === 'CONNECTED' ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm font-bold text-slate-200">Responsive</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                      <span className="text-sm font-bold text-red-400">Offline / Error</span>
                    </>
                  )}
                </div>
              </div>
              <Database className="h-10 w-10 text-slate-800" />
            </div>

            {/* Redis Status Card */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-mono">Redis Cache & Queue</span>
                <div className="flex items-center space-x-2 mt-1">
                  {stats?.redis.status === 'CONNECTED' ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm font-bold text-slate-200">{stats.redis.memoryUsed} utilized</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                      <span className="text-sm font-bold text-red-400">Degraded (Fallback active)</span>
                    </>
                  )}
                </div>
              </div>
              <Server className="h-10 w-10 text-slate-800" />
            </div>

            {/* Server CPU and Memory Usage */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-mono">Server Allocations</span>
                <div className="mt-1 flex flex-col font-mono text-xs text-slate-300">
                  <span>RAM: {stats?.system.memory.heapUsed || '0 MB'} / {stats?.system.memory.heapTotal || '0 MB'}</span>
                  <span>Uptime: {stats ? formatUptime(stats.system.uptime) : '—'}</span>
                </div>
              </div>
              <Cpu className="h-10 w-10 text-slate-800" />
            </div>
          </div>

          {/* Queues & DLQ Monitor Table */}
          <div className="rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-900 bg-slate-950 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-200">BullMQ Distributed Queues</h3>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Active Jobs Scheduler</span>
            </div>

            {loading && !stats ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
                <span>Aggregating queue telemetry...</span>
              </div>
            ) : !stats ? (
              <div className="py-12 text-center text-slate-500">No telemetry data.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-900 text-left text-sm">
                  <thead className="bg-slate-950 text-xs font-mono uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Queue Name</th>
                      <th className="px-6 py-3">Waiting</th>
                      <th className="px-6 py-3">Active</th>
                      <th className="px-6 py-3">Completed</th>
                      <th className="px-6 py-3">Delayed</th>
                      <th className="px-6 py-3">Failed (DLQ)</th>
                      <th className="px-6 py-3 text-right">DLQ Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 bg-slate-950/25 font-mono">
                    {Object.entries(stats.queues).map(([name, counts]) => {
                      const hasFailures = counts.failed > 0;
                      return (
                        <tr key={name} className="hover:bg-slate-900/10 transition-colors">
                          <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-200">
                            {name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                            {counts.waiting}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-indigo-400 font-bold">
                            {counts.active > 0 ? (
                              <span className="flex items-center space-x-1.5 animate-pulse">
                                <Loader2 className="animate-spin h-3.5 w-3.5" />
                                <span>{counts.active}</span>
                              </span>
                            ) : (
                              <span>0</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-emerald-500">
                            {counts.completed}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                            {counts.delayed}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                              hasFailures ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-slate-900 text-slate-500'
                            }`}>
                              {counts.failed}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            {hasFailures ? (
                              <button
                                disabled={retryingQueue === name}
                                onClick={() => handleRetryFailed(name)}
                                className="inline-flex h-8 items-center justify-center rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-slate-950 px-3.5 text-xs font-semibold transition-all duration-200 disabled:opacity-50 space-x-1"
                              >
                                <Play className="h-3 w-3 fill-current" />
                                <span>Retry Failed</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-600 font-sans">No anomalies</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Developer Shell Info */}
          <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-4">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Terminal className="h-5 w-5" />
              <h3 className="font-extrabold text-slate-200">Independent Worker Execution</h3>
            </div>
            <p className="text-sm text-slate-400">
              In production, queue workers execute on isolated Node processes. Trigger the worker-only context by configuring the environment:
            </p>
            <pre className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs text-indigo-300 font-mono overflow-x-auto">
              RUN_WORKER_ONLY=true npm run start:prod
            </pre>
          </div>

        </div>
      </main>
    </>
  );
}
