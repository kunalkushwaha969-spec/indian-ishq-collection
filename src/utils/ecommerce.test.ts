import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product, CartItem } from './ecommerce.ts';
import {
  generateUpiUri,
  validateIndianPhone,
  validateCustomerDetails,
  filterProducts,
  calculateCartSummary,
  formatINR,
  validateIndianWhatsAppNumber,
  buildWhatsAppLink,
  buildCustomerOrderWhatsAppMessage,
} from './ecommerce.ts';

test('generateUpiUri builds valid NPCI URI', () => {
  const uri = generateUpiUri({
    vpa: 'indianishq@okaxis',
    payeeName: 'Indian Ishq Collection',
    amount: 1899,
    transactionNote: 'Order #IIC12345',
    transactionRef: 'IIC12345',
  });

  assert.ok(uri.startsWith('upi://pay?pa=indianishq@okaxis'));
  assert.ok(uri.includes('am=1899.00'));
  assert.ok(uri.includes('cu=INR'));
  assert.ok(uri.includes('pn=Indian%20Ishq%20Collection'));
  assert.ok(uri.includes('tn=Order%20%23IIC12345'));
  assert.ok(uri.includes('tr=IIC12345'));
});

test('generateUpiUri throws error on invalid VPA or zero amount', () => {
  assert.throws(() => {
    generateUpiUri({
      vpa: 'invalid-vpa',
      payeeName: 'Store',
      amount: 100,
      transactionNote: 'Note',
    });
  }, /Invalid UPI VPA/);

  assert.throws(() => {
    generateUpiUri({
      vpa: 'store@upi',
      payeeName: 'Store',
      amount: 0,
      transactionNote: 'Note',
    });
  }, /amount must be greater than 0/);
});

test('validateIndianPhone checks 10 digit Indian mobile numbers', () => {
  assert.equal(validateIndianPhone('9876543210'), true);
  assert.equal(validateIndianPhone('+91 9876543210'), true);
  assert.equal(validateIndianPhone('8123456789'), true);
  assert.equal(validateIndianPhone('12345'), false);
  assert.equal(validateIndianPhone('1234567890'), false); // starts with 1
});

test('validateCustomerDetails verifies required checkout inputs', () => {
  const valid = validateCustomerDetails({
    name: 'Ananya Sharma',
    phone: '9876543210',
    address: 'Flat 402, Lotus Enclave, MG Road, Jaipur 302001',
  });
  assert.equal(valid.valid, true);

  const invalidPhone = validateCustomerDetails({
    name: 'Ananya',
    phone: '12345',
    address: 'Jaipur, Rajasthan',
  });
  assert.equal(invalidPhone.valid, false);

  const shortAddress = validateCustomerDetails({
    name: 'Ananya',
    phone: '9876543210',
    address: 'Home',
  });
  assert.equal(shortAddress.valid, false);
});

test('filterProducts filters by category and search keyword', () => {
  const dummyProducts: Product[] = [
    { id: '1', name: 'Gulabi Noor Anarkali', category: 'Festive', price: 1899, stock: 5, image_url: 'img1.jpg' },
    { id: '2', name: 'Mogra Cotton Kurti', category: 'Kurtis', price: 899, stock: 8, image_url: 'img2.jpg' },
    { id: '3', name: 'Noor Banarasi Saree', category: 'Sarees', price: 2499, stock: 2, image_url: 'img3.jpg' },
  ];

  const festive = filterProducts(dummyProducts, 'Festive', '');
  assert.equal(festive.length, 1);
  assert.equal(festive[0].name, 'Gulabi Noor Anarkali');

  const searchNoor = filterProducts(dummyProducts, 'All', 'Noor');
  assert.equal(searchNoor.length, 2);

  const all = filterProducts(dummyProducts, 'All', '');
  assert.equal(all.length, 3);
});

test('calculateCartSummary computes totals and shipping rules correctly', () => {
  const dummyProducts: Product[] = [
    { id: '1', name: 'Gulabi Noor Anarkali', category: 'Festive', price: 1000, stock: 5, image_url: 'img1.jpg' },
    { id: '2', name: 'Mogra Cotton Kurti', category: 'Kurtis', price: 500, stock: 8, image_url: 'img2.jpg' },
  ];

  // Under ₹1,999 threshold -> standard ₹99 shipping
  const cartUnder: CartItem[] = [{ id: '1', qty: 1 }];
  const summary1 = calculateCartSummary(cartUnder, dummyProducts);
  assert.equal(summary1.subtotal, 1000);
  assert.equal(summary1.shipping, 99);
  assert.equal(summary1.total, 1099);
  assert.equal(summary1.freeShippingQualified, false);

  // Over ₹1,999 threshold -> free shipping
  const cartOver: CartItem[] = [
    { id: '1', qty: 2 }, // 2000
  ];
  const summary2 = calculateCartSummary(cartOver, dummyProducts);
  assert.equal(summary2.subtotal, 2000);
  assert.equal(summary2.shipping, 0);
  assert.equal(summary2.total, 2000);
  assert.equal(summary2.freeShippingQualified, true);
});

test('formatINR formats currency strings with rupee sign', () => {
  assert.equal(formatINR(1899), '₹1,899');
  assert.equal(formatINR(25000), '₹25,000');
});

import {
  COORDINATED_THEMES,
  findThemeById,
  resolveThemeById,
  resolveInitialTheme,
  getSavedThemeFromStorage,
  saveThemeToStorage,
  resolveAppearanceMode,
  THEME_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
} from './themes.ts';

test('COORDINATED_THEMES defines all 6 required boutique colour themes with light and dark tokens', () => {
  assert.equal(COORDINATED_THEMES.length, 6);
  const ids = COORDINATED_THEMES.map((t) => t.id);
  assert.deepEqual(ids, ['burgundy', 'plum', 'emerald', 'rose', 'terracotta', 'ivory']);

  for (const theme of COORDINATED_THEMES) {
    assert.ok(theme.light.primary);
    assert.ok(theme.light.bg);
    assert.ok(theme.dark.primary);
    assert.ok(theme.dark.bg);
    assert.notEqual(theme.light.bg, theme.dark.bg);
  }
});

test('resolveThemeById resolves valid theme IDs, legacy objects, and falls back to Elegant Burgundy', () => {
  assert.equal(resolveThemeById('emerald').id, 'emerald');
  assert.equal(resolveThemeById('plum').id, 'plum');
  assert.equal(resolveThemeById(JSON.stringify({ name: 'Emerald Maharani' })).id, 'emerald');
  assert.equal(resolveThemeById('unknown-theme').id, 'burgundy');
  assert.equal(resolveThemeById(null).id, 'burgundy');
});

test('findThemeById returns null when no saved theme exists or when value is invalid', () => {
  assert.equal(findThemeById(null), null);
  assert.equal(findThemeById(''), null);
  assert.equal(findThemeById('invalid-theme-id'), null);
  assert.equal(findThemeById('emerald')?.id, 'emerald');
  assert.equal(findThemeById('rose')?.id, 'rose');
});

test('resolveInitialTheme prioritizes saved localStorage theme over default storeSettings.themeId', () => {
  // Saved theme in primary storage wins over default 'burgundy'
  assert.equal(resolveInitialTheme('emerald', null, 'burgundy').id, 'emerald');
  assert.equal(resolveInitialTheme('terracotta', null, 'burgundy').id, 'terracotta');

  // Legacy saved theme wins when primary is absent
  assert.equal(
    resolveInitialTheme(null, JSON.stringify({ id: 'plum', name: 'Royal Plum' }), 'burgundy').id,
    'plum'
  );

  // When no saved theme exists in localStorage, falls back to defaultThemeId
  assert.equal(resolveInitialTheme(null, null, 'rose').id, 'rose');
  assert.equal(resolveInitialTheme(null, null, 'burgundy').id, 'burgundy');
  assert.equal(resolveInitialTheme(null, null, null).id, 'burgundy');
});

test('saveThemeToStorage and getSavedThemeFromStorage persist and restore selected theme across reloads', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, val: string) => {
      store.set(key, val);
    },
  };

  // Before saving any theme -> returns null so app uses default theme
  assert.equal(getSavedThemeFromStorage(mockStorage), null);

  // User selects Emerald theme -> saved to storage
  const emeraldTheme = resolveThemeById('emerald');
  saveThemeToStorage(emeraldTheme, mockStorage);
  assert.equal(store.get(THEME_STORAGE_KEY), 'emerald');
  assert.ok(store.get(LEGACY_THEME_STORAGE_KEY)?.includes('"id":"emerald"'));

  // On page refresh -> getSavedThemeFromStorage restores 'emerald' before default theme
  const restored = getSavedThemeFromStorage(mockStorage);
  assert.ok(restored);
  assert.equal(restored.id, 'emerald');
  assert.equal(restored.name, 'Emerald Green');
});

test('resolveAppearanceMode prioritizes explicit manual choice over system preference', () => {
  // No manual preference -> follow system
  assert.equal(resolveAppearanceMode(null, true), 'dark');
  assert.equal(resolveAppearanceMode(null, false), 'light');
  assert.equal(resolveAppearanceMode(undefined, true), 'dark');

  // Explicit manual preference overrides system
  assert.equal(resolveAppearanceMode('light', true), 'light');
  assert.equal(resolveAppearanceMode('dark', false), 'dark');
});

import {
  isRazorpayConfigured,
  resolveInitialOrderStatus,
} from './ecommerce.ts';

test('isRazorpayConfigured returns false when credentials are missing or placeholders, and true for valid rzp_ keys', () => {
  assert.equal(isRazorpayConfigured(''), false);
  assert.equal(isRazorpayConfigured(null), false);
  assert.equal(isRazorpayConfigured(undefined), false);
  assert.equal(isRazorpayConfigured('MY_RAZORPAY_KEY'), false);
  assert.equal(isRazorpayConfigured('rzp_test_123'), false); // too short
  assert.equal(isRazorpayConfigured('rzp_test_AbCdEf123456', false), false); // disabled
  assert.equal(isRazorpayConfigured('rzp_test_AbCdEf123456', true), true);
  assert.equal(isRazorpayConfigured('rzp_live_9876543210XyZ', true), true);
});

test('resolveInitialOrderStatus prevents unverified Razorpay orders and sets Pending status for standard/COD orders', () => {
  assert.equal(resolveInitialOrderStatus('UPI'), 'Pending UPI Payment');
  assert.equal(resolveInitialOrderStatus('COD'), 'Pending');
  assert.equal(resolveInitialOrderStatus(), 'Pending');
  assert.equal(resolveInitialOrderStatus('RAZORPAY', 'pay_Nz123456789'), 'Confirmed');

  assert.throws(() => {
    resolveInitialOrderStatus('RAZORPAY', '');
  }, /Verified Razorpay payment ID is required/);

  assert.throws(() => {
    resolveInitialOrderStatus('RAZORPAY');
  }, /Verified Razorpay payment ID is required/);
});

import {
  DEFAULT_STORE_SETTINGS,
  mergeAndSanitizeStoreSettings,
  resolveDefaultPaymentMethod,
} from './ecommerce.ts';

test('mergeAndSanitizeStoreSettings preserves existing values when incoming fields are blank and updates valid fields', () => {
  const updated = mergeAndSanitizeStoreSettings(
    {
      storeName: '   ', // blank -> should not overwrite existing storeName
      tagline: 'Handcrafted Royal Heritage Wear',
      phone: '', // blank -> should preserve fallback phone
      whatsapp: '919988776655',
      codEnabled: false,
      upiEnabled: true,
      logoUrl: 'https://example.com/logo.png',
    },
    DEFAULT_STORE_SETTINGS
  );

  assert.equal(updated.storeName, DEFAULT_STORE_SETTINGS.storeName);
  assert.equal(updated.phone, DEFAULT_STORE_SETTINGS.phone);
  assert.equal(updated.tagline, 'Handcrafted Royal Heritage Wear');
  assert.equal(updated.whatsapp, '919988776655');
  assert.equal(updated.codEnabled, false);
  assert.equal(updated.upiEnabled, true);
  assert.equal(updated.logoUrl, 'https://example.com/logo.png');
});

test('resolveDefaultPaymentMethod chooses first enabled payment method', () => {
  assert.equal(
    resolveDefaultPaymentMethod({
      codEnabled: true,
      upiEnabled: true,
      razorpayEnabled: false,
      razorpayKeyId: '',
    }),
    'COD'
  );

  assert.equal(
    resolveDefaultPaymentMethod({
      codEnabled: false,
      upiEnabled: true,
      razorpayEnabled: false,
      razorpayKeyId: '',
    }),
    'UPI'
  );

  assert.equal(
    resolveDefaultPaymentMethod({
      codEnabled: false,
      upiEnabled: false,
      razorpayEnabled: true,
      razorpayKeyId: 'rzp_test_AbCdEf123456',
    }),
    'RAZORPAY'
  );
});

import {
  DEFAULT_HERO_SLIDES,
  sanitizeHeroSlides,
  reorderHeroSlides,
  getActiveHeroSlides,
} from './ecommerce.ts';

test('sanitizeHeroSlides normalizes valid slides, strips blank image URLs, and falls back to defaults when empty', () => {
  const fallback = sanitizeHeroSlides(null);
  assert.equal(fallback.length, DEFAULT_HERO_SLIDES.length);
  assert.equal(fallback[0].id, 'slide-1');

  const sanitized = sanitizeHeroSlides([
    {
      id: 'custom-2',
      imageUrl: 'https://example.com/saree.jpg',
      title: 'Royal Silk Edit',
      subtitle: 'Handwoven sarees',
      ctaText: 'Shop Now',
      ctaLink: '#shop',
      categoryFilter: 'Sarees',
      enabled: true,
      order: 5,
    },
    {
      id: 'blank-img',
      imageUrl: '   ',
      title: 'Ignored Slide',
    },
    {
      id: 'custom-1',
      imageUrl: 'https://example.com/kurti.jpg',
      title: 'Everyday Mulmul',
      subtitle: 'Soft cottons',
      ctaText: 'Explore',
      ctaLink: '#shop',
      categoryFilter: 'Kurtis',
      enabled: false,
      order: 1,
    },
  ]);

  assert.equal(sanitized.length, 2);
  // Sorted by order (1 before 5) and re-indexed to 0, 1
  assert.equal(sanitized[0].id, 'custom-1');
  assert.equal(sanitized[0].order, 0);
  assert.equal(sanitized[0].enabled, false);
  assert.equal(sanitized[1].id, 'custom-2');
  assert.equal(sanitized[1].order, 1);
  assert.equal(sanitized[1].enabled, true);
});

test('reorderHeroSlides moves slides cleanly and updates sequential order indices', () => {
  const reordered = reorderHeroSlides(DEFAULT_HERO_SLIDES, 0, 2);
  assert.equal(reordered.length, 3);
  assert.equal(reordered[0].id, 'slide-2');
  assert.equal(reordered[0].order, 0);
  assert.equal(reordered[1].id, 'slide-3');
  assert.equal(reordered[1].order, 1);
  assert.equal(reordered[2].id, 'slide-1');
  assert.equal(reordered[2].order, 2);
});

test('getActiveHeroSlides filters disabled slides and provides a fallback slide if all are disabled', () => {
  const partialDisabled = DEFAULT_HERO_SLIDES.map((s, i) => ({
    ...s,
    enabled: i !== 1, // disable slide-2
  }));

  const active = getActiveHeroSlides({
    heroSlides: partialDisabled,
    tagline: 'Custom Tagline',
    brandDescription: 'Custom Description',
    storeName: 'Indian Ishq Collection',
  });
  assert.equal(active.length, 2);
  assert.equal(active[0].id, 'slide-1');
  assert.equal(active[1].id, 'slide-3');

  // All disabled -> returns 1 safe fallback slide using store tagline & coverPhoto
  const allDisabled = DEFAULT_HERO_SLIDES.map((s) => ({ ...s, enabled: false }));
  const fallbackActive = getActiveHeroSlides(
    {
      heroSlides: allDisabled,
      tagline: 'Festive Couture 2026',
      brandDescription: 'Handcrafted in Jaipur',
      storeName: 'Indian Ishq Collection',
    },
    'https://example.com/custom-cover.jpg'
  );
  assert.equal(fallbackActive.length, 1);
  assert.equal(fallbackActive[0].imageUrl, 'https://example.com/custom-cover.jpg');
  assert.equal(fallbackActive[0].title, 'Festive Couture 2026');
});

import {
  DEFAULT_HOMEPAGE_SECTIONS,
  sanitizeHomepageSections,
  reorderHomepageSections,
  initialProducts,
} from './ecommerce.ts';

test('sanitizeHomepageSections preserves valid section ordering, appends missing default sections, and safeguards against disabling all sections', () => {
  const defaults = sanitizeHomepageSections(null);
  assert.equal(defaults.length, DEFAULT_HOMEPAGE_SECTIONS.length);
  assert.equal(defaults[0].id, 'hero');

  // Reorder categories before hero and enable testimonials
  const custom = sanitizeHomepageSections([
    { id: 'categories', label: 'Shop by Silhouette', description: 'Categories', enabled: true, order: 0 },
    { id: 'hero', label: 'Hero Banner', description: 'Hero', enabled: true, order: 1 },
    { id: 'testimonials', label: 'Patron Stories', description: 'Reviews', enabled: true, order: 2 },
  ]);
  assert.equal(custom.length, DEFAULT_HOMEPAGE_SECTIONS.length);
  assert.equal(custom[0].id, 'categories');
  assert.equal(custom[0].label, 'Shop by Silhouette');
  assert.equal(custom[1].id, 'hero');
  assert.equal(custom[2].id, 'testimonials');
  assert.equal(custom[2].enabled, true);

  // If merchant disables every single section, safeguard keeps hero & bestsellers enabled
  const allOff = DEFAULT_HOMEPAGE_SECTIONS.map((s) => ({ ...s, enabled: false }));
  const safeguarded = sanitizeHomepageSections(allOff);
  assert.equal(
    safeguarded.some((s) => s.id === 'bestsellers' && s.enabled),
    true
  );
});

test('reorderHomepageSections moves section cleanly and updates sequential order indices', () => {
  const reordered = reorderHomepageSections(DEFAULT_HOMEPAGE_SECTIONS, 1, 0);
  assert.equal(reordered[0].id, 'categories');
  assert.equal(reordered[0].order, 0);
  assert.equal(reordered[1].id, 'hero');
  assert.equal(reordered[1].order, 1);
});

test('calculateCartSummary respects custom free shipping threshold and standard shipping fee', () => {
  const cart = [{ id: 'prod-002', qty: 2 }]; // 2 * 899 = 1798
  // With default 1999 threshold, 1798 has 99 shipping
  const stdSummary = calculateCartSummary(cart, initialProducts);
  assert.equal(stdSummary.subtotal, 1798);
  assert.equal(stdSummary.shipping, 99);
  assert.equal(stdSummary.freeShippingQualified, false);

  // With custom 1500 threshold and 149 fee, 1798 qualifies for free shipping
  const customFree = calculateCartSummary(cart, initialProducts, 1500, 149);
  assert.equal(customFree.shipping, 0);
  assert.equal(customFree.freeShippingQualified, true);

  // With custom 2500 threshold and 149 fee, 1798 charges 149 shipping
  const customPaid = calculateCartSummary(cart, initialProducts, 2500, 149);
  assert.equal(customPaid.shipping, 149);
  assert.equal(customPaid.total, 1798 + 149);
});

test('mergeAndSanitizeStoreSettings sanitizes custom colors, typography, radii, and mobile hero images', () => {
  const merged = mergeAndSanitizeStoreSettings({
    customColorsEnabled: true,
    customColors: {
      primary: '#801b32',
      accent: 'not-a-hex-color', // should fallback to default accent
      bg: '#faf5ef',
      surface: '#ffffff',
      textMain: '#1e1618',
      buttonBg: '#801b32',
      buttonText: '#ffffff',
      border: '#e5d8d0',
    },
    headingFont: 'Playfair Display',
    bodyFont: 'Noto Sans',
    headingScale: 'large',
    borderRadiusStyle: 'pill',
    buttonStyle: 'outline',
    gridColumnsDesktop: 3,
    freeShippingThreshold: 1499,
    standardShippingFee: 79,
    heroSlides: [
      {
        id: 's1',
        imageUrl: 'https://example.com/desktop.jpg',
        mobileImageUrl: 'https://example.com/mobile.jpg',
        title: 'Bridal Edit',
        subtitle: 'Handcrafted',
        ctaText: 'Shop',
        ctaLink: '#shop',
        overlayOpacity: 60,
        enabled: true,
        order: 0,
      },
    ],
  });

  assert.equal(merged.customColorsEnabled, true);
  assert.equal(merged.customColors.primary, '#801b32');
  assert.equal(merged.customColors.accent, '#b78a4b'); // fallback for invalid hex
  assert.equal(merged.headingFont, 'Playfair Display');
  assert.equal(merged.bodyFont, 'Noto Sans');
  assert.equal(merged.headingScale, 'large');
  assert.equal(merged.borderRadiusStyle, 'pill');
  assert.equal(merged.buttonStyle, 'outline');
  assert.equal(merged.gridColumnsDesktop, 3);
  assert.equal(merged.freeShippingThreshold, 1499);
  assert.equal(merged.standardShippingFee, 79);
  assert.equal(merged.heroSlides[0].mobileImageUrl, 'https://example.com/mobile.jpg');
  assert.equal(merged.heroSlides[0].overlayOpacity, 60);
});

import {
  resolveSlideIndex,
  shouldAnimateSectionReveal,
} from './ecommerce.ts';

test('resolveSlideIndex wraps around cleanly for next and previous slideshow transitions', () => {
  assert.equal(resolveSlideIndex(0, 1, 3), 1);
  assert.equal(resolveSlideIndex(2, 1, 3), 0);
  assert.equal(resolveSlideIndex(0, -1, 3), 2);
  assert.equal(resolveSlideIndex(1, -1, 3), 0);
  assert.equal(resolveSlideIndex(0, 1, 0), 0);
});

test('shouldAnimateSectionReveal skips hero and respects prefers-reduced-motion or missing IntersectionObserver', () => {
  assert.equal(
    shouldAnimateSectionReveal({
      sectionId: 'hero',
      prefersReducedMotion: false,
      hasIntersectionObserver: true,
    }),
    false
  );
  assert.equal(
    shouldAnimateSectionReveal({
      sectionId: 'categories',
      prefersReducedMotion: true,
      hasIntersectionObserver: true,
    }),
    false
  );
  assert.equal(
    shouldAnimateSectionReveal({
      sectionId: 'newArrivals',
      prefersReducedMotion: false,
      hasIntersectionObserver: false,
    }),
    false
  );
  assert.equal(
    shouldAnimateSectionReveal({
      sectionId: 'bestsellers',
      prefersReducedMotion: false,
      hasIntersectionObserver: true,
    }),
    true
  );
});

test('validateCustomerDetails verifies valid customer inputs for direct order placement', () => {
  const result = validateCustomerDetails({
    name: 'Priyanka Verma',
    phone: '9820112345',
    address: 'A-304, Green Heights, Andheri West, Mumbai',
    city: 'Mumbai',
    pincode: '400053',
  });
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('validateCustomerDetails rejects invalid or missing fields without requiring payment info', () => {
  const missingName = validateCustomerDetails({
    name: ' ',
    phone: '9820112345',
    address: 'Green Heights, Mumbai',
  });
  assert.equal(missingName.valid, false);

  const invalidPhone = validateCustomerDetails({
    name: 'Priyanka Verma',
    phone: '1234567890', // Invalid leading digit for Indian mobile
    address: 'Green Heights, Mumbai',
  });
  assert.equal(invalidPhone.valid, false);

  const shortAddress = validateCustomerDetails({
    name: 'Priyanka Verma',
    phone: '9820112345',
    address: 'Home',
  });
  assert.equal(shortAddress.valid, false);
});

test('resolveInitialOrderStatus sets new customer catalogue orders to Pending until seller confirms', () => {
  const codStatus = resolveInitialOrderStatus('COD');
  assert.equal(codStatus, 'Pending');
  assert.notEqual(codStatus, 'Confirmed');
});

test('validateIndianWhatsAppNumber handles valid 10-digit Indian numbers with various formats', () => {
  // Plain 10 digits
  const plain = validateIndianWhatsAppNumber('9876543210');
  assert.equal(plain.isValid, true);
  assert.equal(plain.clean10Digits, '9876543210');
  assert.equal(plain.waId, '919876543210');
  assert.equal(plain.formattedDisplay, '+91 98765 43210');

  // With +91 country code and spaces/dashes
  const formatted = validateIndianWhatsAppNumber('+91 98765-43210');
  assert.equal(formatted.isValid, true);
  assert.equal(formatted.clean10Digits, '9876543210');
  assert.equal(formatted.waId, '919876543210');
  assert.equal(formatted.formattedDisplay, '+91 98765 43210');

  // With leading 0
  const leadingZero = validateIndianWhatsAppNumber('09876543210');
  assert.equal(leadingZero.isValid, true);
  assert.equal(leadingZero.clean10Digits, '9876543210');
  assert.equal(leadingZero.waId, '919876543210');

  // With 91 prefix
  const withPrefix = validateIndianWhatsAppNumber('918765432109');
  assert.equal(withPrefix.isValid, true);
  assert.equal(withPrefix.clean10Digits, '8765432109');
  assert.equal(withPrefix.waId, '918765432109');
});

test('validateIndianWhatsAppNumber detects unconfigured, invalid, and incomplete numbers', () => {
  // Empty or undefined
  const empty = validateIndianWhatsAppNumber('');
  assert.equal(empty.isValid, false);
  assert.equal(empty.clean10Digits, '');
  assert.ok(empty.error?.includes('No WhatsApp number configured'));

  const unconfigured = validateIndianWhatsAppNumber(undefined);
  assert.equal(unconfigured.isValid, false);

  // Too short
  const short = validateIndianWhatsAppNumber('98765');
  assert.equal(short.isValid, false);
  assert.ok(short.error?.includes('10 digits'));

  // Invalid leading digit for Indian mobile (must be 6-9)
  const invalidStart = validateIndianWhatsAppNumber('5551234567');
  assert.equal(invalidStart.isValid, false);
  assert.ok(invalidStart.error?.includes('start with 6, 7, 8, or 9'));
});

test('buildWhatsAppLink constructs valid wa.me URLs with encoded messages', () => {
  const url = buildWhatsAppLink('919876543210', 'Namaste from Indian Ishq Collection!');
  assert.ok(url.startsWith('https://wa.me/919876543210?text='));
  assert.ok(url.includes('Namaste%20from%20Indian%20Ishq%20Collection!'));

  // Handles 10-digit number by auto-prefixing 91
  const url10 = buildWhatsAppLink('9876543210', 'Hello');
  assert.ok(url10.startsWith('https://wa.me/919876543210?text=Hello'));
});

test('buildCustomerOrderWhatsAppMessage generates readable message with full order details', () => {
  const mockOrder = {
    id: 'ORD-98721',
    customer_details: {
      name: 'Ananya Sharma',
      phone: '9876543210',
      address: '22 Heritage Lane, C-Scheme',
      city: 'Jaipur',
      pincode: '302001',
    },
    items: [
      { id: 'prod-1', name: 'Banarasi Katan Silk Saree', price: 6999, qty: 1 },
      { id: 'prod-2', name: 'Mulmul Handblock Kurti', price: 1899, qty: 2 },
    ],
    total: 10797,
    status: 'Confirmed' as const,
    payment_method: 'COD' as const,
    created_at: new Date().toISOString(),
  };

  const msg = buildCustomerOrderWhatsAppMessage(mockOrder, 'Indian Ishq Collection', '+91 98765 43210');
  assert.ok(msg.includes('Namaste Ananya Sharma!'));
  assert.ok(msg.includes('Order #ORD-98721'));
  assert.ok(msg.includes('1x Banarasi Katan Silk Saree'));
  assert.ok(msg.includes('2x Mulmul Handblock Kurti'));
  assert.ok(msg.includes('3 pcs'));
  assert.ok(msg.includes('Confirmed'));
  assert.ok(msg.includes('22 Heritage Lane, C-Scheme, Jaipur - 302001'));
  assert.ok(msg.includes('+91 98765 43210'));
});

import {
  validateStoreSettingsAmounts,
  MAX_FREE_SHIPPING_THRESHOLD,
  MAX_STANDARD_SHIPPING_FEE,
} from './ecommerce.ts';

test('validateStoreSettingsAmounts accepts valid rupee amounts (99, 499, 999, 1999, 2499) and rejects negative or out-of-range values', () => {
  for (const amount of [0, 99, 499, 999, 1999, 2499, 4999]) {
    const res = validateStoreSettingsAmounts({
      freeShippingThreshold: amount,
      standardShippingFee: Math.min(amount, MAX_STANDARD_SHIPPING_FEE),
    });
    assert.equal(res.valid, true, `Expected amount ₹${amount} to be valid`);
  }

  // Negative amounts rejected
  assert.equal(
    validateStoreSettingsAmounts({ freeShippingThreshold: -1, standardShippingFee: 99 }).valid,
    false
  );
  assert.equal(
    validateStoreSettingsAmounts({ freeShippingThreshold: 1999, standardShippingFee: -50 }).valid,
    false
  );

  // Out-of-range amounts rejected
  assert.equal(
    validateStoreSettingsAmounts({
      freeShippingThreshold: MAX_FREE_SHIPPING_THRESHOLD + 1,
      standardShippingFee: 99,
    }).valid,
    false
  );
  assert.equal(
    validateStoreSettingsAmounts({
      freeShippingThreshold: 1999,
      standardShippingFee: MAX_STANDARD_SHIPPING_FEE + 1,
    }).valid,
    false
  );
});

test('mergeAndSanitizeStoreSettings preserves exact rupee amounts such as 99, 499, 999, 1999, and 2499', () => {
  const s1 = mergeAndSanitizeStoreSettings({
    freeShippingThreshold: 1999,
    standardShippingFee: 99,
  });
  assert.equal(s1.freeShippingThreshold, 1999);
  assert.equal(s1.standardShippingFee, 99);

  const s2 = mergeAndSanitizeStoreSettings({
    freeShippingThreshold: 2499,
    standardShippingFee: 499,
  });
  assert.equal(s2.freeShippingThreshold, 2499);
  assert.equal(s2.standardShippingFee, 499);

  const s3 = mergeAndSanitizeStoreSettings({
    freeShippingThreshold: 999,
    standardShippingFee: 0,
  });
  assert.equal(s3.freeShippingThreshold, 999);
  assert.equal(s3.standardShippingFee, 0);
});

