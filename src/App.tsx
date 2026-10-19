import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Product, CartItem, Order } from './utils/ecommerce';
import { initialProducts } from './utils/ecommerce';
import {
  COORDINATED_THEMES,
  resolveThemeById,
  resolveAppearanceMode,
  applyThemeToDocument,
  THEME_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  APPEARANCE_MANUAL_KEY,
  type CoordinatedTheme,
  type AppearanceMode,
} from './utils/themes';
import {
  fetchProducts,
  subscribeToFirestoreProducts,
  subscribeToFirestoreOrders,
  getStoredToken,
  verifyAdminSession,
  setStoredToken,
} from './services/api';
import {
  type StoreSettings,
  getLocalStoreSettings,
  fetchStoreSettings,
  subscribeToStoreSettings,
} from './services/settings';
import { Storefront } from './components/Storefront';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Toast, type ToastData } from './components/Toast';
import { Footer } from './components/Footer';
import { Palette, Sun, Moon, Monitor, Check, X, Upload } from 'lucide-react';

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getLocalStoreSettings());

  useEffect(() => {
    fetchStoreSettings().then(setStoreSettings).catch(() => {});
    const unsub = subscribeToStoreSettings((live) => setStoreSettings(live));

    const handleLocalUpdate = (e: Event) => {
      const custom = e as CustomEvent<StoreSettings>;
      if (custom.detail) {
        setStoreSettings(custom.detail);
      } else {
        setStoreSettings(getLocalStoreSettings());
      }
    };
    window.addEventListener('ishq:settings-updated', handleLocalUpdate);
    return () => {
      unsub();
      window.removeEventListener('ishq:settings-updated', handleLocalUpdate);
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined' && storeSettings.storeName) {
      document.title = `${storeSettings.storeName} — Handcrafted Indian Ethnic Wear`;
    }
  }, [storeSettings.storeName]);

  const [isMerchantAuthenticated, setIsMerchantAuthenticated] = useState<boolean>(false);

  const handleMerchantAuthChange = useCallback((authenticated: boolean) => {
    setIsMerchantAuthenticated(authenticated);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreMerchantSession = async () => {
      try {
        const token = getStoredToken();
        if (!token) {
          if (!cancelled) {
            setIsMerchantAuthenticated(false);
          }
          return;
        }

        const valid = await verifyAdminSession(token);
        if (cancelled) return;

        setIsMerchantAuthenticated(valid);
        if (!valid) {
          setStoredToken(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Merchant session verification failed:', err);
        setIsMerchantAuthenticated(false);
        setStoredToken(null);
      }
    };

    restoreMerchantSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // 1. Coordinated Theme Palette State (6 curated themes)
  const [activeTheme, setActiveTheme] = useState<CoordinatedTheme>(() => {
    try {
      const savedId =
        localStorage.getItem(THEME_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
      return resolveThemeById(savedId);
    } catch {
      return COORDINATED_THEMES[0];
    }
  });

  // 2. Appearance Mode State (Manual Override vs System Preference)
  const [manualAppearance, setManualAppearance] = useState<'light' | 'dark' | null>(() => {
    try {
      const saved = localStorage.getItem(APPEARANCE_MANUAL_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return null;
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen to device color scheme changes dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const appearanceMode: AppearanceMode = resolveAppearanceMode(
    manualAppearance,
    systemPrefersDark
  );

  // Apply theme tokens and appearance mode to <html> immediately whenever either changes
  useEffect(() => {
    applyThemeToDocument(activeTheme, appearanceMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, activeTheme.id);
      localStorage.setItem(
        LEGACY_THEME_STORAGE_KEY,
        JSON.stringify({
          id: activeTheme.id,
          name: activeTheme.name,
          wine: activeTheme.swatches.primary,
          wine2: activeTheme.light.primaryHover,
          rose: activeTheme.swatches.secondary,
          cream: activeTheme.swatches.bg,
          gold: activeTheme.swatches.accent,
        })
      );
    } catch {}
  }, [activeTheme, appearanceMode]);

  const handleToggleAppearance = useCallback(() => {
    const nextMode: AppearanceMode = appearanceMode === 'dark' ? 'light' : 'dark';
    setManualAppearance(nextMode);
    try {
      localStorage.setItem(APPEARANCE_MANUAL_KEY, nextMode);
    } catch {}
  }, [appearanceMode]);

  const handleSetManualAppearance = useCallback((mode: 'light' | 'dark' | null) => {
    setManualAppearance(mode);
    try {
      if (mode === null) {
        localStorage.removeItem(APPEARANCE_MANUAL_KEY);
      } else {
        localStorage.setItem(APPEARANCE_MANUAL_KEY, mode);
      }
    } catch {}
  }, []);

  // Cover Photo State
  const [coverPhoto, setCoverPhoto] = useState<string>(() => {
    try {
      return localStorage.getItem('ishq_cover_photo') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (coverPhoto) {
        localStorage.setItem('ishq_cover_photo', coverPhoto);
      } else {
        localStorage.removeItem('ishq_cover_photo');
      }
    } catch {}
  }, [coverPhoto]);

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
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
            title: 'New Customer Order Received',
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
    } catch (err: unknown) {
      console.warn('Live products fetch notice:', err);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    loadLiveProducts();

    const unsubscribe = subscribeToFirestoreProducts((liveItems) => {
      let filtered = [...liveItems];
      if (activeCategory && activeCategory !== 'All') {
        filtered = filtered.filter(
          (p) => p.category.toLowerCase() === activeCategory.toLowerCase()
        );
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
          title: 'Cover Photo Updated',
          message: 'New cover photo applied to the storefront hero banner.',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast({
        type: 'error',
        title: 'Sold Out',
        message: `"${product.name}" is out of stock.`,
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast({
            type: 'error',
            title: 'Stock Limit Reached',
            message: `Only ${product.stock} available.`,
          });
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      showToast({
        type: 'cart',
        title: 'Added to Shopping Bag',
        message: `"${product.name}" added to your bag.`,
      });
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
      title: 'Order Confirmed',
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
        coverPhoto={coverPhoto}
        activeTheme={activeTheme}
        themes={COORDINATED_THEMES}
        appearanceMode={appearanceMode}
        storeSettings={storeSettings}
        isMerchantAuthenticated={isMerchantAuthenticated}
        onCategoryChange={setActiveCategory}
        onSearchChange={setSearchQuery}
        onAddToCart={handleAddToCart}
        onWishlistClick={(prod) => showToast(`Saved "${prod.name}" to your wishlist`)}
        onSelectProduct={setSelectedProduct}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenMerchant={() => {
          setIsAdminOpen(true);
          setUnreadOrdersCount(0);
        }}
        onRetryFetch={loadLiveProducts}
        onSelectTheme={setActiveTheme}
        onToggleAppearance={handleToggleAppearance}
        onOpenThemeModal={() => setIsCustomizerOpen(true)}
      />

      <Footer
        storeSettings={storeSettings}
        onOpenMerchant={() => {
          setIsAdminOpen(true);
          setUnreadOrdersCount(0);
        }}
      />

      {/* Floating Quick-Access Theme & Order Notification Controls */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2.5 items-end">
        {unreadOrdersCount > 0 && isMerchantAuthenticated && (
          <button
            type="button"
            onClick={() => {
              setIsAdminOpen(true);
              setUnreadOrdersCount(0);
            }}
            className="px-4 py-2.5 rounded-lg shadow-xl font-semibold text-xs flex items-center gap-2 border cursor-pointer"
            style={{
              backgroundColor: 'var(--error-bg)',
              borderColor: 'var(--error-border)',
              color: 'var(--error-text)',
            }}
          >
            <span>
              {unreadOrdersCount} New Order{unreadOrdersCount > 1 ? 's' : ''}
            </span>
            <span className="underline">View</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsCustomizerOpen(true)}
          aria-label="Customize store theme and appearance"
          className="px-4 py-2.5 rounded-lg shadow-xl font-semibold text-xs flex items-center gap-2 border transition-transform hover:-translate-y-0.5 cursor-pointer"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--btn-text)',
            borderColor: 'var(--border)',
          }}
        >
          <Palette className="w-4 h-4 shrink-0" />
          <span>{isMerchantAuthenticated ? 'Theme & Cover Photo' : 'Colour Theme'}</span>
        </button>
      </div>

      {/* Theme Palette & Appearance Customizer Modal */}
      {isCustomizerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="theme-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--overlay)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCustomizerOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto transition-colors"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-main)',
            }}
          >
            <div
              className="flex justify-between items-center border-b pb-4 mb-5"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <h3 id="theme-modal-title" className="font-serif text-2xl font-semibold">
                  {isMerchantAuthenticated
                    ? 'Store Theme, Appearance & Cover Photo'
                    : 'Theme & Appearance Settings'}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Each colour palette adapts smoothly to Light and Dark appearance modes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizerOpen(false)}
                aria-label="Close theme customizer"
                className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Merchant-Only Hero Cover Photo Section */}
            {isMerchantAuthenticated && (
              <div
                className="mb-6 p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    <span>Merchant Hero Cover Photo</span>
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'var(--btn-text)',
                    }}
                  >
                    Merchant Only
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="block w-full text-xs cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  type="url"
                  value={coverPhoto.startsWith('data:') ? '' : coverPhoto}
                  onChange={(e) => setCoverPhoto(e.target.value)}
                  placeholder="Or paste direct image URL here..."
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
                {coverPhoto && (
                  <div className="flex items-center justify-between pt-1">
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--success-text)' }}
                    >
                      Custom Cover Photo Active
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoverPhoto('')}
                      className="text-xs underline cursor-pointer"
                      style={{ color: 'var(--error-text)' }}
                    >
                      Reset Default Photo
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 1. Appearance Mode Control (Light / Dark / System Auto) */}
            <div className="mb-6">
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Appearance Mode (Light / Dark)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSetManualAppearance('light')}
                  className="py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    backgroundColor:
                      manualAppearance === 'light'
                        ? 'var(--primary)'
                        : 'var(--surface-elevated)',
                    color:
                      manualAppearance === 'light' ? 'var(--btn-text)' : 'var(--text-main)',
                    borderColor:
                      manualAppearance === 'light' ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetManualAppearance('dark')}
                  className="py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    backgroundColor:
                      manualAppearance === 'dark'
                        ? 'var(--primary)'
                        : 'var(--surface-elevated)',
                    color:
                      manualAppearance === 'dark' ? 'var(--btn-text)' : 'var(--text-main)',
                    borderColor:
                      manualAppearance === 'dark' ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetManualAppearance(null)}
                  className="py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  style={{
                    backgroundColor:
                      manualAppearance === null
                        ? 'var(--primary)'
                        : 'var(--surface-elevated)',
                    color: manualAppearance === null ? 'var(--btn-text)' : 'var(--text-main)',
                    borderColor:
                      manualAppearance === null ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>

            {/* 2. Coordinated Boutique Colour Themes */}
            <div className="mb-6">
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Select Coordinated Colour Palette
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COORDINATED_THEMES.map((preset) => {
                  const isSelected = activeTheme.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setActiveTheme(preset)}
                      className="p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--surface-elevated)'
                          : 'var(--surface)',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className="text-xs font-semibold flex items-center gap-1.5"
                          style={{ color: 'var(--text-main)' }}
                        >
                          <span>{preset.name}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-4 h-4 rounded-full border border-black/15"
                            style={{ backgroundColor: preset.swatches.primary }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/15"
                            style={{ backgroundColor: preset.swatches.accent }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/15"
                            style={{ backgroundColor: preset.swatches.secondary }}
                          />
                        </div>
                      </div>
                      <span
                        className="text-[11px] leading-snug line-clamp-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCustomizerOpen(false)}
              className="w-full py-3 rounded-lg font-semibold text-xs uppercase tracking-widest cursor-pointer"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Product Quick View / Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        storeSettings={storeSettings}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onWishlistClick={(prod) => showToast(`Saved "${prod.name}" to your wishlist`)}
      />

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
        storeSettings={storeSettings}
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
        onAuthChange={handleMerchantAuthChange}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
