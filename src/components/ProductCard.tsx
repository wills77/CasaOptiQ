import { Heart, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMAD } from '../i18n';
import type { Product } from '../types';
import { LuxuryImage } from './LuxuryImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { lang, navigate, addToCart, favoriteIds, toggleFavorite } = useStore();
  const isFav = favoriteIds.includes(product.id);
  const title = lang === 'ar' ? product.name_ar : product.name_fr;
  const primaryImage = product.images[0];
  const secondaryImage = product.images[1];

  return (
    <article className="group flex flex-col bg-[#FFFFFF] border border-[#111111]/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-16px_rgba(17,17,17,0.14)]">
      {/* Image Frame: 4:3 consistent aspect ratio */}
      <div
        onClick={() => navigate(`/produit/${product.slug}`)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#F2EFE9] cursor-pointer"
      >
        <LuxuryImage
          src={primaryImage}
          alt={title}
          className={`h-full w-full object-cover transition-all duration-500 ${
            secondaryImage ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]'
          }`}
        />
        {secondaryImage && (
          <LuxuryImage
            src={secondaryImage}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-[1.03]"
          />
        )}

        {/* Top right favorite affordance */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="absolute top-3 end-3 flex h-9 w-9 items-center justify-center bg-[#F8F7F4]/90 text-[#111111] transition-colors hover:bg-[#111111] hover:text-[#F8F7F4]"
        >
          <Heart className="h-4 w-4" strokeWidth={1.5} fill={isFav ? 'currentColor' : 'none'} />
        </button>

        {/* Subtle editorial text tag (zero-pill discipline: sharp rectangle, unboxed prose feel) */}
        {product.badge && (
          <span className="absolute top-3 start-3 bg-[#111111] px-2.5 py-1 text-[11px] font-medium tracking-[0.12em] uppercase text-[#F8F7F4]">
            {product.badge}
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] text-[#6F6B64]">
            <span>{product.brand_name}</span>
            <span className="font-mono">{product.reference}</span>
          </div>

          <h3
            onClick={() => navigate(`/produit/${product.slug}`)}
            className="mt-1.5 cursor-pointer font-serif text-xl font-medium text-[#111111] leading-snug transition-colors group-hover:text-[#8E733E]"
          >
            {title}
          </h3>

          <p className="mt-1 text-xs text-[#6F6B64]">
            {lang === 'ar' ? product.color_ar : product.color_fr}
            <span aria-hidden="true"> · </span>
            {product.stock > 0
              ? lang === 'ar'
                ? 'متوفر'
                : 'En stock'
              : lang === 'ar'
              ? 'نفد المخزون'
              : 'Rupture'}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#111111]/8 pt-3.5">
          <div className="flex items-baseline gap-2.5 tabular-nums">
            <span className="text-[15px] font-semibold text-[#111111]">
              {formatMAD(product.price_mad, lang)}
            </span>
            {product.old_price_mad && product.old_price_mad > product.price_mad && (
              <span className="text-xs text-[#6F6B64] line-through">
                {formatMAD(product.old_price_mad, lang)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={() => addToCart(product, 1, product.color_fr)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#111111] border border-[#111111]/20 transition-colors hover:bg-[#111111] hover:text-[#F8F7F4] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{lang === 'ar' ? 'أضف' : 'Ajouter'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
