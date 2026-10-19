import React, { useState, useEffect } from 'react';
import type { Product, Order } from '../utils/ecommerce';
import { formatINR } from '../utils/ecommerce';
import {
  fetchProducts,
  fetchOrders,
  updateProductStock,
  deleteProduct,
  updateOrderStatus,
  loginAdmin,
  verifyAdminSession,
  setStoredToken,
  subscribeToFirestoreProducts,
  subscribeToFirestoreOrders,
  uploadImageDirect,
} from '../services/api';
import {
  type MerchantActivity,
  getMerchantActivities,
  markActivitiesAsRead,
  getUnreadActivityCount,
} from '../services/activity';
import { ProductModal } from './ProductModal';
import { HeroSlideshowManager } from './HeroSlideshowManager';
import { StoreCustomization } from './StoreCustomization';
import {
  type StoreSettings,
  DEFAULT_STORE_SETTINGS,
  getLocalStoreSettings,
  fetchStoreSettings,
  saveStoreSettings,
} from '../services/settings';
import {
  Lock,
  ShieldCheck,
  Package,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  CheckCircle,
  Bell,
  Clock,
  CheckCheck,
  Filter,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  X,
} from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogChanged: () => void;
  onAuthChange: (authenticated: boolean) => void;
  onThemePreviewChange?: (themeId: string, mode: 'light' | 'dark' | 'system') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onCatalogChanged,
  onAuthChange,
  onThemePreviewChange,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [password, setPassword] = useState('ishq2026');
  const [email, setEmail] = useState('admin@indianishq.com');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'inventory' | 'orders' | 'activity' | 'customization' | 'slideshow' | 'settings'
  >('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() =>
    getLocalStoreSettings()
  );
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [recentOrderFilter, setRecentOrderFilter] = useState<'all' | 'completed' | 'in_progress'>(
    'all'
  );

  const [activities, setActivities] = useState<MerchantActivity[]>(() => getMerchantActivities());
  const [unreadCount, setUnreadCount] = useState<number>(() => getUnreadActivityCount());
  const [activityFilter, setActivityFilter] = useState<'all' | 'order' | 'inventory' | 'status'>(
    'all'
  );

  useEffect(() => {
    const updateActivities = () => {
      setActivities(getMerchantActivities());
      setUnreadCount(getUnreadActivityCount());
    };
    window.addEventListener('ishq:activity-updated', updateActivities);
    return () => window.removeEventListener('ishq:activity-updated', updateActivities);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const checkAuth = async () => {
      setIsCheckingAuth(true);

      try {
        const valid = await verifyAdminSession();

        if (cancelled) return;

        setIsAuthenticated(valid);
        onAuthChange(valid);

        if (valid) {
          await loadData();
        } else {
          setStoredToken(null);
        }
      } catch (error) {
        if (cancelled) return;

        console.error('Merchant session verification failed:', error);

        setIsAuthenticated(false);
        setStoredToken(null);
        onAuthChange(false);
      } finally {
        if (!cancelled) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [isOpen, onAuthChange]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    const unsubProds = subscribeToFirestoreProducts((items) => {
      if (items && items.length > 0) {
        setProducts(items);
      }
    });
    const unsubOrds = subscribeToFirestoreOrders((ords) => {
      setOrders(ords);
    });
    return () => {
      unsubProds();
      unsubOrds();
    };
  }, [isOpen, isAuthenticated]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [prods, ords, liveSettings] = await Promise.all([
        fetchProducts('All', '').catch(() => []),
        fetchOrders().catch(() => []),
        fetchStoreSettings().catch(() => getLocalStoreSettings()),
      ]);
      setProducts(prods);
      setOrders(ords);
      setStoreSettings(liveSettings);
      setActivities(getMerchantActivities());
      setUnreadCount(getUnreadActivityCount());
    } catch {
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await uploadImageDirect(file);
      setStoreSettings((prev) => ({ ...prev, logoUrl: dataUrl }));
      setBanner({
        type: 'info',
        message: 'Logo image loaded! Click "Save Store Settings" to publish across the storefront.',
      });
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load logo image file.',
      });
    }
  };

  const handleSaveSettings = async (
    e?: React.FormEvent,
    customSettings?: StoreSettings
  ) => {
    if (e) e.preventDefault();
    const targetSettings = customSettings || storeSettings;
    if (
      !targetSettings.codEnabled &&
      !targetSettings.upiEnabled &&
      !targetSettings.razorpayEnabled
    ) {
      setBanner({
        type: 'error',
        message: 'Please keep at least one payment method (COD, UPI QR, or Razorpay) enabled.',
      });
      return;
    }

    setIsSavingSettings(true);
    try {
      const saved = await saveStoreSettings(targetSettings);
      setStoreSettings(saved);
      setBanner({
        type: 'success',
        message:
          activeTab === 'slideshow'
            ? 'Hero slideshow saved to Firebase Firestore and updated live on the homepage!'
            : activeTab === 'customization'
            ? 'Store customization saved to Firebase Firestore and applied live across the storefront!'
            : 'Store settings saved to Firebase Firestore and updated live across the storefront!',
      });
      setTimeout(() => setBanner(null), 4000);
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save store settings.',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      await loginAdmin(password, email);
      setIsAuthenticated(true);
      onAuthChange(true);
      loadData();
    } catch (err: any) {
      setLoginError(err.message || 'Unauthorized: Invalid password or admin email');
    }
  };

  const handleLogout = () => {
    setStoredToken(null);
    setIsAuthenticated(false);
    onAuthChange(false);
  };

  const handleStockChange = async (id: string, newStock: number) => {
    try {
      await updateProductStock(id, newStock);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p)));
      onCatalogChanged();
      setBanner({ type: 'success', message: 'Stock updated!' });
      setTimeout(() => setBanner(null), 3000);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to update stock.' });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
      onCatalogChanged();
      setBanner({ type: 'success', message: 'Product removed from catalog.' });
      setTimeout(() => setBanner(null), 3000);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to delete product.' });
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      setBanner({ type: 'success', message: `Order #${orderId} marked as ${newStatus}!` });
      setTimeout(() => setBanner(null), 3000);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to update order status.' });
    }
  };

  const handleMarkAllRead = () => {
    markActivitiesAsRead();
    setActivities(getMerchantActivities());
    setUnreadCount(0);
    setBanner({ type: 'success', message: 'All store alerts marked as read.' });
    setTimeout(() => setBanner(null), 2500);
  };

  if (!isOpen) return null;

  const nonCancelledOrders = orders.filter((o) => o.status !== 'Cancelled');
  const completedOrders = orders.filter((o) => o.status === 'Delivered');
  const inProgressOrders = orders.filter(
    (o) => o.status === 'Confirmed' || o.status === 'Packed' || o.status === 'Shipped'
  );

  const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + o.total, 0);
  const completedRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue =
    nonCancelledOrders.length > 0 ? Math.round(totalRevenue / nonCancelledOrders.length) : 0;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  const displayedRecentOrders = orders.filter((o) => {
    if (recentOrderFilter === 'completed') return o.status === 'Delivered';
    if (recentOrderFilter === 'in_progress')
      return o.status === 'Confirmed' || o.status === 'Packed' || o.status === 'Shipped';
    return true;
  });

  const filteredActivities = activities.filter((a) => {
    if (activityFilter === 'all') return true;
    return a.type === activityFilter;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ backgroundColor: 'var(--overlay)' }}
    >
      <div
        className="w-full max-w-5xl rounded-xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-main)',
        }}
      >
        {/* HEADER BAR */}
        <div
          className="p-3.5 sm:p-5 border-b flex flex-wrap items-center justify-between gap-2.5 min-w-0"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="p-2 rounded-lg border shrink-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--primary)',
              }}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="text-[10px] tracking-widest uppercase font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  Store Administration
                </span>
                {isAuthenticated && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: 'var(--success-bg)',
                      color: 'var(--success-text)',
                    }}
                  >
                    Live Session Active
                  </span>
                )}
              </div>
              <h2
                id="admin-title"
                className="font-serif text-xl sm:text-2xl font-semibold leading-tight truncate"
                style={{ color: 'var(--text-main)' }}
              >
                Merchant Workspace
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('activity');
                    handleMarkAllRead();
                  }}
                  className="relative p-2 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                  title="Merchant Activity & Order Alerts"
                >
                  <Bell className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  <span className="text-xs font-semibold hidden sm:inline">Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-bold tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 sm:px-3 py-2 border text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--error-bg)',
                    borderColor: 'var(--error-border)',
                    color: 'var(--error-text)',
                  }}
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Logout</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close merchant dashboard"
              className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto">
          {isCheckingAuth ? (
            <div className="py-20 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              Verifying merchant authorization...
            </div>
          ) : !isAuthenticated ? (
            /* LOCK SCREEN */
            <div
              className="max-w-md mx-auto my-12 p-8 border rounded-xl shadow-sm text-center"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--primary)',
                }}
              >
                <Lock className="w-6 h-6" />
              </div>

              <h3 className="font-serif text-2xl font-semibold" style={{ color: 'var(--text-main)' }}>
                Merchant Login
              </h3>
              <p className="text-xs mt-1 mb-6 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Sign in to manage catalog items, review incoming customer orders, and update
                inventory stock counts.
              </p>

              {loginError && (
                <div
                  className="mb-4 p-3 border rounded-lg text-xs text-left"
                  style={{
                    backgroundColor: 'var(--error-bg)',
                    borderColor: 'var(--error-border)',
                    color: 'var(--error-text)',
                  }}
                >
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Merchant Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div
                  className="p-3 rounded-lg text-[11px] border"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Demo Merchant Password:{' '}
                  <strong className="font-mono" style={{ color: 'var(--primary)' }}>
                    ishq2026
                  </strong>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 text-xs font-semibold tracking-wider uppercase rounded-lg transition-opacity hover:opacity-95 shadow cursor-pointer"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--btn-text)',
                  }}
                >
                  Enter Workspace
                </button>
              </form>
            </div>
          ) : (
            /* AUTHENTICATED MERCHANT DASHBOARD */
            <div className="p-4 sm:p-6 space-y-6">
              {banner && (
                <div
                  role="status"
                  className="p-3 rounded-lg text-xs flex items-center justify-between border transition-all"
                  style={{
                    backgroundColor:
                      banner.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
                    borderColor:
                      banner.type === 'error' ? 'var(--error-border)' : 'var(--success-border)',
                    color: banner.type === 'error' ? 'var(--error-text)' : 'var(--success-text)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    {banner.type === 'error' ? (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{banner.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBanner(null)}
                    aria-label="Dismiss notification"
                    className="text-xs font-bold px-1.5 py-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div
                  className="p-4 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="flex items-center justify-between text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>Total Sales</span>
                    <TrendingUp className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  </div>
                  <strong
                    className="block font-serif text-2xl mt-2 tabular-nums"
                    style={{ color: 'var(--primary)' }}
                  >
                    {formatINR(totalRevenue)}
                  </strong>
                </div>

                <div
                  className="p-4 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="flex items-center justify-between text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>Live Orders</span>
                    <ShoppingBag className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  </div>
                  <strong
                    className="block font-serif text-2xl mt-2 flex items-center gap-2 tabular-nums"
                    style={{ color: 'var(--primary)' }}
                  >
                    <span>{orders.length}</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white font-sans font-bold">
                        +{unreadCount}
                      </span>
                    )}
                  </strong>
                </div>

                <div
                  className="p-4 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="flex items-center justify-between text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>Catalog Items</span>
                    <Package className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  </div>
                  <strong
                    className="block font-serif text-2xl mt-2 tabular-nums"
                    style={{ color: 'var(--primary)' }}
                  >
                    {products.length}
                  </strong>
                </div>

                <div
                  className="p-4 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="flex items-center justify-between text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>Low / Sold Out</span>
                    <AlertTriangle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <strong
                    className="block font-serif text-2xl mt-2 tabular-nums"
                    style={{ color: 'var(--primary)' }}
                  >
                    {outOfStockCount}
                  </strong>
                </div>
              </div>

              {/* Clean Store Management Tabs */}
              <div
                className="flex flex-wrap border-b gap-1.5 pb-1"
                style={{ borderColor: 'var(--border)' }}
              >
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'inventory', label: `Products (${products.length})` },
                  { id: 'orders', label: `Orders (${orders.length})` },
                  { id: 'customization', label: 'Store Customization' },
                  {
                    id: 'slideshow',
                    label: `Hero Slideshow (${
                      (storeSettings.heroSlides || []).filter((s) => s.enabled).length
                    })`,
                  },
                  { id: 'settings', label: 'Store Settings' },
                ].map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className="px-3.5 py-2.5 rounded-t-lg text-xs font-semibold tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: active ? 'var(--primary)' : 'transparent',
                        color: active ? 'var(--btn-text)' : 'var(--text-muted)',
                      }}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* DEDICATED RECENT ORDERS SECTION */}
                  <div
                    className="space-y-4 p-5 rounded-xl border shadow-xs"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                          <h3
                            className="font-serif text-xl font-bold"
                            style={{ color: 'var(--text-main)' }}
                          >
                            Recent Orders
                          </h3>
                          {completedOrders.length > 0 && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--success-bg)',
                                color: 'var(--success-text)',
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{completedOrders.length} Completed</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Track customer details, fulfillment progress, and completed sales
                          performance.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                        <div
                          className="flex items-center p-1 rounded-lg border text-xs"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: 'var(--border)',
                          }}
                        >
                          {(
                            [
                              { id: 'all', label: `All (${orders.length})` },
                              { id: 'completed', label: `Completed (${completedOrders.length})` },
                              {
                                id: 'in_progress',
                                label: `In Progress (${inProgressOrders.length})`,
                              },
                            ] as const
                          ).map((tab) => {
                            const active = recentOrderFilter === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setRecentOrderFilter(tab.id)}
                                className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
                                style={{
                                  backgroundColor: active ? 'var(--primary)' : 'transparent',
                                  color: active ? 'var(--btn-text)' : 'var(--text-muted)',
                                }}
                              >
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={loadData}
                          className="px-2.5 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                          title="Refresh live orders from database"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`}
                          />
                          <span className="hidden sm:inline">Sync</span>
                        </button>
                      </div>
                    </div>

                    {/* Performance Mini-Stats Strip */}
                    <div
                      className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border text-xs tabular-nums"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div>
                        <span
                          className="text-[10px] uppercase font-semibold block"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Completed Revenue
                        </span>
                        <strong
                          className="text-base font-bold font-serif"
                          style={{ color: 'var(--success-text)' }}
                        >
                          {formatINR(completedRevenue)}
                        </strong>
                        <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>
                          {completedOrders.length} delivered orders
                        </span>
                      </div>
                      <div>
                        <span
                          className="text-[10px] uppercase font-semibold block"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Total Active Sales
                        </span>
                        <strong
                          className="text-base font-bold font-serif"
                          style={{ color: 'var(--primary)' }}
                        >
                          {formatINR(totalRevenue)}
                        </strong>
                        <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>
                          {nonCancelledOrders.length} valid orders
                        </span>
                      </div>
                      <div>
                        <span
                          className="text-[10px] uppercase font-semibold block"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Avg Order Value (AOV)
                        </span>
                        <strong
                          className="text-base font-bold font-serif"
                          style={{ color: 'var(--text-main)' }}
                        >
                          {formatINR(avgOrderValue)}
                        </strong>
                        <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>
                          per customer basket
                        </span>
                      </div>
                      <div>
                        <span
                          className="text-[10px] uppercase font-semibold block"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Fulfillment Rate
                        </span>
                        <strong
                          className="text-base font-bold font-serif"
                          style={{ color: 'var(--accent)' }}
                        >
                          {nonCancelledOrders.length > 0
                            ? Math.round((completedOrders.length / nonCancelledOrders.length) * 100)
                            : 0}
                          %
                        </strong>
                        <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>
                          delivered to customer
                        </span>
                      </div>
                    </div>

                    {/* Orders Table */}
                    {displayedRecentOrders.length === 0 ? (
                      <div
                        className="p-8 text-center border rounded-lg text-xs"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        No{' '}
                        {recentOrderFilter === 'completed'
                          ? 'completed'
                          : recentOrderFilter === 'in_progress'
                          ? 'in-progress'
                          : ''}{' '}
                        orders recorded yet. Customer checkouts will automatically appear here.
                      </div>
                    ) : (
                      <div
                        className="overflow-x-auto border rounded-lg shadow-xs"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <table className="w-full text-left text-xs">
                          <thead
                            className="border-b font-semibold text-[11px] uppercase tracking-wider"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <tr>
                              <th className="p-3">Order & Date</th>
                              <th className="p-3">Customer Details</th>
                              <th className="p-3">Items Ordered</th>
                              <th className="p-3">Payment</th>
                              <th className="p-3">Total Amount</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {displayedRecentOrders.map((ord) => (
                              <tr key={ord.id}>
                                <td className="p-3 align-top font-mono font-medium">
                                  <div className="font-bold" style={{ color: 'var(--primary)' }}>
                                    {ord.id}
                                  </div>
                                  <div
                                    className="text-[10px] font-sans mt-0.5 tabular-nums"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    {new Date(ord.created_at).toLocaleString('en-IN', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </td>

                                <td className="p-3 align-top max-w-[220px]">
                                  <div
                                    className="font-semibold flex items-center gap-1"
                                    style={{ color: 'var(--text-main)' }}
                                  >
                                    <User
                                      className="w-3 h-3 shrink-0"
                                      style={{ color: 'var(--primary)' }}
                                    />
                                    <span>{ord.customer_details.name}</span>
                                  </div>
                                  <div
                                    className="text-[11px] flex items-center gap-1 mt-0.5 tabular-nums"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    <Phone className="w-3 h-3 shrink-0" />
                                    <span>{ord.customer_details.phone}</span>
                                  </div>
                                  <div
                                    className="text-[11px] flex items-start gap-1 mt-0.5 leading-tight"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span>
                                      {ord.customer_details.address}
                                      {ord.customer_details.city
                                        ? `, ${ord.customer_details.city}`
                                        : ''}
                                      {ord.customer_details.pincode
                                        ? ` (${ord.customer_details.pincode})`
                                        : ''}
                                    </span>
                                  </div>
                                </td>

                                <td className="p-3 align-top max-w-[200px]">
                                  <div className="space-y-1">
                                    {ord.items.map((it, idx) => (
                                      <div
                                        key={idx}
                                        className="text-[11px] leading-tight"
                                        style={{ color: 'var(--text-main)' }}
                                      >
                                        <span
                                          className="font-bold tabular-nums"
                                          style={{ color: 'var(--primary)' }}
                                        >
                                          {it.qty}x
                                        </span>{' '}
                                        {it.name}
                                        {it.price && (
                                          <span
                                            className="ml-1 tabular-nums"
                                            style={{ color: 'var(--text-muted)' }}
                                          >
                                            ({formatINR(it.price)})
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </td>

                                <td className="p-3 align-top">
                                  <span
                                    className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold border"
                                    style={{
                                      backgroundColor:
                                        ord.payment_method === 'UPI'
                                          ? 'var(--success-bg)'
                                          : 'var(--surface-elevated)',
                                      color:
                                        ord.payment_method === 'UPI'
                                          ? 'var(--success-text)'
                                          : 'var(--primary)',
                                      borderColor:
                                        ord.payment_method === 'UPI'
                                          ? 'var(--success-border)'
                                          : 'var(--border)',
                                    }}
                                  >
                                    {ord.payment_method === 'UPI'
                                      ? 'UPI QR (Instant)'
                                      : 'Cash on Delivery'}
                                  </span>
                                  {ord.upi_ref_id && (
                                    <div
                                      className="text-[10px] font-mono mt-1"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      UTR: {ord.upi_ref_id}
                                    </div>
                                  )}
                                </td>

                                <td className="p-3 align-top">
                                  <strong
                                    className="font-serif text-sm font-bold tabular-nums"
                                    style={{ color: 'var(--primary)' }}
                                  >
                                    {formatINR(ord.total)}
                                  </strong>
                                </td>

                                <td className="p-3 align-top">
                                  <select
                                    value={ord.status}
                                    onChange={(e) =>
                                      handleStatusChange(ord.id, e.target.value as any)
                                    }
                                    className="p-1.5 border rounded text-xs font-semibold cursor-pointer"
                                    style={{
                                      backgroundColor: 'var(--input-bg)',
                                      borderColor: 'var(--border)',
                                      color: 'var(--text-main)',
                                    }}
                                  >
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Packed">Packed</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="Delivered">Delivered (Completed)</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Real-time Merchant Activity Preview Card */}
                  <div
                    className="p-5 border rounded-xl space-y-3"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                        <h4
                          className="font-serif text-lg font-semibold"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Store Activity Stream
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('activity');
                          handleMarkAllRead();
                        }}
                        className="text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        style={{ color: 'var(--primary)' }}
                      >
                        <span>View Full Log ({activities.length})</span>
                        <span>→</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {activities.slice(0, 3).map((act) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-lg border flex items-center justify-between gap-3 text-xs"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: 'var(--border)',
                          }}
                        >
                          <div>
                            <strong
                              className="font-semibold"
                              style={{ color: 'var(--text-main)' }}
                            >
                              {act.title}:{' '}
                            </strong>
                            <span style={{ color: 'var(--text-muted)' }}>{act.detail}</span>
                          </div>
                          <span
                            className="text-[10px] whitespace-nowrap font-mono tabular-nums"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {new Date(act.timestamp).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INVENTORY */}
              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3
                        className="font-serif text-xl font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        Products & Stock Management
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Live catalog manager. Edit stock counts directly or add items with photos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg uppercase tracking-wider flex items-center gap-1.5 shadow cursor-pointer"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--btn-text)',
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Product</span>
                    </button>
                  </div>

                  <div
                    className="overflow-x-auto border rounded-xl shadow-xs"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <table className="w-full text-left text-xs">
                      <thead
                        className="border-b"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <tr>
                          <th className="p-3">Image</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Stock Count</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {products.map((prod) => (
                          <tr key={prod.id}>
                            <td className="p-3">
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="w-12 h-14 object-cover rounded border"
                                style={{
                                  backgroundColor: 'var(--surface-elevated)',
                                  borderColor: 'var(--border)',
                                }}
                              />
                            </td>
                            <td className="p-3">
                              <strong
                                className="block font-serif text-sm"
                                style={{ color: 'var(--text-main)' }}
                              >
                                {prod.name}
                              </strong>
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {prod.tag || 'CURATED'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className="px-2 py-0.5 rounded text-[11px] border"
                                style={{
                                  backgroundColor: 'var(--surface-elevated)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {prod.category}
                              </span>
                            </td>
                            <td
                              className="p-3 font-semibold tabular-nums"
                              style={{ color: 'var(--primary)' }}
                            >
                              {formatINR(prod.price)}
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min={0}
                                value={prod.stock}
                                onChange={(e) =>
                                  handleStockChange(prod.id, parseInt(e.target.value, 10) || 0)
                                }
                                className="w-16 p-1.5 border rounded text-center font-semibold text-xs tabular-nums"
                                style={{
                                  backgroundColor: 'var(--input-bg)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-main)',
                                }}
                              />
                            </td>
                            <td className="p-3">
                              {confirmDeleteId === prod.id ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(prod.id)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-semibold cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 border rounded text-[10px] cursor-pointer"
                                    style={{
                                      backgroundColor: 'var(--surface-elevated)',
                                      borderColor: 'var(--border)',
                                      color: 'var(--text-main)',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(prod.id)}
                                  aria-label={`Delete ${prod.name}`}
                                  className="p-1.5 rounded transition-colors cursor-pointer"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3
                        className="font-serif text-xl font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        Customer Orders
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Manage shipments, verify UPI transaction IDs, and handle Cash on Delivery
                        orders.
                      </p>
                    </div>
                    <button
                      onClick={loadData}
                      className="text-xs flex items-center gap-1 hover:underline cursor-pointer"
                      style={{ color: 'var(--primary)' }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div
                      className="p-12 text-center border rounded-xl text-xs"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No orders recorded yet.
                    </div>
                  ) : (
                    <div
                      className="overflow-x-auto border rounded-xl shadow-xs"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <table className="w-full text-left text-xs">
                        <thead
                          className="border-b"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <tr>
                            <th className="p-3">Order Ref</th>
                            <th className="p-3">Customer Details</th>
                            <th className="p-3">Delivery Address</th>
                            <th className="p-3">Items</th>
                            <th className="p-3">Payment & Total</th>
                            <th className="p-3">Update Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                          {orders.map((ord) => (
                            <tr key={ord.id}>
                              <td className="p-3 align-top font-mono">
                                <div className="font-bold" style={{ color: 'var(--text-main)' }}>
                                  {ord.id}
                                </div>
                                <div
                                  className="text-[10px] tabular-nums"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {new Date(ord.created_at).toLocaleDateString('en-IN')}
                                </div>
                              </td>

                              <td className="p-3 align-top">
                                <div
                                  className="font-semibold"
                                  style={{ color: 'var(--text-main)' }}
                                >
                                  {ord.customer_details.name}
                                </div>
                                <div
                                  className="text-xs tabular-nums"
                                  style={{ color: 'var(--primary)' }}
                                >
                                  {ord.customer_details.phone}
                                </div>
                              </td>

                              <td className="p-3 align-top max-w-[200px]">
                                <div className="text-xs" style={{ color: 'var(--text-main)' }}>
                                  {ord.customer_details.address}
                                </div>
                                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                  {ord.customer_details.city} {ord.customer_details.pincode}
                                </div>
                              </td>

                              <td className="p-3 align-top">
                                <ul className="space-y-1">
                                  {ord.items.map((it, idx) => (
                                    <li key={idx} style={{ color: 'var(--text-main)' }}>
                                      <span className="font-semibold tabular-nums">{it.qty}x</span>{' '}
                                      {it.name}
                                    </li>
                                  ))}
                                </ul>
                              </td>

                              <td className="p-3 align-top">
                                <div
                                  className="font-bold text-sm tabular-nums"
                                  style={{ color: 'var(--primary)' }}
                                >
                                  {formatINR(ord.total)}
                                </div>
                                <span
                                  className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold border"
                                  style={{
                                    backgroundColor: 'var(--surface-elevated)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--primary)',
                                  }}
                                >
                                  {ord.payment_method === 'UPI'
                                    ? 'UPI QR'
                                    : ord.payment_method === 'RAZORPAY'
                                    ? 'Razorpay Online'
                                    : 'Cash on Delivery'}
                                </span>
                                {ord.upi_ref_id && (
                                  <div
                                    className="text-[10px] font-mono mt-1"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    UTR: {ord.upi_ref_id}
                                  </div>
                                )}
                                {ord.razorpay_payment_id && (
                                  <div
                                    className="text-[10px] font-mono mt-1"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    RZP: {ord.razorpay_payment_id}
                                  </div>
                                )}
                              </td>

                              <td className="p-3 align-top">
                                <select
                                  value={ord.status}
                                  onChange={(e) =>
                                    handleStatusChange(ord.id, e.target.value as any)
                                  }
                                  className="p-1.5 border rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: 'var(--input-bg)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--text-main)',
                                  }}
                                >
                                  <option value="Pending UPI Payment">Pending UPI Payment</option>
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="Packed">Packed</option>
                                  <option value="Shipped">Shipped</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ACTIVITY LOG & NOTIFICATIONS */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3
                        className="font-serif text-xl font-semibold flex items-center gap-2"
                        style={{ color: 'var(--text-main)' }}
                      >
                        <span>Merchant Activity Log & Alerts</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-600 text-white font-sans font-bold">
                            {unreadCount} new
                          </span>
                        )}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Live audit log of all customer orders, stock adjustments, and inventory
                        modifications.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="px-3 py-1.5 border text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--primary)',
                      }}
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark All as Read</span>
                    </button>
                  </div>

                  {/* Filter Buttons */}
                  <div
                    className="flex items-center gap-1.5 border-b pb-2 text-xs"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span
                      className="flex items-center gap-1 mr-2 text-[11px] font-semibold uppercase"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Filter className="w-3 h-3" /> Filter:
                    </span>
                    {(['all', 'order', 'inventory', 'status'] as const).map((filter) => {
                      const active = activityFilter === filter;
                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setActivityFilter(filter)}
                          className="px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer"
                          style={{
                            backgroundColor: active ? 'var(--primary)' : 'var(--surface-elevated)',
                            color: active ? 'var(--btn-text)' : 'var(--text-muted)',
                          }}
                        >
                          {filter === 'all'
                            ? 'All Events'
                            : filter === 'order'
                            ? 'Orders'
                            : filter === 'inventory'
                            ? 'Inventory'
                            : 'Status Updates'}
                        </button>
                      );
                    })}
                  </div>

                  {/* Activity Timeline List */}
                  {filteredActivities.length === 0 ? (
                    <div
                      className="p-12 text-center border rounded-xl text-xs"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No activity events found for the selected filter.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredActivities.map((act) => (
                        <div
                          key={act.id}
                          className="p-4 rounded-xl border transition-all flex items-start gap-3.5"
                          style={{
                            backgroundColor: act.read
                              ? 'var(--surface)'
                              : 'var(--surface-elevated)',
                            borderColor: act.read ? 'var(--border)' : 'var(--primary)',
                          }}
                        >
                          <div className="shrink-0 mt-0.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center border"
                              style={{
                                backgroundColor: 'var(--surface-elevated)',
                                borderColor: 'var(--border)',
                                color: 'var(--primary)',
                              }}
                            >
                              {act.type === 'order' ? (
                                <ShoppingBag className="w-4 h-4" />
                              ) : act.type === 'inventory' ? (
                                <Package className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4
                                className="font-semibold text-xs flex items-center gap-2"
                                style={{ color: 'var(--text-main)' }}
                              >
                                <span>{act.title}</span>
                                {!act.read && (
                                  <span
                                    className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase"
                                    style={{
                                      backgroundColor: 'var(--primary)',
                                      color: 'var(--btn-text)',
                                    }}
                                  >
                                    New
                                  </span>
                                )}
                              </h4>
                              <span
                                className="text-[10px] font-mono whitespace-nowrap tabular-nums"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {new Date(act.timestamp).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p
                              className="text-xs mt-0.5 leading-relaxed"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {act.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: STORE SETTINGS (Complete Merchant Store Settings Management) */}
              {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div>
                      <h3
                        className="font-serif text-2xl font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        Store Settings & Business Profile
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Manage your brand identity, announcement bar, contact details, social links,
                        policies, and checkout payment methods. Separate from Theme & Cover Photo.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setStoreSettings({ ...DEFAULT_STORE_SETTINGS });
                          setBanner({
                            type: 'info',
                            message:
                              'Default values loaded into form. Click "Save Store Settings" to apply.',
                          });
                        }}
                        className="px-3.5 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Load Defaults
                      </button>

                      <button
                        type="submit"
                        disabled={isSavingSettings}
                        className="px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50 shadow-xs"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--btn-text)',
                        }}
                      >
                        {isSavingSettings ? 'Saving...' : 'Save Store Settings'}
                      </button>
                    </div>
                  </div>

                  {/* SECTION 1: Brand Identity, Logo & Homepage Messaging */}
                  <div
                    className="p-5 rounded-xl border space-y-4"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <h4
                      className="font-serif text-lg font-semibold"
                      style={{ color: 'var(--text-main)' }}
                    >
                      1. Brand Identity, Logo & Homepage Messaging
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="setting-store-name"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Store / Brand Name
                        </label>
                        <input
                          id="setting-store-name"
                          type="text"
                          value={storeSettings.storeName}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, storeName: e.target.value })
                          }
                          placeholder="e.g. Indian Ishq Collection"
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-tagline"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Homepage Hero Tagline
                        </label>
                        <input
                          id="setting-tagline"
                          type="text"
                          value={storeSettings.tagline}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, tagline: e.target.value })
                          }
                          placeholder="e.g. Timeless Indian silhouettes, woven with ishq."
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="setting-announcement"
                        className="block text-xs font-semibold uppercase mb-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Store Announcement / Top Banner Text
                      </label>
                      <input
                        id="setting-announcement"
                        type="text"
                        value={storeSettings.announcementText}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, announcementText: e.target.value })
                        }
                        placeholder="e.g. Complimentary express shipping on orders above ₹1,999 · Handcrafted Indian Ethnic Wear"
                        className="w-full p-2.5 border rounded-lg text-xs"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="setting-description"
                        className="block text-xs font-semibold uppercase mb-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Store / Brand Description (Hero & Footer)
                      </label>
                      <textarea
                        id="setting-description"
                        rows={2}
                        value={storeSettings.brandDescription}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, brandDescription: e.target.value })
                        }
                        className="w-full p-2.5 border rounded-lg text-xs"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      />
                    </div>

                    {/* Logo Image Upload & URL */}
                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <label
                        htmlFor="setting-logo-url"
                        className="block text-xs font-semibold uppercase mb-1.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Store Logo Image (Optional — Displayed in Header & Footer)
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {storeSettings.logoUrl && (
                          <div className="flex items-center gap-2 shrink-0">
                            <img
                              src={storeSettings.logoUrl}
                              alt="Store logo preview"
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-lg object-cover border"
                              style={{ borderColor: 'var(--border)' }}
                            />
                            <button
                              type="button"
                              onClick={() => setStoreSettings({ ...storeSettings, logoUrl: '' })}
                              className="text-xs underline cursor-pointer"
                              style={{ color: 'var(--error-text)' }}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            id="setting-logo-url"
                            type="url"
                            value={storeSettings.logoUrl.startsWith('data:') ? '' : storeSettings.logoUrl}
                            onChange={(e) =>
                              setStoreSettings({ ...storeSettings, logoUrl: e.target.value })
                            }
                            placeholder="Paste direct logo image URL..."
                            className="w-full p-2.5 border rounded-lg text-xs"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-main)',
                            }}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            aria-label="Upload store logo image file"
                            onChange={handleLogoFileChange}
                            className="w-full p-2 border rounded-lg text-xs cursor-pointer"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-secondary)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Business Contact, Address, Maps & Hours */}
                  <div
                    className="p-5 rounded-xl border space-y-4"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <h4
                      className="font-serif text-lg font-semibold"
                      style={{ color: 'var(--text-main)' }}
                    >
                      2. Business Contact, Address & Hours
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="setting-phone"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Business Phone Number
                        </label>
                        <input
                          id="setting-phone"
                          type="text"
                          value={storeSettings.phone}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, phone: e.target.value })
                          }
                          className="w-full p-2.5 border rounded-lg text-xs tabular-nums"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-whatsapp"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          WhatsApp Number (with Country Code, e.g. 919876543210)
                        </label>
                        <input
                          id="setting-whatsapp"
                          type="text"
                          value={storeSettings.whatsapp}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, whatsapp: e.target.value })
                          }
                          className="w-full p-2.5 border rounded-lg text-xs tabular-nums"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-email"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Business Email
                        </label>
                        <input
                          id="setting-email"
                          type="email"
                          value={storeSettings.email}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, email: e.target.value })
                          }
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-maps"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Google Maps URL
                        </label>
                        <input
                          id="setting-maps"
                          type="url"
                          value={storeSettings.mapsUrl}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, mapsUrl: e.target.value })
                          }
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-weekday-hours"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Monday – Saturday Hours
                        </label>
                        <input
                          id="setting-weekday-hours"
                          type="text"
                          value={storeSettings.weekdayHours}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, weekdayHours: e.target.value })
                          }
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-sunday-hours"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Sunday Hours
                        </label>
                        <input
                          id="setting-sunday-hours"
                          type="text"
                          value={storeSettings.sundayHours}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, sundayHours: e.target.value })
                          }
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="setting-address"
                        className="block text-xs font-semibold uppercase mb-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Business / Boutique Address
                      </label>
                      <input
                        id="setting-address"
                        type="text"
                        value={storeSettings.address}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, address: e.target.value })
                        }
                        className="w-full p-2.5 border rounded-lg text-xs"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      />
                    </div>
                  </div>

                  {/* SECTION 3: Social Media Links */}
                  <div
                    className="p-5 rounded-xl border space-y-4"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <h4
                      className="font-serif text-lg font-semibold"
                      style={{ color: 'var(--text-main)' }}
                    >
                      3. Social Media URLs
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label
                          htmlFor="setting-instagram"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Instagram URL
                        </label>
                        <input
                          id="setting-instagram"
                          type="url"
                          value={storeSettings.instagramUrl}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, instagramUrl: e.target.value })
                          }
                          placeholder="https://instagram.com/..."
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-facebook"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Facebook URL
                        </label>
                        <input
                          id="setting-facebook"
                          type="url"
                          value={storeSettings.facebookUrl}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, facebookUrl: e.target.value })
                          }
                          placeholder="https://facebook.com/..."
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-twitter"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Twitter / X URL
                        </label>
                        <input
                          id="setting-twitter"
                          type="url"
                          value={storeSettings.twitterUrl}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, twitterUrl: e.target.value })
                          }
                          placeholder="https://twitter.com/..."
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: Delivery, Shipping, Return & Exchange Policies */}
                  <div
                    className="p-5 rounded-xl border space-y-4"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <h4
                      className="font-serif text-lg font-semibold"
                      style={{ color: 'var(--text-main)' }}
                    >
                      4. Delivery, Shipping & Return Policies
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="setting-delivery-policy"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Delivery Information & Shipping Policy
                        </label>
                        <textarea
                          id="setting-delivery-policy"
                          rows={3}
                          value={storeSettings.deliveryPolicy}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, deliveryPolicy: e.target.value })
                          }
                          className="w-full p-2.5 border rounded-lg text-xs leading-relaxed"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-return-policy"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Return & Exchange Policy
                        </label>
                        <textarea
                          id="setting-return-policy"
                          rows={3}
                          value={storeSettings.returnPolicy}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, returnPolicy: e.target.value })
                          }
                          className="w-full p-2.5 border rounded-lg text-xs leading-relaxed"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-free-shipping-threshold"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Free Shipping Threshold (₹ INR)
                        </label>
                        <input
                          id="setting-free-shipping-threshold"
                          type="number"
                          min={0}
                          step={50}
                          value={storeSettings.freeShippingThreshold ?? 1999}
                          onChange={(e) =>
                            setStoreSettings({
                              ...storeSettings,
                              freeShippingThreshold: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-standard-shipping-fee"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Standard Shipping Fee Below Threshold (₹ INR)
                        </label>
                        <input
                          id="setting-standard-shipping-fee"
                          type="number"
                          min={0}
                          step={10}
                          value={storeSettings.standardShippingFee ?? 99}
                          onChange={(e) =>
                            setStoreSettings({
                              ...storeSettings,
                              standardShippingFee: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full p-2.5 border rounded-lg text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: Available Payment Methods & Gateway Configuration */}
                  <div
                    className="p-5 rounded-xl border space-y-4"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <h4
                      className="font-serif text-lg font-semibold"
                      style={{ color: 'var(--text-main)' }}
                    >
                      5. Available Payment Methods & Gateway Configuration
                    </h4>

                    {/* Payment Method Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label
                        className="p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: storeSettings.codEnabled ? 'var(--primary)' : 'var(--border)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={storeSettings.codEnabled}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, codEnabled: e.target.checked })
                          }
                          className="mt-0.5 accent-current"
                        />
                        <div>
                          <span className="block text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                            Cash on Delivery (COD)
                          </span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Pay upon doorstep delivery
                          </span>
                        </div>
                      </label>

                      <label
                        className="p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: storeSettings.upiEnabled ? 'var(--primary)' : 'var(--border)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={storeSettings.upiEnabled}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, upiEnabled: e.target.checked })
                          }
                          className="mt-0.5 accent-current"
                        />
                        <div>
                          <span className="block text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                            Dynamic UPI QR
                          </span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            GPay, PhonePe, Paytm QR
                          </span>
                        </div>
                      </label>

                      <label
                        className="p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: storeSettings.razorpayEnabled
                            ? 'var(--primary)'
                            : 'var(--border)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={storeSettings.razorpayEnabled}
                          onChange={(e) =>
                            setStoreSettings({
                              ...storeSettings,
                              razorpayEnabled: e.target.checked,
                            })
                          }
                          className="mt-0.5 accent-current"
                        />
                        <div>
                          <span className="block text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                            Razorpay Online
                          </span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Requires public Key ID below
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label
                          htmlFor="setting-upi-vpa"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Merchant UPI VPA Address
                        </label>
                        <input
                          id="setting-upi-vpa"
                          type="text"
                          value={storeSettings.upiVpa}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, upiVpa: e.target.value })
                          }
                          placeholder="e.g. indianishq@okaxis"
                          className="w-full p-2.5 border rounded-lg text-xs font-mono"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="setting-razorpay-key"
                          className="block text-xs font-semibold uppercase mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Razorpay Public Key ID (Optional: rzp_test_... / rzp_live_...)
                        </label>
                        <input
                          id="setting-razorpay-key"
                          type="text"
                          value={storeSettings.razorpayKeyId}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, razorpayKeyId: e.target.value })
                          }
                          placeholder="Leave blank if not using Razorpay yet"
                          className="w-full p-2.5 border rounded-lg text-xs font-mono"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('customization')}
                        className="px-4 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--primary)',
                        }}
                      >
                        Open Store Customization →
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('slideshow')}
                        className="px-4 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--primary)',
                        }}
                      >
                        Configure Hero Slideshow →
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest cursor-pointer disabled:opacity-50 shadow-sm"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--btn-text)',
                      }}
                    >
                      {isSavingSettings ? 'Saving Settings...' : 'Save Store Settings'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 5: STORE CUSTOMIZATION */}
              {activeTab === 'customization' && (
                <StoreCustomization
                  storeSettings={storeSettings}
                  isSaving={isSavingSettings}
                  onChangeSettings={setStoreSettings}
                  onSaveSettings={handleSaveSettings}
                  onSelectPresetTheme={(themeId) =>
                    onThemePreviewChange?.(
                      themeId,
                      storeSettings.defaultAppearance || 'system'
                    )
                  }
                  onBanner={(b) => {
                    setBanner(b);
                    setTimeout(() => setBanner(null), 4000);
                  }}
                />
              )}

              {/* TAB 6: HERO SLIDESHOW MANAGEMENT */}
              {activeTab === 'slideshow' && (
                <HeroSlideshowManager
                  storeSettings={storeSettings}
                  isSaving={isSavingSettings}
                  onChangeSettings={setStoreSettings}
                  onSaveSettings={handleSaveSettings}
                  onBanner={(b) => {
                    setBanner(b);
                    setTimeout(() => setBanner(null), 4000);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      <ProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductCreated={(newProd) => {
          setProducts((prev) => [newProd, ...prev]);
          onCatalogChanged();
        }}
      />
    </div>
  );
};
