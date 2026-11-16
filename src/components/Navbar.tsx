import React, { useState } from 'react';
import { Menu, Search, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { translations } from '../i18n';

export function Navbar() {
  const { lang, setLang, settings, cart, setIsCartOpen, navigate, currentPath, user } = useStore();
  const t = translations[lang];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    setMobileOpen(false);
    navigate(`/catalogue?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const navItems = [
    { label: t.nav.home, path: '/' },
    { label: t.nav.catalog, path: '/catalogue' },
    { label: t.nav.collections, path: '/#collections' },
    { label: t.nav.maison, path: '/#maison' },
    { label: t.nav.tracking, path: '/suivi' },
  ];

  const handleNavClick = (path: string) => {
    setMobileOpen(false);
    if (path.startsWith('/#')) {
      const id = path.slice(2);
      if (window.location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#111111]/10 bg-[#F8F7F4]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-10">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            className="flex h-10 w-10 items-center justify-center text-[#111111] lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-start whitespace-nowrap shrink-0"
          >
            {settings?.logo_image ? (
              <img
                src={settings.logo_image}
                alt={settings.logo_text || 'CasaOptiQ'}
                className="h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <span className="font-serif text-2xl font-semibold tracking-[0.06em] text-[#111111]">
              {settings?.logo_text || 'CasaOptiQ'}
            </span>
          </button>
        </div>

        {/* Zone 2: Primary Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#5C5954]">
          {navItems.map((item) => {
            const active = currentPath === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#111111] ${
                  active ? 'text-[#111111]' : ''
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-0.5 h-[1.5px] bg-[#B89B62]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Compact Storefront Utilities & Bag Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            aria-label="Changer de langue"
            className="px-2.5 py-1.5 text-xs font-medium tracking-wider text-[#5C5954] hover:text-[#111111] transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'fr' ? 'AR' : 'FR'}
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Rechercher"
            className="flex h-10 w-10 items-center justify-center text-[#111111] hover:text-[#B89B62] transition-colors"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/compte')}
            aria-label={t.nav.account}
            className="hidden sm:flex h-10 items-center gap-1.5 px-2 text-xs font-medium text-[#111111] hover:text-[#B89B62] transition-colors whitespace-nowrap shrink-0"
          >
            <UserIcon className="h-[18px] w-[18px]" strokeWidth={1.6} />
            <span className="hidden xl:inline max-w-[110px] truncate">
              {user && user.role === 'customer' ? user.full_name.split(' ')[0] : t.nav.account}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="inline-flex h-10 items-center gap-2 bg-[#111111] px-4 text-xs font-medium tracking-wide text-[#F8F7F4] transition-colors hover:bg-[#2A2927] whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.6} />
            <span className="hidden sm:inline">{t.nav.bag}</span>
            <span className="tabular-nums font-mono text-[#D8C6A5]">({cartCount})</span>
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-[#111111]/10 bg-[#F8F7F4] px-4 py-3 sm:px-6 lg:px-10">
          <form onSubmit={handleSearchSubmit} className="mx-auto flex max-w-3xl items-center gap-3">
            <Search className="h-4 w-4 text-[#6F6B64] shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.nav.searchPlaceholder}
              className="w-full bg-transparent py-1.5 text-sm text-[#111111] placeholder:text-[#6F6B64] focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#111111] px-4 py-1.5 text-xs font-medium text-[#F8F7F4] whitespace-nowrap shrink-0"
            >
              {lang === 'ar' ? 'بحث' : 'Rechercher'}
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Fermer la recherche"
              className="p-1.5 text-[#6F6B64] hover:text-[#111111]"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="border-t border-[#111111]/10 bg-[#F8F7F4] px-6 py-5 lg:hidden">
          <nav className="flex flex-col gap-4 text-sm font-medium text-[#111111]">
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path)}
                className="text-start py-1.5 border-b border-[#111111]/8"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                navigate('/compte');
              }}
              className="text-start py-1.5 text-[#B89B62]"
            >
              {t.nav.account}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
