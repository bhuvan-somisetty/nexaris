'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { useRouter } from 'next/navigation';
import { Mail, MapPin, Bell, UserCheck, Loader2, Trophy, Gift, Award, Share2, Copy, Check } from 'lucide-react';
import { api } from '../../lib/api';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [loyaltyProfile, setLoyaltyProfile] = useState<any>(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState<any[]>([]);
  const [referralCode, setReferralCode] = useState<string>('');
  const [loadingPromos, setLoadingPromos] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchPromoDetails = async () => {
      try {
        setLoadingPromos(true);
        const [profileRes, historyRes, refRes] = await Promise.all([
          api.get('/promotions/loyalty/profile'),
          api.get('/promotions/loyalty/history'),
          api.post('/promotions/referral/code'),
        ]);
        setLoyaltyProfile(profileRes.data);
        setLoyaltyHistory(historyRes.data || []);
        setReferralCode(refRes.data.code);
      } catch (err) {
        console.error('Failed to load promotions/loyalty profile information:', err);
      } finally {
        setLoadingPromos(false);
      }
    };

    if (user && user.role === 'CUSTOMER') {
      fetchPromoDetails();
    }
  }, [user]);

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNextTierThreshold = (tier: string) => {
    if (tier === 'BRONZE') return 1000;
    if (tier === 'SILVER') return 2500;
    if (tier === 'GOLD') return 5000;
    return 5000; // Platinum max
  };

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

              {/* Loyalty Club Section */}
              {user.role === 'CUSTOMER' && (
                <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
                      <Trophy className="h-5 w-5 text-indigo-400" />
                      <span>Loyalty Club & Rewards</span>
                    </h3>
                    {loyaltyProfile && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold font-mono tracking-wider border ${
                        loyaltyProfile.tier === 'PLATINUM' ? 'bg-purple-500/10 border-purple-500/35 text-purple-400' :
                        loyaltyProfile.tier === 'GOLD' ? 'bg-amber-500/10 border-amber-500/35 text-amber-400' :
                        loyaltyProfile.tier === 'SILVER' ? 'bg-slate-300/10 border-slate-300/35 text-slate-350' :
                        'bg-yellow-800/10 border-yellow-800/35 text-yellow-600'
                      }`}>
                        {loyaltyProfile.tier} TIER
                      </span>
                    )}
                  </div>

                  {loadingPromos ? (
                    <div className="flex justify-center py-6 text-slate-500">
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      <span>Loading loyalty data...</span>
                    </div>
                  ) : loyaltyProfile ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Total Points</span>
                          <span className="text-2xl font-extrabold text-indigo-400">{loyaltyProfile.points}</span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40">
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Redeemable Value</span>
                          <span className="text-2xl font-extrabold text-emerald-400">₹{(loyaltyProfile.points * 0.1).toFixed(2)}</span>
                        </div>
                      </div>

                      {loyaltyProfile.tier !== 'PLATINUM' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Progress to next tier</span>
                            <span>{loyaltyProfile.points} / {getNextTierThreshold(loyaltyProfile.tier)} pts</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                              style={{ width: `${Math.min(100, (loyaltyProfile.points / getNextTierThreshold(loyaltyProfile.tier)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Loyalty History Logs */}
                      {loyaltyHistory.length > 0 && (
                        <div className="space-y-3 pt-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Recent Activity</h4>
                          <div className="divide-y divide-slate-900/60 max-h-40 overflow-y-auto pr-1">
                            {loyaltyHistory.map((item) => (
                              <div key={item.id} className="flex justify-between py-2 text-xs">
                                <div>
                                  <p className="text-slate-350">{item.reason}</p>
                                  <span className="text-[9px] text-slate-600 font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                                <span className={`font-mono font-bold ${item.pointsChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {item.pointsChange >= 0 ? `+${item.pointsChange}` : item.pointsChange} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center">Loyalty profile could not be loaded.</p>
                  )}
                </div>
              )}

              {/* Referral Tracking Section */}
              {user.role === 'CUSTOMER' && referralCode && (
                <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2">
                    <Gift className="h-5 w-5 text-indigo-400" />
                    <span>Invite Friends Program</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Refer your friends to Nexaris! When they sign up using your referral code, they receive <span className="text-indigo-400 font-semibold">200 points</span>. After their first completed purchase, you will receive a bonus reward of <span className="text-indigo-400 font-semibold">500 points</span>.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 space-y-2">
                      <span className="text-[10px] text-slate-500 font-mono block uppercase">Your Referral Code</span>
                      <div className="flex items-center justify-between bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-lg">
                        <span className="font-mono text-sm font-bold text-slate-200">{referralCode}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(referralCode);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/40 space-y-2">
                      <span className="text-[10px] text-slate-500 font-mono block uppercase">Your Referral Link</span>
                      <button
                        onClick={copyReferralLink}
                        className="w-full inline-flex h-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-350 hover:text-white gap-2 transition-all"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>{copied ? 'Copied Link!' : 'Copy Share Link'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
