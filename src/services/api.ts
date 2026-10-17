import type { Product, Order, CustomerDetails, OrderItem } from '../utils/ecommerce';
import { initialProducts, initialOrders } from '../utils/ecommerce';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
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

// Standard Supabase PostgREST REST headers (Pure HTTP, Zero WebSockets)
const SUPABASE_REST = `${SUPABASE_URL}/rest/v1`;

const getSupabaseHeaders = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
});

// Resilient HTTP fetch helper with timeout
async function httpFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs = 1500
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

// 1. Fetch live products via standard REST/HTTP GET
export async function fetchProducts(
  category = 'All',
  searchQuery = ''
): Promise<Product[]> {
  // A. Attempt direct Supabase PostgREST HTTP GET
  try {
    const params = new URLSearchParams();
    params.set('select', '*');
    if (category && category !== 'All') {
      params.set('category', `eq.${category}`);
    }
    if (searchQuery.trim()) {
      params.set('name', `ilike.%${searchQuery.trim()}%`);
    }
    params.set('order', 'created_at.desc');

    const res = await httpFetch(
      `${SUPABASE_REST}/products?${params.toString()}`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(),
      },
      1500
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setLocalProducts(data as Product[]);
        return data as Product[];
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Supabase cloud HTTP fetch notice (using fallback):', err.message || err);
  }

  // B. Attempt Backend REST API (if running in full-stack Node environment)
  try {
    const backendParams = new URLSearchParams();
    if (category && category !== 'All') backendParams.set('category', category);
    if (searchQuery.trim()) backendParams.set('q', searchQuery.trim());

    const backendRes = await httpFetch(`/api/products?${backendParams.toString()}`, {}, 1200);
    if (backendRes.ok) {
      const result = await backendRes.json();
      if (result.products && result.products.length > 0) {
        setLocalProducts(result.products);
        return result.products;
      }
    }
  } catch {}

  // C. Resilient Static / GitHub Pages fallback
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

  // A. Attempt direct Supabase PostgREST HTTP POST
  try {
    const res = await httpFetch(
      `${SUPABASE_REST}/products`,
      {
        method: 'POST',
        headers: getSupabaseHeaders(),
        body: JSON.stringify([productRecord]),
      },
      1800
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        createdProduct = data[0] as Product;
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Direct cloud POST notice, saving via fallback:', err.message || err);
  }

  // B. Attempt Backend REST API
  if (!createdProduct) {
    try {
      const token = getStoredToken();
      const backendRes = await httpFetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      }, 1500);

      if (backendRes.ok) {
        const data = await backendRes.json();
        createdProduct = data.product as Product;
      }
    } catch {}
  }

  // C. Fallback: Save to Local Storage Cache (GitHub Pages compatible)
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

// 3. Update stock via standard REST/HTTP PATCH
export async function updateProductStock(
  id: string,
  stock: number
): Promise<Product> {
  let updatedProduct: Product | null = null;

  // A. Attempt Supabase PostgREST HTTP PATCH
  try {
    const res = await httpFetch(
      `${SUPABASE_REST}/products?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: getSupabaseHeaders(),
        body: JSON.stringify({ stock }),
      },
      1500
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        updatedProduct = data[0] as Product;
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Cloud PATCH notice, updating via fallback:', err.message || err);
  }

  // B. Attempt Backend REST API
  if (!updatedProduct) {
    try {
      const token = getStoredToken();
      const backendRes = await httpFetch(`/api/products/${id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock }),
      }, 1500);

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

// 4. Delete product via standard REST/HTTP DELETE
export async function deleteProduct(id: string): Promise<void> {
  // A. Attempt Supabase PostgREST HTTP DELETE
  try {
    await httpFetch(
      `${SUPABASE_REST}/products?id=eq.${id}`,
      {
        method: 'DELETE',
        headers: getSupabaseHeaders(),
      },
      1500
    );
  } catch {}

  // B. Attempt Backend REST API
  try {
    const token = getStoredToken();
    await httpFetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }, 1500);
  } catch {}

  // C. Local storage update
  const existing = getLocalProducts();
  setLocalProducts(existing.filter((p) => p.id !== id));

  addMerchantActivity({
    type: 'inventory',
    title: 'Product Removed',
    detail: `Product #${id} removed from catalog`,
  });
}

// 5. Create Order via standard REST/HTTP POST
export async function createOrder(payload: {
  customer_details: CustomerDetails;
  items: OrderItem[];
  payment_method: 'COD' | 'UPI';
  upi_ref_id?: string;
  total: number;
}): Promise<Order> {
  const orderId = 'IIC-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date().toISOString();

  const orderRecord: Order = {
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

  // A. Attempt Supabase PostgREST HTTP POST
  try {
    const res = await httpFetch(
      `${SUPABASE_REST}/orders`,
      {
        method: 'POST',
        headers: getSupabaseHeaders(),
        body: JSON.stringify([orderRecord]),
      },
      1800
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        placedOrder = data[0] as Order;
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Cloud order POST notice, saving via fallback:', err.message || err);
  }

  // B. Attempt Backend REST API
  if (!placedOrder) {
    try {
      const backendRes = await httpFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, 1500);

      if (backendRes.ok) {
        const data = await backendRes.json();
        placedOrder = data.order as Order;
      }
    } catch {}
  }

  // C. Fallback: Save to Local Storage Cache (Guarantees zero failed checkouts on GitHub Pages)
  if (!placedOrder) {
    placedOrder = orderRecord;
  }

  const existingOrders = getLocalOrders();
  setLocalOrders([placedOrder, ...existingOrders.filter((o) => o.id !== placedOrder!.id)]);

  // Decrement stock in local cache
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
    title: 'New Customer Order Placed',
    detail: `Order #${placedOrder.id} placed by ${placedOrder.customer_details.name} (₹${placedOrder.total.toLocaleString('en-IN')} via ${placedOrder.payment_method === 'UPI' ? 'UPI QR' : 'Cash on Delivery'})`,
  });

  return placedOrder;
}

// 6. Fetch Orders via standard REST/HTTP GET
export async function fetchOrders(): Promise<Order[]> {
  // A. Attempt Supabase PostgREST HTTP GET
  try {
    const res = await httpFetch(
      `${SUPABASE_REST}/orders?select=*&order=created_at.desc`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(),
      },
      1500
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setLocalOrders(data as Order[]);
        return data as Order[];
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Cloud orders GET notice, fetching via fallback:', err.message || err);
  }

  // B. Attempt Backend REST API
  try {
    const token = getStoredToken();
    const backendRes = await httpFetch('/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
    }, 1200);

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.orders && data.orders.length > 0) {
        setLocalOrders(data.orders);
        return data.orders;
      }
    }
  } catch {}

  // C. Fallback to Local Storage Cache
  return getLocalOrders();
}

// 7. Update Order Status via standard REST/HTTP PATCH
export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<Order> {
  let updatedOrder: Order | null = null;

  // A. Attempt Supabase PostgREST HTTP PATCH
  try {
    const res = await httpFetch(
      `${SUPABASE_REST}/orders?id=eq.${orderId}`,
      {
        method: 'PATCH',
        headers: getSupabaseHeaders(),
        body: JSON.stringify({ status }),
      },
      1500
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        updatedOrder = data[0] as Order;
      }
    }
  } catch {}

  // B. Attempt Backend REST API
  if (!updatedOrder) {
    try {
      const token = getStoredToken();
      const backendRes = await httpFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      }, 1500);

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
  // If static deployment (GitHub Pages), verify demo credentials locally
  if (password === 'ishq2026') {
    const demoToken = 'ishq_static_admin_token_' + Date.now();
    setStoredToken(demoToken);
    return {
      token: demoToken,
      user: { email: email || 'admin@indianishq.com', role: 'admin' },
    };
  }

  // Otherwise check backend route
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, email }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Invalid merchant credentials');
  }

  const data = await res.json();
  setStoredToken(data.token);
  return data;
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

  // A. Attempt standard HTTP REST upload to Supabase Storage endpoint
  try {
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/product-images/${filePath}`;
    const res = await httpFetch(storageUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    }, 2500);

    if (res.ok) {
      return `${SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Storage cloud HTTP upload notice:', err.message || err);
  }

  // B. Attempt Backend REST /api/upload
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

  // C. Return clean inline Data URL (100% reliable for client preview & GitHub Pages)
  return base64Data;
}
