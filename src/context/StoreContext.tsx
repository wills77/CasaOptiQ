import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { Brand, CartItem, Category, Language, Product, Review, StoreSettings, User } from '../types';

interface StoreContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  user: User | null;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
  settings: StoreSettings | null;
  categories: Category[];
  brands: Brand[];
  featuredProducts: Product[];
  bestSellers: Product[];
  newArrivals: Product[];
  reviews: Review[];
  refreshBootstrap: () => Promise<void>;
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number, selectedColor?: string) => void;
  removeFromCart: (productId: number, selectedColor: string) => void;
  updateCartQuantity: (productId: number, selectedColor: string, quantity: number) => void;
  clearCart: () => void;
  appliedCoupon: { code: string; discount_percent: number } | null;
  setAppliedCoupon: (c: { code: string; discount_percent: number } | null) => void;
  favoriteIds: number[];
  toggleFavorite: (productId: number) => Promise<boolean>;
  recentlyViewed: Product[];
  recordRecentlyViewed: (product: Product) => void;
  currentPath: string;
  navigate: (path: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('casaoptiq_lang');
    return saved === 'ar' ? 'ar' : 'fr';
  });

  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname + window.location.search);
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_percent: number } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('casaoptiq_cart');
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    try {
      const raw = localStorage.getItem('casaoptiq_recent');
      return raw ? (JSON.parse(raw) as Product[]) : [];
    } catch {
      return [];
    }
  });

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem('casaoptiq_lang', next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('casaoptiq_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const handlePop = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = useCallback((path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (window.location.pathname + window.location.search !== normalized) {
      window.history.pushState({}, '', normalized);
      setCurrentPath(normalized);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const data = await apiFetch<{
        settings: StoreSettings;
        categories: Category[];
        brands: Brand[];
        featuredProducts: Product[];
        bestSellers: Product[];
        newArrivals: Product[];
        reviews: Review[];
      }>('/api/storefront/bootstrap');
      setSettings(data.settings);
      setCategories(data.categories);
      setBrands(data.brands);
      setFeaturedProducts(data.featuredProducts);
      setBestSellers(data.bestSellers);
      setNewArrivals(data.newArrivals);
      setReviews(data.reviews);
    } catch {
      // Handled gracefully
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const data = await apiFetch<{ favorites: Product[] }>('/api/customer/favorites');
      setFavoriteIds(data.favorites.map((p) => p.id));
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: User | null }>('/api/auth/me');
      setUser(data.user);
      if (data.user && data.user.role === 'customer') {
        await loadFavorites();
      } else {
        setFavoriteIds([]);
      }
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, [loadFavorites]);

  useEffect(() => {
    refreshBootstrap();
    refreshUser();
  }, [refreshBootstrap, refreshUser]);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setFavoriteIds([]);
  }, []);

  const addToCart = useCallback((product: Product, quantity = 1, selectedColor?: string) => {
    const color = selectedColor || product.color_fr;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id && i.selectedColor === color);
      if (idx >= 0) {
        const next = [...prev];
        const maxQty = Math.max(1, product.stock);
        next[idx] = {
          ...next[idx],
          product,
          quantity: Math.min(maxQty, next[idx].quantity + quantity),
        };
        return next;
      }
      return [...prev, { product, quantity: Math.min(Math.max(1, product.stock), quantity), selectedColor: color }];
    });
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((productId: number, selectedColor: string) => {
    setCart((prev) => prev.filter((i) => !(i.product.id === productId && i.selectedColor === selectedColor)));
  }, []);

  const updateCartQuantity = useCallback((productId: number, selectedColor: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => !(i.product.id === productId && i.selectedColor === selectedColor)));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.selectedColor === selectedColor
          ? { ...item, quantity: Math.min(Math.max(1, item.product.stock), quantity) }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
  }, []);

  const toggleFavorite = useCallback(
    async (productId: number): Promise<boolean> => {
      if (!user) {
        navigate('/compte');
        return false;
      }
      const res = await apiFetch<{ favorited: boolean }>(`/api/customer/favorites/${productId}`, {
        method: 'POST',
      });
      setFavoriteIds((prev) =>
        res.favorited ? (prev.includes(productId) ? prev : [...prev, productId]) : prev.filter((id) => id !== productId)
      );
      return res.favorited;
    },
    [user, navigate]
  );

  const recordRecentlyViewed = useCallback((product: Product) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const next = [product, ...filtered].slice(0, 4);
      localStorage.setItem('casaoptiq_recent', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <StoreContext.Provider
      value={{
        lang,
        setLang,
        user,
        refreshUser,
        logout,
        settings,
        categories,
        brands,
        featuredProducts,
        bestSellers,
        newArrivals,
        reviews,
        refreshBootstrap,
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        appliedCoupon,
        setAppliedCoupon,
        favoriteIds,
        toggleFavorite,
        recentlyViewed,
        recordRecentlyViewed,
        currentPath,
        navigate,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
