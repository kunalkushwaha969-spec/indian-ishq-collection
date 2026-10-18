-- ==============================================================================
-- Indian Ishq Collection - Production Supabase PostgreSQL Schema
-- Tables: Products & Orders with Row Level Security (RLS) & Storage
-- Run this in Supabase Dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 1. Create 'products' table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT ('prod-' || substr(md5(random()::text), 1, 8)),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    old_price NUMERIC(10, 2),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT NOT NULL,
    tag VARCHAR(50) DEFAULT 'CURATED',
    fabric TEXT DEFAULT 'Handcrafted Indian Ethnic Wear',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for speedy catalog queries & category filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- 2. Create 'orders' table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- e.g. 'IIC-104829' or standard alphanumeric order ref
    customer_details JSONB NOT NULL,
    -- JSONB schema: { "name": "...", "phone": "...", "address": "...", "city": "...", "pincode": "..." }
    items JSONB NOT NULL,
    -- JSONB array schema: [ { "id": "...", "name": "...", "price": 1899, "qty": 1 } ]
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('COD', 'UPI')),
    upi_ref_id VARCHAR(100), -- customer transaction reference or UTR if paid via UPI
    status VARCHAR(50) NOT NULL DEFAULT 'Confirmed' 
        CHECK (status IN ('Pending UPI Payment', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled')),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for order lookups & dashboard analytics
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ==============================================================================
-- 3. Row Level Security (RLS) Configuration
-- Configured for frontend REST client using the Supabase publishable / anon key
-- ==============================================================================

-- Enable RLS on both tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Products Policies:
-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Allow insert products" ON public.products;
DROP POLICY IF EXISTS "Allow update products" ON public.products;
DROP POLICY IF EXISTS "Allow delete products" ON public.products;

CREATE POLICY "Public read products" 
ON public.products FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert products" 
ON public.products FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow update products" 
ON public.products FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete products" 
ON public.products FOR DELETE TO public USING (true);

-- Orders Policies:
DROP POLICY IF EXISTS "Public read orders" ON public.orders;
DROP POLICY IF EXISTS "Public create order" ON public.orders;
DROP POLICY IF EXISTS "Public update orders" ON public.orders;

CREATE POLICY "Public read orders" 
ON public.orders FOR SELECT TO public USING (true);

CREATE POLICY "Public create order" 
ON public.orders FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public update orders" 
ON public.orders FOR UPDATE TO public USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. Supabase Storage Bucket Setup for Product Images
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Public upload product images" ON storage.objects;

CREATE POLICY "Public read product images" 
ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');

CREATE POLICY "Public upload product images" 
ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'product-images');
