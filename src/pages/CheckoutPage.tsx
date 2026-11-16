import React, { useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMAD, translations } from '../i18n';
import { apiFetch } from '../lib/api';

const MOROCCAN_CITIES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Tanger',
  'Agadir',
  'Fès',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Mohammedia',
  'Tétouan',
  'El Jadida',
];

interface ConfirmedOrder {
  order_number: string;
  subtotal_mad: number;
  discount_mad: number;
  shipping_fee_mad: number;
  total_mad: number;
  status: string;
  items: Array<{
    product_name: string;
    product_reference: string;
    selected_color: string;
    quantity: number;
    total_price_mad: number;
  }>;
}

export function CheckoutPage() {
  const { lang, cart, user, settings, appliedCoupon, clearCart, refreshBootstrap, navigate } = useStore();
  const t = translations[lang];

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || 'Casablanca');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);

  const subtotal = cart.reduce((sum, i) => sum + i.product.price_mad * i.quantity, 0);
  const discount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discount_percent) / 100) : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const threshold = settings?.free_shipping_threshold_mad ?? 2500;
  const baseShipping = settings?.shipping_fee_mad ?? 45;
  const shippingFee = cart.length === 0 ? 0 : afterDiscount >= threshold ? 0 : baseShipping;
  const total = afterDiscount + shippingFee;
  const gatewayConfigured = settings?.payment_gateway_configured === 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (paymentMethod === 'card' && !gatewayConfigured) {
      setError(t.checkout.cardUnconfigured);
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ order: ConfirmedOrder }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: fullName,
          customer_phone: phone,
          customer_email: email,
          shipping_address: address,
          shipping_city: city,
          payment_method: paymentMethod,
          coupon_code: appliedCoupon?.code || undefined,
          notes,
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            selected_color: item.selectedColor,
          })),
        }),
      });
      setConfirmedOrder(res.order);
      clearCart();
      await refreshBootstrap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de valider la commande.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 lg:px-10">
        <div className="border border-[#111111]/10 bg-[#FFFFFF] p-8 sm:p-10">
          <div className="flex items-center gap-3 text-[#111111]">
            <CheckCircle2 className="h-7 w-7 text-[#8E733E]" />
            <h1 className="font-serif text-3xl font-medium">{t.checkout.orderSuccessTitle}</h1>
          </div>
          <p className="mt-3 text-sm text-[#5C5954]">
            {t.checkout.orderSuccessSub}{' '}
            <span className="font-mono font-semibold text-[#111111]">{confirmedOrder.order_number}</span>
          </p>

          <div className="mt-6 border-t border-[#111111]/10 pt-5 space-y-3 text-sm">
            {confirmedOrder.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>
                  {item.product_name} ({item.selected_color}) × {item.quantity}
                </span>
                <span className="tabular-nums font-medium">{formatMAD(item.total_price_mad, lang)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-[#111111]/10 pt-3 font-semibold text-base">
              <span>{t.cart.total}</span>
              <span className="tabular-nums">{formatMAD(confirmedOrder.total_mad, lang)}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/suivi')}
              className="bg-[#111111] px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] text-[#F8F7F4]"
            >
              Suivre ma commande
            </button>
            <button
              type="button"
              onClick={() => navigate('/catalogue')}
              className="border border-[#111111]/25 px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] text-[#111111]"
            >
              Retour à la boutique
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-[#111111]">{t.cart.empty}</h1>
        <button
          type="button"
          onClick={() => navigate('/catalogue')}
          className="mt-6 bg-[#111111] px-6 py-3 text-xs uppercase tracking-[0.15em] text-[#F8F7F4]"
        >
          {t.cart.continueShopping}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <h1 className="font-serif text-4xl font-medium text-[#111111]">{t.checkout.title}</h1>

      <form onSubmit={handleSubmit} className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
        {/* Left: Shipping & Payment */}
        <div className="lg:col-span-7 space-y-6 border border-[#111111]/10 bg-[#FFFFFF] p-7 sm:p-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5954]">
                {t.checkout.fullName}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5954]">
                {t.checkout.phone}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+212 6..."
                className="mt-1.5 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5954]">
                {t.checkout.email}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5954]">
                {t.checkout.address}
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1.5 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5954]">
                {t.checkout.city}
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1.5 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
              >
                {MOROCCAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#5C5954]">
                {t.checkout.notes}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-t border-[#111111]/10 pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#111111]">
              {t.checkout.paymentMethod}
            </h2>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 border border-[#111111]/20 bg-[#F8F7F4] p-4">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 accent-[#111111]"
                />
                <div>
                  <p className="text-sm font-medium text-[#111111]">{t.checkout.cod}</p>
                  <p className="mt-0.5 text-xs text-[#5C5954]">{t.checkout.codDesc}</p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 border p-4 ${
                  gatewayConfigured
                    ? 'cursor-pointer border-[#111111]/20 bg-[#F8F7F4]'
                    : 'cursor-not-allowed border-[#111111]/10 bg-[#F8F7F4]/50 opacity-75'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  disabled={!gatewayConfigured}
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="mt-1 accent-[#111111]"
                />
                <div>
                  <p className="text-sm font-medium text-[#111111] flex items-center gap-2">
                    <span>{t.checkout.card}</span>
                    {!gatewayConfigured && <Lock className="h-3.5 w-3.5 text-[#6F6B64]" />}
                  </p>
                  <p className="mt-0.5 text-xs text-[#5C5954]">
                    {gatewayConfigured
                      ? `Passerelle active : ${settings?.payment_gateway_provider}`
                      : t.checkout.cardUnconfigured}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#111111] py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#F8F7F4] transition-colors hover:bg-[#2A2927] disabled:opacity-50"
          >
            {submitting ? 'Traitement...' : t.checkout.confirmOrder}
          </button>
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 border border-[#111111]/10 bg-[#FFFFFF] p-7 space-y-5">
          <h2 className="font-serif text-2xl font-medium text-[#111111]">Récapitulatif</h2>
          <div className="divide-y divide-[#111111]/10">
            {cart.map((item) => (
              <div
                key={`${item.product.id}-${item.selectedColor}`}
                className="flex justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-[#111111]">
                    {lang === 'ar' ? item.product.name_ar : item.product.name_fr}
                  </p>
                  <p className="text-xs text-[#6F6B64]">
                    {item.selectedColor} · Qté : {item.quantity}
                  </p>
                </div>
                <span className="tabular-nums font-medium">
                  {formatMAD(item.product.price_mad * item.quantity, lang)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-[#111111]/10 pt-4 text-sm">
            <div className="flex justify-between text-[#5C5954]">
              <span>{t.cart.subtotal}</span>
              <span className="tabular-nums">{formatMAD(subtotal, lang)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[#8E733E]">
                <span>
                  {t.cart.discount} ({appliedCoupon?.code})
                </span>
                <span className="tabular-nums">-{formatMAD(discount, lang)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#5C5954]">
              <span>{t.cart.shipping}</span>
              <span className="tabular-nums">
                {shippingFee === 0 ? t.cart.freeShipping : formatMAD(shippingFee, lang)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#111111]/10 pt-3 text-base font-semibold text-[#111111]">
              <span>{t.cart.total}</span>
              <span className="tabular-nums">{formatMAD(total, lang)}</span>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
