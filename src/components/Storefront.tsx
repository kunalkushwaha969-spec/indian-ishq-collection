import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Product } from '../utils/ecommerce';
import {
  filterProducts,
  formatINR,
  type StoreSettings,
  type HeroSlide,
  type HomepageSectionConfig,
  DEFAULT_STORE_SETTINGS,
  getActiveHeroSlides,
  sanitizeHomepageSections,
  DEFAULT_PROMO_BANNER,
  DEFAULT_TESTIMONIALS,
} from '../utils/ecommerce';
import type { CoordinatedTheme, AppearanceMode } from '../utils/themes';
import { ProductCard } from './ProductCard';
import {
  ShoppingBag,
  Search,
  Sparkles,
  Truck,
  RefreshCcw,
  ShieldCheck,
  Award,
  SlidersHorizontal,
  HeartHandshake,
  MessageCircle,
  CheckCircle2,
  X,
  ArrowUpDown,
  Lock,
  Palette,
  Sun,
  Moon,
  MapPin,
  Phone,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Star,
  Quote,
  Mail,
  Menu,
} from 'lucide-react';

const RevealSection: React.FC<{
  sectionId: string;
  className?: string;
  children: React.ReactNode;
}> = ({ sectionId, className = '', children }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    // Safety fallback so content is guaranteed to appear even if observer is throttled
    const fallbackTimer = window.setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-section ${isVisible ? 'reveal-visible' : 'reveal-pending'} ${className}`}
    >
      {children}
    </div>
  );
};


type SortOption = 'featured' | 'price-asc' | 'price-desc';

interface StorefrontProps {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  activeCategory: string;
  searchQuery: string;
  cartCount: number;
  coverPhoto: string;
  activeTheme: CoordinatedTheme;
  themes: CoordinatedTheme[];
  appearanceMode: AppearanceMode;
  storeSettings?: StoreSettings;
  isMerchantAuthenticated: boolean;
  onCategoryChange: (cat: string) => void;
  onSearchChange: (q: string) => void;
  onAddToCart: (product: Product) => void;
  onWishlistClick: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onOpenCart: () => void;
  onOpenMerchant: () => void;
  onRetryFetch: () => void;
  onSelectTheme: (theme: CoordinatedTheme) => void;
  onToggleAppearance: () => void;
  onOpenThemeModal: () => void;
}

const CATEGORIES = ['All', 'Kurtis', 'Sarees', 'Suits', 'Festive'];

const FEATURED_CATEGORY_CARDS = [
  {
    id: 'Sarees',
    title: 'Royal Silk Sarees',
    subtitle: 'Banarasi Katan, Zari & Hand-Block Drapes',
    image:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=85',
  },
  {
    id: 'Festive',
    title: 'Bridal & Festive Wear',
    subtitle: 'Hand-embroidered Zardozi & Gota Patti',
    image:
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=700&q=85',
  },
  {
    id: 'Kurtis',
    title: 'Everyday Mulmul Kurtis',
    subtitle: 'Breathable cottons & artisanal yoke craft',
    image:
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=700&q=85',
  },
  {
    id: 'Suits',
    title: 'Chanderi & Organza Suits',
    subtitle: 'Three-piece festive & daily suit sets',
    image:
      'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=700&q=85',
  },
];

const CURATED_CRAFT_COLLECTIONS = [
  {
    id: 'Sarees',
    badge: 'Varanasi Looms',
    title: 'The Banarasi Zari Edit',
    desc: 'Lustrous Katan silk drapes woven with pure zari borders and heritage motifs.',
    image:
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'Kurtis',
    badge: 'Jaipur Block Print',
    title: 'Breathable Mulmul & Cottons',
    desc: 'Featherlight daily silhouettes crafted for effortless comfort in Indian summers.',
    image:
      'https://images.unsplash.com/photo-1583391733975-04535df2b378?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'Festive',
    badge: 'Occasion Couture',
    title: 'Sangeet & Festive Ensembles',
    desc: 'Rich velvet lehengas and Chanderi silk anarkalis finished with hand gota patti.',
    image:
      'https://images.unsplash.com/photo-1610030469668-932d0c242e88?auto=format&fit=crop&w=900&q=80',
  },
];

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
  isMerchantAuthenticated,
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
  const brandName = storeSettings.storeName || DEFAULT_STORE_SETTINGS.storeName;
  const brandTagline = storeSettings.tagline || DEFAULT_STORE_SETTINGS.tagline;
  const brandDescription =
    storeSettings.brandDescription || DEFAULT_STORE_SETTINGS.brandDescription;
  const announcementText =
    storeSettings.announcementText ?? DEFAULT_STORE_SETTINGS.announcementText;
  const whatsappClean = (storeSettings.whatsapp || DEFAULT_STORE_SETTINGS.whatsapp).replace(
    /\D/g,
    ''
  );
  const storeAddress = storeSettings.address || '';
  const storePhone = storeSettings.phone || '';
  const mapsUrl =
    storeSettings.mapsUrl ||
    (storeAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${brandName} ${storeAddress}`
        )}`
      : '');

  // Header customization flags
  const showAnnouncementBar =
    storeSettings.announcementEnabled !== false && Boolean(announcementText?.trim());
  const headerShowThemeControls = storeSettings.showThemeSelectorInHeader !== false;

  // Resolve active hero slides from merchant settings (with legacy coverPhoto support)
  const activeHeroSlides: HeroSlide[] = useMemo(() => {
    return getActiveHeroSlides(storeSettings, coverPhoto);
  }, [storeSettings, coverPhoto]);

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isHeroHovered, setIsHeroHovered] = useState<boolean>(false);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentSlideIndex >= activeHeroSlides.length) {
      setCurrentSlideIndex(0);
    }
  }, [activeHeroSlides.length, currentSlideIndex]);

  const handleNextSlide = useCallback(() => {
    if (activeHeroSlides.length <= 1) return;
    setCurrentSlideIndex((prev) => (prev + 1) % activeHeroSlides.length);
  }, [activeHeroSlides.length]);

  const handlePrevSlide = useCallback(() => {
    if (activeHeroSlides.length <= 1) return;
    setCurrentSlideIndex(
      (prev) => (prev - 1 + activeHeroSlides.length) % activeHeroSlides.length
    );
  }, [activeHeroSlides.length]);

  // Automatic slide advancement with pause on hover
  useEffect(() => {
    if (
      activeHeroSlides.length <= 1 ||
      storeSettings.heroAutoplay === false ||
      isHeroHovered
    ) {
      return;
    }
    const intervalMs = Math.max(
      2500,
      Number(storeSettings.heroIntervalMs) || DEFAULT_STORE_SETTINGS.heroIntervalMs
    );
    const timer = window.setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % activeHeroSlides.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    activeHeroSlides.length,
    storeSettings.heroAutoplay,
    storeSettings.heroIntervalMs,
    isHeroHovered,
  ]);

  const currentHeroSlide = activeHeroSlides[currentSlideIndex] || activeHeroSlides[0];
  const slideOverlayOpacity = Math.min(
    90,
    Math.max(25, Number(currentHeroSlide?.overlayOpacity ?? 75))
  );

  // Filter & Sort State
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(25000);
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isCartBumping, setIsCartBumping] = useState<boolean>(false);
  const prevCartCountRef = useRef<number>(cartCount);

  // Subtle bounce on the cart count badge when items are added
  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      setIsCartBumping(true);
      const timer = window.setTimeout(() => setIsCartBumping(false), 380);
      prevCartCountRef.current = cartCount;
      return () => window.clearTimeout(timer);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  // Preload next hero slide image so transitions are instant with zero flash
  useEffect(() => {
    if (activeHeroSlides.length > 1) {
      const nextIndex = (currentSlideIndex + 1) % activeHeroSlides.length;
      const nextSlide = activeHeroSlides[nextIndex];
      if (nextSlide?.imageUrl) {
        const img = new Image();
        img.src = nextSlide.imageUrl;
      }
      if (nextSlide?.mobileImageUrl) {
        const mobImg = new Image();
        mobImg.src = nextSlide.mobileImageUrl;
      }
    }
  }, [currentSlideIndex, activeHeroSlides]);


  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState<boolean>(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) return;
    try {
      const existing = JSON.parse(localStorage.getItem('ishq_newsletter_subscribers') || '[]');
      if (Array.isArray(existing) && !existing.includes(newsletterEmail.trim())) {
        existing.push(newsletterEmail.trim());
        localStorage.setItem('ishq_newsletter_subscribers', JSON.stringify(existing));
      }
    } catch {}
    setNewsletterSubmitted(true);
    setNewsletterEmail('');
  };

  // Compute maximum product price dynamically
  const highestCatalogPrice = useMemo(() => {
    if (products.length === 0) return 25000;
    return Math.max(...products.map((p) => p.price), 10000);
  }, [products]);

  // Featured New Arrivals
  const newArrivalProducts = useMemo(() => {
    const tagged = products.filter(
      (p) =>
        p.stock > 0 &&
        (p.tag?.toLowerCase().includes('new') ||
          p.tag?.toLowerCase().includes('just in') ||
          p.tag?.toLowerCase().includes('festive'))
    );
    const list = tagged.length >= 4 ? tagged : [...products].reverse();
    return list.slice(0, 4);
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let base = filterProducts(products, activeCategory, searchQuery);
    if (inStockOnly) {
      base = base.filter((p) => p.stock > 0);
    }
    if (maxPriceFilter < highestCatalogPrice) {
      base = base.filter((p) => p.price <= maxPriceFilter);
    }
    if (sortBy === 'price-asc') {
      base = [...base].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      base = [...base].sort((a, b) => b.price - a.price);
    }
    return base;
  }, [products, activeCategory, searchQuery, sortBy, inStockOnly, maxPriceFilter, highestCatalogPrice]);

  const activeFilterCount =
    (activeCategory !== 'All' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (maxPriceFilter < highestCatalogPrice ? 1 : 0);

  const resetAllFilters = () => {
    onCategoryChange('All');
    onSearchChange('');
    setSortBy('featured');
    setInStockOnly(false);
    setMaxPriceFilter(highestCatalogPrice);
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog') || document.getElementById('shop');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSlideCtaClick = (slide: HeroSlide) => {
    if (slide.categoryFilter && CATEGORIES.includes(slide.categoryFilter)) {
      onCategoryChange(slide.categoryFilter);
    }
    const targetLink = slide.ctaLink || '#catalog';
    if (targetLink.startsWith('#')) {
      const targetId = targetLink.slice(1);
      const el =
        document.getElementById(targetId) ||
        document.getElementById('catalog') ||
        document.getElementById('shop');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (targetLink.startsWith('http://') || targetLink.startsWith('https://')) {
      window.location.href = targetLink;
    }
  };

  // Ordered homepage sections from merchant settings
  const orderedHomepageSections: HomepageSectionConfig[] = useMemo(
    () => sanitizeHomepageSections(storeSettings.homepageSections),
    [storeSettings.homepageSections]
  );

  // Desktop grid column class based on merchant preference (3 or 4 columns)
  const desktopGridColsClass =
    storeSettings.gridColumnsDesktop === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  const promoBanner = storeSettings.promoBanner || DEFAULT_PROMO_BANNER;
  const testimonials =
    Array.isArray(storeSettings.testimonials) && storeSettings.testimonials.length > 0
      ? storeSettings.testimonials
      : DEFAULT_TESTIMONIALS;

  // Render function for each configurable homepage section
  const renderHomepageSection = (section: HomepageSectionConfig) => {
    if (!section.enabled) return null;

    switch (section.id) {
      case 'hero':
        return (
          <section
            key="hero"
            id="top"
            aria-label="Featured Collection Slideshow"
            className="relative w-full overflow-hidden select-none"
            onMouseEnter={() => setIsHeroHovered(true)}
            onMouseLeave={() => setIsHeroHovered(false)}
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartXRef.current === null) return;
              const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
              const deltaX = endX - touchStartXRef.current;
              if (Math.abs(deltaX) > 40) {
                if (deltaX < 0) handleNextSlide();
                else handlePrevSlide();
              }
              touchStartXRef.current = null;
            }}
          >
            <div className="relative w-full h-[68vh] min-h-[400px] max-h-[640px] sm:h-[74vh] lg:h-[80vh] lg:max-h-[760px] bg-[#160c10]">
              {activeHeroSlides.map((slide, index) => {
                const isCurrent = index === currentSlideIndex;
                return (
                  <div
                    key={slide.id}
                    aria-hidden={!isCurrent}
                    className={`absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  >
                    <picture>
                      {slide.mobileImageUrl && (
                        <source media="(max-width: 767px)" srcSet={slide.mobileImageUrl} />
                      )}
                      <img
                        src={slide.imageUrl}
                        alt={slide.title || brandName}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        referrerPolicy="no-referrer"
                        className={`hero-slide-zoom w-full h-full object-cover object-top sm:object-center ${
                          isCurrent ? 'hero-slide-zoom-active' : ''
                        }`}
                      />
                    </picture>
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, rgba(16, 8, 11, ${(
                          slideOverlayOpacity / 100
                        ).toFixed(2)}) 0%, rgba(16, 8, 11, ${(
                          (slideOverlayOpacity * 0.55) /
                          100
                        ).toFixed(2)}) 48%, rgba(16, 8, 11, 0.14) 100%)`,
                      }}
                    />
                  </div>
                );
              })}

              {/* Hero Overlay Content */}
              {currentHeroSlide && (
                <div className="relative z-20 h-full max-w-[1280px] mx-auto px-3 sm:px-6 pb-10 sm:pb-14 pt-6 flex flex-col justify-end min-w-0">
                  <div
                    key={currentHeroSlide.id}
                    className="max-w-2xl space-y-2.5 sm:space-y-3.5 min-w-0"
                  >
                    {currentHeroSlide.badge && (
                      <div
                        className="hero-animate-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] sm:text-xs font-bold tracking-[0.18em] uppercase shadow-sm max-w-full"
                        style={{
                          backgroundColor: 'var(--accent)',
                          color: '#1b1114',
                        }}
                      >
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span className="truncate">{currentHeroSlide.badge}</span>
                      </div>
                    )}

                    <h1 className="hero-animate-2 font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight drop-shadow-sm break-words">
                      {currentHeroSlide.title}
                    </h1>

                    {currentHeroSlide.subtitle && (
                      <p className="hero-animate-3 text-xs sm:text-base text-white/90 max-w-xl leading-relaxed line-clamp-2 sm:line-clamp-3 drop-shadow-xs break-words">
                        {currentHeroSlide.subtitle}
                      </p>
                    )}

                    <div className="hero-animate-4 pt-1.5 flex flex-wrap items-center gap-2.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => handleSlideCtaClick(currentHeroSlide)}
                        className="btn-luxury px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg cursor-pointer"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--btn-text)',
                        }}
                      >
                        {currentHeroSlide.ctaText || 'Explore Collection'}
                      </button>

                      {whatsappClean && storeSettings.whatsappOrderEnabled !== false && (
                        <a
                          href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent(
                            `Namaste ${brandName}! I would like to explore your ${currentHeroSlide.title}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-luxury px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-black/45 hover:bg-black/65 text-white border border-white/25 backdrop-blur-xs flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>WhatsApp Stylist</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Previous / Next Controls & Slide Dots (only shown when > 1 active slide) */}
              {activeHeroSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    aria-label="Previous hero slide"
                    className="btn-luxury hidden sm:flex absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white border border-white/20 items-center justify-center backdrop-blur-xs cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSlide}
                    aria-label="Next hero slide"
                    className="btn-luxury hidden sm:flex absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 text-white border border-white/20 items-center justify-center backdrop-blur-xs cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Bottom Slide Indicators */}
                  <div
                    role="tablist"
                    aria-label="Slideshow navigation"
                    className="absolute bottom-3.5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-20 flex items-center gap-2 bg-black/35 px-3 py-1.5 rounded-full backdrop-blur-xs border border-white/15 max-w-[90%]"
                  >
                    {activeHeroSlides.map((slide, idx) => {
                      const active = idx === currentSlideIndex;
                      return (
                        <button
                          key={slide.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-label={`Show slide ${idx + 1}: ${slide.title}`}
                          onClick={() => setCurrentSlideIndex(idx)}
                          className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                            active ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                          }`}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>

          </section>
        );

      case 'categories':
        return (
          <RevealSection key="categories" sectionId="categories">
            <section
              aria-label="Featured Categories"
              className="max-w-[1280px] mx-auto px-3 sm:px-4 pt-6 sm:pt-8 min-w-0"
            >
              <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.18em] block"
                    style={{ color: 'var(--primary)' }}
                  >
                    Curated Silks & Craft
                  </span>
                  <h2
                    className="font-serif text-2xl sm:text-3xl font-bold break-words"
                    style={{ color: 'var(--text-main)' }}
                  >
                    {storeSettings.categoriesTitle || 'Featured Categories'}
                  </h2>
                  {storeSettings.categoriesSubtitle && (
                    <p className="text-xs mt-0.5 break-words" style={{ color: 'var(--text-secondary)' }}>
                      {storeSettings.categoriesSubtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onCategoryChange('All');
                    scrollToCatalog();
                  }}
                  className="nav-link-underline text-xs font-semibold uppercase tracking-wider hover:underline shrink-0 cursor-pointer"
                  style={{ color: 'var(--primary)' }}
                >
                  View All ({products.length}) →
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                {FEATURED_CATEGORY_CARDS.map((card) => {
                  const count = products.filter(
                    (p) => p.category.toLowerCase() === card.id.toLowerCase()
                  ).length;
                  const isSelected = activeCategory === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        onCategoryChange(card.id);
                        scrollToCatalog();
                      }}
                      className="group relative aspect-[4/5] sm:aspect-[3/4] rounded-xl overflow-hidden border text-left cursor-pointer shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg min-w-0"
                      style={{
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                      }}
                    >
                      <img
                        src={card.image}
                        alt={card.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(to top, rgba(16, 8, 11, 0.88) 0%, rgba(16, 8, 11, 0.25) 55%, rgba(16, 8, 11, 0.05) 100%)',
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs mb-1">
                          {count} {count === 1 ? 'Design' : 'Designs'}
                        </span>
                        <h3 className="font-serif text-base sm:text-xl font-bold leading-snug break-words">
                          {card.title}
                        </h3>
                        <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">
                          {card.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </RevealSection>
        );

      case 'newArrivals':
        if (newArrivalProducts.length === 0) return null;
        return (
          <RevealSection key="newArrivals" sectionId="newArrivals">
            <section
              aria-label="New Arrivals"
              className="max-w-[1280px] mx-auto px-3 sm:px-4 pt-8 sm:pt-10 min-w-0"
            >
              <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.18em] block"
                    style={{ color: 'var(--primary)' }}
                  >
                    Fresh From Our Looms
                  </span>
                  <h2
                    className="font-serif text-2xl sm:text-3xl font-bold break-words"
                    style={{ color: 'var(--text-main)' }}
                  >
                    {storeSettings.newArrivalsTitle || 'New Season Arrivals'}
                  </h2>
                  {storeSettings.newArrivalsSubtitle && (
                    <p className="text-xs mt-0.5 break-words" style={{ color: 'var(--text-secondary)' }}>
                      {storeSettings.newArrivalsSubtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={scrollToCatalog}
                  className="nav-link-underline text-xs font-semibold uppercase tracking-wider hover:underline shrink-0 cursor-pointer"
                  style={{ color: 'var(--primary)' }}
                >
                  Browse Full Collection →
                </button>
              </div>

              <div className={`grid ${desktopGridColsClass} gap-4 sm:gap-5 min-w-0`}>
                {newArrivalProducts.map((product) => (
                  <ProductCard
                    key={`new-arrival-${product.id}`}
                    product={product}
                    storeSettings={storeSettings}
                    onAddToCart={onAddToCart}
                    onWishlistClick={onWishlistClick}
                    onSelectProduct={onSelectProduct}
                  />
                ))}
              </div>
            </section>
          </RevealSection>
        );


      case 'promoBanner':
        return (
          <RevealSection key="promoBanner" sectionId="promoBanner">
            <section
              aria-label="Promotional Spotlight"
              className="max-w-[1280px] mx-auto px-3 sm:px-4 pt-8 sm:pt-10 min-w-0"
            >
              <div
                className="relative rounded-2xl overflow-hidden border shadow-md min-h-[220px] sm:min-h-[260px] flex items-center"
                style={{ borderColor: 'var(--border)' }}
              >
                {promoBanner.imageUrl && (
                  <img
                    src={promoBanner.imageUrl}
                    alt={promoBanner.heading}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(16, 8, 11, 0.88) 0%, rgba(16, 8, 11, 0.68) 55%, rgba(16, 8, 11, 0.35) 100%)',
                  }}
                />
                <div className="relative z-10 p-6 sm:p-10 max-w-2xl text-white space-y-3 min-w-0">
                  {promoBanner.badge && (
                    <span
                      className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: '#1b1114',
                      }}
                    >
                      {promoBanner.badge}
                    </span>
                  )}
                  <h2 className="font-serif text-2xl sm:text-4xl font-bold leading-tight break-words">
                    {promoBanner.heading}
                  </h2>
                  {promoBanner.subtext && (
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed break-words">
                      {promoBanner.subtext}
                    </p>
                  )}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          promoBanner.ctaCategory &&
                          CATEGORIES.includes(promoBanner.ctaCategory)
                        ) {
                          onCategoryChange(promoBanner.ctaCategory);
                        }
                        scrollToCatalog();
                      }}
                      className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition cursor-pointer btn-luxury active:scale-95"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--btn-text)',
                      }}
                    >
                      {promoBanner.ctaText || 'Explore Sarees'}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </RevealSection>
        );

      case 'story':
        return (
          <RevealSection key="story" sectionId="story">
            <section
              id="story"
              className="max-w-[1280px] mx-auto px-3 sm:px-4 pt-8 sm:pt-10 min-w-0"
            >
              <div
                className="rounded-2xl border p-5 sm:p-8 shadow-xs transition-colors min-w-0"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-center min-w-0">
                  <div className="space-y-3 min-w-0">
                    <div
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: 'var(--primary)' }}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>{brandTagline}</span>
                    </div>
                    <h2
                      className="font-serif text-2xl sm:text-3xl font-bold leading-snug break-words"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {storeSettings.storyHeading || `The ${brandName} Heritage`}
                    </h2>
                    {storeSettings.storyQuote && (
                      <p
                        className="font-serif italic text-base sm:text-lg break-words"
                        style={{ color: 'var(--primary)' }}
                      >
                        {storeSettings.storyQuote}
                      </p>
                    )}
                    <p
                      className="text-xs sm:text-sm leading-relaxed break-words"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {brandDescription}
                    </p>

                    {(storeAddress || storePhone || mapsUrl) && (
                      <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                        {storeAddress && (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border max-w-full"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <MapPin
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: 'var(--primary)' }}
                            />
                            <span className="truncate">{storeAddress}</span>
                          </span>
                        )}
                        {storePhone && (
                          <a
                            href={`tel:${storePhone.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium hover:opacity-90 transition-opacity"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-main)',
                            }}
                          >
                            <Phone
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: 'var(--primary)' }}
                            />
                            <span>{storePhone}</span>
                          </a>
                        )}
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border font-semibold hover:opacity-90 transition-opacity"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                              color: 'var(--primary)',
                            }}
                          >
                            <span>Directions</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Trust & Authenticity Pillars */}
                  <div className="grid grid-cols-2 gap-3 min-w-0">
                    {[
                      {
                        icon: Award,
                        title: 'Authentic Weaves',
                        desc: '100% pure zari & handloom certified',
                      },
                      {
                        icon: Truck,
                        title: 'Insured Delivery',
                        desc: `Free shipping above ₹${(
                          storeSettings.freeShippingThreshold ?? 1999
                        ).toLocaleString('en-IN')}`,
                      },
                      {
                        icon: RefreshCcw,
                        title: 'Easy 7-Day Returns',
                        desc: 'Hassle-free size exchange',
                      },
                      {
                        icon: ShieldCheck,
                        title: 'Secure Checkout',
                        desc: 'Dynamic UPI QR & COD support',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border flex flex-col gap-1.5 min-w-0 transition-transform duration-300 hover:-translate-y-0.5"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <item.icon className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                        <strong
                          className="text-xs font-semibold block break-words"
                          style={{ color: 'var(--text-main)' }}
                        >
                          {item.title}
                        </strong>
                        <span
                          className="text-[11px] leading-snug break-words"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {item.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </RevealSection>
        );

      case 'collections':
        return (
          <RevealSection key="collections" sectionId="collections">
            <section
              aria-label="Additional Curated Collections"
              className="max-w-[1280px] mx-auto px-3 sm:px-4 pt-8 sm:pt-10 min-w-0"
            >
              <div className="mb-4">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.18em] block"
                  style={{ color: 'var(--primary)' }}
                >
                  Regional Craft Edits
                </span>
                <h2
                  className="font-serif text-2xl sm:text-3xl font-bold break-words"
                  style={{ color: 'var(--text-main)' }}
                >
                  Curated Heritage Capsules
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
                {CURATED_CRAFT_COLLECTIONS.map((col) => (
                  <div
                    key={col.title}
                    className="group rounded-xl overflow-hidden border flex flex-col justify-between shadow-2xs min-w-0 transition-all duration-300 hover:shadow-md"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={col.image}
                        alt={col.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <span
                        className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shadow-xs"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--btn-text)',
                        }}
                      >
                        {col.badge}
                      </span>
                    </div>
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h3
                          className="font-serif text-xl font-bold break-words"
                          style={{ color: 'var(--text-main)' }}
                        >
                          {col.title}
                        </h3>
                        <p
                          className="text-xs mt-1 leading-relaxed break-words"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {col.desc}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onCategoryChange(col.id);
                          scrollToCatalog();
                        }}
                        className="pt-2 text-xs font-semibold uppercase tracking-wider text-left hover:underline cursor-pointer transition-colors"
                        style={{ color: 'var(--primary)' }}
                      >
                        Explore {col.id} →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </RevealSection>
        );

      case 'testimonials':
        if (testimonials.length === 0) return null;
        return (
          <RevealSection key="testimonials" sectionId="testimonials">
            <section
              aria-label="Customer Testimonials"
              className="max-w-[1280px] mx-auto px-3 sm:px-4 pt-8 sm:pt-10 min-w-0"
            >
              <div className="mb-4">
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.18em] block"
                  style={{ color: 'var(--primary)' }}
                >
                  Verified Patron Stories
                </span>
                <h2
                  className="font-serif text-2xl sm:text-3xl font-bold break-words"
                  style={{ color: 'var(--text-main)' }}
                >
                  Customer Love & Testimonials
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 rounded-xl border flex flex-col justify-between gap-3 shadow-2xs min-w-0 transition-transform duration-300 hover:-translate-y-0.5"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="space-y-2.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
                          {Array.from({ length: Math.min(5, Math.max(1, t.rating || 5)) }).map(
                            (_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-current" />
                            )
                          )}
                        </div>
                        <Quote
                          className="w-4 h-4 opacity-30 shrink-0"
                          style={{ color: 'var(--primary)' }}
                        />
                      </div>
                      <p
                        className="text-xs leading-relaxed italic break-words"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        “{t.quote}”
                      </p>
                    </div>
                    <div
                      className="pt-2 border-t flex items-center justify-between gap-2 text-xs"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="min-w-0">
                        <strong
                          className="block font-semibold truncate"
                          style={{ color: 'var(--text-main)' }}
                        >
                          {t.customerName}
                        </strong>
                        {t.location && (
                          <span
                            className="text-[11px] truncate block"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {t.location}
                          </span>
                        )}
                      </div>
                      {t.productBought && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded border truncate max-w-[45%]"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: 'var(--border)',
                            color: 'var(--primary)',
                          }}
                        >
                          {t.productBought}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </RevealSection>
        );

      case 'newsletter':
        return (
          <RevealSection key="newsletter" sectionId="newsletter">
            <section
              aria-label="Newsletter Dispatch"
              className="max-w-[1280px] mx-auto px-3 sm:px-4 pt-8 sm:pt-10 min-w-0"
            >
              <div
                className="rounded-2xl border p-6 sm:p-8 text-center max-w-3xl mx-auto space-y-3 shadow-xs"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mx-auto border"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--primary)',
                  }}
                >
                  <Mail className="w-4 h-4" />
                </div>
                <h2
                  className="font-serif text-2xl sm:text-3xl font-bold break-words"
                  style={{ color: 'var(--text-main)' }}
                >
                  {storeSettings.newsletterHeading || 'Join the Indian Ishq Privé List'}
                </h2>
                <p
                  className="text-xs sm:text-sm max-w-xl mx-auto leading-relaxed break-words"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {storeSettings.newsletterSubtext ||
                    'Receive early access to small-batch Banarasi weaves, seasonal Chanderi edits, and private boutique previews.'}
                </p>

                {newsletterSubmitted ? (
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-semibold transition-all duration-300"
                    style={{
                      backgroundColor: 'var(--success-bg)',
                      borderColor: 'var(--success-border)',
                      color: 'var(--success-text)',
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Thank you for subscribing! You are on our private preview list.</span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleNewsletterSubmit}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 max-w-md mx-auto pt-2"
                  >
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email address..."
                      aria-label="Email address for newsletter"
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer shrink-0 btn-luxury active:scale-95"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--btn-text)',
                      }}
                    >
                      Subscribe
                    </button>
                  </form>
                )}
              </div>
            </section>
          </RevealSection>
        );

      case 'bestsellers':
        return (
          <RevealSection key="bestsellers" sectionId="bestsellers">
            <main
              key="bestsellers"
              id="catalog"
              className="max-w-[1280px] mx-auto px-3 sm:px-4 py-8 sm:py-10 min-w-0"
            >
            <div id="shop" />
            {/* Section Heading & Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5 min-w-0">
              <div className="min-w-0">
                <span
                  className="text-xs uppercase tracking-[0.2em] font-semibold block mb-1"
                  style={{ color: 'var(--primary)' }}
                >
                  Handpicked Heritage
                </span>
                <h2
                  className="font-serif text-2xl sm:text-4xl font-bold break-words"
                  style={{ color: 'var(--text-main)' }}
                >
                  {storeSettings.bestsellersTitle || 'Bestsellers & Featured Pieces'}
                </h2>
                <p className="text-xs sm:text-sm mt-1 break-words" style={{ color: 'var(--text-secondary)' }}>
                  {storeSettings.bestsellersSubtitle ||
                    `Showing ${filteredProducts.length} of ${products.length} handcrafted pieces`}
                </p>
              </div>

              {/* Sort & Filter Bar */}
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                {/* In-Stock Toggle */}
                <button
                  type="button"
                  onClick={() => setInStockOnly(!inStockOnly)}
                  className="px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  style={{
                    backgroundColor: inStockOnly ? 'var(--primary)' : 'var(--surface)',
                    color: inStockOnly ? 'var(--btn-text)' : 'var(--text-main)',
                    borderColor: inStockOnly ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>In Stock Only</span>
                </button>

                {/* More Filters Toggle */}
                <button
                  type="button"
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  className="px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  style={{
                    backgroundColor: showFiltersPanel ? 'var(--primary)' : 'var(--surface)',
                    color: showFiltersPanel ? 'var(--btn-text)' : 'var(--text-main)',
                    borderColor: showFiltersPanel ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>Budget Filter</span>
                  {activeFilterCount > 0 && (
                    <span
                      className="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: showFiltersPanel ? 'var(--surface)' : 'var(--primary)',
                        color: showFiltersPanel ? 'var(--primary)' : 'var(--btn-text)',
                      }}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Sort Select */}
                <div
                  className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5 max-w-full"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <ArrowUpDown
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: 'var(--primary)' }}
                  />
                  <span
                    className="text-[11px] font-medium shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Sort:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Sort products by"
                    className="text-xs font-semibold bg-transparent outline-none cursor-pointer min-w-0"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <option
                      value="featured"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-main)' }}
                    >
                      Featured
                    </option>
                    <option
                      value="price-asc"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-main)' }}
                    >
                      Price: Low to High
                    </option>
                    <option
                      value="price-desc"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-main)' }}
                    >
                      Price: High to Low
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Expandable Filter Drawer */}
            {showFiltersPanel && (
              <div
                className="mb-6 p-4 rounded-xl border shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4 items-center"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >
                {/* Price Range Slider */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                    <span style={{ color: 'var(--text-muted)' }}>Max Budget</span>
                    <span style={{ color: 'var(--primary)' }}>{formatINR(maxPriceFilter)}</span>
                  </div>
                  <input
                    type="range"
                    min={800}
                    max={highestCatalogPrice}
                    step={200}
                    value={maxPriceFilter}
                    onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                    className="w-full cursor-pointer"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div
                    className="flex justify-between text-[10px] mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>₹800</span>
                    <span>{formatINR(highestCatalogPrice)}</span>
                  </div>
                </div>

                {/* Reset Controls */}
                <div className="flex sm:justify-end items-end h-full">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-4 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              </div>
            )}

            {/* Category Pills (Wraps cleanly without horizontal scroll overflow) */}
            <div className="flex flex-wrap gap-2 pb-4 mb-5">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                const count =
                  cat === 'All'
                    ? products.length
                    : products.filter((p) => p.category.toLowerCase() === cat.toLowerCase()).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onCategoryChange(cat)}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border"
                    style={{
                      backgroundColor: isActive ? 'var(--primary)' : 'var(--surface)',
                      color: isActive ? 'var(--btn-text)' : 'var(--text-main)',
                      borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    <span>{cat}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.2 rounded-full"
                      style={{
                        backgroundColor: isActive
                          ? 'rgba(255,255,255,0.2)'
                          : 'var(--surface-elevated)',
                        color: isActive ? 'var(--btn-text)' : 'var(--text-muted)',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Loading / Error / Grid */}
            {isLoading ? (
              <div className={`grid ${desktopGridColsClass} gap-5`}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="rounded-xl border p-4 h-[420px] animate-pulse flex flex-col justify-between"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div
                      className="aspect-[3/4] rounded-lg"
                      style={{ backgroundColor: 'var(--surface-elevated)' }}
                    />
                    <div className="space-y-2">
                      <div
                        className="h-4 rounded w-2/3"
                        style={{ backgroundColor: 'var(--surface-elevated)' }}
                      />
                      <div
                        className="h-3 rounded w-full"
                        style={{ backgroundColor: 'var(--surface-elevated)' }}
                      />
                      <div
                        className="h-8 rounded w-full mt-2"
                        style={{ backgroundColor: 'var(--surface-elevated)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div
                className="border rounded-xl p-8 text-center my-8"
                style={{
                  backgroundColor: 'var(--error-bg)',
                  borderColor: 'var(--error-border)',
                  color: 'var(--error-text)',
                }}
              >
                <p className="font-serif text-xl font-semibold">Unable to load catalog</p>
                <p className="text-xs mt-1">{error}</p>
                <button
                  type="button"
                  onClick={onRetryFetch}
                  className="mt-4 px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--btn-text)',
                  }}
                >
                  Retry Connection
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                className="rounded-xl border p-12 text-center my-6"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >
                <p
                  className="font-serif text-2xl font-semibold"
                  style={{ color: 'var(--text-main)' }}
                >
                  No matching designs found
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Try clearing your search filter or adjusting your maximum budget slider.
                </p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="mt-4 px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--btn-text)',
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className={`grid ${desktopGridColsClass} gap-5 min-w-0`}>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    storeSettings={storeSettings}
                    onAddToCart={onAddToCart}
                    onWishlistClick={onWishlistClick}
                    onSelectProduct={onSelectProduct}
                  />
                ))}
              </div>
            )}

            {/* Bespoke Bridal & Styling Banner */}
            <section
              className="mt-12 rounded-2xl p-6 sm:p-8 border flex flex-col md:flex-row items-center justify-between gap-6"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="space-y-2 max-w-xl min-w-0">
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--primary)' }}
                >
                  <HeartHandshake className="w-4 h-4 shrink-0" />
                  <span>Bespoke Bridal & Custom Tailoring</span>
                </div>
                <h3
                  className="font-serif text-2xl sm:text-3xl font-bold break-words"
                  style={{ color: 'var(--text-main)' }}
                >
                  Need custom blouse stitching, petticoat fall-pico, or bridal consultation?
                </h3>
                <p
                  className="text-xs leading-relaxed break-words"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Our master tailors customize sleeve lengths, necklines, and measurements before
                  dispatch. Connect directly with our stylists on WhatsApp for personalized video
                  previews of any silk saree or festive ensemble.
                </p>
              </div>

              {whatsappClean && storeSettings.whatsappOrderEnabled !== false && (
                <a
                  href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent(
                    `Namaste ${brandName}! I would like to inquire about custom styling / blouse stitching.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-xl bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest shadow-md hover:bg-emerald-800 transition flex items-center gap-2 shrink-0"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Chat with a Stylist</span>
                </a>
              )}
            </section>
          </main>
        </RevealSection>
      );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden max-w-full">
      {/* 1. COMPACT STICKY HEADER + OPTIONAL ANNOUNCEMENT BAR */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b transition-colors max-w-full"
        style={{
          backgroundColor: 'var(--header-bg)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Slim Announcement Bar */}
        {showAnnouncementBar && (
          <div
            className="text-[11px] tracking-wider uppercase py-1 px-3 text-center font-medium truncate"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--btn-text)',
            }}
          >
            {announcementText}
          </div>
        )}

        <div className="max-w-[1280px] mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Hamburger Navigation Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={isMobileMenuOpen}
              className="xl:hidden w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 btn-luxury active:scale-95"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* Brand Logo */}
            <a
              href="#top"
              className="flex items-center gap-2.5 group focus:outline-none min-w-0 shrink"
            >
              {storeSettings.logoUrl ? (
                <img
                  src={storeSettings.logoUrl}
                  alt={brandName}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-sm border shrink-0 transition-transform group-hover:scale-105"
                  style={{ borderColor: 'var(--border)' }}
                />
              ) : (
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-serif font-bold text-base sm:text-lg tracking-wider shadow-sm transition-transform group-hover:scale-105 shrink-0"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--btn-text)',
                    border: '2px solid var(--accent)',
                  }}
                >
                  {brandName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <span
                  className="font-serif text-lg sm:text-2xl font-bold tracking-wide block leading-none truncate"
                  style={{ color: 'var(--primary)' }}
                >
                  {brandName}
                </span>
                <span
                  className="hidden sm:block text-[10px] tracking-[0.18em] uppercase font-medium mt-0.5 truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {brandTagline}
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Quick Category Links */}
          <nav aria-label="Primary Categories" className="hidden xl:flex items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <a
                  key={cat}
                  href="#catalog"
                  onClick={() => onCategoryChange(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 nav-link-boutique relative ${
                    isActive ? 'font-bold' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? 'var(--btn-text)' : 'var(--text-main)',
                  }}
                >
                  {cat === 'All' ? 'Shop All' : cat}
                </a>
              );
            })}
          </nav>

          {/* Actions: Search + Theme Controls + Cart + Merchant */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop Search */}
            <div
              className="hidden md:flex items-center rounded-lg px-3 py-1.5 border w-48 lg:w-60 transition-colors"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border)',
              }}
            >
              <Search
                className="w-3.5 h-3.5 mr-2 shrink-0"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search sarees, kurtis..."
                aria-label="Search ethnic wear catalog"
                className="bg-transparent text-xs w-full outline-none min-w-0"
                style={{ color: 'var(--text-main)' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search query"
                  className="cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Theme Selector Dropdown */}
            {headerShowThemeControls && (
              <div
                className="hidden lg:flex items-center gap-1.5 rounded-lg px-2 py-1 border"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
              >
                <Palette className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                <select
                  aria-label="Select Store Colour Theme"
                  value={activeTheme.id}
                  onChange={(e) => {
                    const found = themes.find((t) => t.id === e.target.value);
                    if (found) onSelectTheme(found);
                  }}
                  className="text-xs font-medium bg-transparent outline-none cursor-pointer pr-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  {themes.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      style={{
                        backgroundColor: 'var(--surface)',
                        color: 'var(--text-main)',
                      }}
                    >
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Light / Dark Appearance Mode Toggle */}
            {headerShowThemeControls && (
              <button
                type="button"
                onClick={onToggleAppearance}
                aria-label={
                  appearanceMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'
                }
                title={appearanceMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              >
                {appearanceMode === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                )}
              </button>
            )}

            {/* Mobile Theme Palette Modal Trigger */}
            {headerShowThemeControls && (
              <button
                type="button"
                onClick={onOpenThemeModal}
                aria-label="Open Theme & Appearance Settings"
                title="Theme Settings"
                className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--primary)',
                }}
              >
                <Palette className="w-4 h-4" />
              </button>
            )}

            {/* Shopping Bag Button with Cart Bump Micro-interaction */}
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open shopping bag with ${cartCount} items`}
              className={`px-3 sm:px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 btn-luxury active:scale-95 ${
                isCartBumping ? 'bag-badge-bump ring-2 ring-[var(--accent)] ring-offset-1' : ''
              }`}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Bag</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold tabular-nums transition-transform ${
                  isCartBumping ? 'scale-125' : ''
                }`}
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#1b1114',
                }}
              >
                {cartCount}
              </span>
            </button>

            {/* Subtle Merchant Workspace Icon Trigger */}
            <button
              type="button"
              onClick={onOpenMerchant}
              aria-label={isMerchantAuthenticated ? 'Open Merchant Workspace' : 'Merchant Login'}
              title={isMerchantAuthenticated ? 'Open Merchant Workspace' : 'Merchant Login'}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center transition-all opacity-80 hover:opacity-100 cursor-pointer shrink-0 btn-luxury active:scale-95"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Compact Mobile Search Bar */}
        <div className="md:hidden px-3 pb-2">
          <div
            className="flex items-center rounded-lg px-3 py-1.5 border w-full focus-within:border-[var(--primary)] transition-colors"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--border)',
            }}
          >
            <Search
              className="w-3.5 h-3.5 mr-2 shrink-0"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search sarees, kurtis, festive wear..."
              aria-label="Search ethnic wear catalog"
              className="bg-transparent text-xs w-full outline-none min-w-0"
              style={{ color: 'var(--text-main)' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search query"
                className="cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer with smooth slide & fade */}
        {isMobileMenuOpen && (
          <div
            className="xl:hidden border-t px-4 py-3 space-y-2 animate-fadeIn transition-all duration-300"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--primary)' }}>
              Curated Collections
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      onCategoryChange(cat);
                      setIsMobileMenuOpen(false);
                      scrollToCatalog();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
                    style={{
                      backgroundColor: isActive ? 'var(--primary)' : 'var(--surface-elevated)',
                      color: isActive ? 'var(--btn-text)' : 'var(--text-main)',
                      border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    {cat === 'All' ? 'Shop All' : cat}
                  </button>
                );
              })}
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)' }}>
              <a
                href="#story"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:underline py-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Our Heritage & Artisans →
              </a>
              {whatsappClean && (
                <a
                  href={`https://wa.me/${whatsappClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 py-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Stylist</span>
                </a>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. MERCHANT-CONFIGURABLE HOMEPAGE SECTIONS IN ORDER */}
      {orderedHomepageSections.map((section) => renderHomepageSection(section))}
    </div>
  );
};
