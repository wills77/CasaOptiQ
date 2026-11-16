import React, { useEffect, useState } from 'react';
import { ArrowLeft, Camera, Heart, Minus, Plus, Star, ZoomIn } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMAD, translations } from '../i18n';
import { apiFetch } from '../lib/api';
import type { Product, Review } from '../types';
import { LuxuryImage } from '../components/LuxuryImage';
import { ProductCard } from '../components/ProductCard';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { lang, addToCart, navigate, favoriteIds, toggleFavorite, recordRecentlyViewed, user } = useStore();
  const t = translations[lang];

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // Review form
  const [authorName, setAuthorName] = useState(user?.full_name || '');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');

  useEffect(() => {
    setLoading(true);
    setSelectedImageIdx(0);
    setQuantity(1);
    apiFetch<{ product: Product; reviews: Review[]; similar: Product[] }>(`/api/products/${slug}`)
      .then((res) => {
        setProduct(res.product);
        setReviews(res.reviews);
        setSimilar(res.similar);
        setSelectedColor(res.product.available_colors[0] || res.product.color_fr);
        recordRecentlyViewed(res.product);
      })
      .catch(() => {
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [slug, recordRecentlyViewed]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="h-[460px] animate-pulse bg-[#EFECE5]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-[#111111]">Produit introuvable</h1>
        <button
          type="button"
          onClick={() => navigate('/catalogue')}
          className="mt-6 border border-[#111111] px-6 py-3 text-xs uppercase tracking-widest"
        >
          Retour au catalogue
        </button>
      </div>
    );
  }

  const title = lang === 'ar' ? product.name_ar : product.name_fr;
  const description = lang === 'ar' ? product.description_ar : product.description_fr;
  const material = lang === 'ar' ? product.frame_material_ar : product.frame_material_fr;
  const isFav = favoriteIds.includes(product.id);
  const activeImg = product.images[selectedImageIdx] || product.images[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedColor);
    navigate('/commander');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewFeedback('');
    try {
      const res = await apiFetch<{ review: Review }>(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ author_name: authorName, rating, comment }),
      });
      setReviews((prev) => [res.review, ...prev]);
      setComment('');
      setReviewFeedback('Merci, votre avis a été publié.');
    } catch (err) {
      setReviewFeedback(err instanceof Error ? err.message : 'Erreur lors de la publication.');
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <button
        type="button"
        onClick={() => navigate('/catalogue')}
        className="mb-8 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#5C5954] hover:text-[#111111]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{lang === 'ar' ? 'العودة إلى الكتالوج' : 'Retour au catalogue'}</span>
      </button>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
        {/* Left: Gallery with Interactive Zoom */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div
            onMouseEnter={() => setZoomActive(true)}
            onMouseLeave={() => setZoomActive(false)}
            onMouseMove={handleMouseMove}
            onClick={() => setZoomActive(!zoomActive)}
            className="relative aspect-[4/3] w-full overflow-hidden border border-[#111111]/10 bg-[#F2EFE9] cursor-zoom-in"
          >
            <LuxuryImage
              src={activeImg}
              alt={title}
              className={`h-full w-full object-cover transition-transform duration-200 ${
                zoomActive ? 'scale-150' : 'scale-100'
              }`}
            />
            {zoomActive && activeImg && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-no-repeat"
                style={{
                  backgroundImage: `url(${activeImg})`,
                  backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                  backgroundSize: '185%',
                }}
              />
            )}
            <span className="pointer-events-none absolute bottom-3 end-3 inline-flex items-center gap-1.5 bg-[#111111]/80 px-2.5 py-1 text-[11px] text-[#F8F7F4]">
              <ZoomIn className="h-3.5 w-3.5" />
              <span>{lang === 'ar' ? 'تكبير' : 'Zoom'}</span>
            </span>
          </div>

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`aspect-[4/3] overflow-hidden border transition-all ${
                    selectedImageIdx === idx ? 'border-[#111111]' : 'border-[#111111]/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <LuxuryImage src={img} alt={`${title} ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 space-y-6 border border-[#111111]/10 bg-[#FFFFFF] p-7 sm:p-8">
          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-[#8E733E]">
              <span>{product.brand_name}</span>
              <span className="font-mono text-[#6F6B64]">{product.reference}</span>
            </div>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-medium text-[#111111] leading-tight">
              {title}
            </h1>
            {avgRating && (
              <div className="mt-2 flex items-center gap-2 text-xs text-[#5C5954]">
                <span className="inline-flex items-center gap-1 text-[#B89B62] font-medium">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {avgRating}
                </span>
                <span>·</span>
                <span>
                  {reviews.length} {lang === 'ar' ? 'تقييم' : 'avis'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-3 border-y border-[#111111]/10 py-4 tabular-nums">
            <span className="text-2xl font-semibold text-[#111111]">
              {formatMAD(product.price_mad, lang)}
            </span>
            {product.old_price_mad && product.old_price_mad > product.price_mad && (
              <span className="text-sm text-[#6F6B64] line-through">
                {formatMAD(product.old_price_mad, lang)}
              </span>
            )}
            <span className="ms-auto text-xs font-medium text-[#5C5954]">
              {product.stock > 0 ? `${t.product.inStock} (${product.stock})` : t.product.outOfStock}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-[#5C5954]">{description}</p>

          {/* Colors */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#111111]">
              {t.product.color} : <span className="font-normal text-[#5C5954]">{selectedColor}</span>
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {(product.available_colors.length > 0 ? product.available_colors : [product.color_fr]).map(
                (col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    className={`border px-3.5 py-2 text-xs transition-colors ${
                      selectedColor === col
                        ? 'border-[#111111] bg-[#111111] text-[#F8F7F4]'
                        : 'border-[#111111]/20 bg-[#F8F7F4] text-[#111111] hover:border-[#111111]'
                    }`}
                  >
                    {col}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Quantity & Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-[#111111]/20">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-11 items-center justify-center hover:bg-[#111111]/5"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-medium tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
                  className="flex h-11 w-11 items-center justify-center hover:bg-[#111111]/5"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => addToCart(product, quantity, selectedColor)}
                className="flex-1 bg-[#111111] py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#F8F7F4] transition-colors hover:bg-[#2A2927] disabled:opacity-40"
              >
                {t.product.addToBag}
              </button>

              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                aria-label="Favori"
                className="flex h-11 w-11 items-center justify-center border border-[#111111]/20 text-[#111111] hover:border-[#111111]"
              >
                <Heart className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
              </button>
            </div>

            <button
              type="button"
              disabled={product.stock <= 0}
              onClick={handleBuyNow}
              className="w-full border border-[#111111] py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#111111] transition-colors hover:bg-[#D8C6A5]/30 disabled:opacity-40"
            >
              {t.product.buyNow}
            </button>
          </div>

          {/* Technical Specs */}
          <dl className="divide-y divide-[#111111]/10 border-t border-[#111111]/10 pt-2 text-xs">
            <div className="flex justify-between py-2.5">
              <dt className="text-[#6F6B64]">{t.product.reference}</dt>
              <dd className="font-mono text-[#111111]">{product.reference}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[#6F6B64]">{t.product.material}</dt>
              <dd className="text-[#111111]">{material}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[#6F6B64]">{t.product.dimensions}</dt>
              <dd className="font-mono text-[#111111]">{product.dimensions}</dd>
            </div>
          </dl>

          {/* Planned Virtual Try-On Roadmap Notice (Not simulated as active) */}
          <div className="border border-[#111111]/10 bg-[#F8F7F4] p-4 text-xs text-[#5C5954]">
            <div className="flex items-center gap-2 font-medium text-[#111111]">
              <Camera className="h-4 w-4 text-[#8E733E]" />
              <span>{t.product.virtualTryOnTitle}</span>
            </div>
            <p className="mt-1.5 leading-relaxed">{t.product.virtualTryOnDesc}</p>
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      <section className="mt-16 border-t border-[#111111]/10 pt-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-serif text-3xl font-medium text-[#111111]">{t.product.reviews}</h2>
            <div className="mt-6 space-y-4">
              {reviews.length === 0 ? (
                <p className="text-sm text-[#5C5954]">
                  Aucun avis pour cette monture pour le moment.
                </p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="border border-[#111111]/10 bg-[#FFFFFF] p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[#B89B62]">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                      <span className="text-xs text-[#6F6B64]">
                        {new Date(r.created_at).toLocaleDateString('fr-MA')}
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm text-[#111111]">{r.comment}</p>
                    <p className="mt-2 text-xs text-[#6F6B64]">{r.author_name}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <form onSubmit={handleReviewSubmit} className="border border-[#111111]/10 bg-[#FFFFFF] p-6 space-y-4">
              <h3 className="font-serif text-2xl font-medium text-[#111111]">{t.product.writeReview}</h3>
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Votre nom</label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/15 bg-[#F8F7F4] px-3 py-2 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Note</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="mt-1 w-full border border-[#111111]/15 bg-[#F8F7F4] px-3 py-2 text-sm focus:border-[#B89B62] focus:outline-none"
                >
                  <option value={5}>5 / 5 — Exceptionnel</option>
                  <option value={4}>4 / 5 — Très satisfait</option>
                  <option value={3}>3 / 5 — Correct</option>
                  <option value={2}>2 / 5 — Moyen</option>
                  <option value={1}>1 / 5 — Déçu</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Commentaire</label>
                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/15 bg-[#F8F7F4] px-3 py-2 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#111111] py-3 text-xs font-medium uppercase tracking-[0.15em] text-[#F8F7F4] hover:bg-[#2A2927]"
              >
                Publier l’avis
              </button>
              {reviewFeedback && <p className="text-xs text-[#8E733E]">{reviewFeedback}</p>}
            </form>
          </div>
        </div>
      </section>

      {/* Similar Products */}
      {similar.length > 0 && (
        <section className="mt-16 border-t border-[#111111]/10 pt-12">
          <h2 className="font-serif text-3xl font-medium text-[#111111]">{t.product.similar}</h2>
          <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
