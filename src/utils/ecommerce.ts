export interface Product {
  id: string;
  name: string;
  category: 'Kurtis' | 'Sarees' | 'Suits' | 'Festive' | string;
  price: number;
  old_price?: number;
  stock: number;
  image_url: string;
  tag?: string;
  fabric?: string;
  created_at?: string;
}

export interface CartItem {
  id: string;
  qty: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  pincode?: string;
  city?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  customer_details: CustomerDetails;
  items: OrderItem[];
  status: 'Pending UPI Payment' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
  payment_method: 'UPI' | 'COD' | 'RAZORPAY';
  upi_ref_id?: string;
  razorpay_payment_id?: string;
  total: number;
  created_at: string;
}

export interface UpiParams {
  vpa: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
  transactionRef?: string;
}

/**
 * Generates an official NPCI compliant UPI deep-link URI.
 */
export function generateUpiUri({
  vpa,
  payeeName,
  amount,
  transactionNote,
  transactionRef,
}: UpiParams): string {
  if (!vpa || !vpa.includes('@')) {
    throw new Error('Invalid UPI VPA address');
  }
  if (amount <= 0) {
    throw new Error('UPI transaction amount must be greater than 0');
  }

  const encodedName = encodeURIComponent(payeeName);
  const encodedNote = encodeURIComponent(transactionNote);
  const formattedAmount = amount.toFixed(2);
  const refPart = transactionRef ? `&tr=${encodeURIComponent(transactionRef)}` : '';

  return `upi://pay?pa=${vpa}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}${refPart}`;
}

/**
 * Validates Indian 10-digit phone number
 */
export function validateIndianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-+]/g, '');
  // Match standard 10 digit Indian mobile starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(cleanPhone.slice(-10));
}

/**
 * Validates customer details form submission
 */
export function validateCustomerDetails(details: CustomerDetails): { valid: boolean; error?: string } {
  if (!details.name || details.name.trim().length < 2) {
    return { valid: false, error: 'Please enter your full name (at least 2 characters)' };
  }
  if (!details.phone || !validateIndianPhone(details.phone)) {
    return { valid: false, error: 'Please enter a valid 10-digit Indian mobile number' };
  }
  if (!details.address || details.address.trim().length < 8) {
    return { valid: false, error: 'Please provide a complete delivery address with PIN code' };
  }
  return { valid: true };
}

/**
 * Filter products catalog by category and search query
 */
export function filterProducts(
  products: Product[],
  category: string,
  searchQuery: string
): Product[] {
  const query = searchQuery.trim().toLowerCase();
  return products.filter((p) => {
    const matchesCategory = category === 'All' || p.category.toLowerCase() === category.toLowerCase();
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
}

/**
 * Calculate cart subtotal, item count, and shipping fee
 */
export function calculateCartSummary(
  cart: CartItem[],
  products: Product[],
  customFreeShippingThreshold?: number,
  customStandardShippingFee?: number
): {
  subtotal: number;
  itemCount: number;
  shipping: number;
  total: number;
  freeShippingQualified: boolean;
  freeShippingThreshold: number;
} {
  const FREE_SHIPPING_THRESHOLD =
    typeof customFreeShippingThreshold === 'number' &&
    Number.isFinite(customFreeShippingThreshold) &&
    customFreeShippingThreshold >= 0
      ? customFreeShippingThreshold
      : 1999;
  const STANDARD_SHIPPING_FEE =
    typeof customStandardShippingFee === 'number' &&
    Number.isFinite(customStandardShippingFee) &&
    customStandardShippingFee >= 0
      ? customStandardShippingFee
      : 99;

  const productMap = new Map<string, Product>();
  products.forEach((p) => productMap.set(p.id, p));

  let subtotal = 0;
  let itemCount = 0;

  for (const item of cart) {
    const prod = productMap.get(item.id);
    if (prod) {
      subtotal += prod.price * item.qty;
      itemCount += item.qty;
    }
  }

  const freeShippingQualified = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0;
  const shipping = subtotal === 0 ? 0 : freeShippingQualified ? 0 : STANDARD_SHIPPING_FEE;
  const total = subtotal + shipping;

  return {
    subtotal,
    itemCount,
    shipping,
    total,
    freeShippingQualified,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  };
}

/**
 * Format Indian Rupee currency with commas
 */
export function formatINR(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

/**
 * Checks whether a valid public Razorpay Key ID (rzp_test_... or rzp_live_...) is configured
 * and enabled, ensuring fake or placeholder strings are rejected.
 */
export function isRazorpayConfigured(keyId?: string | null, enabled: boolean = true): boolean {
  if (!enabled || !keyId) return false;
  const trimmed = keyId.trim();
  if (!trimmed) return false;
  // Valid Razorpay public Key IDs start with rzp_test_ or rzp_live_ followed by alphanumeric characters
  return /^rzp_(test|live)_[A-Za-z0-9]{6,}$/.test(trimmed);
}

/**
 * Determines the initial order status without marking orders as paid unless verified.
 * - RAZORPAY requires a non-empty verified razorpayPaymentId
 * - UPI starts as 'Pending UPI Payment' until merchant verifies UTR
 * - COD starts as 'Confirmed' (to be paid upon doorstep delivery)
 */
export function resolveInitialOrderStatus(
  paymentMethod: Order['payment_method'],
  razorpayPaymentId?: string
): Order['status'] {
  if (paymentMethod === 'RAZORPAY') {
    if (!razorpayPaymentId || !razorpayPaymentId.trim()) {
      throw new Error('Verified Razorpay payment ID is required for online payment orders.');
    }
    return 'Confirmed';
  }
  if (paymentMethod === 'UPI') {
    return 'Pending UPI Payment';
  }
  return 'Confirmed';
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string;
  title: string;
  subtitle: string;
  badge?: string;
  ctaText: string;
  ctaLink: string;
  categoryFilter?: 'All' | 'Kurtis' | 'Sarees' | 'Suits' | 'Festive' | string;
  overlayOpacity?: number;
  enabled: boolean;
  order: number;
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    imageUrl:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85',
    mobileImageUrl:
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80',
    badge: 'The Festive Edit · 2026',
    title: 'Timeless Indian silhouettes, woven with ishq.',
    subtitle:
      'Handcrafted Chanderi silk anarkalis, heirloom Banarasi drapes, and breathable mulmul kurtis tailored for celebration and everyday grace.',
    ctaText: 'Explore Collection',
    ctaLink: '#shop',
    categoryFilter: 'All',
    overlayOpacity: 75,
    enabled: true,
    order: 0,
  },
  {
    id: 'slide-2',
    imageUrl:
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1600&q=85',
    mobileImageUrl:
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=80',
    badge: 'Varanasi Heritage Weaves',
    title: 'Heirloom Banarasi Katan Silks & Zari Drapes',
    subtitle:
      'Lustrous handwoven silk sarees finished with intricate gold zari pallus for weddings and festive evenings.',
    ctaText: 'Shop Sarees',
    ctaLink: '#shop',
    categoryFilter: 'Sarees',
    overlayOpacity: 75,
    enabled: true,
    order: 1,
  },
  {
    id: 'slide-3',
    imageUrl:
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1600&q=85',
    mobileImageUrl:
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=80',
    badge: 'Jaipuri Artisanal Craft',
    title: 'Effortless Mulmul Kurtis & Chanderi Suit Sets',
    subtitle:
      'Soft hand-block printed cottons and delicate organza dupattas crafted in small batches by master karigars.',
    ctaText: 'Explore Kurtis',
    ctaLink: '#shop',
    categoryFilter: 'Kurtis',
    overlayOpacity: 75,
    enabled: true,
    order: 2,
  },
];

export type HomepageSectionId =
  | 'hero'
  | 'categories'
  | 'bestsellers'
  | 'newArrivals'
  | 'promoBanner'
  | 'story'
  | 'collections'
  | 'testimonials'
  | 'newsletter';

export interface HomepageSectionConfig {
  id: HomepageSectionId;
  label: string;
  description: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = [
  {
    id: 'hero',
    label: 'Hero Image Slideshow',
    description: 'Full-width editorial fashion banner with text overlay and CTA buttons',
    enabled: true,
    order: 0,
  },
  {
    id: 'categories',
    label: 'Featured Categories',
    description: 'Visual category showcase cards for Kurtis, Sarees, Suit Sets, and Festive Wear',
    enabled: true,
    order: 1,
  },
  {
    id: 'bestsellers',
    label: 'Bestsellers & Product Catalog',
    description: 'Searchable, filterable boutique catalog with live inventory and Add to Bag',
    enabled: true,
    order: 2,
  },
  {
    id: 'newArrivals',
    label: 'New Arrivals Spotlight',
    description: 'Dedicated horizontal showcase highlighting recently added and seasonal pieces',
    enabled: false,
    order: 3,
  },
  {
    id: 'promoBanner',
    label: 'Seasonal Promotional Banner',
    description: 'Editorial mid-page campaign banner for festive offers or bridal capsules',
    enabled: false,
    order: 4,
  },
  {
    id: 'story',
    label: 'Brand Story & Policies',
    description: 'Artisanal craft promise, heritage story, and live delivery/return policies',
    enabled: true,
    order: 5,
  },
  {
    id: 'collections',
    label: 'Additional Curated Collections',
    description: 'Specialized regional craft edits (Banarasi Zari, Mulmul, Festive Couture)',
    enabled: true,
    order: 6,
  },
  {
    id: 'testimonials',
    label: 'Customer Testimonials',
    description: 'Verified patron reviews and boutique craft appreciation notes',
    enabled: false,
    order: 7,
  },
  {
    id: 'newsletter',
    label: 'Boutique Newsletter & Privé List',
    description: 'Customer sign-up section for new collection previews and WhatsApp updates',
    enabled: false,
    order: 8,
  },
];

export interface CustomColorOverrides {
  primary: string;
  accent: string;
  bg: string;
  surface: string;
  textMain: string;
  buttonBg: string;
  buttonText: string;
  border: string;
}

export interface PromoBannerConfig {
  badge: string;
  heading: string;
  subtext: string;
  ctaText: string;
  ctaCategory: string;
  imageUrl: string;
}

export interface StoreTestimonial {
  id: string;
  customerName: string;
  location: string;
  quote: string;
  productBought?: string;
  rating: number;
}

export type HeadingFontChoice =
  | 'Cormorant Garamond'
  | 'Playfair Display'
  | 'Georgia'
  | 'Plus Jakarta Sans';

export type BodyFontChoice = 'Plus Jakarta Sans' | 'Noto Sans' | 'System UI' | 'Georgia';

export type FontScaleChoice = 'compact' | 'standard' | 'large';
export type BorderRadiusChoice = 'sharp' | 'subtle' | 'rounded' | 'pill';
export type ButtonStyleChoice = 'solid' | 'outline' | 'pill' | 'soft';

export const DEFAULT_CUSTOM_COLORS: CustomColorOverrides = {
  primary: '#70283b',
  accent: '#b78a4b',
  bg: '#fbf7f0',
  surface: '#ffffff',
  textMain: '#231c1c',
  buttonBg: '#70283b',
  buttonText: '#ffffff',
  border: '#e6dad4',
};

export const DEFAULT_PROMO_BANNER: PromoBannerConfig = {
  badge: 'Limited Festive Capsule',
  heading: 'Complimentary Custom Tassel Finishing on All Banarasi Sarees',
  subtext:
    'Hand-knotted silk pallu tassels and custom fall-pico finishing included on every heirloom saree order this season.',
  ctaText: 'Explore Sarees',
  ctaCategory: 'Sarees',
  imageUrl:
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1400&q=80',
};

export const DEFAULT_TESTIMONIALS: StoreTestimonial[] = [
  {
    id: 'test-1',
    customerName: 'Meera Krishnan',
    location: 'Mumbai',
    quote:
      'The Banarasi Katan silk drape exceeded every expectation. The zari work is luminous and the fall was finished to perfection.',
    productBought: 'Noor Banarasi Katan Silk Saree',
    rating: 5,
  },
  {
    id: 'test-2',
    customerName: 'Roshni Singhania',
    location: 'New Delhi',
    quote:
      'So breathable and soft! The hand-block mulmul kurti feels featherlight even in peak summer and washes beautifully.',
    productBought: 'Mogra Pure Cotton Daily Kurti',
    rating: 5,
  },
  {
    id: 'test-3',
    customerName: 'Nandini Rao',
    location: 'Bengaluru',
    quote:
      'Ordered the Gulabi Noor Anarkali for a family sangeet. Dispatch was prompt and the gota patti detailing is genuinely artisanal.',
    productBought: 'Gulabi Noor Anarkali Set',
    rating: 5,
  },
];

export interface StoreSettings {
  storeName: string;
  tagline: string;
  brandDescription: string;
  announcementText: string;
  announcementEnabled: boolean;
  logoUrl: string;
  faviconUrl: string;
  phone: string;
  whatsapp: string;
  email: string;
  weekdayHours: string;
  sundayHours: string;
  address: string;
  mapsUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  deliveryPolicy: string;
  returnPolicy: string;
  codEnabled: boolean;
  upiEnabled: boolean;
  upiVpa: string;
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  whatsappOrderEnabled: boolean;
  heroSlides: HeroSlide[];
  heroAutoplay: boolean;
  heroIntervalMs: number;
  // Advanced Customization — Theme, Colors & Typography
  themeId: string;
  defaultAppearance: 'system' | 'light' | 'dark';
  showThemeSelectorInHeader: boolean;
  customColorsEnabled: boolean;
  customColors: CustomColorOverrides;
  headingFont: HeadingFontChoice;
  bodyFont: BodyFontChoice;
  headingScale: FontScaleChoice;
  bodyScale: FontScaleChoice;
  borderRadiusStyle: BorderRadiusChoice;
  buttonStyle: ButtonStyleChoice;
  // Homepage Layout & Section Content
  homepageSections: HomepageSectionConfig[];
  categoriesTitle: string;
  categoriesSubtitle: string;
  bestsellersTitle: string;
  bestsellersSubtitle: string;
  newArrivalsTitle: string;
  newArrivalsSubtitle: string;
  promoBanner: PromoBannerConfig;
  storyHeading: string;
  storyQuote: string;
  testimonials: StoreTestimonial[];
  newsletterHeading: string;
  newsletterSubtext: string;
  // Catalog & Product Display Settings
  gridColumnsDesktop: 3 | 4;
  showStockCount: boolean;
  showDiscountPrice: boolean;
  showFabricInfo: boolean;
  showWishlistButton: boolean;
  showWhatsappInquiry: boolean;
  freeShippingThreshold: number;
  standardShippingFee: number;
  // Footer Visibility Settings
  showFooterSocial: boolean;
  showFooterHours: boolean;
  showFooterMap: boolean;
  showFooterPolicies: boolean;
  updatedAt?: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Indian Ishq Collection',
  tagline: 'Timeless Indian silhouettes, woven with ishq.',
  brandDescription:
    'Thoughtfully curated ethnic wear for festive celebrations and everyday grace. Discover hand-block mulmul kurtis, pure Banarasi Katan silk sarees, and artisanal Chanderi suit sets.',
  announcementText:
    'Complimentary express shipping on orders above ₹1,999 · Handcrafted Indian Ethnic Wear',
  announcementEnabled: true,
  logoUrl: '',
  faviconUrl: '',
  phone: '+91 98765 43210',
  whatsapp: '919876543210',
  email: 'support@indianishqcollection.com',
  weekdayHours: '10:00 AM – 8:00 PM IST',
  sundayHours: 'By Appointment & Online Orders',
  address: 'Shop No. 12, Heritage Silk Arcade, Civil Lines, New Delhi - 110001, India',
  mapsUrl: 'https://maps.google.com/?q=Civil+Lines+New+Delhi',
  instagramUrl: 'https://instagram.com/indianishqcollection',
  facebookUrl: 'https://facebook.com/indianishqcollection',
  twitterUrl: 'https://twitter.com/indianishq',
  deliveryPolicy:
    'Dispatched within 24–48 hours from our Jaipur & New Delhi boutiques. Complimentary express delivery across India on orders above ₹1,999 (₹99 standard shipping below ₹1,999). Estimated delivery in 3–5 business days.',
  returnPolicy:
    'Easy 7-day size exchanges and returns on unworn pieces with original tags intact. Custom-tailored or altered blouses are eligible for store credit.',
  codEnabled: true,
  upiEnabled: true,
  upiVpa: 'indianishq@okaxis',
  razorpayEnabled: true,
  razorpayKeyId: '',
  whatsappOrderEnabled: true,
  heroSlides: DEFAULT_HERO_SLIDES.map((s) => ({ ...s })),
  heroAutoplay: true,
  heroIntervalMs: 5000,
  themeId: 'burgundy',
  defaultAppearance: 'system',
  showThemeSelectorInHeader: true,
  customColorsEnabled: false,
  customColors: { ...DEFAULT_CUSTOM_COLORS },
  headingFont: 'Cormorant Garamond',
  bodyFont: 'Plus Jakarta Sans',
  headingScale: 'standard',
  bodyScale: 'standard',
  borderRadiusStyle: 'rounded',
  buttonStyle: 'solid',
  homepageSections: DEFAULT_HOMEPAGE_SECTIONS.map((sec) => ({ ...sec })),
  categoriesTitle: 'Featured Categories',
  categoriesSubtitle: 'Select a silhouette to filter the live boutique collection below',
  bestsellersTitle: 'Bestsellers & Featured Pieces',
  bestsellersSubtitle:
    'Handcrafted silhouettes tailored in small batches for lasting comfort and grace.',
  newArrivalsTitle: 'New Season Arrivals',
  newArrivalsSubtitle:
    'Freshly woven silhouettes and limited-edition festive drapes just added to the boutique.',
  promoBanner: { ...DEFAULT_PROMO_BANNER },
  storyHeading: 'Clothes with a heart of their own.',
  storyQuote: '“A little tradition. A lot of you.”',
  testimonials: DEFAULT_TESTIMONIALS.map((t) => ({ ...t })),
  newsletterHeading: 'Join the Indian Ishq Privé List',
  newsletterSubtext:
    'Receive early access to small-batch Banarasi weaves, seasonal Chanderi edits, and private boutique previews.',
  gridColumnsDesktop: 4,
  showStockCount: true,
  showDiscountPrice: true,
  showFabricInfo: true,
  showWishlistButton: true,
  showWhatsappInquiry: true,
  freeShippingThreshold: 1999,
  standardShippingFee: 99,
  showFooterSocial: true,
  showFooterHours: true,
  showFooterMap: true,
  showFooterPolicies: true,
};

/**
 * Sanitizes and normalizes an array of HeroSlide objects.
 * Falls back to `fallbackSlides` if the input is missing or contains no valid image URLs.
 */
export function sanitizeHeroSlides(
  slides: unknown,
  fallbackSlides: HeroSlide[] = DEFAULT_HERO_SLIDES
): HeroSlide[] {
  if (!Array.isArray(slides) || slides.length === 0) {
    return fallbackSlides.map((s, idx) => ({ ...s, order: idx }));
  }

  const validSlides: HeroSlide[] = [];

  for (let i = 0; i < slides.length; i++) {
    const raw = slides[i];
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Partial<HeroSlide>;
    const imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
    if (!imageUrl) continue;

    const fallback = fallbackSlides[i] || fallbackSlides[0] || DEFAULT_HERO_SLIDES[0];
    const mobileImageUrl =
      typeof item.mobileImageUrl === 'string' ? item.mobileImageUrl.trim() : '';
    const rawOpacity =
      typeof item.overlayOpacity === 'number' && Number.isFinite(item.overlayOpacity)
        ? item.overlayOpacity
        : fallback.overlayOpacity ?? 75;

    validSlides.push({
      id:
        typeof item.id === 'string' && item.id.trim().length > 0
          ? item.id.trim()
          : `slide-${i + 1}-${Date.now()}`,
      imageUrl,
      ...(mobileImageUrl ? { mobileImageUrl } : {}),
      title:
        typeof item.title === 'string' && item.title.trim().length > 0
          ? item.title.trim()
          : fallback.title,
      subtitle:
        typeof item.subtitle === 'string' && item.subtitle.trim().length > 0
          ? item.subtitle.trim()
          : fallback.subtitle,
      badge:
        typeof item.badge === 'string'
          ? item.badge.trim()
          : fallback.badge || 'Signature Collection',
      ctaText:
        typeof item.ctaText === 'string' && item.ctaText.trim().length > 0
          ? item.ctaText.trim()
          : 'Explore Collection',
      ctaLink:
        typeof item.ctaLink === 'string' && item.ctaLink.trim().length > 0
          ? item.ctaLink.trim()
          : '#shop',
      categoryFilter:
        typeof item.categoryFilter === 'string' && item.categoryFilter.trim().length > 0
          ? item.categoryFilter.trim()
          : 'All',
      overlayOpacity: Math.min(90, Math.max(25, Math.round(rawOpacity))),
      enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
      order: typeof item.order === 'number' && Number.isFinite(item.order) ? item.order : i,
    });
  }

  if (validSlides.length === 0) {
    return fallbackSlides.map((s, idx) => ({ ...s, order: idx }));
  }

  return validSlides
    .sort((a, b) => a.order - b.order)
    .map((s, idx) => ({ ...s, order: idx }));
}

/**
 * Reorders hero slides by moving the item at `fromIndex` to `toIndex` and re-indexing `.order`.
 */
export function reorderHeroSlides(
  slides: HeroSlide[],
  fromIndex: number,
  toIndex: number
): HeroSlide[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= slides.length ||
    toIndex >= slides.length ||
    fromIndex === toIndex
  ) {
    return slides.map((s, idx) => ({ ...s, order: idx }));
  }
  const next = slides.map((s) => ({ ...s }));
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((s, idx) => ({ ...s, order: idx }));
}

/**
 * Sanitizes and normalizes homepage section configurations, ensuring all known sections
 * exist in a deterministic order and that essential catalog/navigation cannot break.
 */
export function sanitizeHomepageSections(
  sections?: unknown,
  fallbackSections: HomepageSectionConfig[] = DEFAULT_HOMEPAGE_SECTIONS
): HomepageSectionConfig[] {
  const defaultMap = new Map<HomepageSectionId, HomepageSectionConfig>();
  fallbackSections.forEach((sec) => defaultMap.set(sec.id, { ...sec }));

  if (!Array.isArray(sections) || sections.length === 0) {
    return fallbackSections.map((sec, idx) => ({ ...sec, order: idx }));
  }

  const seen = new Set<HomepageSectionId>();
  const result: HomepageSectionConfig[] = [];

  for (let i = 0; i < sections.length; i++) {
    const raw = sections[i];
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Partial<HomepageSectionConfig>;
    if (!item.id || !defaultMap.has(item.id as HomepageSectionId)) continue;
    const id = item.id as HomepageSectionId;
    if (seen.has(id)) continue;
    seen.add(id);

    const def = defaultMap.get(id)!;
    result.push({
      id,
      label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : def.label,
      description:
        typeof item.description === 'string' && item.description.trim()
          ? item.description.trim()
          : def.description,
      enabled: typeof item.enabled === 'boolean' ? item.enabled : def.enabled,
      order: typeof item.order === 'number' && Number.isFinite(item.order) ? item.order : i,
    });
  }

  // Append any missing default sections at the end
  for (const def of fallbackSections) {
    if (!seen.has(def.id)) {
      result.push({ ...def, order: result.length });
    }
  }

  const sorted = result
    .sort((a, b) => a.order - b.order)
    .map((sec, idx) => ({ ...sec, order: idx }));

  // Safeguard: never allow all primary shopping sections to be disabled simultaneously;
  // if every single section is disabled, keep 'bestsellers' (catalog) enabled so the store remains functional.
  if (!sorted.some((s) => s.enabled)) {
    return sorted.map((s) => (s.id === 'bestsellers' || s.id === 'hero' ? { ...s, enabled: true } : s));
  }

  return sorted;
}

/**
 * Reorders homepage sections by moving the section at `fromIndex` to `toIndex`.
 */
export function reorderHomepageSections(
  sections: HomepageSectionConfig[],
  fromIndex: number,
  toIndex: number
): HomepageSectionConfig[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= sections.length ||
    toIndex >= sections.length ||
    fromIndex === toIndex
  ) {
    return sections.map((s, idx) => ({ ...s, order: idx }));
  }
  const next = sections.map((s) => ({ ...s }));
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((s, idx) => ({ ...s, order: idx }));
}

/**
 * Returns the active (enabled) hero slides for the storefront.
 * If all slides are disabled or empty, gracefully returns a single fallback slide
 * using the merchant's coverPhoto (if provided) or the primary default slide.
 */
export function getActiveHeroSlides(
  settings?: Partial<Pick<StoreSettings, 'heroSlides' | 'tagline' | 'brandDescription' | 'storeName'>> | null,
  legacyCoverPhoto?: string
): HeroSlide[] {
  const allSlides = sanitizeHeroSlides(settings?.heroSlides, DEFAULT_HERO_SLIDES);
  const enabledSlides = allSlides.filter((s) => s.enabled && s.imageUrl.trim().length > 0);

  if (enabledSlides.length > 0) {
    // If legacyCoverPhoto is set and the first slide still has the default Unsplash URL, let legacyCoverPhoto override slide 1
    if (
      legacyCoverPhoto &&
      legacyCoverPhoto.trim().length > 0 &&
      enabledSlides[0].imageUrl === DEFAULT_HERO_SLIDES[0].imageUrl
    ) {
      return [
        { ...enabledSlides[0], imageUrl: legacyCoverPhoto.trim() },
        ...enabledSlides.slice(1),
      ];
    }
    return enabledSlides;
  }

  // Fallback single slide if merchant disabled all slides
  return [
    {
      id: 'fallback-slide',
      imageUrl:
        legacyCoverPhoto && legacyCoverPhoto.trim().length > 0
          ? legacyCoverPhoto.trim()
          : DEFAULT_HERO_SLIDES[0].imageUrl,
      badge: `${settings?.storeName || DEFAULT_STORE_SETTINGS.storeName} · Handcrafted Ethnic Wear`,
      title: settings?.tagline || DEFAULT_STORE_SETTINGS.tagline,
      subtitle: settings?.brandDescription || DEFAULT_STORE_SETTINGS.brandDescription,
      ctaText: 'Explore Collection',
      ctaLink: '#shop',
      categoryFilter: 'All',
      overlayOpacity: 75,
      enabled: true,
      order: 0,
    },
  ];
}

/**
 * Safely merges partial settings with existing/default settings so blank strings
 * never accidentally overwrite required store fields.
 */
export function mergeAndSanitizeStoreSettings(
  incoming?: Partial<StoreSettings> | null,
  fallback: StoreSettings = DEFAULT_STORE_SETTINGS
): StoreSettings {
  if (!incoming || typeof incoming !== 'object') {
    return {
      ...fallback,
      heroSlides: sanitizeHeroSlides(fallback.heroSlides, DEFAULT_HERO_SLIDES),
      homepageSections: sanitizeHomepageSections(
        fallback.homepageSections,
        DEFAULT_HOMEPAGE_SECTIONS
      ),
    };
  }

  const pickNonBlank = (val: unknown, fb: string): string => {
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
    return fb;
  };

  const pickOptionalString = (val: unknown, fb: string): string => {
    if (typeof val === 'string') {
      return val.trim();
    }
    return fb;
  };

  const pickBool = (val: unknown, fb: boolean): boolean =>
    typeof val === 'boolean' ? val : fb;

  const pickHexColor = (val: unknown, fb: string): string => {
    if (typeof val === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(val.trim())) {
      return val.trim();
    }
    return fb;
  };

  const codEnabled = pickBool(incoming.codEnabled, fallback.codEnabled);
  const upiEnabled = pickBool(incoming.upiEnabled, fallback.upiEnabled);
  const razorpayEnabled = pickBool(incoming.razorpayEnabled, fallback.razorpayEnabled);
  const whatsappOrderEnabled = pickBool(
    incoming.whatsappOrderEnabled,
    fallback.whatsappOrderEnabled ?? true
  );
  const announcementEnabled = pickBool(
    incoming.announcementEnabled,
    fallback.announcementEnabled ?? true
  );

  const heroAutoplay = pickBool(incoming.heroAutoplay, fallback.heroAutoplay ?? true);

  const rawInterval =
    typeof incoming.heroIntervalMs === 'number' && Number.isFinite(incoming.heroIntervalMs)
      ? incoming.heroIntervalMs
      : fallback.heroIntervalMs || 5000;
  const heroIntervalMs = Math.min(15000, Math.max(2500, Math.round(rawInterval)));

  const heroSlides = Array.isArray(incoming.heroSlides)
    ? sanitizeHeroSlides(incoming.heroSlides, fallback.heroSlides || DEFAULT_HERO_SLIDES)
    : sanitizeHeroSlides(fallback.heroSlides, DEFAULT_HERO_SLIDES);

  const homepageSections = Array.isArray(incoming.homepageSections)
    ? sanitizeHomepageSections(
        incoming.homepageSections,
        fallback.homepageSections || DEFAULT_HOMEPAGE_SECTIONS
      )
    : sanitizeHomepageSections(fallback.homepageSections, DEFAULT_HOMEPAGE_SECTIONS);

  const fbColors = fallback.customColors || DEFAULT_CUSTOM_COLORS;
  const inColors =
    incoming.customColors && typeof incoming.customColors === 'object'
      ? incoming.customColors
      : fbColors;

  const customColors: CustomColorOverrides = {
    primary: pickHexColor(inColors.primary, fbColors.primary),
    accent: pickHexColor(inColors.accent, fbColors.accent),
    bg: pickHexColor(inColors.bg, fbColors.bg),
    surface: pickHexColor(inColors.surface, fbColors.surface),
    textMain: pickHexColor(inColors.textMain, fbColors.textMain),
    buttonBg: pickHexColor(inColors.buttonBg, fbColors.buttonBg),
    buttonText: pickHexColor(inColors.buttonText, fbColors.buttonText),
    border: pickHexColor(inColors.border, fbColors.border),
  };

  const validHeadingFonts: HeadingFontChoice[] = [
    'Cormorant Garamond',
    'Playfair Display',
    'Georgia',
    'Plus Jakarta Sans',
  ];
  const headingFont: HeadingFontChoice = validHeadingFonts.includes(
    incoming.headingFont as HeadingFontChoice
  )
    ? (incoming.headingFont as HeadingFontChoice)
    : fallback.headingFont || 'Cormorant Garamond';

  const validBodyFonts: BodyFontChoice[] = [
    'Plus Jakarta Sans',
    'Noto Sans',
    'System UI',
    'Georgia',
  ];
  const bodyFont: BodyFontChoice = validBodyFonts.includes(incoming.bodyFont as BodyFontChoice)
    ? (incoming.bodyFont as BodyFontChoice)
    : fallback.bodyFont || 'Plus Jakarta Sans';

  const validScales: FontScaleChoice[] = ['compact', 'standard', 'large'];
  const headingScale: FontScaleChoice = validScales.includes(
    incoming.headingScale as FontScaleChoice
  )
    ? (incoming.headingScale as FontScaleChoice)
    : fallback.headingScale || 'standard';

  const bodyScale: FontScaleChoice = validScales.includes(incoming.bodyScale as FontScaleChoice)
    ? (incoming.bodyScale as FontScaleChoice)
    : fallback.bodyScale || 'standard';

  const validRadii: BorderRadiusChoice[] = ['sharp', 'subtle', 'rounded', 'pill'];
  const borderRadiusStyle: BorderRadiusChoice = validRadii.includes(
    incoming.borderRadiusStyle as BorderRadiusChoice
  )
    ? (incoming.borderRadiusStyle as BorderRadiusChoice)
    : fallback.borderRadiusStyle || 'rounded';

  const validButtonStyles: ButtonStyleChoice[] = ['solid', 'outline', 'pill', 'soft'];
  const buttonStyle: ButtonStyleChoice = validButtonStyles.includes(
    incoming.buttonStyle as ButtonStyleChoice
  )
    ? (incoming.buttonStyle as ButtonStyleChoice)
    : fallback.buttonStyle || 'solid';

  const validAppearances = ['system', 'light', 'dark'] as const;
  const defaultAppearance = validAppearances.includes(incoming.defaultAppearance as any)
    ? (incoming.defaultAppearance as 'system' | 'light' | 'dark')
    : fallback.defaultAppearance || 'system';

  const fbPromo = fallback.promoBanner || DEFAULT_PROMO_BANNER;
  const inPromo =
    incoming.promoBanner && typeof incoming.promoBanner === 'object'
      ? incoming.promoBanner
      : fbPromo;
  const promoBanner: PromoBannerConfig = {
    badge: pickNonBlank(inPromo.badge, fbPromo.badge),
    heading: pickNonBlank(inPromo.heading, fbPromo.heading),
    subtext: pickNonBlank(inPromo.subtext, fbPromo.subtext),
    ctaText: pickNonBlank(inPromo.ctaText, fbPromo.ctaText),
    ctaCategory: pickNonBlank(inPromo.ctaCategory, fbPromo.ctaCategory),
    imageUrl: pickNonBlank(inPromo.imageUrl, fbPromo.imageUrl),
  };

  const testimonials: StoreTestimonial[] = Array.isArray(incoming.testimonials)
    ? incoming.testimonials
        .filter(
          (t) =>
            t &&
            typeof t === 'object' &&
            typeof t.customerName === 'string' &&
            t.customerName.trim().length > 0 &&
            typeof t.quote === 'string' &&
            t.quote.trim().length > 0
        )
        .map((t, idx) => ({
          id:
            typeof t.id === 'string' && t.id.trim()
              ? t.id.trim()
              : `testimonial-${idx + 1}-${Date.now()}`,
          customerName: t.customerName.trim(),
          location: typeof t.location === 'string' ? t.location.trim() : 'India',
          quote: t.quote.trim(),
          productBought: typeof t.productBought === 'string' ? t.productBought.trim() : '',
          rating:
            typeof t.rating === 'number' && Number.isFinite(t.rating)
              ? Math.min(5, Math.max(1, Math.round(t.rating)))
              : 5,
        }))
    : fallback.testimonials || DEFAULT_TESTIMONIALS;

  const gridColumnsDesktop: 3 | 4 =
    incoming.gridColumnsDesktop === 3 || incoming.gridColumnsDesktop === 4
      ? incoming.gridColumnsDesktop
      : fallback.gridColumnsDesktop || 4;

  const freeShippingThreshold =
    typeof incoming.freeShippingThreshold === 'number' &&
    Number.isFinite(incoming.freeShippingThreshold) &&
    incoming.freeShippingThreshold >= 0
      ? Math.round(incoming.freeShippingThreshold)
      : fallback.freeShippingThreshold ?? 1999;

  const standardShippingFee =
    typeof incoming.standardShippingFee === 'number' &&
    Number.isFinite(incoming.standardShippingFee) &&
    incoming.standardShippingFee >= 0
      ? Math.round(incoming.standardShippingFee)
      : fallback.standardShippingFee ?? 99;

  return {
    storeName: pickNonBlank(incoming.storeName, fallback.storeName),
    tagline: pickNonBlank(incoming.tagline, fallback.tagline),
    brandDescription: pickNonBlank(incoming.brandDescription, fallback.brandDescription),
    announcementText: pickNonBlank(incoming.announcementText, fallback.announcementText),
    announcementEnabled,
    logoUrl: pickOptionalString(incoming.logoUrl, fallback.logoUrl),
    faviconUrl: pickOptionalString(incoming.faviconUrl, fallback.faviconUrl || ''),
    phone: pickNonBlank(incoming.phone, fallback.phone),
    whatsapp: pickNonBlank(incoming.whatsapp, fallback.whatsapp),
    email: pickNonBlank(incoming.email, fallback.email),
    weekdayHours: pickNonBlank(incoming.weekdayHours, fallback.weekdayHours),
    sundayHours: pickNonBlank(incoming.sundayHours, fallback.sundayHours),
    address: pickNonBlank(incoming.address, fallback.address),
    mapsUrl: pickNonBlank(incoming.mapsUrl, fallback.mapsUrl),
    instagramUrl: pickOptionalString(incoming.instagramUrl, fallback.instagramUrl),
    facebookUrl: pickOptionalString(incoming.facebookUrl, fallback.facebookUrl),
    twitterUrl: pickOptionalString(incoming.twitterUrl, fallback.twitterUrl),
    deliveryPolicy: pickNonBlank(incoming.deliveryPolicy, fallback.deliveryPolicy),
    returnPolicy: pickNonBlank(incoming.returnPolicy, fallback.returnPolicy),
    codEnabled,
    upiEnabled,
    upiVpa: pickNonBlank(incoming.upiVpa, fallback.upiVpa),
    razorpayEnabled,
    razorpayKeyId: pickOptionalString(incoming.razorpayKeyId, fallback.razorpayKeyId),
    whatsappOrderEnabled,
    heroSlides,
    heroAutoplay,
    heroIntervalMs,
    themeId: pickNonBlank(incoming.themeId, fallback.themeId || 'burgundy'),
    defaultAppearance,
    showThemeSelectorInHeader: pickBool(
      incoming.showThemeSelectorInHeader,
      fallback.showThemeSelectorInHeader ?? true
    ),
    customColorsEnabled: pickBool(
      incoming.customColorsEnabled,
      fallback.customColorsEnabled ?? false
    ),
    customColors,
    headingFont,
    bodyFont,
    headingScale,
    bodyScale,
    borderRadiusStyle,
    buttonStyle,
    homepageSections,
    categoriesTitle: pickNonBlank(incoming.categoriesTitle, fallback.categoriesTitle),
    categoriesSubtitle: pickNonBlank(incoming.categoriesSubtitle, fallback.categoriesSubtitle),
    bestsellersTitle: pickNonBlank(incoming.bestsellersTitle, fallback.bestsellersTitle),
    bestsellersSubtitle: pickNonBlank(incoming.bestsellersSubtitle, fallback.bestsellersSubtitle),
    newArrivalsTitle: pickNonBlank(incoming.newArrivalsTitle, fallback.newArrivalsTitle),
    newArrivalsSubtitle: pickNonBlank(incoming.newArrivalsSubtitle, fallback.newArrivalsSubtitle),
    promoBanner,
    storyHeading: pickNonBlank(incoming.storyHeading, fallback.storyHeading),
    storyQuote: pickNonBlank(incoming.storyQuote, fallback.storyQuote),
    testimonials,
    newsletterHeading: pickNonBlank(incoming.newsletterHeading, fallback.newsletterHeading),
    newsletterSubtext: pickNonBlank(incoming.newsletterSubtext, fallback.newsletterSubtext),
    gridColumnsDesktop,
    showStockCount: pickBool(incoming.showStockCount, fallback.showStockCount ?? true),
    showDiscountPrice: pickBool(incoming.showDiscountPrice, fallback.showDiscountPrice ?? true),
    showFabricInfo: pickBool(incoming.showFabricInfo, fallback.showFabricInfo ?? true),
    showWishlistButton: pickBool(incoming.showWishlistButton, fallback.showWishlistButton ?? true),
    showWhatsappInquiry: pickBool(
      incoming.showWhatsappInquiry,
      fallback.showWhatsappInquiry ?? true
    ),
    freeShippingThreshold,
    standardShippingFee,
    showFooterSocial: pickBool(incoming.showFooterSocial, fallback.showFooterSocial ?? true),
    showFooterHours: pickBool(incoming.showFooterHours, fallback.showFooterHours ?? true),
    showFooterMap: pickBool(incoming.showFooterMap, fallback.showFooterMap ?? true),
    showFooterPolicies: pickBool(incoming.showFooterPolicies, fallback.showFooterPolicies ?? true),
    ...(incoming.updatedAt || fallback.updatedAt
      ? { updatedAt: incoming.updatedAt || fallback.updatedAt }
      : {}),
  };
}

/**
 * Resolves the default active checkout payment method based on merchant settings.
 */
export function resolveDefaultPaymentMethod(
  settings: Pick<StoreSettings, 'codEnabled' | 'upiEnabled' | 'razorpayEnabled' | 'razorpayKeyId'>
): Order['payment_method'] {
  if (settings.codEnabled) return 'COD';
  if (settings.upiEnabled) return 'UPI';
  if (isRazorpayConfigured(settings.razorpayKeyId, settings.razorpayEnabled)) return 'RAZORPAY';
  return 'COD';
}

export const initialProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Gulabi Noor Anarkali Set',
    category: 'Festive',
    price: 1899,
    old_price: 2299,
    stock: 8,
    image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    tag: 'BESTSELLER',
    fabric: 'Chanderi silk with gota patti detailing',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'prod-002',
    name: 'Mogra Pure Cotton Daily Kurti',
    category: 'Kurtis',
    price: 899,
    old_price: 1099,
    stock: 12,
    image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
    tag: 'EVERYDAY',
    fabric: '100% Breathable Mulmul cotton',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'prod-003',
    name: 'Noor Banarasi Katan Silk Saree',
    category: 'Sarees',
    price: 2499,
    old_price: 2999,
    stock: 4,
    image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
    tag: 'FESTIVE EDIT',
    fabric: 'Banarasi Katan Silk with gold zari pallu',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'prod-004',
    name: 'Meher Powder Blue Chanderi Suit',
    category: 'Suits',
    price: 1599,
    old_price: 1899,
    stock: 7,
    image_url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
    tag: 'NEW ARRIVAL',
    fabric: 'Chanderi cotton with organza dupatta',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'prod-005',
    name: 'Rani Gul Embroidered Straight Kurti',
    category: 'Kurtis',
    price: 1199,
    old_price: 1499,
    stock: 5,
    image_url: 'https://images.unsplash.com/photo-1583391733975-04535df2b378?auto=format&fit=crop&w=800&q=80',
    tag: 'HAND PICKED',
    fabric: 'Rayon flex with hand zardozi yoke',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'prod-006',
    name: 'Sunehri Shaam Velvet Lehenga Set',
    category: 'Festive',
    price: 3999,
    old_price: 4599,
    stock: 3,
    image_url: 'https://images.unsplash.com/photo-1610030469668-932d0c242e88?auto=format&fit=crop&w=800&q=80',
    tag: 'OCCASION',
    fabric: 'Micro velvet with intricate tilla work',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'prod-007',
    name: 'Chandni Hand-Block Printed Saree',
    category: 'Sarees',
    price: 1799,
    old_price: 2099,
    stock: 9,
    image_url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
    tag: 'JUST IN',
    fabric: 'Jaipuri Hand-block Kota Doria with running blouse',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-008',
    name: 'Aabroo Mauve Everyday Suit Set',
    category: 'Suits',
    price: 1399,
    old_price: 1699,
    stock: 10,
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    tag: 'EASY ELEGANCE',
    fabric: 'Slub cotton with floral printed malmal dupatta',
    created_at: new Date().toISOString(),
  },
];

export const initialOrders: Order[] = [
  {
    id: 'IIC-555958',
    customer_details: {
      name: 'Ananya Sharma',
      phone: '9876543210',
      address: 'B-42, Gulmohar Enclave, Civil Lines',
      city: 'Jaipur',
      pincode: '302006',
    },
    items: [{ id: 'prod-001', name: 'Gulabi Noor Anarkali Set', price: 1899, qty: 1 }],
    status: 'Confirmed',
    payment_method: 'UPI',
    upi_ref_id: '429104829102',
    total: 1899,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'IIC-902148',
    customer_details: {
      name: 'Priyanka Verma',
      phone: '9820112345',
      address: 'Flat 402, Lotus Tower, Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
    },
    items: [{ id: 'prod-001', name: 'Gulabi Noor Anarkali Set', price: 1899, qty: 1 }],
    status: 'Confirmed',
    payment_method: 'UPI',
    upi_ref_id: '429011928374',
    total: 1899,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'IIC-891024',
    customer_details: {
      name: 'Aditi Sharma',
      phone: '9845098765',
      address: '78, Defence Colony',
      city: 'New Delhi',
      pincode: '110024',
    },
    items: [{ id: 'prod-002', name: 'Mogra Pure Cotton Daily Kurti', price: 899, qty: 1 }],
    status: 'Packed',
    payment_method: 'COD',
    total: 998,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];
