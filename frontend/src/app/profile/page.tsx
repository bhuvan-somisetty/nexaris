'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { useRouter } from 'next/navigation';
import { Mail, MapPin, Bell, UserCheck, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
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
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Header Panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-8 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 rounded-full blur-2xl" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-bold text-3xl shadow-inner mb-4 sm:mb-0">
                {user.profile?.firstName?.[0] || 'U'}
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">
                  {user.profile?.firstName} {user.profile?.lastName}
                </h1>
                <div className="flex items-center space-x-2 text-slate-400 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="inline-flex items-center space-x-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-xs text-indigo-300 font-mono tracking-widest uppercase">
                  <UserCheck className="h-3 w-3" />
                  <span>{user.role}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Account Details Box */}
            <div className="md:col-span-2 space-y-8">
              {/* Profile Details */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3">
                  Account Overview
                </h3>
                <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-500 uppercase font-mono">User ID</dt>
                    <dd className="mt-1 text-sm text-slate-300 font-mono overflow-hidden text-ellipsis">{user.id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 uppercase font-mono">Registered Role</dt>
                    <dd className="mt-1 text-sm text-slate-300 capitalize">{user.role.toLowerCase()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 uppercase font-mono">First Name</dt>
                    <dd className="mt-1 text-sm text-slate-300">{user.profile?.firstName || 'Not Set'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 uppercase font-mono">Last Name</dt>
                    <dd className="mt-1 text-sm text-slate-300">{user.profile?.lastName || 'Not Set'}</dd>
                  </div>
                </dl>
              </div>

              {/* Shipping Addresses Relation */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-indigo-400" />
                    <span>My Addresses</span>
                  </h3>
                  <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                    + Add New
                  </button>
                </div>
                <div className="mt-4 text-center py-8 rounded-xl border border-dashed border-slate-900 bg-slate-950/40">
                  <MapPin className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">No address profiles registered yet.</p>
                  <p className="text-xs text-slate-600 mt-1">Shipping addresses can be configured during the checkout phase.</p>
                </div>
              </div>
            </div>

            {/* Sidebar Alerts / Notifications */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6">
                <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2 border-b border-slate-900 pb-3">
                  <Bell className="h-5 w-5 text-indigo-400" />
                  <span>Recent Notifications</span>
                </h3>
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 relative">
                    <div className="flex items-start space-x-2">
                      <div className="h-2 w-2 mt-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">Welcome to Nexaris!</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Your customer account has been successfully initialized. Discover our premium features.
                        </p>
                        <span className="text-[10px] text-slate-600 mt-2 block font-mono">
                          Just now
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
