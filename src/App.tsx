import React, { useState, useEffect, useCallback } from 'react';
import type { Product, CartItem, Order } from './utils/ecommerce';
import { fetchProducts } from './services/api';
import { Storefront } from './components/Storefront';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminDashboard } from './components/AdminDashboard';
import { CloudDocsModal } from './components/CloudDocsModal';
import { Toast, type ToastData } from './components/Toast';

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
  const [isCloudDocsOpen, setIsCloudDocsOpen] = useState<boolean>(false);

  // In-app Notification / Toast state
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((data: ToastData | string) => {
    if (typeof data === 'string') {
      setToast({ message: data, type: 'info' });
    } else {
      setToast(data);
    }
  }, []);

  // Auto-dismiss toast after 3.8s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Listen for hash changes (e.g. user goes to #admin)
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
    } catch (e) {}
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

  // Cart operations with instant in-app toast feedback
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast({
        type: 'error',
        title: 'Sold Out',
        message: `"${product.name}" is currently out of stock.`,
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast({
            type: 'error',
            title: 'Stock Limit Reached',
            message: `Only ${product.stock} pieces of "${product.name}" are currently available in inventory.`,
          });
          return prev;
        }

        showToast({
          type: 'cart',
          title: 'Bag Quantity Updated',
          message: `Increased quantity of "${product.name}" to ${existing.qty + 1}.`,
          actionLabel: 'Open Bag',
          onAction: () => setIsCartOpen(true),
        });

        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      showToast({
        type: 'cart',
        title: 'Added to Bag ✨',
        message: `"${product.name}" is now in your shopping bag.`,
        actionLabel: 'View Bag',
        onAction: () => setIsCartOpen(true),
      });

      return [...prev, { id: product.id, qty: 1 }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === productId);
      if (!existing) return prev;

      if (delta > 0 && product && existing.qty >= product.stock) {
        showToast({
          type: 'error',
          title: 'Stock Limit',
          message: `Cannot add more. Available stock is ${product.stock}.`,
        });
        return prev;
      }

      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        showToast({
          type: 'info',
          title: 'Removed from Bag',
          message: product ? `"${product.name}" was removed from your bag.` : 'Item removed.',
        });
        return prev.filter((i) => i.id !== productId);
      }
      return prev.map((i) => (i.id === productId ? { ...i, qty: newQty } : i));
    });
  };

  const handleRemoveItem = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setCart((prev) => prev.filter((i) => i.id !== productId));
    showToast({
      type: 'info',
      title: 'Item Removed',
      message: product ? `"${product.name}" was removed from your bag.` : 'Item removed.',
    });
  };

  // Instant order confirmation alert
  const handleOrderSuccess = (order: Order) => {
    setCart([]);
    loadLiveProducts(); // refresh inventory stock
    showToast({
      type: 'order',
      title: 'Order Confirmed! 🎉',
      message: `Order #${order.id} (₹${order.total.toLocaleString('en-IN')}) placed successfully for ${order.customer_details.name}. Preparing your handcrafted outfit!`,
      actionLabel: 'Merchant Workspace',
      onAction: () => setIsAdminOpen(true),
    });
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <>
      <Storefront
        products={products}
        isLoading={isLoading}
        error={error}
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        cartCount={cartCount}
        onCategoryChange={setActiveCategory}
        onSearchChange={setSearchQuery}
        onAddToCart={handleAddToCart}
        onWishlistClick={(prod) => {
          showToast({
            type: 'info',
            title: 'Saved to Wishlist',
            message: `"${prod.name}" saved to your wishlist.`,
          });
        }}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenMerchant={() => setIsAdminOpen(true)}
        onOpenCloudDocs={() => setIsCloudDocsOpen(true)}
        onRetryFetch={loadLiveProducts}
      />

      {/* Shopping Bag Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        products={products}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal (Dynamic UPI QR & Cash on Delivery) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        products={products}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Secure Merchant Workspace (/admin) */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          if (window.location.hash === '#admin') {
            window.history.pushState(null, '', window.location.pathname);
          }
        }}
        onCatalogChanged={loadLiveProducts}
        onOpenCloudDocs={() => setIsCloudDocsOpen(true)}
      />

      {/* Cloud Blueprints & Code Snippets Modal */}
      <CloudDocsModal
        isOpen={isCloudDocsOpen}
        onClose={() => setIsCloudDocsOpen(false)}
      />

      {/* Customer & Merchant In-App Notification Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
