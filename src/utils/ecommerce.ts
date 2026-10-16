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
  payment_method: 'UPI' | 'COD';
  upi_ref_id?: string;
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
