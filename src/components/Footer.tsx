import { useStore } from '../context/StoreContext';
import { translations } from '../i18n';

export function Footer() {
  const { lang, settings, navigate } = useStore();
  const t = translations[lang];

  return (
    <footer className="border-t border-[#111111]/10 bg-[#111111] text-[#F8F7F4]">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <span className="font-serif text-3xl font-semibold tracking-[0.06em] text-[#F8F7F4]">
              {settings?.logo_text || 'CasaOptiQ'}
            </span>
            <p className="text-sm leading-relaxed text-[#D8C6A5]/85">
              {lang === 'ar'
                ? 'للنظرة أناقتها الخاصة — دار مختارة للنظارات الشمسية والطبية الفاخرة في الدار البيضاء.'
                : 'Le regard a son élégance. Maison dédiée à la haute lunetterie solaire et optique à Casablanca.'}
            </p>
            <p className="text-xs leading-relaxed text-[#F8F7F4]/60">
              {t.home.brandsDisclaimer}
            </p>
          </div>

          {/* Salon Info */}
          <div className="space-y-3 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D8C6A5]">
              {t.footer.boutique}
            </h3>
            <p className="text-[#F8F7F4]/80">{settings?.store_address}</p>
            <p className="text-[#F8F7F4]/80 tabular-nums">{settings?.phone_number}</p>
            <p className="text-[#F8F7F4]/80">{settings?.email}</p>
            <p className="text-xs text-[#F8F7F4]/65">
              {lang === 'ar' ? settings?.opening_hours_ar : settings?.opening_hours_fr}
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D8C6A5]">
              {t.footer.navigation}
            </h3>
            <ul className="space-y-2 text-[#F8F7F4]/80">
              <li>
                <button type="button" onClick={() => navigate('/catalogue')} className="hover:text-[#D8C6A5] transition-colors">
                  {t.nav.catalog}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/suivi')} className="hover:text-[#D8C6A5] transition-colors">
                  {t.nav.tracking}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/compte')} className="hover:text-[#D8C6A5] transition-colors">
                  {t.nav.account}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/admin')} className="hover:text-[#D8C6A5] transition-colors">
                  {lang === 'ar' ? 'إدارة المتجر' : 'Administration'}
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Social */}
          <div className="space-y-3 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D8C6A5]">
              {t.footer.legal}
            </h3>
            <ul className="space-y-2 text-[#F8F7F4]/80">
              <li>
                <button type="button" onClick={() => navigate('/cgv')} className="hover:text-[#D8C6A5] transition-colors">
                  {t.footer.cgv}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/confidentialite')} className="hover:text-[#D8C6A5] transition-colors">
                  {t.footer.privacy}
                </button>
              </li>
              <li>
                <a
                  href={settings?.instagram_url || 'https://instagram.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#D8C6A5] transition-colors"
                >
                  Instagram
                </a>
                <span className="mx-2 text-[#F8F7F4]/40">·</span>
                <a
                  href={settings?.facebook_url || 'https://facebook.com'}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#D8C6A5] transition-colors"
                >
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[#F8F7F4]/12 pt-8 text-xs text-[#F8F7F4]/60 sm:flex-row sm:items-center">
          <p>{t.footer.copyright}</p>
          <p>Casablanca · Devise : MAD</p>
        </div>
      </div>
    </footer>
  );
}
