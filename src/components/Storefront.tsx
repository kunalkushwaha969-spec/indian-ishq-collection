import React, { useState, useEffect, useRef } from 'react';
import type { Product, StoreSettings } from '../utils/ecommerce';
import { DEFAULT_STORE_SETTINGS, isRazorpayConfigured } from '../utils/ecommerce';
import type { CoordinatedTheme, AppearanceMode } from '../utils/themes';
import { ProductCard } from './ProductCard';
import {
  Search,
  ShoppingBag,
  Shield,
  RefreshCw,
  Loader2,
  Sun,
  Moon,
  Palette,
  X,
  ArrowUpRight,
  Check,
  Phone,
  MapPin,
  MessageCircle,
  Truck,
  RotateCcw,
} from 'lucide-react';

interface StorefrontProps {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  activeCategory: string;
  searchQuery: string;
  cartCount: number;
  coverPhoto?: string;
  activeTheme: CoordinatedTheme;
  themes: CoordinatedTheme[];
  appearanceMode: AppearanceMode;
  storeSettings?: StoreSettings;
  isMerchantAuthenticated?: boolean;
  onCategoryChange: (category: string) => void;
  onSearchChange: (query: string) => void;
  onAddToCart: (product: Product) => void;
  onWishlistClick: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  onOpenCart: () => void;
  onOpenMerchant: () => void;
  onRetryFetch: () => void;
  onSelectTheme: (theme: CoordinatedTheme) => void;
  onToggleAppearance: () => void;
  onOpenThemeModal: () => void;
}

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80';

export const Storefront: React.FC<StorefrontProps> = ({
  products,
  isLoading,
  error,
  activeCategory,
  searchQuery,
  cartCount,
  coverPhoto,
  activeTheme,
  themes,
  appearanceMode,
  storeSettings = DEFAULT_STORE_SETTINGS,
  isMerchantAuthenticated = false,
  onCategoryChange,
  onSearchChange,
  onAddToCart,
  onWishlistClick,
  onSelectProduct,
  onOpenCart,
  onOpenMerchant,
  onRetryFetch,
  onSelectTheme,
  onToggleAppearance,
  onOpenThemeModal,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);

  const categories = [
    { id: 'All', label: 'All Pieces' },
    { id: 'Kurtis', label: 'Kurtis' },
    { id: 'Sarees', label: 'Sarees' },
    { id: 'Suits', label: 'Suit Sets' },
    { id: 'Festive', label: 'Festive Wear' },
  ];

  // Reset hero error if coverPhoto changes
  useEffect(() => {
    setHeroImgError(false);
  }, [coverPhoto]);

  useEffect(() => {
    setLogoImgError(false);
  }, [storeSettings.logoUrl]);

  // Lock body scroll and listen for Escape when Hamburger Drawer is open
  useEffect(() => {
    if (!isDrawerOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen]);

  // IntersectionObserver for gentle section reveals
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const elements = document.querySelectorAll('.reveal-section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            entry.target.classList.remove('reveal-pending');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    );

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight) {
        el.classList.add('reveal-pending');
      }
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleDrawerCategoryClick = (categoryId: string) => {
    onCategoryChange(categoryId);
    setIsDrawerOpen(false);
    const shopEl = document.getElementById('shop');
    if (shopEl) {
      shopEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const heroImageSrc = coverPhoto && coverPhoto.trim() !== '' ? coverPhoto : DEFAULT_HERO_IMAGE;
  const cleanPhoneHref = (storeSettings.phone || '+919876543210').replace(/[^\d+]/g, '');
  const cleanWhatsapp = (storeSettings.whatsapp || '919876543210').replace(/\D/g, '');
  const activePaymentLabels = [
    storeSettings.upiEnabled ? 'Instant UPI QR' : null,
    storeSettings.codEnabled ? 'Doorstep COD' : null,
    isRazorpayConfigured(storeSettings.razorpayKeyId, storeSettings.razorpayEnabled)
      ? 'Razorpay Online'
      : null,
  ].filter(Boolean);

  return (
    <div
      className="min-h-screen font-sans transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-main)' }}
    >
      {/* Slim Top Announcement Bar */}
      {storeSettings.announcementText && (
        <div
          className="text-center py-2 px-4 text-[11px] sm:text-xs tracking-wider font-medium border-b transition-colors"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--btn-text)',
            borderColor: 'var(--border)',
          }}
        >
          {storeSettings.announcementText}
        </div>
      )}

      {/* Sticky Top Header */}
      <header
        className="sticky top-0 z-40 h-16 sm:h-[72px] backdrop-blur-md border-b px-4 sm:px-8 lg:px-12 transition-colors"
        style={{
          backgroundColor: 'var(--header-bg)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Zone: Hamburger Three-Line Button + Logo & Brand Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              aria-label={isDrawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isDrawerOpen}
              aria-controls="mobile-navigation-drawer"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            >
              <span
                className={`block w-4.5 h-0.5 rounded-full transition-transform duration-200 ${
                  isDrawerOpen ? 'translate-y-2 rotate-45' : ''
                }`}
                style={{ backgroundColor: 'var(--text-main)' }}
              />
              <span
                className={`block w-4.5 h-0.5 rounded-full transition-opacity duration-200 ${
                  isDrawerOpen ? 'opacity-0' : 'opacity-100'
                }`}
                style={{ backgroundColor: 'var(--text-main)' }}
              />
              <span
                className={`block w-4.5 h-0.5 rounded-full transition-transform duration-200 ${
                  isDrawerOpen ? '-translate-y-2 -rotate-45' : ''
                }`}
                style={{ backgroundColor: 'var(--text-main)' }}
              />
            </button>

            <a
              href="#home"
              className="flex items-center gap-2 font-serif text-[16px] sm:text-2xl font-bold tracking-tight truncate"
              style={{ color: 'var(--primary)' }}
            >
              {storeSettings.logoUrl && !logoImgError && (
                <img
                  src={storeSettings.logoUrl}
                  alt={`${storeSettings.storeName} logo`}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoImgError(true)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover border shrink-0"
                  style={{ borderColor: 'var(--border)' }}
                />
              )}
              <span className="truncate">{storeSettings.storeName}</span>
            </a>
          </div>

          {/* Center Zone: Clean Single-Line Desktop Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            <a
              href="#home"
              className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Home
            </a>
            <a
              href="#shop"
              onClick={() => onCategoryChange('All')}
              className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Collection
            </a>
            <a
              href="#shop"
              onClick={() => onCategoryChange('Sarees')}
              className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sarees
            </a>
            <a
              href="#shop"
              onClick={() => onCategoryChange('Kurtis')}
              className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Kurtis
            </a>
            <a
              href="#story"
              className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Our Story
            </a>
          </nav>

          {/* Right Zone: Appearance Switch, Theme Selector, Merchant & Shopping Bag */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Separate Dark/Light Appearance Toggle */}
            <button
              type="button"
              onClick={onToggleAppearance}
              aria-label={
                appearanceMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'
              }
              title={appearanceMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            >
              {appearanceMode === 'dark' ? (
                <Sun className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              ) : (
                <Moon className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              )}
            </button>

            {/* Theme Palette Selector Trigger */}
            <button
              type="button"
              onClick={onOpenThemeModal}
              aria-label="Open colour theme selector"
              title="Change Colour Theme"
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            >
              <Palette className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <span className="hidden xl:inline whitespace-nowrap">{activeTheme.name}</span>
            </button>

            {/* Merchant Workspace Button (Desktop) */}
            <button
              type="button"
              onClick={onOpenMerchant}
              className="hidden sm:flex h-10 px-3 rounded-lg border items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
              title="Merchant Login"
            >
              <Shield className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              <span>{isMerchantAuthenticated ? 'Workspace' : 'Merchant'}</span>
            </button>

            {/* Shopping Bag Primary Action */}
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`View shopping bag, ${cartCount} items`}
              className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-lg text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5 sm:gap-2 transition-opacity hover:opacity-95 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Bag</span>
              <span
                className="px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums"
                style={{
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-main)',
                }}
              >
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-In Left Hamburger Navigation Drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation drawer"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 transition-opacity duration-200"
            style={{ backgroundColor: 'var(--overlay)' }}
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <aside
            id="mobile-navigation-drawer"
            ref={drawerRef}
            className="relative z-10 w-[86vw] max-w-sm h-full overflow-y-auto border-r shadow-2xl flex flex-col justify-between p-6 transition-transform duration-200"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-main)',
            }}
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div
                className="flex items-center justify-between pb-4 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {storeSettings.logoUrl && !logoImgError && (
                    <img
                      src={storeSettings.logoUrl}
                      alt={`${storeSettings.storeName} logo`}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-lg object-cover border shrink-0"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  )}
                  <div className="min-w-0">
                    <span
                      className="font-serif text-xl font-bold block truncate"
                      style={{ color: 'var(--primary)' }}
                    >
                      {storeSettings.storeName}
                    </span>
                    <span className="text-[11px] block truncate" style={{ color: 'var(--text-muted)' }}>
                      {storeSettings.tagline}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="Close navigation menu"
                  className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Search Input */}
              <div>
                <label htmlFor="drawer-search-input" className="sr-only">
                  Search products
                </label>
                <div className="relative">
                  <Search
                    className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    id="drawer-search-input"
                    type="text"
                    placeholder="Search kurtis, sarees, suits..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsDrawerOpen(false);
                        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              </div>

              {/* Primary Navigation Links */}
              <div className="space-y-1">
                <span
                  className="text-[11px] font-semibold uppercase tracking-widest block mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Navigation
                </span>
                {[
                  { label: 'Home', href: '#home' },
                  { label: 'Shop All Products', href: '#shop' },
                  { label: 'Our Craft & Story', href: '#story' },
                  { label: 'Contact & Boutique Info', href: '#footer-contact' },
                ].map((navItem) => (
                  <a
                    key={navItem.label}
                    href={navItem.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className="block py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: 'var(--text-main)' }}
                  >
                    {navItem.label}
                  </a>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenCart();
                  }}
                  className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-between cursor-pointer"
                  style={{ color: 'var(--text-main)' }}
                >
                  <span>Shopping Bag</span>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold tabular-nums"
                    style={{
                      backgroundColor: 'var(--secondary)',
                      color: 'var(--primary)',
                    }}
                  >
                    {cartCount} items
                  </span>
                </button>
              </div>

              {/* Product Categories */}
              <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <span
                  className="text-[11px] font-semibold uppercase tracking-widest block mb-2.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Product Categories
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const active = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleDrawerCategoryClick(cat.id)}
                        className="px-3 py-2 rounded-lg border text-xs font-semibold text-left transition-colors cursor-pointer"
                        style={{
                          backgroundColor: active ? 'var(--primary)' : 'var(--surface-elevated)',
                          color: active ? 'var(--btn-text)' : 'var(--text-main)',
                          borderColor: active ? 'var(--primary)' : 'var(--border)',
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Separate Appearance Mode Control inside Drawer */}
              <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Appearance Mode
                  </span>
                  <button
                    type="button"
                    onClick={onToggleAppearance}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {appearanceMode === 'dark' ? (
                      <>
                        <Moon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                        <span>Dark Mode</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                        <span>Light Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Colour Theme Selector inside Drawer */}
              <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <span
                  className="text-[11px] font-semibold uppercase tracking-widest block mb-2.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Colour Theme Palette
                </span>
                <div className="space-y-1.5">
                  {themes.map((t) => {
                    const isSelected = activeTheme.id === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onSelectTheme(t)}
                        className="w-full p-2.5 rounded-lg border flex items-center justify-between text-left transition-colors cursor-pointer"
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--surface-elevated)'
                            : 'var(--surface)',
                          borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                            {t.name}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-4 h-4 rounded-full border border-black/15"
                            style={{ backgroundColor: t.swatches.primary }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/15"
                            style={{ backgroundColor: t.swatches.accent }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/15"
                            style={{ backgroundColor: t.swatches.secondary }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer: Merchant Login Entry & Contact */}
            <div className="pt-6 mt-6 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenMerchant();
                }}
                className="w-full py-2.5 px-4 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              >
                <Shield className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                <span>
                  {isMerchantAuthenticated ? 'Open Merchant Workspace' : 'Merchant Login'}
                </span>
              </button>

              <div className="flex items-center justify-between text-[11px] gap-2" style={{ color: 'var(--text-muted)' }}>
                <a href={`tel:${cleanPhoneHref}`} className="flex items-center gap-1 hover:underline truncate">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span className="tabular-nums">{storeSettings.phone}</span>
                </a>
                <a
                  href={storeSettings.mapsUrl || '#footer-contact'}
                  target={storeSettings.mapsUrl ? '_blank' : undefined}
                  rel={storeSettings.mapsUrl ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-1 hover:underline truncate"
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">Store Map</span>
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* HERO SECTION */}
        <section
          id="home"
          className="border-b transition-colors"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Editorial Narrative */}
              <div className="lg:col-span-7 space-y-6">
                <div
                  className="hero-animate-1 text-xs font-semibold tracking-[0.22em] uppercase"
                  style={{ color: 'var(--accent)' }}
                >
                  {storeSettings.storeName} · Handcrafted Ethnic Wear
                </div>

                <h1
                  className="hero-animate-1 font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.08] tracking-tight"
                  style={{ color: 'var(--text-main)', textWrap: 'balance' }}
                >
                  {storeSettings.tagline === DEFAULT_STORE_SETTINGS.tagline ? (
                    <>
                      Timeless Indian silhouettes, woven with{' '}
                      <em className="italic font-normal" style={{ color: 'var(--primary)' }}>
                        ishq.
                      </em>
                    </>
                  ) : (
                    storeSettings.tagline
                  )}
                </h1>

                <p
                  className="hero-animate-2 text-sm sm:text-base leading-relaxed max-w-xl"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {storeSettings.brandDescription}
                </p>

                <div className="hero-animate-3 flex flex-wrap items-center gap-3.5 pt-1">
                  <a
                    href="#shop"
                    className="px-6 py-3.5 rounded-lg text-xs font-semibold tracking-widest uppercase inline-flex items-center gap-2 shadow-sm transition-opacity hover:opacity-95 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'var(--btn-text)',
                    }}
                  >
                    <span>Explore Collection</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>

                  <a
                    href="#story"
                    className="px-5 py-3.5 rounded-lg border text-xs font-semibold tracking-widest uppercase inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-main)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <span>Our Heritage Story</span>
                  </a>

                  {cleanWhatsapp && (
                    <a
                      href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                        `Namaste ${storeSettings.storeName}! I would like to inquire about your ethnic wear collection.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3.5 rounded-lg border text-xs font-semibold tracking-wider uppercase inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                      style={{
                        backgroundColor: 'var(--surface)',
                        color: 'var(--primary)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Boutique</span>
                    </a>
                  )}
                </div>

                {/* Unboxed Editorial Metadata */}
                <div
                  className="hero-animate-3 pt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span>Authentic Handloom & Craft</span>
                  {activePaymentLabels.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{activePaymentLabels.join(' & ')}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>Pan-India Express Delivery</span>
                </div>
              </div>

              {/* Right Column: Hero Showcase Image */}
              <div className="lg:col-span-5">
                <div
                  className="relative aspect-[4/5] w-full max-w-md mx-auto lg:max-w-none rounded-2xl overflow-hidden border shadow-xl"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {!heroImgError ? (
                    <img
                      src={heroImageSrc}
                      alt={`${storeSettings.storeName} festive ethnic wear showcase`}
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgError(true)}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
                      style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
                    >
                      <span className="font-serif italic text-3xl">{storeSettings.storeName}</span>
                      <span className="text-xs uppercase tracking-widest mt-2">
                        The Festive Edit · 2026
                      </span>
                    </div>
                  )}

                  {/* Measured Contrast Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent pointer-events-none" />

                  <div className="absolute bottom-5 left-5 right-5 text-white flex items-end justify-between gap-4">
                    <div>
                      <span className="text-[11px] uppercase tracking-widest text-amber-200 block font-semibold">
                        Signature Collection
                      </span>
                      <p className="font-serif text-xl sm:text-2xl font-medium">
                        {storeSettings.storeName}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-white/90 tabular-nums">
                      {products.length} {products.length === 1 ? 'Curated Piece' : 'Curated Pieces'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SHOP CATALOG SECTION */}
        <section
          id="shop"
          className="reveal-section max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-14 sm:py-20"
        >
          {/* Section Header & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div
                className="text-xs font-semibold tracking-[0.2em] uppercase mb-1.5"
                style={{ color: 'var(--accent)' }}
              >
                Curated Wardrobe
              </div>
              <h2
                className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight"
                style={{ color: 'var(--text-main)' }}
              >
                Pieces to Fall For
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Handcrafted silhouettes tailored in small batches for lasting comfort and grace.
              </p>
            </div>

            {/* Search Input */}
            <div className="w-full md:w-80">
              <label htmlFor="catalog-search" className="sr-only">
                Search catalog
              </label>
              <div className="relative">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  id="catalog-search"
                  type="text"
                  placeholder="Search kurtis, sarees, suits, fabrics..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-lg border text-xs sm:text-sm transition-colors"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Clear search query"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Category Filter Bar */}
          <div
            className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none"
            role="tablist"
            aria-label="Product category filters"
          >
            {categories.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onCategoryChange(cat.id)}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors border whitespace-nowrap shrink-0 cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'var(--surface)',
                    color: active ? 'var(--btn-text)' : 'var(--text-secondary)',
                    borderColor: active ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Dynamic Product Grid */}
          {isLoading ? (
            <div
              className="py-24 text-center rounded-xl border"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <Loader2
                className="w-8 h-8 animate-spin mx-auto mb-3"
                style={{ color: 'var(--primary)' }}
              />
              <p className="font-serif text-xl" style={{ color: 'var(--text-main)' }}>
                Loading boutique catalog...
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Synchronizing live availability
              </p>
            </div>
          ) : error ? (
            <div
              className="py-16 px-6 text-center rounded-xl border max-w-md mx-auto"
              style={{
                backgroundColor: 'var(--error-bg)',
                borderColor: 'var(--error-border)',
                color: 'var(--error-text)',
              }}
            >
              <p className="text-sm font-medium mb-4">{error}</p>
              <button
                type="button"
                onClick={onRetryFetch}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Loading</span>
              </button>
            </div>
          ) : products.length === 0 ? (
            <div
              className="py-20 px-6 text-center rounded-xl border"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <p className="font-serif text-2xl" style={{ color: 'var(--text-main)' }}>
                No pieces match your current filter.
              </p>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Try searching for another fabric or browse all categories.
              </p>
              <button
                type="button"
                onClick={() => {
                  onCategoryChange('All');
                  onSearchChange('');
                }}
                className="mt-5 px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  onWishlistClick={onWishlistClick}
                  onSelectProduct={onSelectProduct}
                />
              ))}
            </div>
          )}
        </section>

        {/* HERITAGE & CRAFTSMANSHIP STORY SECTION */}
        <section
          id="story"
          className="reveal-section border-t transition-colors"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5">
                <div
                  className="p-8 sm:p-10 rounded-2xl border text-center space-y-4"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <span
                    className="text-xs font-semibold uppercase tracking-[0.22em] block"
                    style={{ color: 'var(--accent)' }}
                  >
                    Artisanal Promise
                  </span>
                  <blockquote
                    className="font-serif italic text-3xl sm:text-4xl leading-snug"
                    style={{ color: 'var(--primary)' }}
                  >
                    “A little tradition. A lot of you.”
                  </blockquote>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Every silhouette is finished by master karigars in Jaipur and Varanasi,
                    honoring centuries-old hand-block printing, zari weaving, and zardozi work.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div
                  className="text-xs font-semibold tracking-[0.22em] uppercase"
                  style={{ color: 'var(--accent)' }}
                >
                  The Indian Ishq Feeling
                </div>
                <h2
                  className="font-serif text-3xl sm:text-4xl font-semibold leading-tight"
                  style={{ color: 'var(--text-main)', textWrap: 'balance' }}
                >
                  Clothes with a heart of their own.
                </h2>
                <p
                  className="text-sm sm:text-base leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  From breathable everyday mulmul cottons to heirloom Banarasi Katan silks tailored
                  for your biggest celebrations, Indian Ishq Collection brings together colour,
                  craft, and effortless comfort. Founded as an independent Indian boutique, every
                  piece is inspected by hand before dispatch.
                </p>

                <div
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div>
                    <strong
                      className="font-serif text-xl block"
                      style={{ color: 'var(--primary)' }}
                    >
                      100% Authentic
                    </strong>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Pure Mulmul, Chanderi & Katan Silk
                    </span>
                  </div>
                  <div>
                    <strong
                      className="font-serif text-xl block"
                      style={{ color: 'var(--primary)' }}
                    >
                      24-Hr Dispatch
                    </strong>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Shipped directly from our boutique
                    </span>
                  </div>
                  <div>
                    <strong
                      className="font-serif text-xl block"
                      style={{ color: 'var(--primary)' }}
                    >
                      UPI & COD
                    </strong>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Instant QR payment or pay at doorstep
                    </span>
                  </div>
                </div>

                {/* Live Delivery & Return Policy Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <div
                    className="p-4 rounded-xl border space-y-1.5"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div
                      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--primary)' }}
                    >
                      <Truck className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                      <span>Delivery & Shipping Policy</span>
                    </div>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {storeSettings.deliveryPolicy}
                    </p>
                  </div>

                  <div
                    className="p-4 rounded-xl border space-y-1.5"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div
                      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--primary)' }}
                    >
                      <RotateCcw className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                      <span>Return & Exchange Policy</span>
                    </div>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {storeSettings.returnPolicy}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
