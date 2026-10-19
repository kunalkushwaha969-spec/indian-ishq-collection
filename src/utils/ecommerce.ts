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
  products: Product[]
): {
  subtotal: number;
  itemCount: number;
  shipping: number;
  total: number;
  freeShippingQualified: boolean;
  freeShippingThreshold: number;
} {
  const FREE_SHIPPING_THRESHOLD = 1999;
  const STANDARD_SHIPPING_FEE = 99;

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

export interface StoreSettings {
  storeName: string;
  tagline: string;
  brandDescription: string;
  announcementText: string;
  logoUrl: string;
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
  updatedAt?: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Indian Ishq Collection',
  tagline: 'Timeless Indian silhouettes, woven with ishq.',
  brandDescription:
    'Thoughtfully curated ethnic wear for festive celebrations and everyday grace. Discover hand-block mulmul kurtis, pure Banarasi Katan silk sarees, and artisanal Chanderi suit sets.',
  announcementText:
    'Complimentary express shipping on orders above ₹1,999 · Handcrafted Indian Ethnic Wear',
  logoUrl: '',
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
};

/**
 * Safely merges partial settings with existing/default settings so blank strings
 * never accidentally overwrite required store fields.
 */
export function mergeAndSanitizeStoreSettings(
  incoming?: Partial<StoreSettings> | null,
  fallback: StoreSettings = DEFAULT_STORE_SETTINGS
): StoreSettings {
  if (!incoming || typeof incoming !== 'object') {
    return { ...fallback };
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

  const codEnabled =
    typeof incoming.codEnabled === 'boolean' ? incoming.codEnabled : fallback.codEnabled;
  const upiEnabled =
    typeof incoming.upiEnabled === 'boolean' ? incoming.upiEnabled : fallback.upiEnabled;
  const razorpayEnabled =
    typeof incoming.razorpayEnabled === 'boolean'
      ? incoming.razorpayEnabled
      : fallback.razorpayEnabled;

  return {
    storeName: pickNonBlank(incoming.storeName, fallback.storeName),
    tagline: pickNonBlank(incoming.tagline, fallback.tagline),
    brandDescription: pickNonBlank(incoming.brandDescription, fallback.brandDescription),
    announcementText: pickNonBlank(incoming.announcementText, fallback.announcementText),
    logoUrl: pickOptionalString(incoming.logoUrl, fallback.logoUrl),
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
