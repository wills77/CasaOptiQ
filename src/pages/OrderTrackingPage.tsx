import React, { useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMAD } from '../i18n';
import { apiFetch } from '../lib/api';
import type { Order } from '../types';

const STEPS = ['En attente', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée'];

export function OrderTrackingPage() {
  const { lang } = useStore();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ order: Order }>(
        `/api/orders/track/${encodeURIComponent(orderNumber.trim())}?email=${encodeURIComponent(email.trim())}`
      );
      setOrder(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commande introuvable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-14 lg:px-10">
      <div className="border-b border-[#111111]/10 pb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8E733E]">CasaOptiQ · Suivi</p>
        <h1 className="mt-2 font-serif text-4xl font-medium text-[#111111]">
          {lang === 'ar' ? 'تتبع طلبي' : 'Suivre ma commande'}
        </h1>
        <p className="mt-2 text-sm text-[#5C5954]">
          {lang === 'ar'
            ? 'أدخل رقم الطلب والبريد الإلكتروني للاطلاع على حالة التجهيز والتوصيل.'
            : 'Saisissez votre référence de commande (ex : COQ-2026-1001) et votre adresse e-mail.'}
        </p>
      </div>

      <form onSubmit={handleSearch} className="mt-8 grid grid-cols-1 gap-4 border border-[#111111]/10 bg-[#FFFFFF] p-6 sm:grid-cols-12">
        <input
          type="text"
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="COQ-2026-..."
          className="sm:col-span-5 border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm font-mono focus:border-[#B89B62] focus:outline-none"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail de commande"
          className="sm:col-span-5 border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-2 inline-flex items-center justify-center gap-2 bg-[#111111] px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#F8F7F4] hover:bg-[#2A2927]"
        >
          <PackageSearch className="h-4 w-4" />
          <span>{loading ? '...' : 'Suivre'}</span>
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {order && (
        <div className="mt-8 border border-[#111111]/10 bg-[#FFFFFF] p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#111111]/10 pb-4">
            <div>
              <p className="font-mono text-sm font-semibold text-[#111111]">{order.order_number}</p>
              <p className="text-xs text-[#6F6B64]">
                {order.shipping_city} · {new Date(order.created_at).toLocaleDateString('fr-MA')}
              </p>
            </div>
            <span className="border border-[#111111]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
              {order.status}
            </span>
          </div>

          {order.status !== 'Annulée' && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {STEPS.map((step, i) => {
                const currentIdx = STEPS.indexOf(order.status);
                const done = i <= currentIdx;
                return (
                  <div
                    key={step}
                    className={`border p-3 text-center text-xs ${
                      done
                        ? 'border-[#111111] bg-[#111111] text-[#F8F7F4]'
                        : 'border-[#111111]/10 bg-[#F8F7F4] text-[#6F6B64]'
                    }`}
                  >
                    {step}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2 text-sm">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.product_name} ({item.selected_color}) × {item.quantity}
                </span>
                <span className="tabular-nums font-medium">{formatMAD(item.total_price_mad, lang)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-[#111111]/10 pt-3 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatMAD(order.total_mad, lang)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
