import type { Product, Order, CustomerDetails, OrderItem } from '../utils/ecommerce';
import { initialProducts, initialOrders, formatINR } from '../utils/ecommerce';
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
import {
  getEffectiveSupabaseUrl,
  getEffectiveSupabaseKey,
  isPlaceholderSupabaseUrl,
  saveCustomSupabaseCredentials,
  sanitizeUrl,
  sanitizeKey,
  extractProjectRef,
  DEFAULT_PROJECT_REF,
} from './supabase';
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

// Detect static hosting environments (e.g. GitHub Pages) where /api/* backend routes do not exist
const isStaticHost = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.endsWith('github.io') ||
    window.location.protocol === 'file:'
  );
};

// Local Storage Fallback Cache (Ensures 100% operation on static hosts like GitHub Pages)
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

const getSupabaseRestUrl = () => `${getEffectiveSupabaseUrl()}/rest/v1`;

const getSupabaseHeaders = () => {
  const key = getEffectiveSupabaseKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
};

// Cached host reachability probe state to prevent ever calling fetch() on unresolvable hosts
const knownResolvableHosts = new Map<string, { resolvable: boolean; timestamp: number }>();

export async function isHostResolvable(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsed.hostname;

    // Check cache (valid for 60 seconds)
    const cached = knownResolvableHosts.get(hostname);
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.resolvable;
    }

    // 1. In dev/full-stack mode, ask local backend route (runs native Node dns.lookup without browser errors)
    if (!isStaticHost()) {
      try {
        const res = await fetch(`/api/supabase/check-dns?host=${encodeURIComponent(hostname)}`);
        if (res.ok) {
          const data = await res.json();
          const isOk = !!data.resolvable;
          knownResolvableHosts.set(hostname, { resolvable: isOk, timestamp: Date.now() });
          return isOk;
        }
      } catch {}
    }

    // 2. On static host (e.g. GitHub Pages), use clean DNS-over-HTTPS (DoH) JSON lookup
    // This returns HTTP 200 without ever producing net::ERR_NAME_NOT_RESOLVED in the console
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

// Cloud connectivity circuit breaker to silence repetitive browser console error floods
let cloudCircuitOpen = false;
let cloudCircuitLastTrip = 0;
let cloudCircuitReason = '';
const CIRCUIT_COOLDOWN_MS = 60000; // 60s cooldown between background cloud retries

export function isCloudCircuitActive(): boolean {
  if (!cloudCircuitOpen) return true;
  // If cooldown passed, permit one probe
  if (Date.now() - cloudCircuitLastTrip > CIRCUIT_COOLDOWN_MS) {
    cloudCircuitOpen = false;
    return true;
  }
  return false;
}

export function getCloudSyncStatus(): { connected: boolean; circuitOpen: boolean; reason: string } {
  return {
    connected: !cloudCircuitOpen,
    circuitOpen: cloudCircuitOpen,
    reason: cloudCircuitReason,
  };
}

export function tripCloudCircuit(reason?: string) {
  cloudCircuitOpen = true;
  cloudCircuitLastTrip = Date.now();
  cloudCircuitReason = reason || 'Project unreachable or paused in Supabase';
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ishq:cloud-sync-status', {
        detail: { connected: false, reason: cloudCircuitReason },
      })
    );
  }
}

export function resetCloudCircuit() {
  cloudCircuitOpen = false;
  cloudCircuitLastTrip = 0;
  cloudCircuitReason = '';
  knownResolvableHosts.clear();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ishq:cloud-sync-status', {
        detail: { connected: true, reason: '' },
      })
    );
  }
}

// Resilient HTTP fetch helper with timeout
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

/**
 * Diagnostic test tool to verify Supabase project connectivity & schema tables
 */
export async function testSupabaseConnection(
  rawUrl = getEffectiveSupabaseUrl(),
  rawKey = getEffectiveSupabaseKey()
): Promise<{
  ok: boolean;
  message: string;
  projectRef: string;
  tableStatus: 'ready' | 'missing_tables' | 'unreachable';
}> {
  const url = sanitizeUrl(rawUrl);
  const key = sanitizeKey(rawKey);
  const projectRef = extractProjectRef(url);

  // Check if host actually resolves in DNS first (zero console errors)
  const isResolvable = await isHostResolvable(url);
  if (!isResolvable) {
    tripCloudCircuit('Project unreachable or paused in Supabase');
    return {
      ok: false,
      message: `Project "${projectRef}" is unreachable or paused on Supabase free tier. In your Supabase Dashboard, click "Restore project" to re-activate your database.`,
      projectRef,
      tableStatus: 'unreachable',
    };
  }

  try {
    const testUrl = `${url}/rest/v1/products?select=id&limit=1`;
    const res = await httpFetch(
      testUrl,
      {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
      3000
    );

    if (res.ok) {
      resetCloudCircuit();
      return {
        ok: true,
        message: 'Successfully connected to Supabase! Live database sync is active.',
        projectRef,
        tableStatus: 'ready',
      };
    }

    if (res.status === 404 || res.status === 400) {
      resetCloudCircuit();
      const body = await res.json().catch(() => ({}));
      if (body.message?.includes('relation "public.products" does not exist')) {
        return {
          ok: true,
          message: 'Connected to Supabase project, but "products" table is not created yet. Run the SQL schema to create tables.',
          projectRef,
          tableStatus: 'missing_tables',
        };
      }
    }

    return {
      ok: false,
      message: `Supabase returned HTTP ${res.status}. Check API key or project permissions.`,
      projectRef,
      tableStatus: 'unreachable',
    };
  } catch (err: any) {
    tripCloudCircuit(err.message);
    return {
      ok: false,
      message: `Project "${projectRef}" is unreachable or paused on Supabase free tier. In your Supabase Dashboard, click "Restore project" to re-activate your database.`,
      projectRef,
      tableStatus: 'unreachable',
    };
  }
}

// 1. Fetch live products from cloud database
export async function fetchProducts(
  category = 'All',
  searchQuery = ''
): Promise<Product[]> {
  // A. Primary Cloud Database: Google Cloud Firestore
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
    console.warn('Firestore fetch products failed, trying backend fallback:', err);
  }

  // B. Secondary Backend REST API fallback
  if (!isStaticHost()) {
    try {
      const backendParams = new URLSearchParams();
      if (category && category !== 'All') backendParams.set('category', category);
      if (searchQuery.trim()) backendParams.set('q', searchQuery.trim());

      const backendRes = await httpFetch(`/api/products?${backendParams.toString()}`);
      if (backendRes.ok) {
        const result = await backendRes.json();
        if (result.products && result.products.length > 0) {
          setLocalProducts(result.products);
          return result.products;
        }
      }
    } catch {}
  }

  // C. Resilient Local Storage fallback
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

// 2. Create product via standard REST/HTTP POST
export async function createProduct(
  product: Omit<Product, 'id' | 'created_at'>
): Promise<Product> {
  const newId = 'prod-' + Date.now().toString().slice(-6);
  const now = new Date().toISOString();

  const productRecord: Product = {
    id: newId,
    name: product.name,
    category: product.category,
    price: product.price,
    old_price: product.old_price,
    stock: product.stock,
    image_url: product.image_url,
    tag: product.tag || 'NEW',
    fabric: product.fabric || 'Indian Ethnic Craft',
    created_at: now,
  };

  let createdProduct: Product | null = null;

  // A. Primary Cloud Database: Google Cloud Firestore
  try {
    createdProduct = await saveFirestoreProduct(productRecord);
  } catch (err) {
    console.warn('Firestore product creation warning:', err);
  }

  // B. Attempt Backend REST API
  if (!isStaticHost()) {
    try {
      const token = getStoredToken();
      const backendRes = await httpFetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        if (!createdProduct) createdProduct = data.product as Product;
      }
    } catch {}
  }

  // C. Fallback: Save to Local Storage Cache
  if (!createdProduct) {
    createdProduct = productRecord;
  }

  const existing = getLocalProducts();
  setLocalProducts([createdProduct, ...existing.filter((p) => p.id !== createdProduct!.id)]);

  // Log in merchant audit stream
  addMerchantActivity({
    type: 'inventory',
    title: 'New Product Added',
    detail: `"${createdProduct.name}" added to catalog (${createdProduct.stock} units · ₹${createdProduct.price})`,
  });

  return createdProduct;
}

// 3. Update stock via Firestore cloud database
export async function updateProductStock(
  id: string,
  stock: number
): Promise<Product> {
  let updatedProduct: Product | null = null;

  // A. Primary Cloud Database: Google Cloud Firestore
  try {
    await updateFirestoreProductStock(id, stock);
  } catch (err) {
    console.warn('Firestore stock update warning:', err);
  }

  // B. Attempt Backend REST API
  if (!isStaticHost()) {
    try {
      const token = getStoredToken();
      const backendRes = await httpFetch(`/api/products/${id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock }),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        updatedProduct = data.product as Product;
      }
    } catch {}
  }

  // C. Fallback: Update Local Storage Cache
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

// 4. Delete product from Firestore cloud database
export async function deleteProduct(id: string): Promise<void> {
  // A. Primary Cloud Database: Google Cloud Firestore
  try {
    await deleteFirestoreProduct(id);
  } catch (err) {
    console.warn('Firestore delete warning:', err);
  }

  // B. Attempt Backend REST API
  if (!isStaticHost()) {
    try {
      const token = getStoredToken();
      await httpFetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }

  // C. Local storage update
  const existing = getLocalProducts();
  setLocalProducts(existing.filter((p) => p.id !== id));

  addMerchantActivity({
    type: 'inventory',
    title: 'Product Removed',
    detail: `Product #${id} removed from catalog`,
  });
}


// 5. Create Order via Firestore cloud database
export async function createOrder(payload: {
  customer_details: CustomerDetails;
  items: OrderItem[];
  payment_method: 'UPI' | 'COD';
  upi_ref_id?: string;
  total: number;
}): Promise<Order> {
  const orderId = 'IIC-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date().toISOString();

  const newOrder: Order = {
    id: orderId,
    customer_details: payload.customer_details,
    items: payload.items,
    payment_method: payload.payment_method,
    upi_ref_id: payload.upi_ref_id || undefined,
    status: 'Confirmed',
    total: payload.total,
    created_at: now,
  };

  let placedOrder: Order | null = null;

  // A. Primary Cloud Database: Google Cloud Firestore
  try {
    placedOrder = await saveFirestoreOrder(newOrder);
    // Decrement stock in Firestore cloud database
    for (const item of payload.items) {
      const currentProducts = await fetchFirestoreProducts();
      const prod = currentProducts.find((p) => p.id === item.id);
      if (prod) {
        const nextStock = Math.max(0, prod.stock - item.qty);
        await updateFirestoreProductStock(item.id, nextStock);
      }
    }
  } catch (err) {
    console.warn('Firestore order placement warning:', err);
  }

  // B. Attempt Backend REST API
  if (!isStaticHost()) {
    try {
      const backendRes = await httpFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        if (!placedOrder) placedOrder = data.order as Order;
      }
    } catch {}
  }

  if (!placedOrder) {
    placedOrder = newOrder;
  }

  const existingOrders = getLocalOrders();
  setLocalOrders([placedOrder, ...existingOrders.filter((o) => o.id !== placedOrder!.id)]);

  // Decrement stock in local cache
  const products = getLocalProducts();
  payload.items.forEach((item) => {
    const prod = products.find((p) => p.id === item.id);
    if (prod) {
      const newStock = Math.max(0, prod.stock - item.qty);
      prod.stock = newStock;
    }
  });
  setLocalProducts(products);

  addMerchantActivity({
    type: 'order',
    title: 'New Customer Order Placed',
    detail: `Order #${placedOrder.id} placed by ${placedOrder.customer_details.name} (₹${placedOrder.total.toLocaleString('en-IN')} via ${placedOrder.payment_method === 'UPI' ? 'UPI QR' : 'Cash on Delivery'})`,
  });

  return placedOrder;
}

// 6. Fetch Orders via Firestore cloud database
export async function fetchOrders(): Promise<Order[]> {
  // A. Primary Cloud Database: Google Cloud Firestore
  try {
    const list = await fetchFirestoreOrders();
    if (list && list.length > 0) {
      setLocalOrders(list);
      return list;
    }
  } catch (err) {
    console.warn('Firestore fetch orders warning:', err);
  }

  // B. Attempt Backend REST API only if not static host
  if (!isStaticHost()) {
    try {
      const token = getStoredToken();
      const backendRes = await httpFetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        if (data.orders && data.orders.length > 0) {
          setLocalOrders(data.orders);
          return data.orders;
        }
      }
    } catch {}
  }

  // C. Fallback to Local Storage Cache
  return getLocalOrders();
}

// 7. Update Order Status in Firestore cloud database
export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<Order> {
  let updatedOrder: Order | null = null;

  // A. Primary Cloud Database: Google Cloud Firestore
  try {
    await updateFirestoreOrderStatus(orderId, status);
  } catch (err) {
    console.warn('Firestore update order status warning:', err);
  }

  // B. Attempt Backend REST API only if not static host
  if (!isStaticHost()) {
    try {
      const token = getStoredToken();
      const backendRes = await httpFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        updatedOrder = data.order as Order;
      }
    } catch {}
  }

  // C. Local storage update
  const orders = getLocalOrders();
  const found = orders.find((o) => o.id === orderId);
  if (found) {
    found.status = status;
    updatedOrder = { ...found };
    setLocalOrders(orders);
  } else if (!updatedOrder) {
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

// 8. Admin Authentication
export async function loginAdmin(
  password: string,
  email?: string
): Promise<{ token: string; user: { email: string; role: string } }> {
  // If running in full-stack mode, authenticate against backend route to get server token
  if (!isStaticHost()) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, email }),
      });

      if (res.ok) {
        const data = await res.json();
        setStoredToken(data.token);
        return data;
      }
    } catch {}
  }

  // If static deployment (GitHub Pages) or offline, verify demo credentials locally
  if (password === 'ishq2026') {
    const demoToken = 'ishq_static_admin_token_' + Date.now();
    setStoredToken(demoToken);
    return {
      token: demoToken,
      user: { email: email || 'admin@indianishq.com', role: 'admin' },
    };
  }

  throw new Error('Invalid merchant credentials');
}

export async function verifyAdminSession(token = getStoredToken()): Promise<boolean> {
  if (!token) return false;
  if (token.startsWith('ishq_static_admin_token_')) return true;
  try {
    const res = await fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return true; // Graceful offline admin access for authenticated token
  }
}

// 9. Generate UPI QR Code (Robust client-side & server-side generation)
export async function generateUpiQrCode(params: {
  amount: number;
  orderRef: string;
  payeeName?: string;
  vpa?: string;
}): Promise<{ upiUri: string; qrDataUrl: string; vpa: string }> {
  if (!isStaticHost()) {
    try {
      const res = await httpFetch('/api/upi/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }, 1500);

      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }

  // Client-side fallback generation (works statically on GitHub Pages)
  const QRCode = (await import('qrcode')).default;
  const { generateUpiUri } = await import('../utils/ecommerce');

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

// 10. Direct Image Upload via Standard REST/HTTP with Camera/Base64 Fallback
export async function uploadImageDirect(file: File): Promise<string> {
  if (!file) throw new Error('No file selected');
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image size must be under 10MB');
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '');
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${cleanExt}`;
  const filePath = `products/${fileName}`;

  // Read base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file data'));
    reader.readAsDataURL(file);
  });

  const supabaseUrl = getEffectiveSupabaseUrl();

  // A. Attempt standard HTTP REST upload to Supabase Storage endpoint
  if (!isPlaceholderSupabaseUrl(supabaseUrl) && isCloudCircuitActive()) {
    try {
      const storageUrl = `${supabaseUrl}/storage/v1/object/product-images/${filePath}`;
      const res = await httpFetch(storageUrl, {
        method: 'POST',
        headers: {
          apikey: getEffectiveSupabaseKey(),
          Authorization: `Bearer ${getEffectiveSupabaseKey()}`,
          'Content-Type': file.type || 'image/jpeg',
        },
        body: file,
      }, 2500);

      if (res.ok) {
        resetCloudCircuit();
        return `${supabaseUrl}/storage/v1/object/public/product-images/${filePath}`;
      }
    } catch (err: any) {
      tripCloudCircuit(err.message || 'DNS unresolvable');
    }
  }

  // B. Attempt Backend REST /api/upload
  if (!isStaticHost()) {
    try {
      const token = getStoredToken();
      const res = await httpFetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          base64Data,
          filename: file.name,
        }),
      }, 2000);

      if (res.ok) {
        const data = await res.json();
        if (data.url) return data.url;
      }
    } catch {}
  }

  // C. Return clean inline Data URL (100% reliable for client preview & GitHub Pages)
  return base64Data;
}
