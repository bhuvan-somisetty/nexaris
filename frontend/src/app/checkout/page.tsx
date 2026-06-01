'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Loader2, CreditCard, Sparkles, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { cart, loading: cartLoading, clearCart } = useCart();
  const router = useRouter();

  // Address States
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // New Address Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [street1, setStreet1] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');
  const [phone, setPhone] = useState('');

  // Checkout States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await api.get('/users/profile');
      const addrList = res.data.addresses || [];
      setAddresses(addrList);
      
      const defaultAddr = addrList.find((a: Address) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else if (addrList.length > 0) {
        setSelectedAddressId(addrList[0].id);
      }
    } catch (err) {
      console.error('Failed to load shipping addresses', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'CUSTOMER') {
        router.push('/');
      } else {
        fetchAddresses();
      }
    }
  }, [user, authLoading, router]);

  const items = cart?.items || [];

  // Totals calculations
  const subtotal = items.reduce((acc, item) => {
    const price = item.variant?.price
      ? parseFloat(item.variant.price)
      : parseFloat(item.product.price);
    return acc + price * item.quantity;
  }, 0);

  const tax = subtotal * 0.18; // 18% GST
  const shipping = subtotal > 999 ? 0 : 99; // ₹99 shipping, free above ₹999
  const total = subtotal + tax + shipping;

  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      firstName,
      lastName,
      street1,
      street2: street2 || undefined,
      city,
      state,
      postalCode,
      country,
      phone: phone || undefined,
    };

    try {
      const res = await api.post('/checkout', { newAddress: payload });
      // Checkout returns { order, payment } — redirect to payment page
      const { order, payment } = res.data;
      router.push(`/payment?orderId=${order.id}&paymentId=${payment.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError('Please select a shipping address.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post('/checkout', { addressId: selectedAddressId });
      // Checkout returns { order, payment } — redirect to payment page
      const { order, payment } = res.data;
      router.push(`/payment?orderId=${order.id}&paymentId=${payment.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || cartLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <Header />
        <div className="flex-1 bg-slate-950 text-white flex flex-col items-center justify-center py-20 px-4">
          <AlertCircle className="h-12 w-12 text-slate-500 mb-4 animate-pulse" />
          <h2 className="text-xl font-bold">No Items in Cart</h2>
          <p className="text-slate-500 text-sm mt-1 mb-8 text-center max-w-sm">
            Add items to your cart before proceeding to checkout.
          </p>
          <Link href="/products" className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 px-6 font-semibold hover:bg-slate-800 transition-colors">
            Browse Marketplace
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="border-b border-slate-900 pb-6 mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>
            <p className="text-sm text-slate-400 mt-1">Review your selections, select an address, and confirm your purchase.</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 mb-8 flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Address steps */}
            <div className="lg:col-span-2 space-y-6">
              {!showNewAddressForm ? (
                <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-indigo-400" />
                      <span>Select Shipping Address</span>
                    </h3>
                    <button
                      onClick={() => setShowNewAddressForm(true)}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center space-x-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add New</span>
                    </button>
                  </div>

                  {loadingAddresses ? (
                    <div className="flex justify-center py-6 text-slate-500">
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      <span>Loading addresses...</span>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-8 bg-slate-900/10 rounded-xl border border-dashed border-slate-900">
                      <p className="text-xs text-slate-500 font-mono mb-4">No saved addresses found.</p>
                      <button
                        onClick={() => setShowNewAddressForm(true)}
                        className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-350 hover:text-white px-4 transition-colors"
                      >
                        Create New Address
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {addresses.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setSelectedAddressId(a.id)}
                          className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 ${
                            selectedAddressId === a.id
                              ? 'bg-indigo-500/5 border-indigo-500 text-indigo-400'
                              : 'bg-slate-900/20 border-slate-900 text-slate-400 hover:border-slate-800'
                          }`}
                        >
                          <span className="text-sm font-bold text-slate-200">
                            {a.firstName} {a.lastName}
                          </span>
                          <span className="text-xs text-slate-400 mt-2 leading-relaxed">
                            {a.street1}
                            {a.street2 && `, ${a.street2}`}
                            <br />
                            {a.city}, {a.state} - {a.postalCode}
                            <br />
                            {a.country}
                          </span>
                          {a.phone && (
                            <span className="text-[10px] text-slate-500 mt-2 font-mono">
                              Phone: {a.phone}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-indigo-400" />
                      <span>New Shipping Address</span>
                    </h3>
                    <button
                      onClick={() => setShowNewAddressForm(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Use Saved Address
                    </button>
                  </div>

                  <form onSubmit={handleAddNewAddress} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">First Name</label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Last Name</label>
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Street Address</label>
                      <input
                        type="text"
                        required
                        placeholder="Street, apartment, suite, etc."
                        value={street1}
                        onChange={(e) => setStreet1(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Apartment/Suite (Optional)</label>
                      <input
                        type="text"
                        value={street2}
                        onChange={(e) => setStreet2(e.target.value)}
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">City</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Postal Code</label>
                        <input
                          type="text"
                          required
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">State</label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Country</label>
                        <input
                          type="text"
                          required
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 9999999999"
                        className="mt-1.5 block w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-sm focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm(false)}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-5 text-xs font-semibold text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 text-xs font-semibold text-white shadow-xl shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          'Save & Checkout'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Items Summary list */}
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 font-mono uppercase tracking-wide">
                  Items in Shipment
                </h3>

                <div className="divide-y divide-slate-900/60 max-h-80 overflow-y-auto pr-2">
                  {items.map((item) => {
                    const price = item.variant?.price
                      ? parseFloat(item.variant.price)
                      : parseFloat(item.product.price);
                    const img = item.product.images?.[0]?.url;

                    return (
                      <div key={item.id} className="flex py-3.5 gap-4 items-center">
                        <div className="h-12 w-12 rounded-lg bg-slate-900 border border-slate-900 overflow-hidden shrink-0 relative">
                          {img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={item.product.name} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-200 truncate">{item.product.name}</h4>
                          {item.variant && (
                            <span className="text-[10px] text-indigo-400 font-semibold">{item.variant.name}</span>
                          )}
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Qty: {item.quantity} × ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <span className="text-sm font-bold font-mono text-slate-350 text-right">
                          ₹{(price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Checkout Billing breakdown */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-900 bg-slate-950 p-6 space-y-6">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 font-mono uppercase tracking-wide">
                  Checkout Summary
                </h3>

                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-slate-200 font-mono">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST (18%)</span>
                    <span className="font-semibold text-slate-200 font-mono">₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Shipping Charges</span>
                    <span className="font-semibold text-slate-200 font-mono">
                      {shipping === 0 ? (
                        <span className="text-emerald-400 font-semibold uppercase text-xs">Free</span>
                      ) : (
                        `₹${shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {shipping > 0 && (
                    <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-2.5 text-[10px] text-indigo-400 flex items-start gap-1.5 leading-relaxed">
                      <Sparkles className="h-3 w-3 shrink-0 mt-0.5 animate-pulse" />
                      <span>Add ₹{(1000 - subtotal).toLocaleString('en-IN')} more to unlock free shipping.</span>
                    </div>
                  )}

                  <div className="border-t border-slate-900 pt-4 flex justify-between text-base font-extrabold">
                    <span>Grand Total</span>
                    <span className="text-indigo-400 font-mono">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting || showNewAddressForm || !selectedAddressId}
                    className="w-full inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 font-bold text-white shadow-xl shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    ) : (
                      <CreditCard className="h-5 w-5 mr-2" />
                    )}
                    <span>Place Order (Mock Payment)</span>
                  </button>
                  
                  <span className="text-[10px] text-center text-slate-500 block mt-3 leading-relaxed">
                    By confirming checkout, your order will be placed immediately and inventory stock deducted.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
