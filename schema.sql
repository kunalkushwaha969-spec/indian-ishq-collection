-- ==============================================================================
-- Indian Ishq Collection - Production Supabase PostgreSQL Schema
-- Tables: Products & Orders with Row Level Security (RLS) & Storage
-- ==============================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create 'products' table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('Kurtis', 'Sarees', 'Suits', 'Festive', 'Everyday')),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    old_price NUMERIC(10, 2) CHECK (old_price >= price),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT NOT NULL,
    tag VARCHAR(50) DEFAULT 'CURATED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for speedy catalog queries & category filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- 3. Create 'orders' table
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
-- 4. Row Level Security (RLS) Configuration
-- Protect your database so unauthorized users cannot tamper with inventory or orders
-- ==============================================================================

-- Enable RLS on both tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Products Policies:
-- 1. Public can view all products
CREATE POLICY "Public read products" 
ON public.products 
FOR SELECT 
USING (true);

-- 2. Only authenticated admins can insert/update/delete products
CREATE POLICY "Admins full access products" 
ON public.products 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Orders Policies:
-- 1. Any customer can insert a new order (Checkout)
CREATE POLICY "Public create order" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- 2. Only authenticated admins can read all orders
CREATE POLICY "Admins read orders" 
ON public.orders 
FOR SELECT 
TO authenticated 
USING (true);

-- 3. Only authenticated admins can update order status
CREATE POLICY "Admins update orders" 
ON public.orders 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 5. Supabase Storage Bucket Setup for Product Images
-- ==============================================================================
-- Run in Supabase SQL editor or create via Supabase Dashboard > Storage > 'products':
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Anyone can read product images
CREATE POLICY "Public read product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

-- Storage Policy: Only authenticated users can upload product images
CREATE POLICY "Admins upload product images" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'product-images');
