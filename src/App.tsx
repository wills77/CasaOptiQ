import { MessageCircle } from 'lucide-react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { AccountPage } from './pages/AccountPage';
import { LegalPage } from './pages/LegalPage';
import { AdminPage } from './pages/AdminPage';

function AppRouter() {
  const { currentPath, settings, lang } = useStore();
  const pathname = currentPath.split('?')[0];

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return <AdminPage />;
  }

  let content = <HomePage />;
  if (pathname === '/catalogue') {
    content = <CatalogPage />;
  } else if (pathname.startsWith('/produit/')) {
    const slug = pathname.replace('/produit/', '');
    content = <ProductDetailPage slug={slug} />;
  } else if (pathname === '/commander' || pathname === '/panier') {
    content = <CheckoutPage />;
  } else if (pathname === '/suivi') {
    content = <OrderTrackingPage />;
  } else if (pathname === '/compte') {
    content = <AccountPage />;
  } else if (pathname === '/cgv' || pathname === '/mentions-legales') {
    content = <LegalPage type="cgv" />;
  } else if (pathname === '/confidentialite') {
    content = <LegalPage type="privacy" />;
  }

  const whatsappClean = (settings?.whatsapp_number || '+212600000000').replace(/[^\d+]/g, '');
  const whatsappUrl = `https://wa.me/${whatsappClean.replace('+', '')}?text=${encodeURIComponent(
    lang === 'ar'
      ? 'مرحباً كازا أوبتيـك، أود الاستفسار عن إحدى النظارات.'
      : 'Bonjour CasaOptiQ, je souhaite obtenir un conseil sur une monture.'
  )}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4] text-[#111111]">
      <Navbar />
      <main className="flex-1">{content}</main>
      <Footer />
      <CartDrawer />

      {/* Discreet WhatsApp Boutique Concierge Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Contacter CasaOptiQ sur WhatsApp"
        className="fixed bottom-5 end-5 z-30 inline-flex h-11 items-center gap-2 bg-[#111111] px-4 text-xs font-medium text-[#F8F7F4] shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-[#2A2927]"
      >
        <MessageCircle className="h-4 w-4 text-[#D8C6A5]" />
        <span className="hidden sm:inline">WhatsApp</span>
      </a>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppRouter />
    </StoreProvider>
  );
}
