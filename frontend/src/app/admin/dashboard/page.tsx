'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Header } from '../../../components/Header';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Shield, Users, UserCheck, Store, Check, X, AlertCircle, Loader2, MessageSquare } from 'lucide-react';

interface SellerProfile {
  id: string;
  storeName: string;
  storeDescription?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface Profile {
  firstName: string;
  lastName: string;
}

interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  profile?: Profile;
  sellerProfile?: SellerProfile;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Failed to fetch platform users.');
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
        fetchUsers();
      }
    }
  }, [user, authLoading, router]);

  const handleUpdateStatus = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(userId);
    try {
      await api.patch(`/users/${userId}/seller-status`, { status });
      // Update local state to avoid full reload, or re-fetch
      await fetchUsers();
    } catch (err) {
      console.error(err);
      const axiosError = err as { response?: { data?: { message?: string } } };
      alert(axiosError.response?.data?.message || 'Failed to update seller status.');
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  const sellerProfilesPending = users.filter(u => u.role === 'SELLER' && u.sellerProfile?.status === 'PENDING').length;

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          
          {/* Header section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-8 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-purple-500/5 rounded-full blur-2xl" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/25 text-purple-400">
                  <Shield className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-white">Administration Portal</h1>
                  <p className="text-sm text-slate-400">Manage user accounts, approve seller applications, and monitor audits.</p>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-0 flex flex-wrap gap-3 items-center">
                {sellerProfilesPending > 0 && (
                  <div className="inline-flex items-center space-x-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 text-sm text-yellow-400 font-semibold animate-pulse">
                    <AlertCircle className="h-4 w-4" />
                    <span>{sellerProfilesPending} Seller Profile(s) Pending Review</span>
                  </div>
                )}
                <button
                  onClick={() => router.push('/admin/reviews')}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-purple-600 px-5 text-sm font-semibold hover:bg-purple-700 transition-colors space-x-1.5"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Moderate Reviews</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-mono">Total Platform Users</span>
                <h2 className="text-3xl font-extrabold text-slate-200 mt-1">{users.length}</h2>
              </div>
              <Users className="h-10 w-10 text-slate-700" />
            </div>
            
            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-mono">Sellers Registered</span>
                <h2 className="text-3xl font-extrabold text-slate-200 mt-1">
                  {users.filter(u => u.role === 'SELLER').length}
                </h2>
              </div>
              <Store className="h-10 w-10 text-indigo-900" />
            </div>

            <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-mono">Customers Registered</span>
                <h2 className="text-3xl font-extrabold text-slate-200 mt-1">
                  {users.filter(u => u.role === 'CUSTOMER').length}
                </h2>
              </div>
              <UserCheck className="h-10 w-10 text-emerald-900" />
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl border border-slate-900 bg-slate-950 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-900 bg-slate-950 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-200">Registered Accounts</h3>
              <button 
                onClick={fetchUsers} 
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Refresh Data
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mb-2" />
                <span>Fetching user listings...</span>
              </div>
            ) : error ? (
              <div className="py-12 text-center text-red-400">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>{error}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-900 text-left text-sm">
                  <thead className="bg-slate-950 text-xs font-mono uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Details / Store</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 bg-slate-950/20">
                    {users.map((u) => {
                      const isSeller = u.role === 'SELLER';
                      const sellerStatus = u.sellerProfile?.status;

                      return (
                        <tr key={u.id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-200">
                            {u.profile?.firstName} {u.profile?.lastName}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                            {u.email}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-mono font-semibold tracking-wider ${
                              u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              u.role === 'SELLER' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300 max-w-xs truncate">
                            {isSeller ? (
                              <div>
                                <span className="font-semibold text-slate-200">{u.sellerProfile?.storeName}</span>
                                <span className="block text-xs text-slate-500 truncate">{u.sellerProfile?.storeDescription}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            {isSeller && sellerStatus ? (
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${
                                sellerStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                                sellerStatus === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                                'bg-yellow-500/10 text-yellow-400'
                              }`}>
                                {sellerStatus}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            {isSeller && sellerStatus === 'PENDING' && (
                              <div className="flex justify-end space-x-2">
                                <button
                                  disabled={processingId === u.id}
                                  onClick={() => handleUpdateStatus(u.id, 'APPROVED')}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-200 disabled:opacity-50"
                                  title="Approve Seller"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  disabled={processingId === u.id}
                                  onClick={() => handleUpdateStatus(u.id, 'REJECTED')}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 disabled:opacity-50"
                                  title="Reject Seller"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
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
        </div>
      </main>
    </>
  );
}
