import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Box,
  ExternalLink,
  LogOut,
  Plus,
  Settings,
  ShoppingBag,
  Tag,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMAD } from '../i18n';
import { apiFetch } from '../lib/api';
import type { Brand, Category, Coupon, Order, OrderStatus, Product, StoreSettings, User } from '../types';
import { LuxuryImage } from '../components/LuxuryImage';

type AdminTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'coupons' | 'settings';

interface DashboardData {
  kpis: {
    revenue_mad: number;
    total_orders: number;
    pending_orders: number;
    delivered_orders: number;
    total_customers: number;
    total_products: number;
    out_of_stock_products: number;
  };
  salesSeries: Array<{ day: string; revenue: number; orders_count: number }>;
  recentOrders: Order[];
  topProducts: Array<{
    id: number;
    reference: string;
    name_fr: string;
    brand_name: string;
    price_mad: number;
    stock: number;
    units_sold: number;
    revenue_mad: number;
  }>;
}

interface AdminCustomer {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  orders_count: number;
  total_spent_mad: number;
  created_at: string;
}

const ORDER_STATUSES: OrderStatus[] = [
  'En attente',
  'Confirmée',
  'En préparation',
  'Expédiée',
  'Livrée',
  'Annulée',
];

export function AdminPage() {
  const { navigate, refreshBootstrap } = useStore();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Login Form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Mandatory Password Change Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePassError, setChangePassError] = useState('');

  // Workspace State
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [settingsForm, setSettingsForm] = useState<StoreSettings | null>(null);
  const [feedback, setFeedback] = useState('');

  // Orders filter & detail
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Customer search & orders modal
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  // Product Form Modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productError, setProductError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  // Category / Brand Quick Add
  const [newCatNameFr, setNewCatNameFr] = useState('');
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandCountry, setNewBrandCountry] = useState('');

  // Coupon Quick Add
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPercent, setNewCouponPercent] = useState(10);
  const [newCouponExpires, setNewCouponExpires] = useState('2027-12-31');

  const checkAdminSession = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const res = await apiFetch<{ user: User; mustChangePassword: boolean }>('/api/admin/status');
      setAdminUser(res.user);
      setMustChangePassword(res.mustChangePassword);
    } catch {
      setAdminUser(null);
      setMustChangePassword(false);
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAdminSession();
  }, [checkAdminSession]);

  const loadTabData = useCallback(async (tab: AdminTab) => {
    try {
      if (tab === 'dashboard') {
        const d = await apiFetch<DashboardData>('/api/admin/dashboard');
        setDashboard(d);
      } else if (tab === 'products') {
        const [pRes, cRes, bRes] = await Promise.all([
          apiFetch<{ products: Product[] }>('/api/admin/products'),
          apiFetch<{ categories: Category[] }>('/api/admin/categories'),
          apiFetch<{ brands: Brand[] }>('/api/admin/brands'),
        ]);
        setProducts(pRes.products);
        setCategories(cRes.categories);
        setBrands(bRes.brands);
      } else if (tab === 'orders') {
        const sp = new URLSearchParams();
        if (orderStatusFilter !== 'all') sp.set('status', orderStatusFilter);
        if (orderSearch.trim()) sp.set('q', orderSearch.trim());
        const oRes = await apiFetch<{ orders: Order[] }>(`/api/admin/orders?${sp.toString()}`);
        setOrders(oRes.orders);
      } else if (tab === 'customers') {
        const cRes = await apiFetch<{ customers: AdminCustomer[] }>(
          `/api/admin/customers?q=${encodeURIComponent(customerSearch.trim())}`
        );
        setCustomers(cRes.customers);
      } else if (tab === 'coupons') {
        const res = await apiFetch<{ coupons: Coupon[] }>('/api/admin/coupons');
        setCoupons(res.coupons);
      } else if (tab === 'settings') {
        const res = await apiFetch<{ settings: StoreSettings }>('/api/admin/settings');
        setSettingsForm(res.settings);
      }
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'MUST_CHANGE_PASSWORD') {
        setMustChangePassword(true);
      }
    }
  }, [orderStatusFilter, orderSearch, customerSearch]);

  useEffect(() => {
    if (adminUser && !mustChangePassword) {
      loadTabData(activeTab);
    }
  }, [adminUser, mustChangePassword, activeTab, loadTabData]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await apiFetch<{ user: User; mustChangePassword: boolean }>('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      setAdminUser(res.user);
      setMustChangePassword(res.mustChangePassword);
      setCurrentPassword(password);
      setPassword('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Échec de connexion');
    }
  };

  const handleChangeInitialPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    if (newPassword !== confirmNewPassword) {
      setChangePassError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    try {
      const res = await apiFetch<{ user: User }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setAdminUser(res.user);
      setMustChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setChangePassError(err instanceof Error ? err.message : 'Impossible de mettre à jour le mot de passe.');
    }
  };

  const handleAdminLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setAdminUser(null);
    setMustChangePassword(false);
  };

  const handleImageUpload = async (files: FileList | null, onUploaded: (urls: string[]) => void) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f));
      const res = await apiFetch<{ urls: string[] }>('/api/admin/upload', {
        method: 'POST',
        body: fd,
      });
      onUploaded(res.urls);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setProductError('');
    try {
      if (editingProduct.id) {
        await apiFetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingProduct),
        });
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(editingProduct),
        });
      }
      setEditingProduct(null);
      await loadTabData('products');
      await refreshBootstrap();
      setFeedback('Produit enregistré avec succès.');
    } catch (err) {
      setProductError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    setFeedback('');
    try {
      await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      await loadTabData('products');
      await refreshBootstrap();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: OrderStatus) => {
    const res = await apiFetch<{ order: Order }>(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
    if (selectedOrder?.id === orderId) setSelectedOrder(res.order);
  };

  const handleInspectCustomer = async (cust: AdminCustomer) => {
    setSelectedCustomer(cust);
    const res = await apiFetch<{ orders: Order[] }>(`/api/admin/customers/${cust.id}/orders`);
    setCustomerOrders(res.orders);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    setFeedback('');
    const res = await apiFetch<{ settings: StoreSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsForm),
    });
    setSettingsForm(res.settings);
    await refreshBootstrap();
    setFeedback('Paramètres de la boutique enregistrés.');
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7F4] text-sm text-[#5C5954]">
        Vérification de session...
      </div>
    );
  }

  // 1. Admin Login View (no credentials exposed)
  if (!adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111111] px-4 text-[#F8F7F4]">
        <div className="w-full max-w-md border border-[#F8F7F4]/15 bg-[#191919] p-8 sm:p-10">
          <p className="text-xs uppercase tracking-[0.22em] text-[#D8C6A5]">CasaOptiQ · Back-Office</p>
          <h1 className="mt-2 font-serif text-3xl font-medium">Console d’Administration</h1>
          <p className="mt-2 text-xs text-[#F8F7F4]/65">
            Accès réservé à la gestion de la boutique CasaOptiQ.
          </p>

          <form onSubmit={handleAdminLogin} className="mt-7 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#D8C6A5]">
                Identifiant ou E-mail
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1.5 w-full border border-[#F8F7F4]/20 bg-[#111111] px-3.5 py-2.5 text-sm text-[#F8F7F4] focus:border-[#D8C6A5] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.12em] text-[#D8C6A5]">
                Mot de passe
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full border border-[#F8F7F4]/20 bg-[#111111] px-3.5 py-2.5 text-sm text-[#F8F7F4] focus:border-[#D8C6A5] focus:outline-none"
              />
            </div>

            {loginError && <p className="text-xs text-red-400">{loginError}</p>}

            <button
              type="submit"
              className="w-full bg-[#D8C6A5] py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#111111] hover:bg-[#B89B62] transition-colors"
            >
              Se connecter
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 block w-full text-center text-xs text-[#F8F7F4]/60 hover:text-[#F8F7F4]"
          >
            Retour à la boutique publique
          </button>
        </div>
      </div>
    );
  }

  // 2. Mandatory First-Login Password Change Gate
  if (mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111111] px-4 text-[#F8F7F4]">
        <div className="w-full max-w-md border border-[#D8C6A5]/40 bg-[#191919] p-8 sm:p-10">
          <p className="text-xs uppercase tracking-[0.18em] text-[#D8C6A5]">Sécurité Obligatoire</p>
          <h1 className="mt-2 font-serif text-3xl font-medium">Changement de mot de passe requis</h1>
          <p className="mt-2 text-xs leading-relaxed text-[#F8F7F4]/75">
            Pour sécuriser votre boutique dès la première connexion, veuillez définir un nouveau mot de passe administrateur (8 caractères minimum).
          </p>

          <form onSubmit={handleChangeInitialPassword} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs text-[#D8C6A5]">Mot de passe actuel</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 w-full border border-[#F8F7F4]/20 bg-[#111111] px-3.5 py-2.5 text-sm text-[#F8F7F4]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#D8C6A5]">Nouveau mot de passe (8+ caractères)</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full border border-[#F8F7F4]/20 bg-[#111111] px-3.5 py-2.5 text-sm text-[#F8F7F4]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#D8C6A5]">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="mt-1 w-full border border-[#F8F7F4]/20 bg-[#111111] px-3.5 py-2.5 text-sm text-[#F8F7F4]"
              />
            </div>

            {changePassError && <p className="text-xs text-red-400">{changePassError}</p>}

            <button
              type="submit"
              className="w-full bg-[#D8C6A5] py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#111111]"
            >
              Valider et accéder au tableau de bord
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'products', label: 'Produits & Catalogue', icon: <Box className="h-4 w-4" /> },
    { id: 'orders', label: 'Commandes', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'customers', label: 'Clients', icon: <Users className="h-4 w-4" /> },
    { id: 'coupons', label: 'Promotions', icon: <Tag className="h-4 w-4" /> },
    { id: 'settings', label: 'Gestion du site', icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8F7F4] text-[#111111]">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-e border-[#111111]/10 bg-[#111111] text-[#F8F7F4] lg:flex">
        <div>
          <div className="border-b border-[#F8F7F4]/10 px-6 py-5">
            <span className="font-serif text-2xl font-semibold tracking-[0.06em]">CasaOptiQ</span>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-[#D8C6A5]">
              Administration
            </p>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setFeedback('');
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-xs font-medium tracking-wide transition-colors ${
                  activeTab === item.id
                    ? 'bg-[#D8C6A5] text-[#111111]'
                    : 'text-[#F8F7F4]/75 hover:bg-[#F8F7F4]/8 hover:text-[#F8F7F4]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="border-t border-[#F8F7F4]/10 p-4 space-y-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-[#D8C6A5] hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Voir la boutique</span>
          </button>
          <button
            type="button"
            onClick={handleAdminLogout}
            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-[#F8F7F4]/70 hover:text-[#F8F7F4]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#111111]/10 bg-[#FFFFFF] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-semibold lg:hidden">CasaOptiQ Admin</span>
            <span className="text-xs uppercase tracking-[0.14em] text-[#6F6B64]">
              {navItems.find((i) => i.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as AdminTab)}
              className="border border-[#111111]/20 bg-[#F8F7F4] px-3 py-1.5 text-xs"
            >
              {navItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleAdminLogout} className="p-2 text-xs underline">
              Quitter
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-xs text-[#5C5954]">
            <span>{adminUser.full_name}</span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 space-y-6">
          {feedback && (
            <div className="border border-[#B89B62] bg-[#FFFFFF] px-4 py-3 text-xs font-medium text-[#111111]">
              {feedback}
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && dashboard && (
            <div className="space-y-8">
              {/* KPI Strip */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
                {[
                  { label: 'Chiffre d’affaires', value: formatMAD(dashboard.kpis.revenue_mad) },
                  { label: 'Commandes', value: String(dashboard.kpis.total_orders) },
                  { label: 'En attente', value: String(dashboard.kpis.pending_orders) },
                  { label: 'Livrées', value: String(dashboard.kpis.delivered_orders) },
                  { label: 'Clients', value: String(dashboard.kpis.total_customers) },
                  { label: 'Produits', value: String(dashboard.kpis.total_products) },
                  { label: 'Rupture de stock', value: String(dashboard.kpis.out_of_stock_products) },
                ].map((kpi) => (
                  <div key={kpi.label} className="border border-[#111111]/10 bg-[#FFFFFF] p-4">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[#6F6B64]">{kpi.label}</p>
                    <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-[#111111]">
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Sales Chart */}
              <div className="border border-[#111111]/10 bg-[#FFFFFF] p-6">
                <h2 className="font-serif text-xl font-medium">Évolution des ventes (MAD)</h2>
                {dashboard.salesSeries.length === 0 ? (
                  <p className="mt-4 text-xs text-[#6F6B64]">Aucune donnée de vente enregistrée.</p>
                ) : (
                  <div className="mt-6 flex items-end gap-4 h-44 border-b border-[#111111]/10 pb-2">
                    {dashboard.salesSeries.map((point) => {
                      const maxRev = Math.max(...dashboard.salesSeries.map((s) => s.revenue), 1);
                      const pct = Math.max(8, Math.round((point.revenue / maxRev) * 100));
                      return (
                        <div key={point.day} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                          <span className="text-[11px] font-mono tabular-nums text-[#5C5954]">
                            {formatMAD(point.revenue)}
                          </span>
                          <div
                            className="w-full max-w-[56px] bg-[#111111] transition-all"
                            style={{ height: `${pct}%` }}
                          />
                          <span className="text-[11px] font-mono text-[#6F6B64]">{point.day.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Latest Orders & Top Products */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="border border-[#111111]/10 bg-[#FFFFFF] p-6">
                  <h2 className="font-serif text-xl font-medium">Dernières commandes</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#111111]/10 text-[#6F6B64]">
                        <tr>
                          <th className="py-2">Réf</th>
                          <th className="py-2">Client</th>
                          <th className="py-2">Statut</th>
                          <th className="py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#111111]/8">
                        {dashboard.recentOrders.map((o) => (
                          <tr key={o.id}>
                            <td className="py-2.5 font-mono">{o.order_number}</td>
                            <td className="py-2.5">{o.customer_name}</td>
                            <td className="py-2.5">{o.status}</td>
                            <td className="py-2.5 text-right tabular-nums font-medium">
                              {formatMAD(o.total_mad)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-[#111111]/10 bg-[#FFFFFF] p-6">
                  <h2 className="font-serif text-xl font-medium">Produits les plus vendus</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#111111]/10 text-[#6F6B64]">
                        <tr>
                          <th className="py-2">Monture</th>
                          <th className="py-2">Marque</th>
                          <th className="py-2 text-right">Vendus</th>
                          <th className="py-2 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#111111]/8">
                        {dashboard.topProducts.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2.5 font-medium">{p.name_fr}</td>
                            <td className="py-2.5 text-[#5C5954]">{p.brand_name}</td>
                            <td className="py-2.5 text-right tabular-nums">{p.units_sold}</td>
                            <td className="py-2.5 text-right tabular-nums">{p.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS, CATEGORIES & BRANDS */}
          {activeTab === 'products' && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-serif text-2xl font-medium">Gestion des Produits ({products.length})</h2>
                <button
                  type="button"
                  onClick={() =>
                    setEditingProduct({
                      reference: `COQ-${Math.floor(1000 + Math.random() * 9000)}`,
                      name_fr: '',
                      name_ar: '',
                      brand_id: brands[0]?.id,
                      category_id: categories[0]?.id,
                      price_mad: 2500,
                      old_price_mad: null,
                      description_fr: '',
                      description_ar: '',
                      color_fr: 'Noir & Or',
                      color_ar: 'أسود وذهبي',
                      available_colors: ['Noir & Or'],
                      frame_material_fr: 'Acétate italien',
                      frame_material_ar: 'أسيتات إيطالي',
                      dimensions: '52-18-145 mm',
                      stock: 10,
                      badge: 'Nouveau',
                      is_featured: false,
                      images: ['/src/assets/images/eyewear_acetate_noir_1794860298059.jpg'],
                    })
                  }
                  className="inline-flex items-center gap-2 bg-[#111111] px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-[#F8F7F4]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Ajouter un produit</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-[#111111]/10 bg-[#FFFFFF]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#111111]/10 bg-[#F8F7F4] text-[#6F6B64]">
                    <tr>
                      <th className="p-3">Produit</th>
                      <th className="p-3">Réf</th>
                      <th className="p-3">Marque</th>
                      <th className="p-3 text-right">Prix MAD</th>
                      <th className="p-3 text-right">Stock</th>
                      <th className="p-3">Vedette</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111111]/8">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F8F7F4]/50">
                        <td className="p-3 flex items-center gap-3">
                          <div className="h-10 w-12 shrink-0 overflow-hidden bg-[#EFECE5]">
                            <LuxuryImage src={p.images[0]} alt={p.name_fr} className="h-full w-full object-cover" />
                          </div>
                          <span className="font-medium">{p.name_fr}</span>
                        </td>
                        <td className="p-3 font-mono text-[#5C5954]">{p.reference}</td>
                        <td className="p-3">{p.brand_name}</td>
                        <td className="p-3 text-right tabular-nums font-medium">{formatMAD(p.price_mad)}</td>
                        <td className="p-3 text-right tabular-nums">
                          <span className={p.stock <= 0 ? 'text-red-700 font-semibold' : ''}>{p.stock}</span>
                        </td>
                        <td className="p-3">{p.is_featured ? 'Oui' : 'Non'}</td>
                        <td className="p-3 text-right space-x-3">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="underline hover:text-[#B89B62]"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="text-red-700 hover:underline"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Categories & Brands Management */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="border border-[#111111]/10 bg-[#FFFFFF] p-6 space-y-4">
                  <h3 className="font-serif text-xl font-medium">Catégories</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nom FR"
                      value={newCatNameFr}
                      onChange={(e) => setNewCatNameFr(e.target.value)}
                      className="flex-1 border border-[#111111]/20 px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Nom AR"
                      value={newCatNameAr}
                      onChange={(e) => setNewCatNameAr(e.target.value)}
                      className="flex-1 border border-[#111111]/20 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newCatNameFr.trim()) return;
                        await apiFetch('/api/admin/categories', {
                          method: 'POST',
                          body: JSON.stringify({ name_fr: newCatNameFr, name_ar: newCatNameAr }),
                        });
                        setNewCatNameFr('');
                        setNewCatNameAr('');
                        await loadTabData('products');
                      }}
                      className="bg-[#111111] px-4 py-2 text-xs text-[#F8F7F4]"
                    >
                      Ajouter
                    </button>
                  </div>
                  <ul className="divide-y divide-[#111111]/8 text-xs">
                    {categories.map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-2">
                        <span>{c.name_fr}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                              await loadTabData('products');
                            } catch (err) {
                              setFeedback(err instanceof Error ? err.message : 'Erreur');
                            }
                          }}
                          className="text-red-700 hover:underline"
                        >
                          Supprimer
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-[#111111]/10 bg-[#FFFFFF] p-6 space-y-4">
                  <h3 className="font-serif text-xl font-medium">Marques</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nom de la marque"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      className="flex-1 border border-[#111111]/20 px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Pays"
                      value={newBrandCountry}
                      onChange={(e) => setNewBrandCountry(e.target.value)}
                      className="w-32 border border-[#111111]/20 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newBrandName.trim()) return;
                        await apiFetch('/api/admin/brands', {
                          method: 'POST',
                          body: JSON.stringify({ name: newBrandName, country: newBrandCountry }),
                        });
                        setNewBrandName('');
                        setNewBrandCountry('');
                        await loadTabData('products');
                      }}
                      className="bg-[#111111] px-4 py-2 text-xs text-[#F8F7F4]"
                    >
                      Ajouter
                    </button>
                  </div>
                  <ul className="divide-y divide-[#111111]/8 text-xs max-h-60 overflow-y-auto">
                    {brands.map((b) => (
                      <li key={b.id} className="flex items-center justify-between py-2">
                        <span>
                          {b.name} <span className="text-[#6F6B64]">({b.country})</span>
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await apiFetch(`/api/admin/brands/${b.id}`, { method: 'DELETE' });
                              await loadTabData('products');
                            } catch (err) {
                              setFeedback(err instanceof Error ? err.message : 'Erreur');
                            }
                          }}
                          className="text-red-700 hover:underline"
                        >
                          Supprimer
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Rechercher référence, client, téléphone, ville..."
                  className="flex-1 min-w-[220px] border border-[#111111]/15 bg-[#FFFFFF] px-3.5 py-2 text-xs"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="border border-[#111111]/15 bg-[#FFFFFF] px-3.5 py-2 text-xs"
                >
                  <option value="all">Tous les statuts</option>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => loadTabData('orders')}
                  className="bg-[#111111] px-4 py-2 text-xs text-[#F8F7F4]"
                >
                  Filtrer
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
                <div className="xl:col-span-7 overflow-x-auto border border-[#111111]/10 bg-[#FFFFFF]">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#111111]/10 bg-[#F8F7F4] text-[#6F6B64]">
                      <tr>
                        <th className="p-3">Commande</th>
                        <th className="p-3">Client</th>
                        <th className="p-3">Ville</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#111111]/8">
                      {orders.map((o) => (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className={`cursor-pointer hover:bg-[#F8F7F4] ${
                            selectedOrder?.id === o.id ? 'bg-[#F8F7F4]' : ''
                          }`}
                        >
                          <td className="p-3 font-mono font-medium">{o.order_number}</td>
                          <td className="p-3">{o.customer_name}</td>
                          <td className="p-3 text-[#5C5954]">{o.shipping_city}</td>
                          <td className="p-3">{o.status}</td>
                          <td className="p-3 text-right tabular-nums font-medium">{formatMAD(o.total_mad)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="xl:col-span-5 border border-[#111111]/10 bg-[#FFFFFF] p-6">
                  {selectedOrder ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between border-b border-[#111111]/10 pb-3">
                        <span className="font-mono text-sm font-semibold">{selectedOrder.order_number}</span>
                        <span className="font-semibold">{selectedOrder.status}</span>
                      </div>
                      <div className="space-y-1 text-[#5C5954]">
                        <p className="font-medium text-[#111111]">{selectedOrder.customer_name}</p>
                        <p>{selectedOrder.customer_phone}</p>
                        <p>{selectedOrder.customer_email}</p>
                        <p>
                          {selectedOrder.shipping_address}, {selectedOrder.shipping_city}
                        </p>
                      </div>
                      <div className="border-t border-[#111111]/10 pt-3 space-y-1.5">
                        {selectedOrder.items?.map((it) => (
                          <div key={it.id} className="flex justify-between">
                            <span>
                              {it.product_name} ({it.selected_color}) × {it.quantity}
                            </span>
                            <span className="tabular-nums">{formatMAD(it.total_price_mad)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-[#111111]/10 pt-2 font-semibold text-sm">
                          <span>Total</span>
                          <span className="tabular-nums">{formatMAD(selectedOrder.total_mad)}</span>
                        </div>
                      </div>
                      <div className="border-t border-[#111111]/10 pt-4">
                        <p className="mb-2 font-semibold uppercase tracking-[0.12em] text-[#6F6B64]">
                          Mettre à jour le statut
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {ORDER_STATUSES.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleUpdateOrderStatus(selectedOrder.id, st)}
                              className={`border py-2 px-2 text-xs transition-colors ${
                                selectedOrder.status === st
                                  ? 'border-[#111111] bg-[#111111] text-[#F8F7F4]'
                                  : 'border-[#111111]/20 hover:border-[#111111]'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6F6B64]">
                      Sélectionnez une commande pour consulter ses détails et modifier son statut.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Rechercher client par nom, e-mail, téléphone ou ville..."
                  className="flex-1 border border-[#111111]/15 bg-[#FFFFFF] px-3.5 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => loadTabData('customers')}
                  className="bg-[#111111] px-4 py-2 text-xs text-[#F8F7F4]"
                >
                  Rechercher
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
                <div className="xl:col-span-7 overflow-x-auto border border-[#111111]/10 bg-[#FFFFFF]">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#111111]/10 bg-[#F8F7F4] text-[#6F6B64]">
                      <tr>
                        <th className="p-3">Client</th>
                        <th className="p-3">Téléphone</th>
                        <th className="p-3">Ville</th>
                        <th className="p-3 text-right">Commandes</th>
                        <th className="p-3 text-right">Total dépensé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#111111]/8">
                      {customers.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => handleInspectCustomer(c)}
                          className="cursor-pointer hover:bg-[#F8F7F4]"
                        >
                          <td className="p-3">
                            <p className="font-medium">{c.full_name}</p>
                            <p className="text-[#6F6B64]">{c.email}</p>
                          </td>
                          <td className="p-3">{c.phone || '—'}</td>
                          <td className="p-3">{c.city || '—'}</td>
                          <td className="p-3 text-right tabular-nums">{c.orders_count}</td>
                          <td className="p-3 text-right tabular-nums font-medium">
                            {formatMAD(c.total_spent_mad)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="xl:col-span-5 border border-[#111111]/10 bg-[#FFFFFF] p-6">
                  {selectedCustomer ? (
                    <div className="space-y-4 text-xs">
                      <h3 className="font-serif text-xl font-medium">{selectedCustomer.full_name}</h3>
                      <p className="text-[#5C5954]">
                        {selectedCustomer.email} · {selectedCustomer.phone} · {selectedCustomer.address},{' '}
                        {selectedCustomer.city}
                      </p>
                      <div className="border-t border-[#111111]/10 pt-3 space-y-2">
                        <p className="font-semibold uppercase tracking-[0.12em] text-[#6F6B64]">
                          Historique d’achats
                        </p>
                        {customerOrders.length === 0 ? (
                          <p className="text-[#6F6B64]">Aucune commande.</p>
                        ) : (
                          customerOrders.map((co) => (
                            <div key={co.id} className="flex justify-between border-b border-[#111111]/8 pb-2">
                              <div>
                                <span className="font-mono font-medium">{co.order_number}</span>
                                <span className="mx-1.5">·</span>
                                <span>{co.status}</span>
                              </div>
                              <span className="tabular-nums font-medium">{formatMAD(co.total_mad)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6F6B64]">
                      Cliquez sur un client pour consulter ses coordonnées et son historique d’achat.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COUPONS */}
          {activeTab === 'coupons' && (
            <div className="space-y-6 max-w-4xl">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await apiFetch('/api/admin/coupons', {
                    method: 'POST',
                    body: JSON.stringify({
                      code: newCouponCode,
                      discount_percent: newCouponPercent,
                      expires_at: newCouponExpires,
                    }),
                  });
                  setNewCouponCode('');
                  await loadTabData('coupons');
                }}
                className="grid grid-cols-1 gap-3 border border-[#111111]/10 bg-[#FFFFFF] p-6 sm:grid-cols-4"
              >
                <input
                  type="text"
                  required
                  placeholder="Code (ex : CASA20)"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  className="border border-[#111111]/20 px-3 py-2 text-xs uppercase font-mono"
                />
                <input
                  type="number"
                  required
                  min={1}
                  max={90}
                  value={newCouponPercent}
                  onChange={(e) => setNewCouponPercent(Number(e.target.value))}
                  className="border border-[#111111]/20 px-3 py-2 text-xs tabular-nums"
                />
                <input
                  type="date"
                  required
                  value={newCouponExpires}
                  onChange={(e) => setNewCouponExpires(e.target.value)}
                  className="border border-[#111111]/20 px-3 py-2 text-xs"
                />
                <button type="submit" className="bg-[#111111] px-4 py-2 text-xs text-[#F8F7F4]">
                  Créer code promo
                </button>
              </form>

              <div className="border border-[#111111]/10 bg-[#FFFFFF]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#111111]/10 bg-[#F8F7F4] text-[#6F6B64]">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Réduction</th>
                      <th className="p-3">Expiration</th>
                      <th className="p-3">État</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#111111]/8">
                    {coupons.map((c) => (
                      <tr key={c.id}>
                        <td className="p-3 font-mono font-semibold">{c.code}</td>
                        <td className="p-3 tabular-nums">-{c.discount_percent}%</td>
                        <td className="p-3 font-mono">{c.expires_at}</td>
                        <td className="p-3">{c.is_active ? 'Actif' : 'Désactivé'}</td>
                        <td className="p-3 text-right space-x-3">
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/coupons/${c.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ is_active: !c.is_active }),
                              });
                              await loadTabData('coupons');
                            }}
                            className="underline"
                          >
                            {c.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' });
                              await loadTabData('coupons');
                            }}
                            className="text-red-700 hover:underline"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: STORE SETTINGS */}
          {activeTab === 'settings' && settingsForm && (
            <form onSubmit={handleSaveSettings} className="max-w-4xl space-y-6 border border-[#111111]/10 bg-[#FFFFFF] p-7">
              <h2 className="font-serif text-2xl font-medium">Identité, Coordonnées & Livraison</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <label className="block font-medium text-[#5C5954]">Nom / Logo texte</label>
                  <input
                    type="text"
                    value={settingsForm.logo_text}
                    onChange={(e) => setSettingsForm({ ...settingsForm, logo_text: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#5C5954]">Logo image (URL ou téléverser)</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={settingsForm.logo_image || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, logo_image: e.target.value })}
                      className="flex-1 border border-[#111111]/20 px-3 py-2 text-xs"
                    />
                    <label className="cursor-pointer border border-[#111111] px-3 py-2 text-xs">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e.target.files, (urls) =>
                            setSettingsForm({ ...settingsForm, logo_image: urls[0] || '' })
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#5C5954]">Bannière Hero (URL ou upload)</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={settingsForm.hero_banner_url}
                      onChange={(e) => setSettingsForm({ ...settingsForm, hero_banner_url: e.target.value })}
                      className="flex-1 border border-[#111111]/20 px-3 py-2 text-xs"
                    />
                    <label className="cursor-pointer border border-[#111111] px-3 py-2 text-xs">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(e.target.files, (urls) =>
                            setSettingsForm({ ...settingsForm, hero_banner_url: urls[0] || settingsForm.hero_banner_url })
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[#5C5954]">Slogan / Titre Hero (FR)</label>
                  <input
                    type="text"
                    value={settingsForm.hero_title_fr}
                    onChange={(e) => setSettingsForm({ ...settingsForm, hero_title_fr: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#5C5954]">Slogan / Titre Hero (AR)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={settingsForm.hero_title_ar}
                    onChange={(e) => setSettingsForm({ ...settingsForm, hero_title_ar: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#5C5954]">Texte Univers CasaOptiQ (FR)</label>
                  <textarea
                    rows={3}
                    value={settingsForm.about_text_fr}
                    onChange={(e) => setSettingsForm({ ...settingsForm, about_text_fr: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#5C5954]">Adresse de la boutique</label>
                  <input
                    type="text"
                    value={settingsForm.store_address}
                    onChange={(e) => setSettingsForm({ ...settingsForm, store_address: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#5C5954]">Horaires d’ouverture (FR)</label>
                  <input
                    type="text"
                    value={settingsForm.opening_hours_fr}
                    onChange={(e) => setSettingsForm({ ...settingsForm, opening_hours_fr: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#5C5954]">Numéro WhatsApp</label>
                  <input
                    type="text"
                    value={settingsForm.whatsapp_number}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_number: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#5C5954]">Téléphone boutique</label>
                  <input
                    type="text"
                    value={settingsForm.phone_number}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone_number: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#5C5954]">E-mail de contact</label>
                  <input
                    type="email"
                    value={settingsForm.email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#5C5954]">Instagram URL</label>
                  <input
                    type="text"
                    value={settingsForm.instagram_url}
                    onChange={(e) => setSettingsForm({ ...settingsForm, instagram_url: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#5C5954]">Facebook URL</label>
                  <input
                    type="text"
                    value={settingsForm.facebook_url}
                    onChange={(e) => setSettingsForm({ ...settingsForm, facebook_url: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#5C5954]">Frais livraison (MAD)</label>
                    <input
                      type="number"
                      value={settingsForm.shipping_fee_mad}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, shipping_fee_mad: Number(e.target.value) })
                      }
                      className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#5C5954]">Seuil gratuité (MAD)</label>
                    <input
                      type="number"
                      value={settingsForm.free_shipping_threshold_mad}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          free_shipping_threshold_mad: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#5C5954]">Conditions Générales de Vente (FR)</label>
                  <textarea
                    rows={4}
                    value={settingsForm.cgv_fr}
                    onChange={(e) => setSettingsForm({ ...settingsForm, cgv_fr: e.target.value })}
                    className="mt-1 w-full border border-[#111111]/20 px-3 py-2 text-sm"
                  />
                </div>

                <div className="sm:col-span-2 border border-[#111111]/10 bg-[#F8F7F4] p-4">
                  <p className="font-semibold text-[#111111]">Passerelle Carte Bancaire (Maroc)</p>
                  <p className="mt-1 text-[#5C5954]">
                    État actuel : {settingsForm.payment_gateway_provider}. Le paiement à la livraison (COD) est actif par défaut. Pour activer le paiement carte (CMI / Payzone), configurez les clés marchandes côté serveur avant d’activer la passerelle.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="bg-[#111111] px-7 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F8F7F4]"
              >
                Enregistrer les paramètres
              </button>
            </form>
          )}
        </main>
      </div>

      {/* Product Create/Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/55 p-4">
          <form
            onSubmit={handleSaveProduct}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-[#FFFFFF] p-7 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#111111]/10 pb-3">
              <h3 className="font-serif text-2xl font-medium">
                {editingProduct.id ? 'Modifier le produit' : 'Nouveau produit'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-xs underline"
              >
                Fermer
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-medium text-[#5C5954]">Référence</label>
                <input
                  type="text"
                  required
                  value={editingProduct.reference || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, reference: e.target.value })}
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C5954]">Étiquette</label>
                <select
                  value={editingProduct.badge || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      badge: (e.target.value || null) as Product['badge'],
                    })
                  }
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2"
                >
                  <option value="">Aucune</option>
                  <option value="Nouveau">Nouveau</option>
                  <option value="Promotion">Promotion</option>
                  <option value="Best-seller">Best-seller</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#5C5954]">Nom (FR)</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name_fr || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name_fr: e.target.value })}
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C5954]">Nom (AR)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={editingProduct.name_ar || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name_ar: e.target.value })}
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-medium text-[#5C5954]">Marque</label>
                <select
                  value={editingProduct.brand_id || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, brand_id: Number(e.target.value) })}
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#5C5954]">Catégorie</label>
                <select
                  value={editingProduct.category_id || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category_id: Number(e.target.value) })}
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_fr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#5C5954]">Prix (MAD)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editingProduct.price_mad ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price_mad: Number(e.target.value) })}
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2 tabular-nums"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C5954]">Ancien prix promo (MAD, optionnel)</label>
                <input
                  type="number"
                  min={0}
                  value={editingProduct.old_price_mad ?? ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      old_price_mad: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2 tabular-nums"
                />
              </div>

              <div>
                <label className="block font-medium text-[#5C5954]">Stock</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editingProduct.stock ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2 tabular-nums"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C5954]">Dimensions</label>
                <input
                  type="text"
                  value={editingProduct.dimensions || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, dimensions: e.target.value })}
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-[#5C5954]">Coloris principal</label>
                <input
                  type="text"
                  value={editingProduct.color_fr || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      color_fr: e.target.value,
                      available_colors: [e.target.value],
                    })
                  }
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium text-[#5C5954]">Matière monture</label>
                <input
                  type="text"
                  value={editingProduct.frame_material_fr || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, frame_material_fr: e.target.value })}
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-[#5C5954]">Description (FR)</label>
                <textarea
                  rows={3}
                  value={editingProduct.description_fr || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description_fr: e.target.value })}
                  className="mt-1 w-full border border-[#111111]/20 px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-[#5C5954]">Images du produit</label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 border border-[#111111] px-3 py-1.5 text-xs">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingImages ? 'Téléversement...' : 'Téléverser des images'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageUpload(e.target.files, (urls) =>
                          setEditingProduct({
                            ...editingProduct,
                            images: [...(editingProduct.images || []), ...urls],
                          })
                        )
                      }
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editingProduct.images || []).map((img, i) => (
                    <div key={`${img}-${i}`} className="relative h-16 w-20 border border-[#111111]/15">
                      <LuxuryImage src={img} alt="Aperçu" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            images: (editingProduct.images || []).filter((_, idx) => idx !== i),
                          })
                        }
                        className="absolute top-0.5 end-0.5 bg-[#111111] p-0.5 text-[#F8F7F4]"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(editingProduct.is_featured)}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_featured: e.target.checked })}
                  />
                  <span>Mettre ce produit en avant sur la page d’accueil</span>
                </label>
              </div>
            </div>

            {productError && <p className="text-red-700">{productError}</p>}

            <div className="flex justify-end gap-3 border-t border-[#111111]/10 pt-4">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="border border-[#111111]/20 px-5 py-2.5"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-[#111111] px-6 py-2.5 font-semibold uppercase tracking-[0.14em] text-[#F8F7F4]"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
