import { useStore } from '../context/StoreContext';

export function LegalPage({ type }: { type: 'cgv' | 'privacy' }) {
  const { lang, settings, navigate } = useStore();
  const title =
    type === 'cgv'
      ? lang === 'ar'
        ? 'الشروط العامة للبيع'
        : 'Conditions Générales de Vente'
      : lang === 'ar'
      ? 'سياسة الخصوصية'
      : 'Politique de Confidentialité';

  const content =
    type === 'cgv'
      ? lang === 'ar'
        ? settings?.cgv_ar
        : settings?.cgv_fr
      : lang === 'ar'
      ? settings?.privacy_ar
      : settings?.privacy_fr;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 lg:px-10">
      <p className="text-xs uppercase tracking-[0.18em] text-[#8E733E]">CasaOptiQ · Informations</p>
      <h1 className="mt-2 font-serif text-4xl font-medium text-[#111111]">{title}</h1>
      <div className="mt-8 border border-[#111111]/10 bg-[#FFFFFF] p-8 text-sm leading-relaxed text-[#5C5954] whitespace-pre-line">
        {content}
      </div>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-6 text-xs font-medium uppercase tracking-[0.14em] underline text-[#111111]"
      >
        Retour à l’accueil
      </button>
    </div>
  );
}
