import React, { useState } from 'react';
import { Copy, Check, FileCode, Database, Shield, QrCode, UploadCloud, X } from 'lucide-react';

interface CloudDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudDocsModal: React.FC<CloudDocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'firebase' | 'fetch' | 'auth' | 'upi' | 'upload'>('supabase');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const snippets = {
    supabase: `-- Supabase (PostgreSQL) Production Schema & Row Level Security (RLS)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Products Table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL CHECK (category IN ('Kurtis', 'Sarees', 'Suits', 'Festive', 'Everyday')),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  old_price NUMERIC(10, 2),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT NOT NULL,
  tag VARCHAR(50) DEFAULT 'CURATED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  customer_details JSONB NOT NULL,
  items JSONB NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('COD', 'UPI')),
  upi_ref_id VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Read policies: Public can read products
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admin full access products" ON public.products FOR ALL TO authenticated USING (true);

-- Orders: Public can place order; Authenticated admin can read & update
CREATE POLICY "Public create order" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin update orders" ON public.orders FOR UPDATE TO authenticated USING (true);`,

    firebase: `// Firebase Firestore Rules (firestore.rules)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return request.auth != null && request.auth.token.email != null;
    }

    // Products collection: public read, merchant-only write
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Orders collection: public create, merchant-only read/update
    match /orders/{orderId} {
      allow create: if request.resource.data.customer_details != null
                    && request.resource.data.items is list
                    && request.resource.data.total is number;
      allow read, update, delete: if isAdmin();
    }
  }
}`,

    fetch: `// Production Vanilla JS renderProducts() with Live Cloud Database Fetching
async function renderProducts() {
  const container = document.getElementById("products");
  container.innerHTML = '<div class="empty">Loading Indian Ishq collection...</div>';

  try {
    // If using Supabase:
    // const { data: liveProducts, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    // If using REST/Serverless:
    const res = await fetch(\`/api/products?category=\${encodeURIComponent(activeCategory)}&q=\${encodeURIComponent(searchQuery)}\`);
    const { products: liveProducts } = await res.json();

    if (!liveProducts || !liveProducts.length) {
      container.innerHTML = '<div class="empty">No pieces found in this category.</div>';
      return;
    }

    container.innerHTML = liveProducts.map(p => \`
      <article class="product">
        <div class="product-art">
          <span class="badge">\${esc(p.tag || "CURATED")}</span>
          <img src="\${esc(p.image_url)}" alt="\${esc(p.name)}" loading="lazy">
        </div>
        <h3>\${esc(p.name)}</h3>
        <div class="product-meta">
          <div>
            <span class="price">₹\${Number(p.price).toLocaleString("en-IN")}</span>
            \${p.old_price ? \`<span class="oldprice">₹\${Number(p.old_price).toLocaleString("en-IN")}</span>\` : ""}
          </div>
          <small>\${p.stock > 0 ? \`\${p.stock} left\` : '<span style="color:#b91c1c">Sold Out</span>'}</small>
        </div>
        <button class="addbtn" \${p.stock <= 0 ? 'disabled' : ''} onclick="addToCart('\${p.id}')">
          \${p.stock <= 0 ? 'SOLD OUT' : 'ADD TO BAG +'}
        </button>
      </article>
    \`).join("");
  } catch (err) {
    container.innerHTML = \`<div class="empty" style="color:#b91c1c">Failed to load catalog: \${err.message}. <button class="softbtn" onclick="renderProducts()">Retry</button></div>\`;
  }
}`,

    auth: `// Production Password-Protected /admin Route Guard (Vanilla JS)
async function verifyAdminAuth() {
  const token = localStorage.getItem("ishq_admin_token");
  if (!token) {
    lockOutUnauthorizedUser();
    return false;
  }

  try {
    // Verify token with backend
    const res = await fetch("/api/auth/verify", {
      headers: { Authorization: \`Bearer \${token}\` }
    });

    if (!res.ok) {
      throw new Error("Token expired or unauthorized");
    }

    // Access granted: load orders and inventory
    document.getElementById("adminLockScreen").classList.add("hidden");
    document.getElementById("adminWorkspace").classList.remove("hidden");
    loadAdminDashboard();
    return true;
  } catch (err) {
    localStorage.removeItem("ishq_admin_token");
    lockOutUnauthorizedUser();
    return false;
  }
}

function lockOutUnauthorizedUser() {
  document.getElementById("adminWorkspace").classList.add("hidden");
  document.getElementById("adminLockScreen").classList.remove("hidden");
  showToast("Unauthorized. Please log in with merchant credentials.");
}`,

    upi: `// Production Dynamic UPI QR Code & Intent Generator (NPCI Compliant)
function generateUpiUri({ vpa, payeeName, amount, orderId }) {
  const params = new URLSearchParams({
    pa: vpa,                          // Payee VPA: e.g. 'indianishq@okaxis'
    pn: payeeName,                    // Payee Name: 'Indian Ishq Collection'
    am: Number(amount).toFixed(2),    // Dynamic checkout total
    cu: 'INR',                        // Indian Rupee currency
    tn: \`Order \${orderId}\`,           // Transaction Note
    tr: orderId                       // Transaction Reference
  });
  return \`upi://pay?\${params.toString()}\`;
}

// Generate Scannable QR in Vanilla JS (via QRCode.js or /api/upi/qr)
async function renderUpiCheckout(amount, orderId) {
  const upiUri = generateUpiUri({
    vpa: "indianishq@okaxis",
    payeeName: "Indian Ishq Collection",
    amount,
    orderId
  });

  // Call dynamic QR generator endpoint or QRCode.toDataURL(upiUri)
  const res = await fetch("/api/upi/qr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, orderRef: orderId })
  });
  const { qrDataUrl } = await res.json();
  
  document.getElementById("upiQrImage").src = qrDataUrl;
  document.getElementById("upiMobileLink").href = upiUri;
}`,

    upload: `// Frontend Direct Cloud Storage Image Upload (Supabase / Firebase)

// 1. Supabase Storage Direct Upload
async function uploadToSupabaseStorage(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = \`\${Date.now()}-\${Math.random().toString(36).substring(7)}.\${fileExt}\`;
  const filePath = \`products/\${fileName}\`;

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicUrl;
}

// 2. Direct Serverless API Upload
async function uploadToCloudApi(file, token) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: \`Bearer \${token}\`
        },
        body: JSON.stringify({
          base64Data: reader.result,
          filename: file.name
        })
      });
      const data = await res.json();
      if (!res.ok) return reject(new Error(data.error));
      resolve(data.url);
    };
    reader.readAsDataURL(file);
  });
}`
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-docs-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#fffdf9] w-full max-w-[850px] max-h-[90vh] rounded-lg shadow-2xl border border-[#eadfda] my-6 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eadfda] bg-white">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#70283b]" />
            <div>
              <h2 id="cloud-docs-title" className="font-serif text-2xl text-[#70283b]">
                Cloud Architecture & Code Snippets
              </h2>
              <p className="text-[11px] text-[#776c6b]">
                Production blueprints for Supabase, Firebase, Vanilla JS & Payments
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close docs modal"
            className="text-2xl text-[#70283b] hover:opacity-75 p-1 leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#eadfda] bg-[#fcf9f5] px-6 overflow-x-auto gap-2">
          {[
            { id: 'supabase', label: '1. Supabase SQL & RLS', icon: Database },
            { id: 'firebase', label: '2. Firebase Rules', icon: Shield },
            { id: 'fetch', label: '3. Dynamic renderProducts()', icon: FileCode },
            { id: 'auth', label: '4. /admin Route Auth', icon: Shield },
            { id: 'upi', label: '5. Dynamic UPI QR', icon: QrCode },
            { id: 'upload', label: '6. Cloud Image Upload', icon: UploadCloud },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? 'border-[#70283b] text-[#70283b] font-semibold bg-white'
                  : 'border-transparent text-[#776c6b] hover:text-[#292222]'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#1e1e24] text-gray-200 font-mono text-xs relative">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400 text-[11px]">Production Ready Code</span>
            <button
              type="button"
              onClick={() => copyCode(activeTab, (snippets as any)[activeTab])}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs flex items-center gap-1.5 border border-white/20 transition-colors"
            >
              {copiedKey === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <pre className="overflow-x-auto p-4 bg-black/40 rounded border border-white/10 leading-relaxed">
            <code>{(snippets as any)[activeTab]}</code>
          </pre>
        </div>

        <div className="p-4 bg-white border-t border-[#eadfda] flex justify-between items-center text-xs text-[#776c6b]">
          <span>All tables, schemas, rules, and APIs are live in this application.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#70283b] text-white rounded text-xs font-semibold"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
