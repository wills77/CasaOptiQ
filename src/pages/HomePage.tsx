import React, { useState } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { translations } from '../i18n';
import { apiFetch } from '../lib/api';
import { LuxuryImage } from '../components/LuxuryImage';
import { ProductCard } from '../components/ProductCard';

export function HomePage() {
  const {
    lang,
    settings,
    categories,
    brands,
    bestSellers,
    newArrivals,
    reviews,
    recentlyViewed,
    navigate,
  } = useStore();
  const t = translations[lang];
  const [activeShowcase, setActiveShowcase] = useState<'bestsellers' | 'new'>('bestsellers');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');
  const [newsletterErr, setNewsletterErr] = useState('');

  const showcaseProducts = activeShowcase === 'bestsellers' ? bestSellers : newArrivals;

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterMsg('');
    setNewsletterErr('');
    try {
      const res = await apiFetch<{ message: string }>('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail }),
      });
      setNewsletterMsg(res.message);
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterErr(err instanceof Error ? err.message : 'Erreur');
    }
  };

  return (
    <div>
      {/* 1. Hero Campaign Banner */}
      <section className="relative overflow-hidden bg-[#111111] text-[#F8F7F4]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="flex flex-col justify-center px-6 py-16 sm:px-10 lg:col-span-5 lg:py-24">
            <p className="text-xs uppercase tracking-[0.22em] text-[#D8C6A5]">
              CasaOptiQ · Casablanca
            </p>
            <h1 className="mt-4 font-serif text-[clamp(2.5rem,4.4vw,4rem)] font-medium leading-[1.08] tracking-tight text-balance">
              {lang === 'ar'
                ? settings?.hero_title_ar || 'للنظرة أناقتها الخاصة.'
                : settings?.hero_title_fr || 'Le regard a son élégance.'}
            </h1>
            <p className="mt-5 max-w-md text-sm sm:text-base leading-relaxed text-[#F8F7F4]/80">
              {lang === 'ar'
                ? settings?.hero_subtitle_ar
                : settings?.hero_subtitle_fr}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/catalogue')}
                className="inline-flex items-center gap-3 bg-[#D8C6A5] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#111111] transition-colors hover:bg-[#B89B62] whitespace-nowrap shrink-0"
              >
                <span>{t.home.discover}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative min-h-[340px] lg:col-span-7 lg:min-h-[560px]">
            <LuxuryImage
              src={settings?.hero_banner_url || '/src/assets/images/hero_casaoptiq_luxury_1794860297522.jpg'}
              alt="CasaOptiQ Casablanca Collection"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#111111]/60 via-transparent to-transparent lg:from-[#111111]/40" />
          </div>
        </div>
      </section>

      {/* 2. Best-Sellers & New Arrivals */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="flex flex-col justify-between gap-6 border-b border-[#111111]/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#111111]">
              {activeShowcase === 'bestsellers' ? t.home.bestSellers : t.home.newArrivals}
            </h2>
            <p className="mt-2 text-sm text-[#5C5954]">
              {activeShowcase === 'bestsellers' ? t.home.bestSellersSub : t.home.newArrivalsSub}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex border border-[#111111]/15 bg-[#FFFFFF] p-1">
              <button
                type="button"
                onClick={() => setActiveShowcase('bestsellers')}
                className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeShowcase === 'bestsellers'
                    ? 'bg-[#111111] text-[#F8F7F4]'
                    : 'text-[#5C5954] hover:text-[#111111]'
                }`}
              >
                {t.home.bestSellers}
              </button>
              <button
                type="button"
                onClick={() => setActiveShowcase('new')}
                className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeShowcase === 'new'
                    ? 'bg-[#111111] text-[#F8F7F4]'
                    : 'text-[#5C5954] hover:text-[#111111]'
                }`}
              >
                {t.home.newArrivals}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/catalogue')}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#111111] hover:text-[#B89B62] whitespace-nowrap shrink-0"
            >
              <span>{t.home.exploreCatalog}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {showcaseProducts.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 3. Exclusive Collections (6 Categories) */}
      <section id="collections" className="border-y border-[#111111]/10 bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="max-w-xl">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#111111]">
              {t.home.exclusiveCollections}
            </h2>
            <p className="mt-2 text-sm text-[#5C5954]">{t.home.exclusiveSub}</p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, index) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => navigate(`/catalogue?category=${cat.slug}`)}
                className="group flex flex-col justify-between border border-[#111111]/10 bg-[#F8F7F4] p-6 text-start transition-all hover:border-[#B89B62] hover:bg-[#FFFFFF]"
              >
                <div>
                  <span className="font-mono text-xs text-[#8E733E]">0{index + 1}</span>
                  <h3 className="mt-3 font-serif text-2xl font-medium text-[#111111] group-hover:text-[#8E733E] transition-colors">
                    {lang === 'ar' ? cat.name_ar : cat.name_fr}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C5954]">
                    {lang === 'ar' ? cat.description_ar : cat.description_fr}
                  </p>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#111111]">
                  <span>{lang === 'ar' ? 'استكشاف' : 'Explorer'}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Univers CasaOptiQ */}
      <section id="maison" className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 overflow-hidden bg-[#EFECE5]">
            <LuxuryImage
              src={settings?.about_banner_url || '/src/assets/images/atelier_casablanca_boutique_1794860299990.jpg'}
              alt="Salon CasaOptiQ Casablanca"
              className="h-full min-h-[320px] w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center lg:col-span-5 lg:px-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8E733E]">
              Casablanca · Salon & Optique
            </p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-medium text-[#111111]">
              {lang === 'ar' ? settings?.about_title_ar : settings?.about_title_fr}
            </h2>
            <p className="mt-5 text-sm sm:text-base leading-relaxed text-[#5C5954]">
              {lang === 'ar' ? settings?.about_text_ar : settings?.about_text_fr}
            </p>
            <div className="mt-6 border-t border-[#111111]/10 pt-5 text-xs text-[#5C5954] space-y-1">
              <p>{settings?.store_address}</p>
              <p>{lang === 'ar' ? settings?.opening_hours_ar : settings?.opening_hours_fr}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Partner Brands Strip */}
      <section className="border-y border-[#111111]/10 bg-[#FFFFFF]">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#111111]">
              {t.home.partnerBrands}
            </h2>
            <p className="max-w-lg text-xs text-[#6F6B64]">{t.home.brandsDisclaimer}</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {brands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => navigate(`/catalogue?brand=${brand.slug}`)}
                className="border border-[#111111]/10 bg-[#F8F7F4] py-4 px-3 text-center font-serif text-lg tracking-wide text-[#111111] transition-colors hover:border-[#B89B62] hover:bg-[#FFFFFF]"
              >
                {brand.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Recently Viewed (if any) */}
      {recentlyViewed.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pt-16 lg:px-10">
          <h2 className="font-serif text-2xl font-medium text-[#111111]">{t.home.recentlyViewed}</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyViewed.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 7. Client Reviews & Newsletter */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-serif text-3xl font-medium text-[#111111]">{t.home.reviewsTitle}</h2>
            <p className="mt-1.5 text-sm text-[#5C5954]">{t.home.reviewsSub}</p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {reviews.slice(0, 4).map((rev) => (
                <div key={rev.id} className="border border-[#111111]/10 bg-[#FFFFFF] p-5">
                  <div className="flex items-center gap-1 text-[#B89B62]">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#111111]">{rev.comment}</p>
                  <p className="mt-3 text-xs text-[#6F6B64]">{rev.author_name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center border border-[#111111]/10 bg-[#111111] p-8 text-[#F8F7F4] lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#D8C6A5]">CasaOptiQ</p>
            <h3 className="mt-3 font-serif text-3xl font-medium">{t.home.newsletterTitle}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#F8F7F4]/75">
              {t.home.newsletterSub}
            </p>
            <form onSubmit={handleNewsletter} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder={t.home.newsletterPlaceholder}
                className="flex-1 border border-[#F8F7F4]/25 bg-transparent px-4 py-3 text-sm text-[#F8F7F4] placeholder:text-[#F8F7F4]/50 focus:border-[#D8C6A5] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#D8C6A5] px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#111111] hover:bg-[#B89B62] transition-colors whitespace-nowrap shrink-0"
              >
                {t.home.newsletterCta}
              </button>
            </form>
            {newsletterMsg && <p className="mt-3 text-xs text-[#D8C6A5]">{newsletterMsg}</p>}
            {newsletterErr && <p className="mt-3 text-xs text-red-400">{newsletterErr}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
