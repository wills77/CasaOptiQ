import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMAD } from '../i18n';
import { apiFetch } from '../lib/api';
import type { Order, Product } from '../types';
import { ProductCard } from '../components/ProductCard';

export function AccountPage() {
  const { lang, user, refreshUser, logout, navigate } = useStore();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [tab, setTab] = useState<'orders' | 'favorites' | 'profile'>('orders');

  // Auth form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [resetNewPass, setResetNewPass] = useState('');
  const [authMsg, setAuthMsg] = useState('');
  const [authErr, setAuthErr] = useState('');

  // Customer data
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [profileFullName, setProfileFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    if (user && user.role === 'customer') {
      setProfileFullName(user.full_name || '');
      setProfilePhone(user.phone || '');
      setProfileAddress(user.address || '');
      setProfileCity(user.city || 'Casablanca');

      apiFetch<{ orders: Order[] }>('/api/customer/orders')
        .then((res) => setOrders(res.orders))
        .catch(() => setOrders([]));

      apiFetch<{ favorites: Product[] }>('/api/customer/favorites')
        .then((res) => setFavorites(res.favorites))
        .catch(() => setFavorites([]));
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr('');
    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await refreshUser();
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : 'Erreur de connexion');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr('');
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          phone,
          address,
          city,
        }),
      });
      await refreshUser();
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : 'Erreur lors de l’inscription');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr('');
    setAuthMsg('');
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, phone, newPassword: resetNewPass }),
      });
      setAuthMsg(res.message);
      setAuthMode('login');
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : 'Réinitialisation impossible');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    await apiFetch('/api/customer/profile', {
      method: 'PUT',
      body: JSON.stringify({
        full_name: profileFullName,
        phone: profilePhone,
        address: profileAddress,
        city: profileCity,
      }),
    });
    await refreshUser();
    setProfileMsg('Vos informations personnelles ont été enregistrées.');
  };

  if (!user || user.role !== 'customer') {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <div className="border border-[#111111]/10 bg-[#FFFFFF] p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8E733E]">Espace Client</p>
          <h1 className="mt-2 font-serif text-3xl font-medium text-[#111111]">
            {authMode === 'login'
              ? 'Connexion'
              : authMode === 'register'
              ? 'Créer un compte'
              : 'Mot de passe oublié'}
          </h1>

          <div className="mt-6 flex gap-4 border-b border-[#111111]/10 pb-3 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthErr('');
              }}
              className={authMode === 'login' ? 'text-[#111111] underline underline-offset-4' : 'text-[#6F6B64]'}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthErr('');
              }}
              className={authMode === 'register' ? 'text-[#111111] underline underline-offset-4' : 'text-[#6F6B64]'}
            >
              Inscription
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('forgot');
                setAuthErr('');
              }}
              className={authMode === 'forgot' ? 'text-[#111111] underline underline-offset-4' : 'text-[#6F6B64]'}
            >
              Mot de passe oublié
            </button>
          </div>

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Adresse e-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#111111] py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F8F7F4]"
              >
                Se connecter
              </button>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Nom et prénom</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Adresse e-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Téléphone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5C5954]">Ville</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5954]">Adresse</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Mot de passe (6+ caractères)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#111111] py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F8F7F4]"
              >
                Créer mon compte
              </button>
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              <p className="text-xs text-[#5C5954]">
                Confirmez votre e-mail et le numéro de téléphone associé à votre compte pour définir un nouveau mot de passe.
              </p>
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Adresse e-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Téléphone enregistré</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5954]">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#B89B62] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#111111] py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F8F7F4]"
              >
                Réinitialiser le mot de passe
              </button>
            </form>
          )}

          {authErr && <p className="mt-4 text-xs text-red-700">{authErr}</p>}
          {authMsg && <p className="mt-4 text-xs text-[#8E733E]">{authMsg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#111111]/10 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#8E733E]">Espace Client</p>
          <h1 className="mt-2 font-serif text-4xl font-medium text-[#111111]">
            Bonjour, {user.full_name}
          </h1>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 border border-[#111111]/20 px-4 py-2 text-xs font-medium text-[#111111] hover:bg-[#111111] hover:text-[#F8F7F4] transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Déconnexion</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-6 border-b border-[#111111]/10 text-sm">
        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`pb-3 font-medium transition-colors ${
            tab === 'orders' ? 'border-b-2 border-[#111111] text-[#111111]' : 'text-[#6F6B64]'
          }`}
        >
          Mes Commandes ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('favorites')}
          className={`pb-3 font-medium transition-colors ${
            tab === 'favorites' ? 'border-b-2 border-[#111111] text-[#111111]' : 'text-[#6F6B64]'
          }`}
        >
          Mes Favoris ({favorites.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('profile')}
          className={`pb-3 font-medium transition-colors ${
            tab === 'profile' ? 'border-b-2 border-[#111111] text-[#111111]' : 'text-[#6F6B64]'
          }`}
        >
          Informations Personnelles
        </button>
      </div>

      <div className="mt-8">
        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="border border-[#111111]/10 bg-[#FFFFFF] p-10 text-center">
                <p className="text-sm text-[#5C5954]">Vous n’avez pas encore passé de commande.</p>
                <button
                  type="button"
                  onClick={() => navigate('/catalogue')}
                  className="mt-4 bg-[#111111] px-6 py-2.5 text-xs uppercase tracking-[0.14em] text-[#F8F7F4]"
                >
                  Découvrir la collection
                </button>
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="border border-[#111111]/10 bg-[#FFFFFF] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#111111]/10 pb-3">
                    <div>
                      <span className="font-mono text-sm font-semibold">{o.order_number}</span>
                      <span className="mx-2 text-[#6F6B64]">·</span>
                      <span className="text-xs text-[#6F6B64]">
                        {new Date(o.created_at).toLocaleDateString('fr-MA')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8E733E]">
                        {o.status}
                      </span>
                      <span className="font-semibold tabular-nums">{formatMAD(o.total_mad, lang)}</span>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-[#5C5954]">
                    {o.items?.map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>
                          {it.product_name} ({it.selected_color}) × {it.quantity}
                        </span>
                        <span className="tabular-nums">{formatMAD(it.total_price_mad, lang)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'favorites' && (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.length === 0 ? (
              <p className="text-sm text-[#5C5954]">Aucun produit enregistré dans vos favoris.</p>
            ) : (
              favorites.map((p) => <ProductCard key={p.id} product={p} />)
            )}
          </div>
        )}

        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="max-w-xl border border-[#111111]/10 bg-[#FFFFFF] p-7 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#5C5954]">Nom et prénom</label>
              <input
                type="text"
                required
                value={profileFullName}
                onChange={(e) => setProfileFullName(e.target.value)}
                className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5C5954]">Téléphone</label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5C5954]">Adresse</label>
              <input
                type="text"
                value={profileAddress}
                onChange={(e) => setProfileAddress(e.target.value)}
                className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5C5954]">Ville</label>
              <input
                type="text"
                value={profileCity}
                onChange={(e) => setProfileCity(e.target.value)}
                className="mt-1 w-full border border-[#111111]/20 bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-[#111111] px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#F8F7F4]"
            >
              Enregistrer les modifications
            </button>
            {profileMsg && <p className="text-xs text-[#8E733E]">{profileMsg}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
