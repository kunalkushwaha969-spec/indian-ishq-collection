import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import QRCode from 'qrcode';
import { generateUpiUri, type Product, type Order } from './src/utils/ecommerce.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.DISABLE_HMR = 'true';

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET_TOKEN = 'ishq_jwt_sec_884930194829';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ishq2026';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@indianishq.com';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initial seed products with gorgeous Indian ethnic wear imagery & realistic stock
const initialProducts: Product[] = [
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

// In-memory data store with disk cache fallback
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const productsFile = path.join(dataDir, 'products.json');
const ordersFile = path.join(dataDir, 'orders.json');

let products: Product[] = [];
let orders: Order[] = [];

try {
  if (fs.existsSync(productsFile)) {
    products = JSON.parse(fs.readFileSync(productsFile, 'utf-8'));
  } else {
    products = [...initialProducts];
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
  }
} catch (err) {
  products = [...initialProducts];
}

try {
  if (fs.existsSync(ordersFile)) {
    orders = JSON.parse(fs.readFileSync(ordersFile, 'utf-8'));
  } else {
    orders = [
      {
        id: 'IIC-902148',
        customer_details: {
          name: 'Priyanka Verma',
          phone: '9820112345',
          address: 'A-304, Green Heights, Andheri West, Mumbai, Maharashtra 400053',
        },
        items: [
          { id: 'prod-001', name: 'Gulabi Noor Anarkali Set', price: 1899, qty: 1 },
        ],
        payment_method: 'UPI',
        upi_ref_id: 'UPI902838194',
        status: 'Confirmed',
        total: 1899,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'IIC-891024',
        customer_details: {
          name: 'Aditi Sharma',
          phone: '9845098765',
          address: 'Plot 12, Indiranagar, Bengaluru, Karnataka 560038',
        },
        items: [
          { id: 'prod-002', name: 'Mogra Pure Cotton Daily Kurti', price: 899, qty: 1 },
        ],
        payment_method: 'COD',
        status: 'Packed',
        total: 998,
        created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
      },
    ];
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
  }
} catch (err) {
  orders = [];
}

function persistData() {
  try {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
  } catch (err) {
    console.error('Error persisting data:', err);
  }
}

// Authentication Middleware
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== ADMIN_SECRET_TOKEN) {
    return res.status(403).json({ error: 'Forbidden: Invalid merchant session token' });
  }

  next();
}

// API Routes
// 1. Auth Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Accepts either configured password or email+password
  const isEmailMatch = !email || email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isPassMatch = password === ADMIN_PASSWORD;

  if (isPassMatch && isEmailMatch) {
    return res.json({
      success: true,
      token: ADMIN_SECRET_TOKEN,
      user: {
        email: ADMIN_EMAIL,
        role: 'admin',
        brand: 'Indian Ishq Collection',
      },
    });
  }

  return res.status(401).json({ error: 'Invalid merchant credentials. Check password and try again.' });
});

// 2. Auth Verify
app.get('/api/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }
  const token = authHeader.split(' ')[1];
  if (token === ADMIN_SECRET_TOKEN) {
    return res.json({ valid: true, user: { email: ADMIN_EMAIL, role: 'admin' } });
  }
  return res.status(403).json({ valid: false });
});

// 3. Products Endpoints
app.get('/api/products', (req: Request, res: Response) => {
  const category = req.query.category as string;
  const search = (req.query.q as string || '').toLowerCase().trim();

  let filtered = [...products];

  if (category && category !== 'All') {
    filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search) ||
        (p.fabric && p.fabric.toLowerCase().includes(search))
    );
  }

  res.json({ products: filtered, count: filtered.length });
});

app.post('/api/products', requireAdminAuth, (req: Request, res: Response) => {
  const { name, category, price, old_price, stock, image_url, tag, fabric } = req.body;

  if (!name || !category || price === undefined || stock === undefined || !image_url) {
    return res.status(400).json({ error: 'Missing required product fields (name, category, price, stock, image_url)' });
  }

  const newProduct: Product = {
    id: 'prod-' + Date.now().toString().slice(-6),
    name: String(name).trim(),
    category: String(category).trim(),
    price: Number(price),
    old_price: old_price ? Number(old_price) : Number(price),
    stock: Math.max(0, parseInt(stock, 10)),
    image_url: String(image_url).trim(),
    tag: tag ? String(tag).trim() : 'NEW',
    fabric: fabric ? String(fabric).trim() : 'Pure Indian Fabric',
    created_at: new Date().toISOString(),
  };

  products.unshift(newProduct);
  persistData();

  res.status(201).json({ success: true, product: newProduct });
});

app.patch('/api/products/:id/stock', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { stock } = req.body;

  const product = products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  product.stock = Math.max(0, parseInt(stock, 10));
  persistData();

  res.json({ success: true, product });
});

app.delete('/api/products/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLen = products.length;
  products = products.filter((p) => p.id !== id);

  if (products.length === initialLen) {
    return res.status(404).json({ error: 'Product not found' });
  }

  persistData();
  res.json({ success: true, message: 'Product deleted' });
});

// 4. Orders Endpoints
app.get('/api/orders', requireAdminAuth, (req: Request, res: Response) => {
  res.json({ orders });
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { customer_details, items, payment_method, upi_ref_id, total } = req.body;

  if (!customer_details || !items || !Array.isArray(items) || items.length === 0 || !payment_method) {
    return res.status(400).json({ error: 'Invalid order payload. Missing items or customer details.' });
  }

  // Deduct inventory
  for (const item of items) {
    const prod = products.find((p) => p.id === item.id);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - (item.qty || 1));
    }
  }

  const orderId = 'IIC-' + Math.floor(100000 + Math.random() * 900000);
  const newOrder: Order = {
    id: orderId,
    customer_details,
    items,
    payment_method,
    upi_ref_id: upi_ref_id || undefined,
    status: payment_method === 'UPI' ? 'Confirmed' : 'Confirmed',
    total: Number(total),
    created_at: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  persistData();

  res.status(201).json({ success: true, order: newOrder });
});

app.patch('/api/orders/:id/status', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = status;
  persistData();

  res.json({ success: true, order });
});

// 5. Dynamic UPI QR Code Generation
app.post('/api/upi/qr', async (req: Request, res: Response) => {
  try {
    const { amount, orderRef, payeeName, vpa } = req.body;
    const finalVpa = vpa || 'indianishq@okaxis';
    const finalName = payeeName || 'Indian Ishq Collection';
    const finalNote = `Order ${orderRef || 'Payment'}`;

    const upiUri = generateUpiUri({
      vpa: finalVpa,
      payeeName: finalName,
      amount: Number(amount) || 1,
      transactionNote: finalNote,
      transactionRef: orderRef,
    });

    const qrDataUrl = await QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 2,
      color: {
        dark: '#4c1727', // Matching brand wine color
        light: '#ffffff',
      },
    });

    res.json({
      upiUri,
      qrDataUrl,
      vpa: finalVpa,
      payeeName: finalName,
      amount: Number(amount),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate UPI QR code' });
  }
});

// 6. Direct Image Upload (handles Base64 or Cloud Storage Proxy)
app.post('/api/upload', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // In a real cloud bucket, this streams to Supabase or Firebase Storage.
    // For this serverless environment, we safely store in data URLs or static assets.
    res.json({
      success: true,
      url: base64Data,
      filename: filename || 'uploaded_image.jpg',
      size: Math.round(base64Data.length * 0.75),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Image upload failed: ' + err.message });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Indian Ishq Collection full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
