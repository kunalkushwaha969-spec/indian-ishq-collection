import type { Product, Order, CustomerDetails, OrderItem } from '../utils/ecommerce';
import {
  initialProducts,
  initialOrders,
  formatINR,
  generateUpiUri,
  resolveInitialOrderStatus,
} from '../utils/ecommerce';
import {
  fetchFirestoreProducts,
  saveFirestoreProduct,
  updateFirestoreProductStock,
  deleteFirestoreProduct,
  fetchFirestoreOrders,
  saveFirestoreOrder,
  updateFirestoreOrderStatus,
  subscribeToFirestoreProducts,
  subscribeToFirestoreOrders,
} from './firebase';
export { subscribeToFirestoreProducts, subscribeToFirestoreOrders };

import { addMerchantActivity } from './activity';

const TOKEN_KEY = 'ishq_merchant_token';
const PRODUCTS_STORE_KEY = 'ishq_products_cache_v2';
const ORDERS_STORE_KEY = 'ishq_orders_cache_v2';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

const isStaticHost = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.endsWith('github.io') ||
    window.location.protocol === 'file:'
  );
};

function getLocalProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...initialProducts];
}

function setLocalProducts(prods: Product[]) {
  try {
    localStorage.setItem(PRODUCTS_STORE_KEY, JSON.stringify(prods));
  } catch {}
}

function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [...initialOrders];
}

function setLocalOrders(ords: Order[]) {
  try {
    localStorage.setItem(ORDERS_STORE_KEY, JSON.stringify(ords));
  } catch {}
}

const knownResolvableHosts = new Map<string, { resolvable: boolean; timestamp: number }>();

export async function isHostResolvable(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname;

    const cached = knownResolvableHosts.get(hostname);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.resolvable;
    }



    try {
      const dohRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}`);
      if (dohRes.ok) {
        const dohData = await dohRes.json();
        const isOk = dohData.Status === 0;
        knownResolvableHosts.set(hostname, { resolvable: isOk, timestamp: Date.now() });
        return isOk;
      }
    } catch {}

    return false;
  } catch {
    return false;
  }
}

let cloudCircuitOpen = false;
let cloudCircuitLastTrip = 0;
let cloudCircuitReason = '';
const CIRCUIT_COOLDOWN_MS = 60000;

export function isCloudCircuitActive(): boolean {
  if (!cloudCircuitOpen) return true;
  if (Date.now() - cloudCircuitLastTrip > CIRCUIT_COOLDOWN_MS) {
    cloudCircuitOpen = false;
    return true;
  }
  return false;
}

export function tripCloudCircuit(reason?: string) {
  cloudCircuitOpen = true;
  cloudCircuitLastTrip = Date.now();
  cloudCircuitReason = reason || 'Cloud Firestore unreachable';
}

export function resetCloudCircuit() {
  cloudCircuitOpen = false;
  cloudCircuitLastTrip = 0;
  cloudCircuitReason = '';
  knownResolvableHosts.clear();
}

async function httpFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchProducts(
  category = 'All',
  searchQuery = ''
): Promise<Product[]> {
  try {
    const firestoreItems = await fetchFirestoreProducts();
    if (firestoreItems && firestoreItems.length > 0) {
      setLocalProducts(firestoreItems);
      let filtered = [...firestoreItems];
      if (category && category !== 'All') {
        filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
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
      return filtered;
    }
  } catch (err) {
    console.warn('Firestore fetch products failed, using local cache:', err);
  }

  const localList = getLocalProducts();
  let filtered = [...localList];

  if (category && category !== 'All') {
    filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
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

  return filtered;
}

export async function createProduct(
  product: Omit<Product, 'id' | 'created_at'>
): Promise<Product> {
  const newId = 'prod-' + Date.now().toString().slice(-6);
  const now = new Date().toISOString();

  const productRecord: Product = {
    id: newId,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    ...(product.old_price ? { old_price: Number(product.old_price) } : {}),
    stock: Number(product.stock),
    image_url: product.image_url,
    tag: product.tag || 'NEW',
    fabric: product.fabric || 'Indian Ethnic Craft',
    created_at: now,
  };

  let createdProduct: Product | null = null;

  try {
    createdProduct = await saveFirestoreProduct(productRecord);
  } catch (err) {
    console.warn('Firestore product creation warning:', err);
  }

  if (!createdProduct) {
    createdProduct = productRecord;
  }

  const existing = getLocalProducts();
  setLocalProducts([createdProduct, ...existing.filter((p) => p.id !== createdProduct!.id)]);

  addMerchantActivity({
    type: 'inventory',
    title: 'New Product Added',
    detail: `"${createdProduct.name}" added to catalog (${createdProduct.stock} units · ₹${createdProduct.price})`,
  });

  return createdProduct;
}

export async function updateProductStock(
  id: string,
  stock: number
): Promise<Product> {
  let updatedProduct: Product | null = null;

  try {
    await updateFirestoreProductStock(id, stock);
  } catch (err) {
    console.warn('Firestore stock update warning:', err);
  }

  const existing = getLocalProducts();
  let found = existing.find((p) => p.id === id);
  if (found) {
    found.stock = stock;
    updatedProduct = { ...found };
    setLocalProducts(existing);
  } else if (!updatedProduct) {
    updatedProduct = {
      id,
      name: `Product #${id}`,
      category: 'Kurtis',
      price: 1499,
      stock,
      image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
    };
  }

  addMerchantActivity({
    type: 'inventory',
    title: 'Stock Count Adjusted',
    detail: `Stock for item #${id} set to ${stock} units`,
  });

  return updatedProduct;
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await deleteFirestoreProduct(id);
  } catch (err) {
    console.warn('Firestore delete warning:', err);
  }

  const existing = getLocalProducts();
  setLocalProducts(existing.filter((p) => p.id !== id));

  addMerchantActivity({
    type: 'inventory',
    title: 'Product Removed',
    detail: `Product #${id} removed from catalog`,
  });
}

// Fixed Order Creation (Cleaned of undefined fields so Firestore accepts COD & UPI successfully)
export async function createOrder(payload: {
  customer_details: CustomerDetails;
  items: OrderItem[];
  payment_method: 'UPI' | 'COD' | 'RAZORPAY';
  upi_ref_id?: string;
  razorpay_payment_id?: string;
  total: number;
}): Promise<Order> {
  const orderId = 'IIC-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date().toISOString();

  const initialStatus = resolveInitialOrderStatus(
    payload.payment_method,
    payload.razorpay_payment_id
  );

  const newOrder: Order = {
    id: orderId,
    customer_details: {
      name: payload.customer_details.name || 'Customer',
      phone: payload.customer_details.phone || '',
      address: payload.customer_details.address || '',
      ...(payload.customer_details.city ? { city: payload.customer_details.city } : {}),
      ...(payload.customer_details.pincode ? { pincode: payload.customer_details.pincode } : {}),
    },
    items: payload.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      qty: Number(item.qty),
    })),
    payment_method: payload.payment_method,
    ...(payload.upi_ref_id ? { upi_ref_id: payload.upi_ref_id } : {}),
    ...(payload.razorpay_payment_id ? { razorpay_payment_id: payload.razorpay_payment_id } : {}),
    status: initialStatus,
    total: Number(payload.total),
    created_at: now,
  };

  let placedOrder: Order | null = null;

  try {
    placedOrder = await saveFirestoreOrder(newOrder);
    const currentProducts = await fetchFirestoreProducts();
    for (const item of payload.items) {
      const prod = currentProducts.find((p) => p.id === item.id);
      if (prod) {
        const nextStock = Math.max(0, prod.stock - item.qty);
        await updateFirestoreProductStock(item.id, nextStock);
      }
    }
  } catch (err) {
    console.warn('Firestore order placement warning:', err);
  }

  if (!placedOrder) {
    placedOrder = newOrder;
  }

  const existingOrders = getLocalOrders();
  setLocalOrders([placedOrder, ...existingOrders.filter((o) => o.id !== placedOrder!.id)]);

  const products = getLocalProducts();
  payload.items.forEach((item) => {
    const prod = products.find((p) => p.id === item.id);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - item.qty);
    }
  });
  setLocalProducts(products);

  const methodLabel =
    placedOrder.payment_method === 'UPI'
      ? 'UPI QR (Pending Verification)'
      : placedOrder.payment_method === 'RAZORPAY'
      ? 'Razorpay Online (Paid)'
      : 'Cash on Delivery (Pay on Delivery)';

  addMerchantActivity({
    type: 'order',
    title: 'New Customer Order Placed',
    detail: `Order #${placedOrder.id} placed by ${placedOrder.customer_details.name} (₹${placedOrder.total.toLocaleString('en-IN')} via ${methodLabel})`,
  });

  return placedOrder;
}

export async function fetchOrders(): Promise<Order[]> {
  try {
    const list = await fetchFirestoreOrders();
    if (list && list.length > 0) {
      setLocalOrders(list);
      return list;
    }
  } catch (err) {
    console.warn('Firestore fetch orders warning:', err);
  }
  return getLocalOrders();
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<Order> {
  try {
    await updateFirestoreOrderStatus(orderId, status);
  } catch (err) {
    console.warn('Firestore update order status warning:', err);
  }

  const orders = getLocalOrders();
  const found = orders.find((o) => o.id === orderId);
  let updatedOrder: Order;
  if (found) {
    found.status = status;
    updatedOrder = { ...found };
    setLocalOrders(orders);
  } else {
    updatedOrder = {
      id: orderId,
      customer_details: { name: 'Customer', phone: '', address: '' },
      items: [],
      status,
      payment_method: 'UPI',
      total: 0,
      created_at: new Date().toISOString(),
    };
  }

  addMerchantActivity({
    type: 'status',
    title: 'Order Status Changed',
    detail: `Order #${orderId} marked as "${status}"`,
  });

  return updatedOrder;
}

export async function loginAdmin(
  password: string,
  email?: string
): Promise<{ token: string; user: { email: string; role: string } }> {
  const normalizedEmail = (email || 'admin@indianishq.com')
    .trim()
    .toLowerCase();

  if (
    password === 'ishq2026' &&
    normalizedEmail === 'admin@indianishq.com'
  ) {
    const demoToken = 'ishq_static_admin_token_' + Date.now();

    setStoredToken(demoToken);

    return {
      token: demoToken,
      user: {
        email: normalizedEmail,
        role: 'admin',
      },
    };
  }

  throw new Error('Invalid merchant credentials');
}

export async function verifyAdminSession(
  token = getStoredToken()
): Promise<boolean> {
  if (!token) return false;

  const isValidFormat =
    /^ishq_static_admin_token_\d+$/.test(token);

  if (!isValidFormat) {
    setStoredToken(null);
    return false;
  }

  return true;
}

export async function generateUpiQrCode(params: {
  amount: number;
  orderRef: string;
  payeeName?: string;
  vpa?: string;
}): Promise<{ upiUri: string; qrDataUrl: string; vpa: string }> {
  const QRCode = (await import('qrcode')).default;

  const vpa = params.vpa || 'merchant.indianishq@okicici';
  const payeeName = params.payeeName || 'Indian Ishq Collection';
  const upiUri = generateUpiUri({
    vpa,
    payeeName,
    amount: params.amount,
    transactionNote: `Order ${params.orderRef} - Indian Ishq Collection`,
    transactionRef: params.orderRef,
  });

  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    width: 320,
    margin: 1,
    color: { dark: '#4c1727', light: '#ffffff' },
  });

  return { upiUri, qrDataUrl, vpa };
}

export async function uploadImageDirect(file: File): Promise<string> {
  if (!file) throw new Error('No file selected');
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image size must be under 10MB');
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file data'));
    reader.readAsDataURL(file);
  });
}
