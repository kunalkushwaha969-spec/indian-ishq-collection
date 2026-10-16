import type { Product, Order, CustomerDetails, OrderItem } from '../utils/ecommerce';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { addMerchantActivity } from './activity';

const TOKEN_KEY = 'ishq_merchant_token';

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

    const res = await httpFetch(`${SUPABASE_REST}/products?${params.toString()}`, {
      method: 'GET',
      headers: getSupabaseHeaders(),
    }, 1500);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data as Product[];
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Supabase cloud HTTP fetch notice (using backend REST):', err.message || err);
  }

  // B. Standard Backend REST HTTP GET fallback
  const backendParams = new URLSearchParams();
  if (category && category !== 'All') backendParams.set('category', category);
  if (searchQuery.trim()) backendParams.set('q', searchQuery.trim());

  const backendRes = await fetch(`/api/products?${backendParams.toString()}`);
  if (!backendRes.ok) {
    throw new Error('Failed to fetch live products catalog');
  }

  const result = await backendRes.json();
  return (result.products || []) as Product[];
}

// 2. Create product via standard REST/HTTP POST
export async function createProduct(
  product: Omit<Product, 'id' | 'created_at'>
): Promise<Product> {
  const newId = 'prod-' + Date.now().toString().slice(-6);
  const now = new Date().toISOString();

  const productRecord = {
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
    const res = await httpFetch(`${SUPABASE_REST}/products`, {
      method: 'POST',
      headers: getSupabaseHeaders(),
      body: JSON.stringify([productRecord]),
    }, 1800);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        createdProduct = data[0] as Product;
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Direct cloud POST notice, saving via backend REST:', err.message || err);
  }

  // B. Standard Backend REST HTTP POST
  if (!createdProduct) {
    const token = getStoredToken();
    const backendRes = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(product),
    });

    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create product');
    }

    const data = await backendRes.json();
    createdProduct = data.product as Product;
  }

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
  // A. Attempt Supabase PostgREST HTTP PATCH
  try {
    const res = await httpFetch(`${SUPABASE_REST}/products?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(),
      body: JSON.stringify({ stock }),
    }, 1500);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Also update backend store
        const token = getStoredToken();
        fetch(`/api/products/${id}/stock`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ stock }),
        }).catch(() => {});

        addMerchantActivity({
          type: 'inventory',
          title: 'Stock Count Adjusted',
          detail: `Stock for item #${id} set to ${stock} units`,
        });

        return data[0] as Product;
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Cloud PATCH notice, updating via backend REST:', err.message || err);
  }

  // B. Backend REST HTTP PATCH
  const token = getStoredToken();
  const backendRes = await fetch(`/api/products/${id}/stock`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ stock }),
  });

  if (!backendRes.ok) {
    throw new Error('Failed to update stock');
  }

  const data = await backendRes.json();
  const updated = data.product as Product;

  addMerchantActivity({
    type: 'inventory',
    title: 'Stock Count Adjusted',
    detail: `Stock for item #${id} set to ${stock} units`,
  });

  return updated;
}

// 4. Delete product via standard REST/HTTP DELETE
export async function deleteProduct(id: string): Promise<void> {
  // A. Attempt Supabase PostgREST HTTP DELETE
  try {
    await httpFetch(`${SUPABASE_REST}/products?id=eq.${id}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(),
    }, 1500);
  } catch (err: any) {
    console.info('[REST Data Service]: Cloud DELETE notice, deleting via backend REST:', err.message || err);
  }

  // B. Backend REST HTTP DELETE
  const token = getStoredToken();
  const backendRes = await fetch(`/api/products/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!backendRes.ok) {
    throw new Error('Failed to delete product');
  }

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

  const orderRecord = {
    id: orderId,
    customer_details: payload.customer_details,
    items: payload.items,
    payment_method: payload.payment_method,
    upi_ref_id: payload.upi_ref_id || null,
    status: 'Confirmed',
    total: payload.total,
    created_at: now,
  };

  let placedOrder: Order | null = null;

  // A. Attempt Supabase PostgREST HTTP POST
  try {
    const res = await httpFetch(`${SUPABASE_REST}/orders`, {
      method: 'POST',
      headers: getSupabaseHeaders(),
      body: JSON.stringify([orderRecord]),
    }, 1800);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        placedOrder = data[0] as Order;
        // Sync with backend
        fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Cloud order POST notice, saving via backend REST:', err.message || err);
  }

  // B. Backend REST HTTP POST
  if (!placedOrder) {
    const backendRes = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to place order');
    }

    const data = await backendRes.json();
    placedOrder = data.order as Order;
  }

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
    const res = await httpFetch(`${SUPABASE_REST}/orders?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: getSupabaseHeaders(),
    }, 1500);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data as Order[];
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Cloud orders GET notice, fetching via backend REST:', err.message || err);
  }

  // B. Backend REST HTTP GET
  const token = getStoredToken();
  const backendRes = await fetch('/api/orders', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!backendRes.ok) {
    throw new Error('Failed to fetch orders or unauthorized');
  }

  const data = await backendRes.json();
  return (data.orders || []) as Order[];
}

// 7. Update Order Status via standard REST/HTTP PATCH
export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<Order> {
  // A. Attempt Supabase PostgREST HTTP PATCH
  try {
    const res = await httpFetch(`${SUPABASE_REST}/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(),
      body: JSON.stringify({ status }),
    }, 1500);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const token = getStoredToken();
        fetch(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }).catch(() => {});

        addMerchantActivity({
          type: 'status',
          title: 'Order Status Changed',
          detail: `Order #${orderId} marked as "${status}"`,
        });

        return data[0] as Order;
      }
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Cloud order status PATCH notice:', err.message || err);
  }

  // B. Backend REST HTTP PATCH
  const token = getStoredToken();
  const backendRes = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!backendRes.ok) {
    throw new Error('Failed to update order status');
  }

  const data = await backendRes.json();
  const order = data.order as Order;

  addMerchantActivity({
    type: 'status',
    title: 'Order Status Changed',
    detail: `Order #${orderId} marked as "${status}"`,
  });

  return order;
}

// 8. Admin Authentication
export async function loginAdmin(
  password: string,
  email?: string
): Promise<{ token: string; user: { email: string; role: string } }> {
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
  try {
    const res = await fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 9. Generate UPI QR Code
export async function generateUpiQrCode(params: {
  amount: number;
  orderRef: string;
  payeeName?: string;
  vpa?: string;
}): Promise<{ upiUri: string; qrDataUrl: string; vpa: string }> {
  const res = await fetch('/api/upi/qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error('Failed to generate UPI QR code');
  }

  return res.json();
}

// 10. Direct Image Upload via Standard REST/HTTP
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

  // Attempt standard HTTP REST upload to Supabase Storage endpoint
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
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;
      return publicUrl;
    }
  } catch (err: any) {
    console.info('[REST Data Service]: Storage cloud HTTP upload notice:', err.message || err);
  }

  // Fallback to Backend REST /api/upload
  const token = getStoredToken();
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        base64Data,
        filename: file.name,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (backendErr: any) {
    console.warn('[REST Data Service]: Backend upload notice:', backendErr.message);
  }

  // Return clean inline Data URL
  return base64Data;
}
