/**
 * Indian Ishq Collection - Supabase Pure REST/HTTP Client
 * Standard REST fetch operations — Zero WebSockets, zero real-time subscriptions
 */

export const SUPABASE_URL = 'https://totetycoeeqrsxsduhwx.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_H0rCbTz0yw118dY-2P8VIw_XrOVAFr1';

const SUPABASE_REST = `${SUPABASE_URL}/rest/v1`;

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// 1. Fetch products via standard REST HTTP GET
export async function getLiveProducts(category = 'All', searchQuery = '') {
  const params = new URLSearchParams();
  params.set('select', '*');
  if (category && category !== 'All') {
    params.set('category', `eq.${category}`);
  }
  if (searchQuery.trim()) {
    params.set('name', `ilike.%${searchQuery.trim()}%`);
  }
  params.set('order', 'created_at.desc');

  const res = await fetch(`${SUPABASE_REST}/products?${params.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) throw new Error('Failed to fetch products via REST');
  return res.json();
}

// 2. Insert order via standard REST HTTP POST
export async function insertOrder({ customer_details, items, payment_method, upi_ref_id, total }) {
  const orderId = 'IIC-' + Math.floor(100000 + Math.random() * 900000);

  const res = await fetch(`${SUPABASE_REST}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify([
      {
        id: orderId,
        customer_details,
        items,
        payment_method,
        upi_ref_id: upi_ref_id || null,
        status: 'Confirmed',
        total: Number(total),
        created_at: new Date().toISOString(),
      },
    ]),
  });

  if (!res.ok) throw new Error('Failed to place order via REST');
  const data = await res.json();
  return data[0];
}

// 3. Image Upload via standard REST HTTP POST
export async function uploadProductImageToStorage(file) {
  if (!file) throw new Error('No file selected');

  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  try {
    const storageUrl = `${SUPABASE_URL}/storage/v1/object/product-images/${filePath}`;
    const res = await fetch(storageUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    });

    if (res.ok) {
      return `${SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;
    }
  } catch (err) {
    console.warn('[Vanilla REST Storage Notice]:', err);
  }

  // Fallback to inline Data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
