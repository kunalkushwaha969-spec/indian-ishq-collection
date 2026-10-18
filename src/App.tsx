import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Product, CartItem, Order } from './utils/ecommerce';
import { initialProducts } from './utils/ecommerce';
import {
  fetchProducts,
  subscribeToFirestoreProducts,
  subscribeToFirestoreOrders,
  getStoredToken,
} from './services/api';
import { Storefront } from './components/Storefront';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Toast, type ToastData } from './components/Toast';

interface StoreTheme {
  name: string;
  wine: string;
  wine2: string;
  rose: string;
  cream: string;
  gold: string;
}

const THEME_PRESETS: StoreTheme[] = [
  { name: 'Royal Wine (Default)', wine: '#70283b', wine2: '#4c1727', rose: '#f3dfe0', cream: '#fbf7f0', gold: '#b78a4b' },
  { name: 'Bridal Crimson', wine: '#8b1e24', wine2: '#5a1015', rose: '#fce8e8', cream: '#fffaf5', gold: '#d4af37' },
  { name: 'Emerald Maharani', wine: '#134e4a', wine2: '#0f2926', rose: '#e0f2f1', cream: '#f9fbf9', gold: '#c59b27' },
  { name: 'Midnight Peacock', wine: '#1e293b', wine2: '#0f172a', rose: '#e2e8f0', cream: '#f8fafc', gold: '#ca8a04' },
  { name: 'Rosewater Pastel', wine: '#9d174d', wine2: '#500724', rose: '#fce7f3', cream: '#fffbfd', gold: '#b45309' },
];

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('ishq_products_cache_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialProducts;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('ishq_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(() => {
    return window.location.hash === '#admin';
  });
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);

  const [isMerchantAuthenticated, setIsMerchantAuthenticated] =
  useState<boolean>(() => !!getStoredToken());
  const handleMerchantAuthChange = useCallback(
  (authenticated: boolean) => {
    setIsMerchantAuthenticated(authenticated);
  },
  []
);

useEffect(() => {
  const checkAuth = () => {
    setIsMerchantAuthenticated(!!getStoredToken());
  };

  checkAuth();

  window.addEventListener('storage', checkAuth);

  return () => {
    window.removeEventListener('storage', checkAuth);
  };
}, [isAdminOpen]);

  const [theme, setTheme] = useState<StoreTheme>(() => {
    try {
      const saved = localStorage.getItem('ishq_theme');
      return saved ? JSON.parse(saved) : THEME_PRESETS[0];
    } catch {
      return THEME_PRESETS[0];
    }
  });

  const [coverPhoto, setCoverPhoto] = useState<string>(() => {
    try {
      return localStorage.getItem('ishq_cover_photo') || '';
    } catch {
      return '';
    }
  });

  const [unreadOrdersCount, setUnreadOrdersCount] = useState<number>(0);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialOrdersLoadedRef = useRef<boolean>(false);

  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((data: ToastData | string) => {
    if (typeof data === 'string') {
      setToast({ message: data, type: 'info' });
    } else {
      setToast(data);
    }
  }, []);

  const playOrderChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--wine', theme.wine);
    root.style.setProperty('--wine2', theme.wine2);
    root.style.setProperty('--rose', theme.rose);
    root.style.setProperty('--cream', theme.cream);
    root.style.setProperty('--gold', theme.gold);
    try {
      localStorage.setItem('ishq_theme', JSON.stringify(theme));
    } catch {}
  }, [theme]);

  useEffect(() => {
    if (!coverPhoto) return;
    try {
      localStorage.setItem('ishq_cover_photo', coverPhoto);
    } catch {}

    const timer = setTimeout(() => {
      const imgs = document.querySelectorAll('section img, header img');
      if (imgs.length > 0) {
        (imgs[0] as HTMLImageElement).src = coverPhoto;
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [coverPhoto, products, isAdminOpen]);

  useEffect(() => {
    const unsubscribeOrders = subscribeToFirestoreOrders((liveOrders) => {
      if (!initialOrdersLoadedRef.current) {
        liveOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
        initialOrdersLoadedRef.current = true;
        return;
      }

      const brandNewOrders = liveOrders.filter((o) => !knownOrderIdsRef.current.has(o.id));
      if (brandNewOrders.length > 0) {
        brandNewOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
        setUnreadOrdersCount((prev) => prev + brandNewOrders.length);
        playOrderChime();

        if (getStoredToken() || isAdminOpen) {
          const latest = brandNewOrders[0];
          showToast({
            type: 'order',
            title: '🔔 New Customer Order Received!',
            message: `Order #${latest.id} (₹${latest.total.toLocaleString('en-IN')}) from ${latest.customer_details.name}`,
            actionLabel: 'Open Orders',
            onAction: () => {
              setIsAdminOpen(true);
              setUnreadOrdersCount(0);
            },
          });
        }
      }
    });

    return () => unsubscribeOrders();
  }, [isAdminOpen, playOrderChime, showToast]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ishq_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const loadLiveProducts = useCallback(async () => {
    try {
      const live = await fetchProducts(activeCategory, searchQuery);
      if (live && live.length > 0) {
        setProducts(live);
      }
    } catch (err: any) {
      console.warn('Live products fetch notice:', err);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    loadLiveProducts();

    const unsubscribe = subscribeToFirestoreProducts((liveItems) => {
      let filtered = [...liveItems];
      if (activeCategory && activeCategory !== 'All') {
        filtered = filtered.filter((p) => p.category.toLowerCase() === activeCategory.toLowerCase());
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.fabric && p.fabric.toLowerCase().includes(q)) ||
            (p.tag && p.tag.toLowerCase().includes(q))
        );
      }
      setProducts(filtered);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeCategory, searchQuery, loadLiveProducts]);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverPhoto(reader.result);
        showToast({
          type: 'info',
          title: 'Cover Photo Updated ✨',
          message: 'New cover photo applied to the storefront hero banner.',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast({ type: 'error', title: 'Sold Out', message: `"${product.name}" is out of stock.` });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast({ type: 'error', title: 'Stock Limit Reached', message: `Only ${product.stock} available.` });
          return prev;
        }
        return prev.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      showToast({ type: 'cart', title: 'Added to Bag ✨', message: `"${product.name}" added to bag.` });
      return [...prev, { id: product.id, qty: 1 }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === productId);
      if (!existing) return prev;
      if (delta > 0 && product && existing.qty >= product.stock) return prev;
      const newQty = existing.qty + delta;
      if (newQty <= 0) return prev.filter((i) => i.id !== productId);
      return prev.map((i) => (i.id === productId ? { ...i, qty: newQty } : i));
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== productId));
  };

  const handleOrderSuccess = (order: Order) => {
    setCart([]);
    loadLiveProducts();
    playOrderChime();
    knownOrderIdsRef.current.add(order.id);
    setUnreadOrdersCount((prev) => prev + 1);

    showToast({
      type: 'order',
      title: 'Order Confirmed! 🎉',
      message: `Order #${order.id} (₹${order.total.toLocaleString('en-IN')}) placed successfully.`,
      actionLabel: 'Merchant Workspace',
      onAction: () => {
        setIsAdminOpen(true);
        setUnreadOrdersCount(0);
      },
    });
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
      <Storefront
        products={products}
        isLoading={isLoading}
        error={error}
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        cartCount={cartCount}
        onCategoryChange={setActiveCategory}
        onSearchChange={setSearchQuery}
        onAddToCart={handleAddToCart}
        onWishlistClick={(prod) => showToast(`Saved "${prod.name}" to wishlist`)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenMerchant={() => {
          setIsAdminOpen(true);
          setUnreadOrdersCount(0);
        }}
        onRetryFetch={loadLiveProducts}
      />

      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end">
        {unreadOrdersCount > 0 && isMerchantAuthenticated && (
          <button
            onClick={() => {
              setIsAdminOpen(true);
              setUnreadOrdersCount(0);
            }}
            className="bg-red-600 text-white px-4 py-2.5 rounded-full shadow-2xl font-semibold text-sm flex items-center gap-2 animate-bounce"
          >
            <span>🔔 {unreadOrdersCount} New Order{unreadOrdersCount > 1 ? 's' : ''}!</span>
            <span className="underline text-xs">View</span>
          </button>
        )}

        <button
          onClick={() => setIsCustomizerOpen(true)}
          style={{ backgroundColor: 'var(--wine)' }}
          className="text-white px-4 py-2.5 rounded-full shadow-2xl font-semibold text-sm flex items-center gap-2 border border-white/30"
        >
          🎨 {isMerchantAuthenticated ? 'Theme & Cover Photo' : 'Color Theme'}
        </button>
      </div>

      {isCustomizerOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {isMerchantAuthenticated ? 'Store Theme & Cover Photo' : 'Choose Store Color Theme'}
              </h3>
              <button
                onClick={() => setIsCustomizerOpen(false)}
                className="text-gray-500 hover:text-gray-800 text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            {isMerchantAuthenticated && (
              <div className="mb-6 p-3.5 bg-pink-50/60 border border-pink-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-900">
                    📸 Merchant Cover Photo (Hero Banner)
                  </label>
                  <span className="text-[11px] bg-pink-900 text-white px-2 py-0.5 rounded-full">
                    Admin Only
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-pink-900 hover:file:bg-pink-100 mb-2"
                />
                <input
                  type="url"
                  value={coverPhoto.startsWith('data:') ? '' : coverPhoto}
                  onChange={(e) => setCoverPhoto(e.target.value)}
                  placeholder="Or paste direct image URL here..."
                  className="w-full border bg-white rounded-lg px-3 py-1.5 text-sm"
                />
                {coverPhoto && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-green-700 font-medium">✓ Custom Cover Active</span>
                    <button
                      onClick={() => {
                        setCoverPhoto('');
                        localStorage.removeItem('ishq_cover_photo');
                        window.location.reload();
                      }}
                      className="text-xs text-red-600 underline"
                    >
                      Reset Default Photo
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Select Color Palette
              </label>
              <div className="grid grid-cols-1 gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setTheme(preset)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                      theme.name === preset.name ? 'border-gray-900 bg-gray-50 font-semibold' : 'border-gray-200'
                    }`}
                  >
                    <span className="text-sm text-gray-800">{preset.name}</span>
                    <div className="flex gap-1.5">
                      <span className="w-5 h-5 rounded-full border" style={{ background: preset.wine }} />
                      <span className="w-5 h-5 rounded-full border" style={{ background: preset.gold }} />
                      <span className="w-5 h-5 rounded-full border" style={{ background: preset.cream }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsCustomizerOpen(false)}
              style={{ backgroundColor: 'var(--wine)' }}
              className="w-full text-white py-2.5 rounded-xl font-semibold text-sm"
            >
              Apply Theme
            </button>
          </div>
        </div>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        products={products}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        products={products}
        onOrderSuccess={handleOrderSuccess}
      />

      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          if (window.location.hash === '#admin') {
            window.history.pushState(null, '', window.location.pathname);
          }
        }}
        onCatalogChanged={loadLiveProducts}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
