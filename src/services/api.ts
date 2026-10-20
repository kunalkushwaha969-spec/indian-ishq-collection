import type { Product, Order, CustomerDetails, OrderItem } from '../utils/ecommerce';
import {
  initialProducts,
  initialOrders,
  formatINR,
  generateUpiUri,
  resolveInitialOrderStatus,
  resolveSafeProductImage,
} from '../utils/ecommerce';
import {
  auth,
  getMerchantRole,
  isAuthorizedMerchantUser,
  isValidMerchantRole,
  signInMerchantWithEmail,
  signInMerchantWithGoogle,
  signOutMerchant,
  subscribeToMerchantAuth,
  fetchFirestoreProducts,
  saveFirestoreProduct,
  updateFirestoreProductStock,
  deleteFirestoreProduct,
  fetchFirestoreOrders,
  saveFirestoreOrder,
  updateFirestoreOrderStatus,
  subscribeToFirestoreProducts,
  subscribeToFirestoreOrders,
  type MerchantRole,
} from './firebase';
export {
  subscribeToFirestoreProducts,
  subscribeToFirestoreOrders,
  subscribeToMerchantAuth,
  signInMerchantWithGoogle,
  signOutMerchant,
  getMerchantRole,
  isAuthorizedMerchantUser,
  isValidMerchantRole,
  type MerchantRole,
};

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
    if (raw) {
      const parsed = JSON.parse(raw) as Product[];
      return parsed.map((p) => ({ ...p, image_url: resolveSafeProductImage(p) }));
    }
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
  const isAdmin = await isAuthorizedMerchantUser(auth?.currentUser || null);
  if (!isAdmin) {
    throw new Error('Unauthorized: Only authorized store administrators or merchants can add products.');
  }

  const newId = 'prod-' + Date.now().toString().slice(-6);
  const now = new Date().toISOString();

  const productRecord: Product = {
    id: newId,
    name: product.name,
    category: product.category,
    price: Number(product.price),
    ...(product.old_price && Number(product.old_price) > Number(product.price)
      ? { old_price: Number(product.old_price) }
      : {}),
    ...(product.description ? { description: product.description.trim() } : {}),
    ...(product.sizes && product.sizes.length > 0 ? { sizes: product.sizes } : {}),
    stock: Number(product.stock),
    image_url: product.image_url,
    tag: product.tag || 'NEW',
    fabric: product.fabric || 'Indian Ethnic Craft',
    created_at: now,
  };

  const createdProduct = await saveFirestoreProduct(productRecord);

  const existing = getLocalProducts();
  setLocalProducts([createdProduct, ...existing.filter((p) => p.id !== createdProduct.id)]);

  addMerchantActivity({
    type: 'inventory',
    title: 'New Product Added',
    detail: `"${createdProduct.name}" added to catalog (${createdProduct.stock} units · ₹${createdProduct.price})`,
  });

  return createdProduct;
}

export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, 'id'>>
): Promise<Product> {
  const isAdmin = await isAuthorizedMerchantUser(auth?.currentUser || null);
  if (!isAdmin) {
    throw new Error('Unauthorized: Only authorized store administrators or merchants can update products.');
  }

  const existing = getLocalProducts();
  const current = existing.find((p) => p.id === id);

  const nextPrice =
    updates.price !== undefined ? Number(updates.price) : current?.price ?? 1499;
  const nextOldPrice =
    updates.old_price !== undefined
      ? Number(updates.old_price)
      : current?.old_price;

  const updatedRecord: Product = {
    id,
    name: updates.name !== undefined ? updates.name.trim() : current?.name || 'Boutique Piece',
    category: updates.category !== undefined ? updates.category : current?.category || 'Kurtis',
    price: nextPrice,
    ...(nextOldPrice && nextOldPrice > nextPrice ? { old_price: nextOldPrice } : {}),
    ...(updates.description !== undefined
      ? updates.description.trim()
        ? { description: updates.description.trim() }
        : {}
      : current?.description
      ? { description: current.description }
      : {}),
    ...(updates.sizes !== undefined
      ? updates.sizes.length > 0
        ? { sizes: updates.sizes }
        : {}
      : current?.sizes
      ? { sizes: current.sizes }
      : {}),
    stock:
      updates.stock !== undefined
        ? Math.max(0, Number(updates.stock))
        : current?.stock ?? 10,
    image_url:
      updates.image_url !== undefined
        ? updates.image_url
        : current?.image_url ||
          'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
    tag: updates.tag !== undefined ? updates.tag : current?.tag || 'NEW',
    fabric:
      updates.fabric !== undefined
        ? updates.fabric
        : current?.fabric || 'Handcrafted Indian Ethnic Wear',
    created_at: current?.created_at || new Date().toISOString(),
  };

  await saveFirestoreProduct(updatedRecord);

  const nextList = existing.some((p) => p.id === id)
    ? existing.map((p) => (p.id === id ? updatedRecord : p))
    : [updatedRecord, ...existing];
  setLocalProducts(nextList);

  addMerchantActivity({
    type: 'inventory',
    title: 'Product Updated',
    detail: `"${updatedRecord.name}" updated (${updatedRecord.stock} in stock · ₹${updatedRecord.price})`,
  });

  return updatedRecord;
}

export async function updateProductStock(
  id: string,
  stock: number
): Promise<Product> {
  const isAdmin = await isAuthorizedMerchantUser(auth?.currentUser || null);
  if (!isAdmin) {
    throw new Error('Unauthorized: Only authorized store administrators or merchants can update stock.');
  }

  let updatedProduct: Product | null = null;

  await updateFirestoreProductStock(id, stock);

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
  const isAdmin = await isAuthorizedMerchantUser(auth?.currentUser || null);
  if (!isAdmin) {
    throw new Error('Unauthorized: Only authorized store administrators or merchants can delete products.');
  }

  await deleteFirestoreProduct(id);

  const existing = getLocalProducts();
  setLocalProducts(existing.filter((p) => p.id !== id));

  addMerchantActivity({
    type: 'inventory',
    title: 'Product Removed',
    detail: `Product #${id} removed from catalog`,
  });
}

// Fixed Order Creation (Cleaned of undefined fields so Firestore accepts order payload successfully)
export async function createOrder(payload: {
  customer_details: CustomerDetails;
  items: OrderItem[];
  payment_method?: 'UPI' | 'COD' | 'RAZORPAY' | string;
  upi_ref_id?: string;
  razorpay_payment_id?: string;
  total: number;
}): Promise<Order> {
  const orderId = 'IIC-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date().toISOString();

  const method =
    payload.payment_method === 'RAZORPAY' || payload.payment_method === 'UPI'
      ? payload.payment_method
      : 'COD';
  const initialStatus = resolveInitialOrderStatus(
    method,
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
    payment_method: (payload.payment_method as any) || 'COD',
    ...(payload.upi_ref_id ? { upi_ref_id: payload.upi_ref_id } : {}),
    ...(payload.razorpay_payment_id ? { razorpay_payment_id: payload.razorpay_payment_id } : {}),
    status: initialStatus,
    total: Number(payload.total),
    created_at: now,
  };

  let placedOrder: Order;

  try {
    placedOrder = await saveFirestoreOrder(newOrder);
  } catch (err) {
    console.error('Firestore order placement error:', err);
    throw new Error(
      'Unable to save your order to the store database right now. Please verify your internet connection and try again.'
    );
  }

  // Best-effort stock decrement when called by an authenticated merchant
  if (auth?.currentUser) {
    try {
      const currentProducts = await fetchFirestoreProducts();
      for (const item of payload.items) {
        const prod = currentProducts.find((p) => p.id === item.id);
        if (prod) {
          const nextStock = Math.max(0, prod.stock - item.qty);
          await updateFirestoreProductStock(item.id, nextStock);
        }
      }
    } catch {
      // Non-admin customers cannot mutate /products directly under strict Firestore rules
    }
  }

  const existingOrders = getLocalOrders();
  setLocalOrders([placedOrder, ...existingOrders.filter((o) => o.id !== placedOrder.id)]);

  const products = getLocalProducts();
  payload.items.forEach((item) => {
    const prod = products.find((p) => p.id === item.id);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - item.qty);
    }
  });
  setLocalProducts(products);

  addMerchantActivity({
    type: 'order',
    title: 'New Customer Order Received',
    detail: `Order #${placedOrder.id} received from ${placedOrder.customer_details.name} (₹${placedOrder.total.toLocaleString('en-IN')}) — Status: ${placedOrder.status}`,
  });

  return placedOrder;
}

export async function fetchOrders(): Promise<Order[]> {
  const isAdmin = await isAuthorizedMerchantUser(auth?.currentUser || null);
  if (!isAdmin) {
    throw new Error('Unauthorized: Only authenticated store administrators can view customer orders.');
  }
  const list = await fetchFirestoreOrders();
  setLocalOrders(list);
  return list;
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<Order> {
  const isAdmin = await isAuthorizedMerchantUser(auth?.currentUser || null);
  if (!isAdmin) {
    throw new Error('Unauthorized: Only authenticated store administrators can update order status.');
  }

  await updateFirestoreOrderStatus(orderId, status);

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
      payment_method: 'COD',
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
): Promise<{ token: string; user: { email: string; role: MerchantRole } }> {
  const normalizedEmail = (email || '').trim();
  if (!normalizedEmail || !password) {
    throw new Error('Please enter both your administrator email and password.');
  }

  const firebaseUser = await signInMerchantWithEmail(normalizedEmail, password);
  const role = (await getMerchantRole(firebaseUser)) || 'merchant';
  const idToken = await firebaseUser.getIdToken();
  setStoredToken(idToken);

  return {
    token: idToken,
    user: {
      email: firebaseUser.email || normalizedEmail,
      role,
    },
  };
}

export async function loginAdminWithGoogle(): Promise<{
  token: string;
  user: { email: string; role: MerchantRole };
}> {
  const firebaseUser = await signInMerchantWithGoogle();
  const role = (await getMerchantRole(firebaseUser)) || 'merchant';
  const idToken = await firebaseUser.getIdToken();
  setStoredToken(idToken);

  return {
    token: idToken,
    user: {
      email: firebaseUser.email || '',
      role,
    },
  };
}

export async function verifyAdminSession(): Promise<boolean> {
  if (!auth?.currentUser) {
    setStoredToken(null);
    return false;
  }
  const authorized = await isAuthorizedMerchantUser(auth.currentUser);
  if (!authorized) {
    setStoredToken(null);
  }
  return authorized;
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
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file data'));
    reader.readAsDataURL(file);
  });

  // Optimize large images in browser via canvas so multiple slideshow uploads fit in Firestore (1MB limit)
  if (typeof document !== 'undefined' && typeof Image !== 'undefined' && file.size > 180 * 1024) {
    try {
      const compressed = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 1400;
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;
            if (width > maxDim || height > maxDim) {
              if (width >= height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawDataUrl);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      });
      return compressed;
    } catch {
      return rawDataUrl;
    }
  }

  return rawDataUrl;
}
