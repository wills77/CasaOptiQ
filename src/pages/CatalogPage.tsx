import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';
import type { Product } from '../types';
import { ProductCard } from '../components/ProductCard';

export function CatalogPage() {
  const { lang, categories, brands, currentPath } = useStore();
  const params = new URLSearchParams(currentPath.split('?')[1] || '');

  const [q, setQ] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [brand, setBrand] = useState(params.get('brand') || 'all');
  const [color, setColor] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Sync URL query params when navigating from Home/Navbar
  useEffect(() => {
    const sp = new URLSearchParams(currentPath.split('?')[1] || '');
    if (sp.has('q')) setQ(sp.get('q') || '');
    if (sp.has('category')) setCategory(sp.get('category') || 'all');
    if (sp.has('brand')) setBrand(sp.get('brand') || 'all');
  }, [currentPath]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (category !== 'all') sp.set('category', category);
    if (brand !== 'all') sp.set('brand', brand);
    if (color !== 'all') sp.set('color', color);
    if (minPrice) sp.set('minPrice', minPrice);
    if (maxPrice) sp.set('maxPrice', maxPrice);
    if (inStockOnly) sp.set('inStock', 'true');
    if (sort) sp.set('sort', sort);

    apiFetch<{ products: Product[] }>(`/api/products?${sp.toString()}`)
      .then((res) => {
        if (active) setProducts(res.products);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [q, category, brand, color, minPrice, maxPrice, inStockOnly, sort]);

  const resetFilters = () => {
    setQ('');
    setCategory('all');
    setBrand('all');
    setColor('all');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSort('newest');
  };

  const colorOptions = ['Noir', 'Or', 'Écaille', 'Ivoire', 'Titane', 'Cognac'];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      {/* Header */}
      <div className="border-b border-[#111111]/10 pb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8E733E]">CasaOptiQ · Collection</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h1 className="font-serif text-4xl font-medium text-[#111111]">
            {lang === 'ar' ? 'الكتالوج الكامل' : 'Catalogue de Haute Lunetterie'}
          </h1>
          <p className="text-xs text-[#6F6B64] tabular-nums">
            {products.length} {lang === 'ar' ? 'نموذجاً' : 'pièces disponibles'}
          </p>
        </div>

        {/* Search + Sort Bar */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F6B64]" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'ابحث بالاسم، العلامة التجارية أو المرجع...'
                  : 'Rechercher par modèle, marque ou référence...'
              }
              className="w-full border border-[#111111]/15 bg-[#FFFFFF] py-2.5 ps-10 pe-4 text-sm text-[#111111] placeholder:text-[#6F6B64] focus:border-[#B89B62] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 border border-[#111111]/20 bg-[#FFFFFF] px-4 py-2.5 text-xs font-medium text-[#111111] lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>{lang === 'ar' ? 'تصفية' : 'Filtres'}</span>
            </button>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Trier"
              className="border border-[#111111]/15 bg-[#FFFFFF] px-4 py-2.5 text-xs font-medium text-[#111111] focus:border-[#B89B62] focus:outline-none"
            >
              <option value="newest">{lang === 'ar' ? 'الأكثر تميزاً' : 'Sélection CasaOptiQ'}</option>
              <option value="price_asc">{lang === 'ar' ? 'السعر: من الأقل' : 'Prix croissant'}</option>
              <option value="price_desc">{lang === 'ar' ? 'السعر: من الأعلى' : 'Prix décroissant'}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Sidebar Filters */}
        <aside className={`lg:col-span-3 space-y-7 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          {/* Categories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#111111]">
              {lang === 'ar' ? 'الفئات' : 'Catégories'}
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setCategory('all')}
                  className={`text-start transition-colors ${
                    category === 'all' ? 'font-semibold text-[#111111] underline underline-offset-4' : 'text-[#5C5954] hover:text-[#111111]'
                  }`}
                >
                  {lang === 'ar' ? 'الكل' : 'Toutes les catégories'}
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => setCategory(cat.slug)}
                    className={`text-start transition-colors ${
                      category === cat.slug
                        ? 'font-semibold text-[#111111] underline underline-offset-4'
                        : 'text-[#5C5954] hover:text-[#111111]'
                    }`}
                  >
                    {lang === 'ar' ? cat.name_ar : cat.name_fr}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Brands */}
          <div className="border-t border-[#111111]/10 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#111111]">
              {lang === 'ar' ? 'العلامات التجارية' : 'Marques'}
            </h3>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-3 w-full border border-[#111111]/15 bg-[#FFFFFF] px-3 py-2 text-sm text-[#111111] focus:border-[#B89B62] focus:outline-none"
            >
              <option value="all">{lang === 'ar' ? 'جميع العلامات' : 'Toutes les marques'}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div className="border-t border-[#111111]/10 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#111111]">
              {lang === 'ar' ? 'اللون' : 'Coloris'}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setColor('all')}
                className={`px-3 py-1.5 text-xs border transition-colors ${
                  color === 'all'
                    ? 'border-[#111111] bg-[#111111] text-[#F8F7F4]'
                    : 'border-[#111111]/15 bg-[#FFFFFF] text-[#5C5954]'
                }`}
              >
                {lang === 'ar' ? 'الكل' : 'Tous'}
              </button>
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`px-3 py-1.5 text-xs border transition-colors ${
                    color === c
                      ? 'border-[#111111] bg-[#111111] text-[#F8F7F4]'
                      : 'border-[#111111]/15 bg-[#FFFFFF] text-[#5C5954]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="border-t border-[#111111]/10 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#111111]">
              {lang === 'ar' ? 'السعر (درهم)' : 'Budget (MAD)'}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="border border-[#111111]/15 bg-[#FFFFFF] px-3 py-2 text-xs tabular-nums focus:border-[#B89B62] focus:outline-none"
              />
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="border border-[#111111]/15 bg-[#FFFFFF] px-3 py-2 text-xs tabular-nums focus:border-[#B89B62] focus:outline-none"
              />
            </div>
          </div>

          {/* Availability */}
          <div className="border-t border-[#111111]/10 pt-6">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#111111]">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 accent-[#111111]"
              />
              <span>{lang === 'ar' ? 'المتوفر في المخزون فقط' : 'En stock uniquement'}</span>
            </label>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-xs text-[#6F6B64] underline hover:text-[#111111]"
          >
            <X className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Réinitialiser les filtres'}</span>
          </button>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {loading ? (
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse bg-[#EFECE5]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="border border-[#111111]/10 bg-[#FFFFFF] p-12 text-center">
              <p className="font-serif text-2xl text-[#111111]">
                {lang === 'ar'
                  ? 'لم يتم العثور على نظارات مطابقة لبحثك.'
                  : 'Aucune monture ne correspond à vos critères.'}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 border border-[#111111] px-6 py-2.5 text-xs font-medium uppercase tracking-[0.15em] hover:bg-[#111111] hover:text-[#F8F7F4] transition-colors"
              >
                {lang === 'ar' ? 'عرض جميع المنتجات' : 'Afficher tout le catalogue'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
