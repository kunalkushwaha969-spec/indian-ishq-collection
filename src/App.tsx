import React, { useState, useEffect, useCallback } from 'react';
import type { Product, CartItem, Order } from './utils/ecommerce';
import { fetchProducts } from './services/api';
import { Storefront } from './components/Storefront';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Toast, type ToastData } from './components/Toast';

interface StoreTheme {
  name: string;
  wine: string;
  wine2: string;
  rose: string;
  cream: string;
  gold: string;
}

const THEME_PRESETS: StoreTheme[] = [
  { name: 'Royal Wine (Default)', wine: '#70283b', wine2: '#4c1727', rose: '#f3dfe0', cream: '#fbf7f0', gold: '#b78a4b' },
  { name: 'Bridal Crimson', wine: '#8b1e24', wine2: '#5a1015', rose: '#fce8e8', cream: '#fffaf5', gold: '#d4af37' },
  { name: 'Emerald Maharani', wine: '#134e4a', wine2: '#0f2926', rose: '#e0f2f1', cream: '#f9fbf9', gold: '#c59b27' },
  { name: 'Midnight Peacock', wine: '#1e293b', wine2: '#0f172a', rose: '#e2e8f0', cream: '#f8fafc', gold: '#ca8a04' },
  { name: 'Dusty Rose Boutique', wine: '#9d4edd', wine2: '#5a189a', rose: '#f3e8ff', cream: '#fdfaff', gold: '#d97706' },
];

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart stored in localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('ishq_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(() => {
    return window.location.hash === '#admin';
  });
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);

  // Theme & Cover Photo state
  const [theme, setTheme] = useState<StoreTheme>(() => {
    try {
      const saved = localStorage.getItem('ishq_theme');
      return saved ? JSON.parse(saved) : THEME_PRESETS[0];
    } catch {
      return THEME_PRESETS[0];
    }
  });

  const [coverPhoto, setCoverPhoto] = useState<string>(() => {
    try {
      return localStorage.getItem('ishq_cover_photo') || '';
    } catch {
      return '';
    }
  });

  // Unread Order Notifications for Merchant
  const [unreadOrders, setUnreadOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('ishq_unread_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // In-app Notification / Toast state
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((data: ToastData | string) => {
    if (typeof data === 'string') {
      setToast({ message: data, type: 'info' });
    } else {
      setToast(data);
    }
  }, []);

  // Apply CSS variables dynamically when theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--wine', theme.wine);
    root.style.setProperty('--wine2', theme.wine2);
    root.style.setProperty('--rose', theme.rose);
    root.style.setProperty('--cream', theme.cream);
    root.style.setProperty('--gold', theme.gold);
    try {
      localStorage.setItem('ishq_theme', JSON.stringify(theme));
    } catch {}
  }, [theme]);

  // Apply custom cover photo to storefront hero image
  const applyCoverPhotoToDOM = useCallback((photoUrl: string) => {
    if (!photoUrl) return;
    setTimeout(() => {
      const heroImages = document.querySelectorAll('header img, section:first-of-type img, .hero-image');
      if (heroImages.length > 0) {
        const mainHeroImg = heroImages[0] as HTMLImageElement;
        mainHeroImg.src = photoUrl;
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (coverPhoto) {
      applyCoverPhotoToDOM(coverPhoto);
      try {
        localStorage.setItem('ishq_cover_photo', coverPhoto);
      } catch {}
    }
  }, [coverPhoto, products, applyCoverPhotoToDOM]);

  // Play notification sound on new order
  const playOrderSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  // Auto-dismiss toast after 3.8s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Save cart changes
  useEffect(() => {
    try {
      localStorage.setItem('ishq_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Dynamic live catalog fetching
  const loadLiveProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const live = await fetchProducts(activeCategory, searchQuery);
      setProducts(live);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to live product database');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    loadLiveProducts();
  }, [loadLiveProducts]);

  // Handle cover photo file upload from mobile gallery or PC
  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverPhoto(reader.result);
        showToast({
          type: 'info',
          title: 'Cover Photo Updated!',
          message: 'Aapki nayi cover photo storefront par set ho gayi hai.',
        });
      }
    };
    reader.readAsDataURL(file);
