import React, { useState } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMAD, translations } from '../i18n';
import { apiFetch } from '../lib/api';
import { LuxuryImage } from './LuxuryImage';

export function CartDrawer() {
  const {
    lang,
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQuantity,
    removeFromCart,
    settings,
    appliedCoupon,
    setAppliedCoupon,
    navigate,
  } = useStore();
  const t = translations[lang];
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [validating, setValidating] = useState(false);

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price_mad * item.quantity, 0);
  const discount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discount_percent) / 100) : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const threshold = settings?.free_shipping_threshold_mad ?? 2500;
  const baseShipping = settings?.shipping_fee_mad ?? 45;
  const shipping = cart.length === 0 ? 0 : afterDiscount >= threshold ? 0 : baseShipping;
  const total = afterDiscount + shipping;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    if (!promoInput.trim()) return;
    setValidating(true);
    try {
      const res = await apiFetch<{ coupon: { code: string; discount_percent: number } }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: promoInput.trim() }),
      });
      setAppliedCoupon(res.coupon);
      setPromoInput('');
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#111111]/45 backdrop-blur-[2px]">
      <div
        className="fixed inset-0"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#F8F7F4] text-[#111111] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#111111]/10 px-6 py-5">
          <h2 className="font-serif text-2xl font-medium tracking-wide">{t.cart.title}</h2>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center text-[#5C5954] hover:text-[#111111]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <p className="text-sm text-[#5C5954]">{t.cart.empty}</p>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/catalogue');
                }}
                className="mt-5 border border-[#111111] px-6 py-2.5 text-xs font-medium uppercase tracking-widest text-[#111111] hover:bg-[#111111] hover:text-[#F8F7F4] transition-colors"
              >
                {t.cart.continueShopping}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#111111]/10">
              {cart.map((item) => {
                const name = lang === 'ar' ? item.product.name_ar : item.product.name_fr;
                return (
                  <div key={`${item.product.id}-${item.selectedColor}`} className="flex gap-4 py-5 first:pt-0">
                    <div className="h-20 w-24 shrink-0 overflow-hidden bg-[#EFECE5] border border-[#111111]/10">
                      <LuxuryImage
                        src={item.product.images[0]}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-[#6F6B64]">
                            {item.product.brand_name}
                          </p>
                          <h3 className="font-serif text-base font-medium leading-tight">{name}</h3>
                          <p className="mt-0.5 text-xs text-[#6F6B64]">{item.selectedColor}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id, item.selectedColor)}
                          aria-label="Supprimer"
                          className="p-1 text-[#6F6B64] hover:text-[#111111]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center border border-[#111111]/20">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.product.id, item.selectedColor, item.quantity - 1)
                            }
                            aria-label="Diminuer"
                            className="flex h-8 w-8 items-center justify-center hover:bg-[#111111]/5"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-xs tabular-nums font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.product.id, item.selectedColor, item.quantity + 1)
                            }
                            aria-label="Augmenter"
                            className="flex h-8 w-8 items-center justify-center hover:bg-[#111111]/5"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMAD(item.product.price_mad * item.quantity, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary & Promo */}
        {cart.length > 0 && (
          <div className="border-t border-[#111111]/10 bg-[#FFFFFF] px-6 py-5">
            {afterDiscount < threshold && (
              <p className="mb-3 text-xs text-[#5C5954]">
                {lang === 'ar'
                  ? `أضف ${formatMAD(threshold - afterDiscount, lang)} للحصول على توصيل مجاني.`
                  : `Plus que ${formatMAD(threshold - afterDiscount, lang)} pour bénéficier de la livraison offerte.`}
              </p>
            )}

            <form onSubmit={handleApplyCoupon} className="mb-4 flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder={t.cart.promoCode}
                className="flex-1 border border-[#111111]/20 bg-[#F8F7F4] px-3 py-2 text-xs text-[#111111] placeholder:text-[#6F6B64] focus:border-[#B89B62] focus:outline-none"
              />
              <button
                type="submit"
                disabled={validating}
                className="border border-[#111111] px-4 py-2 text-xs font-medium hover:bg-[#111111] hover:text-[#F8F7F4] transition-colors whitespace-nowrap shrink-0"
              >
                {t.cart.apply}
              </button>
            </form>
            {promoError && <p className="mb-3 text-xs text-red-700">{promoError}</p>}
            {appliedCoupon && (
              <div className="mb-3 flex items-center justify-between text-xs text-[#8E733E]">
                <span>
                  Code {appliedCoupon.code} (-{appliedCoupon.discount_percent}%)
                </span>
                <button
                  type="button"
                  onClick={() => setAppliedCoupon(null)}
                  className="underline"
                >
                  Retirer
                </button>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#5C5954]">
                <span>{t.cart.subtotal}</span>
                <span className="tabular-nums">{formatMAD(subtotal, lang)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#8E733E]">
                  <span>{t.cart.discount}</span>
                  <span className="tabular-nums">-{formatMAD(discount, lang)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#5C5954]">
                <span>{t.cart.shipping}</span>
                <span className="tabular-nums">
                  {shipping === 0 ? t.cart.freeShipping : formatMAD(shipping, lang)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#111111]/10 pt-2.5 text-base font-semibold text-[#111111]">
                <span>{t.cart.total}</span>
                <span className="tabular-nums">{formatMAD(total, lang)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                navigate('/commander');
              }}
              className="mt-5 w-full bg-[#111111] py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-[#F8F7F4] transition-colors hover:bg-[#2A2927]"
            >
              {t.cart.checkout}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
