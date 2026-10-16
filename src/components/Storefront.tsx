import React, { useState, useEffect } from 'react';
import type { Product } from '../utils/ecommerce';
import { ProductCard } from './ProductCard';
import { Search, ShoppingBag, Shield, Database, RefreshCw, Loader2, Sparkles } from 'lucide-react';

interface StorefrontProps {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  activeCategory: string;
  searchQuery: string;
  cartCount: number;
  onCategoryChange: (category: string) => void;
  onSearchChange: (query: string) => void;
  onAddToCart: (product: Product) => void;
  onWishlistClick: (product: Product) => void;
  onOpenCart: () => void;
  onOpenMerchant: () => void;
  onOpenCloudDocs: () => void;
  onRetryFetch: () => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  products,
  isLoading,
  error,
  activeCategory,
  searchQuery,
  cartCount,
  onCategoryChange,
  onSearchChange,
  onAddToCart,
  onWishlistClick,
  onOpenCart,
  onOpenMerchant,
  onOpenCloudDocs,
  onRetryFetch,
}) => {
  const categories = [
    { id: 'All', label: 'All pieces' },
    { id: 'Kurtis', label: 'Kurtis' },
    { id: 'Sarees', label: 'Sarees' },
    { id: 'Suits', label: 'Suit sets' },
    { id: 'Festive', label: 'Festive wear' },
  ];

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-[#292222] font-sans">
      {/* Top Notification Bar */}
      <div className="bg-[#4c1727] text-white text-center py-2 px-4 text-xs tracking-widest uppercase font-medium">
        Complimentary shipping on orders above ₹1,999 · A little love in every thread
      </div>

      {/* Navigation */}
      <header className="h-[76px] bg-[#fffdf9] border-b border-[#eadfda] sticky top-0 z-40 px-6 sm:px-12 flex items-center justify-between shadow-xs">
        {/* Brand */}
        <a href="#home" className="flex flex-col items-center">
          <span className="font-serif text-2xl text-[#70283b] font-bold tracking-tight">
            Indian Ishq
          </span>
          <small className="text-[10px] tracking-[0.28em] text-[#b78a4b] font-sans -mt-1 font-semibold uppercase">
            Collection
          </small>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-[#776c6b]">
          <a href="#home" className="hover:text-[#70283b] transition-colors">
            Home
          </a>
          <a href="#shop" className="hover:text-[#70283b] transition-colors">
            Shop Catalog
          </a>
          <a href="#story" className="hover:text-[#70283b] transition-colors">
            Our Story
          </a>
          <button
            type="button"
            onClick={onOpenCloudDocs}
            className="hover:text-[#70283b] transition-colors flex items-center gap-1 text-[#b78a4b]"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Cloud Specs</span>
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMerchant}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-[#eadfda] rounded-full text-xs font-semibold text-[#70283b] bg-white hover:bg-[#fcf5f3] transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Merchant Admin</span>
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`View shopping bag, ${cartCount} items`}
            className="flex items-center gap-2 px-4 py-2 bg-[#70283b] text-white hover:bg-[#4c1727] rounded-full text-xs font-semibold tracking-wider uppercase transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Bag</span>
            <span className="bg-white text-[#70283b] text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main>
        {/* HERO SECTION */}
        <section
          id="home"
          className="grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] min-h-[490px] px-6 sm:px-12 py-12 gap-8 items-center bg-gradient-to-br from-[#fbf4ed] via-[#f7ece8] to-[#f2dfdc] border-b border-[#eadfda]"
        >
          <div>
            <div className="text-[11px] font-bold tracking-[0.25em] text-[#b78a4b] uppercase mb-2">
              Tradition, with a little romance
            </div>
            <h1 className="font-serif text-4xl sm:text-6xl text-[#4c1727] leading-[1.05] mb-4">
              Wear your<br />
              <em className="text-[#b78a4b] font-normal italic">story.</em>
            </h1>
            <p className="text-sm sm:text-base text-[#776c6b] leading-relaxed max-w-lg mb-6">
              Thoughtfully chosen ethnic wear for every celebration, every everyday moment, and every
              version of you. Handcrafted kurtis, Banarasi sarees, and festive silhouettes.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="#shop"
                className="px-6 py-3 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold tracking-widest uppercase rounded-xs transition-colors shadow-md inline-flex items-center gap-1.5"
              >
                <span>Explore the Collection</span>
                <span>↗</span>
              </a>
              <button
                type="button"
                onClick={onOpenMerchant}
                className="px-5 py-3 bg-[#f3dfe0] hover:bg-[#edd4d5] text-[#70283b] text-xs font-semibold tracking-wider rounded-xs transition-colors border border-[#e2cbcc]"
              >
                Merchant Dashboard
              </button>
            </div>

            <div className="text-[10px] tracking-widest text-[#776c6b] uppercase mt-8 font-semibold">
              MADE FOR YOUR MOMENTS · ROOTED IN INDIAN CRAFT · UPI & COD READY
            </div>
          </div>

          {/* Hero Art Image */}
          <div className="relative h-[360px] sm:h-[420px] rounded-tl-sm rounded-tr-[80px] rounded-b-sm overflow-hidden bg-[#ead4c7] shadow-xl border border-[#eadfda]">
            <img
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80"
              alt="Indian Ishq Collection festive fashion"
              className="w-full h-full object-cover object-[55%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2e102b]/40 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-5 right-5 bg-white/95 text-[#70283b] px-4 py-2 font-serif italic text-sm shadow-md border border-[#eadfda]">
              The festive edit · 2026
            </div>
          </div>
        </section>

        {/* SHOP CATALOG SECTION */}
        <section id="shop" className="px-6 sm:px-12 py-16 max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="text-[11px] font-bold tracking-[0.25em] text-[#b78a4b] uppercase">
                Curated for you
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#4c1727] mt-1 mb-0.5">
                Pieces to fall for
              </h2>
              <p className="text-xs text-[#776c6b]">
                Live cloud catalog dynamically fetched from database.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search kurtis, sarees, suits..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#eadfda] rounded-full text-xs text-[#292222] focus:outline-[#b78a4b] shadow-xs"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2.5 mb-8">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-colors border ${
                  activeCategory === cat.id
                    ? 'bg-[#70283b] text-white border-[#70283b] shadow-xs'
                    : 'bg-white text-[#776c6b] border-[#eadfda] hover:border-[#70283b] hover:text-[#70283b]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* DYNAMIC PRODUCTS GRID */}
          {isLoading ? (
            <div className="py-24 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#70283b] mx-auto mb-3" />
              <p className="font-serif text-lg text-[#292222]">Fetching live product catalog...</p>
              <p className="text-xs text-[#776c6b]">Connecting to cloud database</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center bg-white border border-red-200 rounded p-6 max-w-md mx-auto">
              <p className="text-red-700 text-sm font-medium mb-2">{error}</p>
              <button
                type="button"
                onClick={onRetryFetch}
                className="px-4 py-2 bg-[#70283b] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Fetching</span>
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center bg-white border border-[#eadfda] rounded p-8">
              <p className="font-serif text-xl text-[#292222]">No pieces found matching your filter.</p>
              <p className="text-xs text-[#776c6b] mt-1">Try another search keyword or select All pieces.</p>
              <button
                type="button"
                onClick={() => {
                  onCategoryChange('All');
                  onSearchChange('');
                }}
                className="mt-4 px-4 py-2 bg-[#70283b] text-white text-xs font-semibold rounded"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  onWishlistClick={onWishlistClick}
                />
              ))}
            </div>
          )}
        </section>

        {/* OUR STORY SECTION */}
        <section id="story" className="bg-[#f0e2dc] border-y border-[#eadfda] px-6 sm:px-12 py-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="bg-gradient-to-br from-[#c69c8a] to-[#713548] min-h-[280px] rounded flex items-center justify-center text-white font-serif italic text-3xl sm:text-4xl text-center p-8 shadow-inner">
              A little tradition.<br />A lot of you.
            </div>

            <div className="space-y-4">
              <div className="text-[11px] font-bold tracking-[0.25em] text-[#b78a4b] uppercase">
                The Indian Ishq Feeling
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#4c1727]">
                Clothes with a<br />heart of their own.
              </h2>
              <p className="text-sm text-[#776c6b] leading-relaxed">
                From soft everyday cottons to pieces tailored for your biggest celebrations, Indian
                Ishq Collection brings together colour, craft and confidence. Founded as a home-based
                boutique, every stitch honors Indian heritage with a modern, romantic soul.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenCloudDocs}
                  className="px-5 py-2.5 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold uppercase tracking-wider rounded transition-colors"
                >
                  View Cloud Architecture Specs
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#4c1727] text-[#f9eae5] px-6 sm:px-12 py-12 text-xs border-t border-[#3a101d]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="font-serif text-2xl text-white font-bold">Indian Ishq</div>
            <p className="text-[#d8bfc2] mt-1">Wear your story. Celebrate your ishq.</p>
            <p className="text-[11px] text-[#a88289] mt-3">
              Home-based ethnic fashion powered by serverless cloud database & instant UPI.
            </p>
          </div>

          <div>
            <strong className="block text-white font-semibold mb-2">Customer Care & Orders</strong>
            <p className="text-[#d8bfc2]">Jaipur, Rajasthan · Orders & Sizing Assistance</p>
            <p className="text-[#d8bfc2] mt-1">Supported Payments: Dynamic UPI QR & Cash on Delivery</p>
          </div>

          <div>
            <strong className="block text-white font-semibold mb-2">Store Management</strong>
            <button
              type="button"
              onClick={onOpenMerchant}
              className="px-3.5 py-1.5 bg-[#f3dfe0] text-[#70283b] rounded font-semibold text-xs hover:bg-white transition-colors"
            >
              Merchant Login (/admin)
            </button>
            <p className="text-[10px] text-[#a88289] mt-3">
              © 2026 Indian Ishq Collection. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
