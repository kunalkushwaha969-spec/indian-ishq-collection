import React, { useState, useEffect } from 'react';
import type { Product, Order } from '../utils/ecommerce';
import { formatINR, resolveSafeProductImage } from '../utils/ecommerce';
import {
  fetchProducts,
  fetchOrders,
  updateProductStock,
  deleteProduct,
  updateOrderStatus,
  loginAdmin,
  loginAdminWithGoogle,
  signOutMerchant,
  subscribeToMerchantAuth,
  setStoredToken,
  subscribeToFirestoreProducts,
  subscribeToFirestoreOrders,
  type MerchantRole,
} from '../services/api';
import {
  type MerchantActivity,
  getMerchantActivities,
  markActivitiesAsRead,
  getUnreadActivityCount,
} from '../services/activity';
import { ProductModal } from './ProductModal';
import { StoreCustomization } from './StoreCustomization';
import {
  type StoreSettings,
  DEFAULT_STORE_SETTINGS,
  getLocalStoreSettings,
  fetchStoreSettings,
  saveStoreSettings,
  validateIndianWhatsAppNumber,
  buildWhatsAppLink,
  buildCustomerOrderWhatsAppMessage,
} from '../services/settings';
import { useAnimatedMount } from '../utils/useAnimatedMount';
import {
  Lock,
  ShieldCheck,
  Package,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  Edit3,
  RefreshCw,
  LogOut,
  CheckCircle,
  Bell,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  X,
  LayoutDashboard,
  Palette,
  Settings,
  Search,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogChanged: () => void;
  onAuthChange: (authenticated: boolean) => void;
  onThemePreviewChange?: (themeId: string, mode: 'light' | 'dark' | 'system') => void;
}

type MerchantSectionId = 'dashboard' | 'products' | 'orders' | 'customize' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onCatalogChanged,
  onAuthChange,
  onThemePreviewChange,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [merchantRole, setMerchantRole] = useState<MerchantRole | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Strictly 5 Main Sections: Dashboard, Products, Orders, Customize Store, Store Settings
  const [activeTab, setActiveTab] = useState<MerchantSectionId>('dashboard');

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() =>
    getLocalStoreSettings()
  );
  const [savedSettingsSnapshot, setSavedSettingsSnapshot] = useState<StoreSettings>(() =>
    getLocalStoreSettings()
  );
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Product Add / Edit Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState<string>('');

  // Feedback & Confirmation States
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetSettings, setConfirmResetSettings] = useState<boolean>(false);

  // Order Filters
  const [orderFilter, setOrderFilter] = useState<'all' | 'in_progress' | 'completed' | 'cancelled'>(
    'all'
  );

  // Activity Alerts
  const [activities, setActivities] = useState<MerchantActivity[]>(() => getMerchantActivities());
  const [unreadCount, setUnreadCount] = useState<number>(() => getUnreadActivityCount());

  // Animated mount hook must run unconditionally on every render
  const { shouldRender, isEntered } = useAnimatedMount(isOpen, 240);

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

    setIsCheckingAuth(true);
    const unsubAuth = subscribeToMerchantAuth(async (_user, isAdmin, role) => {
      if (isAdmin) {
        setIsAuthenticated(true);
        setMerchantRole(role || 'merchant');
        onAuthChange(true);
        await loadData();
      } else {
        setIsAuthenticated(false);
        setMerchantRole(null);
        onAuthChange(false);
      }
      setIsCheckingAuth(false);
    });

    return () => {
      unsubAuth();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    const unsubProducts = subscribeToFirestoreProducts((liveProducts) => {
      setProducts(liveProducts);
    });

    const unsubOrders = subscribeToFirestoreOrders((liveOrders) => {
      setOrders(liveOrders);
    });

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, [isOpen, isAuthenticated]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [prods, ords, settings] = await Promise.all([
        fetchProducts('All', ''),
        fetchOrders(),
        fetchStoreSettings(),
      ]);
      setProducts(prods);
      setOrders(ords);
      setStoreSettings(settings);
      setSavedSettingsSnapshot(settings);
    } catch {
      setBanner({
        type: 'error',
        message: 'Could not refresh store data. Using saved local data.',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveSettings = async (
    e?: React.FormEvent,
    customSettings?: StoreSettings
  ) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    setBanner(null);

    try {
      const target = customSettings || storeSettings;
      const saved = await saveStoreSettings(target);
      setStoreSettings(saved);
      setSavedSettingsSnapshot(saved);
      setBanner({
        type: 'success',
        message:
          activeTab === 'customize'
            ? 'Your store customization changes have been saved and published!'
            : 'Store settings saved successfully!',
      });
      setTimeout(() => setBanner(null), 4000);
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err.message || 'Could not save settings. Please try again.',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCancelSettingsChanges = () => {
    setStoreSettings(savedSettingsSnapshot);
    if (savedSettingsSnapshot.themeId) {
      onThemePreviewChange?.(
        savedSettingsSnapshot.themeId,
        savedSettingsSnapshot.defaultAppearance || 'light'
      );
    }
    setBanner({
      type: 'info',
      message: 'Unsaved changes discarded.',
    });
    setTimeout(() => setBanner(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await loginAdmin(password, email);
      setIsAuthenticated(true);
      setMerchantRole(res.user.role);
      onAuthChange(true);
      await loadData();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid administrator email or password.');
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError(null);
    try {
      const res = await loginAdminWithGoogle();
      setIsAuthenticated(true);
      setMerchantRole(res.user.role);
      onAuthChange(true);
      await loadData();
    } catch (err: any) {
      setLoginError(err.message || 'Google sign-in failed or account is not an authorized store administrator.');
    }
  };

  const handleLogout = async () => {
    await signOutMerchant();
    setStoredToken(null);
    setOrders([]);
    setIsAuthenticated(false);
    setMerchantRole(null);
    onAuthChange(false);
  };

  const handleStockChange = async (id: string, newStock: number) => {
    const clamped = Math.max(0, newStock);
    try {
      await updateProductStock(id, clamped);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: clamped } : p)));
      onCatalogChanged();
      setBanner({ type: 'success', message: 'Product stock updated!' });
      setTimeout(() => setBanner(null), 2500);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Could not update stock.' });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
      onCatalogChanged();
      setBanner({ type: 'success', message: 'Product deleted from your store.' });
      setTimeout(() => setBanner(null), 3000);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Could not delete product.' });
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      setBanner({ type: 'success', message: `Order #${orderId} updated to ${newStatus}.` });
      setTimeout(() => setBanner(null), 3000);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Could not update order status.' });
    }
  };

  const handleMarkAllRead = () => {
    markActivitiesAsRead();
    setActivities(getMerchantActivities());
    setUnreadCount(0);
    setBanner({ type: 'success', message: 'All alerts marked as read.' });
    setTimeout(() => setBanner(null), 2500);
  };

  const nonCancelledOrders = orders.filter((o) => o.status !== 'Cancelled');
  const completedOrders = orders.filter((o) => o.status === 'Delivered');
  const inProgressOrders = orders.filter(
    (o) =>
      o.status === 'Pending' ||
      o.status === 'Order Received' ||
      o.status === 'Pending UPI Payment' ||
      o.status === 'Confirmed' ||
      o.status === 'Packed' ||
      o.status === 'Shipped'
  );

  const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + o.total, 0);
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'completed') return o.status === 'Delivered';
    if (orderFilter === 'cancelled') return o.status === 'Cancelled';
    if (orderFilter === 'in_progress')
      return (
        o.status === 'Pending' ||
        o.status === 'Order Received' ||
        o.status === 'Pending UPI Payment' ||
        o.status === 'Confirmed' ||
        o.status === 'Packed' ||
        o.status === 'Shipped'
      );
    return true;
  });

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.fabric && p.fabric.toLowerCase().includes(q))
    );
  });

  const merchantWaValidation = validateIndianWhatsAppNumber(storeSettings.whatsapp);

  const MAIN_SECTIONS: {
    id: MerchantSectionId;
    label: string;
    mobileLabel: string;
    badge?: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      mobileLabel: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'products',
      label: 'Products',
      mobileLabel: 'Products',
      badge: products.length,
      icon: <Package className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'orders',
      label: 'Orders',
      mobileLabel: 'Orders',
      badge: orders.length,
      icon: <ShoppingBag className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'customize',
      label: 'Customize Store',
      mobileLabel: 'Customize',
      icon: <Palette className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Store Settings',
      mobileLabel: 'Settings',
      icon: <Settings className="w-4 h-4 shrink-0" />,
    },
  ];

  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 overflow-y-auto transition-opacity duration-240 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isEntered ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'var(--overlay)' }}
    >
      <div
        className={`w-full max-w-5xl sm:rounded-xl shadow-2xl border-0 sm:border flex flex-col h-full sm:h-auto sm:max-h-[92vh] overflow-hidden transition-all duration-240 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isEntered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-main)',
        }}
      >
        {/* TOP HEADER BAR */}
        <div
          className="px-4 py-3.5 sm:px-5 sm:py-4 border-b flex items-center justify-between gap-2 shrink-0 min-w-0"
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
              <div className="flex items-center gap-2">
                <h2
                  id="admin-title"
                  className="font-serif text-lg sm:text-2xl font-semibold leading-tight truncate"
                  style={{ color: 'var(--text-main)' }}
                >
                  Merchant Workspace
                </h2>
                {isAuthenticated && merchantRole && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--primary)',
                    }}
                  >
                    {merchantRole}
                  </span>
                )}
              </div>
              <span className="text-[11px] block truncate" style={{ color: 'var(--text-muted)' }}>
                {storeSettings.storeName || 'Indian Ishq Collection'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-2 border text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close merchant workspace"
              className="px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            >
              <X className="w-4 h-4" />
              <span>Back to Shop</span>
            </button>
          </div>
        </div>

        {/* 5-SECTION NAVIGATION BAR (Desktop & Tablet Top Bar) */}
        {isAuthenticated && !isCheckingAuth && (
          <nav
            aria-label="Merchant workspace sections"
            className="hidden sm:flex items-center gap-1.5 px-5 pt-2.5 border-b shrink-0 overflow-x-auto"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            {MAIN_SECTIONS.map((sec) => {
              const active = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveTab(sec.id)}
                  className="px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'transparent',
                    color: active ? 'var(--btn-text)' : 'var(--text-secondary)',
                  }}
                >
                  {sec.icon}
                  <span>{sec.label}</span>
                  {typeof sec.badge === 'number' && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums"
                      style={{
                        backgroundColor: active
                          ? 'rgba(255,255,255,0.22)'
                          : 'var(--surface)',
                        color: active ? 'var(--btn-text)' : 'var(--text-muted)',
                      }}
                    >
                      {sec.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* MAIN SCROLLABLE WORKSPACE CONTENT */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-24 sm:pb-6">
          {isCheckingAuth ? (
            <div className="py-20 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              Opening your merchant workspace...
            </div>
          ) : !isAuthenticated ? (
            /* SIMPLE SIGN-IN SCREEN */
            <div
              className="max-w-md mx-auto my-8 p-6 sm:p-8 border rounded-xl shadow-xs text-center"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 border"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--primary)',
                }}
              >
                <Lock className="w-5 h-5" />
              </div>

              <h3 className="font-serif text-2xl font-semibold" style={{ color: 'var(--text-main)' }}>
                Store Owner Sign In
              </h3>
              <p className="text-xs mt-1 mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Sign in to manage your products, check customer orders, and customize your store.
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

              <div className="space-y-4 text-left">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-3 px-4 text-xs font-semibold uppercase tracking-wider rounded-lg transition-opacity hover:opacity-95 shadow flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--btn-text)',
                  }}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Sign in with Google (Store Owner)</span>
                </button>

                <div className="relative flex items-center py-1">
                  <div className="grow border-t" style={{ borderColor: 'var(--border)' }} />
                  <span className="shrink-0 mx-3 text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Or Administrator Email
                  </span>
                  <div className="grow border-t" style={{ borderColor: 'var(--border)' }} />
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label
                      htmlFor="merchant-login-email"
                      className="block text-xs font-semibold mb-1"
                      style={{ color: 'var(--text-main)' }}
                    >
                      Administrator Email
                    </label>
                    <input
                      id="merchant-login-email"
                      type="email"
                      required
                      placeholder="Enter authorized admin email"
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
                      htmlFor="merchant-login-password"
                      className="block text-xs font-semibold mb-1"
                      style={{ color: 'var(--text-main)' }}
                    >
                      Password
                    </label>
                    <input
                      id="merchant-login-password"
                      type="password"
                      required
                      placeholder="Enter your Firebase Auth password"
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

                  <button
                    type="submit"
                    className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-opacity hover:opacity-90 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    Sign In with Email
                  </button>
                </form>

                <div
                  className="p-3 rounded-lg text-[11px] border leading-relaxed"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Protected by Firebase Authentication & Firestore Security Rules. Only verified store administrators can read customer orders, update order statuses, or edit store settings.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* NOTIFICATION BANNER */}
              {banner && (
                <div
                  role="status"
                  className="p-3.5 rounded-xl text-xs flex items-center justify-between border transition-all"
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
                    <span className="font-medium">{banner.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBanner(null)}
                    aria-label="Dismiss message"
                    className="text-sm font-bold px-2 py-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* ================================================================= */}
              {/* SECTION 1: DASHBOARD                                              */}
              {/* ================================================================= */}
              {activeTab === 'dashboard' && (
                <div key="dashboard" className="space-y-6 animate-fadeIn">
                  {/* WhatsApp Configuration Status Card */}
                  {!merchantWaValidation.isValid ? (
                    <div
                      className="p-4 sm:p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                      style={{
                        backgroundColor: 'rgba(217, 119, 6, 0.08)',
                        borderColor: 'rgba(217, 119, 6, 0.35)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg shrink-0 mt-0.5"
                          style={{ backgroundColor: 'rgba(217, 119, 6, 0.15)', color: '#d97706' }}
                        >
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                            Merchant WhatsApp Number Not Configured
                          </h4>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            You have not set up your WhatsApp number yet. Please add your WhatsApp number in Store Settings so you can test your contact link and message customers with prefilled order details.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className="px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 shadow-xs cursor-pointer"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--btn-text)',
                        }}
                      >
                        Configure in Store Settings →
                      </button>
                    </div>
                  ) : (
                    <div
                      className="p-3.5 sm:p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 shadow-xs"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <div className="text-xs min-w-0">
                          <span className="block" style={{ color: 'var(--text-muted)' }}>
                            Active Merchant WhatsApp Contact:
                          </span>
                          <strong className="font-mono text-emerald-600 font-semibold text-sm">
                            {merchantWaValidation.formattedDisplay}
                          </strong>
                        </div>
                      </div>
                      <a
                        href={buildWhatsAppLink(
                          merchantWaValidation.waId,
                          `Namaste! This is a manual test message from ${storeSettings.storeName} to verify that the merchant WhatsApp contact (${merchantWaValidation.formattedDisplay}) is configured properly.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-xs cursor-pointer"
                        title="Manually test WhatsApp contact in browser or mobile app"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Test WhatsApp Contact</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    </div>
                  )}

                  {/* 4 Key Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
                        className="block font-sans font-bold text-xl sm:text-2xl mt-1.5 tabular-nums"
                        style={{ color: 'var(--primary)' }}
                      >
                        {formatINR(totalRevenue)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="p-4 rounded-xl border text-left cursor-pointer transition-colors"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div
                        className="flex items-center justify-between text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span>Customer Orders</span>
                        <ShoppingBag className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      </div>
                      <strong
                        className="block font-serif text-xl sm:text-2xl mt-1.5 tabular-nums"
                        style={{ color: 'var(--primary)' }}
                      >
                        {orders.length}
                      </strong>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      className="p-4 rounded-xl border text-left cursor-pointer transition-colors"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div
                        className="flex items-center justify-between text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span>Products</span>
                        <Package className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      </div>
                      <strong
                        className="block font-serif text-xl sm:text-2xl mt-1.5 tabular-nums"
                        style={{ color: 'var(--primary)' }}
                      >
                        {products.length}
                      </strong>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      className="p-4 rounded-xl border text-left cursor-pointer transition-colors"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div
                        className="flex items-center justify-between text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span>Sold Out Items</span>
                        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      </div>
                      <strong
                        className="block font-serif text-xl sm:text-2xl mt-1.5 tabular-nums"
                        style={{ color: 'var(--primary)' }}
                      >
                        {outOfStockCount}
                      </strong>
                    </button>
                  </div>

                  {/* Quick Actions Strip for Mobile & Desktop */}
                  <div
                    className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div>
                      <h3
                        className="font-serif text-lg font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        Quick Actions
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Common tasks for running your store today
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setIsProductModalOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--btn-text)',
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Product</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('customize')}
                        className="px-4 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      >
                        <Palette className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                        <span>Customize Store</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="px-4 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      >
                        <ShoppingBag className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                        <span>Manage Orders ({inProgressOrders.length} active)</span>
                      </button>
                    </div>
                  </div>

                  {/* Recent Orders Box */}
                  <div
                    className="p-4 sm:p-5 rounded-xl border space-y-4"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3
                          className="font-serif text-lg sm:text-xl font-semibold"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Recent Customer Orders
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Update order status as you pack and ship items
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={loadData}
                          className="px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`}
                          />
                          <span>Refresh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('orders')}
                          className="text-xs font-semibold underline cursor-pointer"
                          style={{ color: 'var(--primary)' }}
                        >
                          View All ({orders.length})
                        </button>
                      </div>
                    </div>

                    {orders.length === 0 ? (
                      <div
                        className="p-6 text-center border rounded-lg text-xs"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        No customer orders yet. New orders will appear here automatically.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.slice(0, 5).map((ord) => (
                          <div
                            key={ord.id}
                            className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                            }}
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className="font-mono text-xs font-bold"
                                  style={{ color: 'var(--primary)' }}
                                >
                                  #{ord.id}
                                </span>
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: 'var(--text-main)' }}
                                >
                                  {ord.customer_details.name}
                                </span>
                                <span
                                  className="text-xs tabular-nums"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  · {ord.customer_details.phone}
                                </span>
                              </div>
                              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {ord.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0" style={{ borderColor: 'var(--border)' }}>
                              <strong
                                className="font-sans text-sm sm:text-base font-bold tabular-nums"
                                style={{ color: 'var(--primary)' }}
                              >
                                {formatINR(ord.total)}
                              </strong>
                              <select
                                aria-label={`Status for order ${ord.id}`}
                                value={ord.status}
                                onChange={(e) =>
                                  handleStatusChange(ord.id, e.target.value as Order['status'])
                                }
                                className="p-2 border rounded-lg text-xs font-semibold cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--input-bg)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-main)',
                                }}
                              >
                                <option value="Pending">Pending (Order Received)</option>
                                {ord.status === 'Order Received' && (
                                  <option value="Order Received">Order Received</option>
                                )}
                                <option value="Confirmed">Confirmed</option>
                                <option value="Packed">Packed</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                                {ord.status === 'Pending UPI Payment' && (
                                  <option value="Pending UPI Payment">Pending UPI Payment</option>
                                )}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Store Alerts */}
                  {activities.length > 0 && (
                    <div
                      className="p-4 sm:p-5 border rounded-xl space-y-3"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                          <h4
                            className="font-serif text-base font-semibold"
                            style={{ color: 'var(--text-main)' }}
                          >
                            Recent Store Activity
                          </h4>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-bold tabular-nums">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="text-xs font-semibold underline cursor-pointer"
                            style={{ color: 'var(--primary)' }}
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {activities.slice(0, 4).map((act) => (
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* SECTION 2: PRODUCTS (Straightforward Add, Edit, Stock & Delete)    */}
              {/* ================================================================= */}
              {activeTab === 'products' && (
                <div key="products" className="space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3
                        className="font-serif text-xl sm:text-2xl font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        Products ({products.length})
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Add new outfits, edit prices or descriptions, and adjust stock counts.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setIsProductModalOpen(true);
                      }}
                      className="px-4 py-2.5 text-xs font-semibold rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5 shadow cursor-pointer shrink-0"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--btn-text)',
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Product</span>
                    </button>
                  </div>

                  {/* Simple Product Search Bar */}
                  <div className="relative">
                    <Search
                      className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                      type="search"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products by name or category..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  {/* Mobile-Friendly Product Cards (Shown on Phones) */}
                  <div className="grid grid-cols-1 gap-3 md:hidden">
                    {filteredProducts.map((prod) => {
                      const hasDiscount =
                        Boolean(prod.old_price) && Number(prod.old_price) > Number(prod.price);
                      return (
                        <div
                          key={prod.id}
                          className="p-3.5 rounded-xl border space-y-3"
                          style={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--border)',
                          }}
                        >
                          <div className="flex gap-3">
                            <img
                              src={resolveSafeProductImage(prod)}
                              alt={prod.name}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src =
                                  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80';
                              }}
                              className="w-16 h-20 object-cover rounded-lg border shrink-0"
                              style={{ borderColor: 'var(--border)' }}
                            />
                            <div className="flex-1 min-w-0">
                              <span
                                className="text-[11px] font-medium"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                {prod.category}
                              </span>
                              <h4
                                className="font-serif text-base font-semibold leading-snug truncate"
                                style={{ color: 'var(--text-main)' }}
                              >
                                {prod.name}
                              </h4>
                              <div className="flex items-baseline gap-2 mt-1 tabular-nums">
                                <strong
                                  className="text-sm font-bold"
                                  style={{ color: 'var(--primary)' }}
                                >
                                  {formatINR(prod.price)}
                                </strong>
                                {hasDiscount && (
                                  <span
                                    className="text-xs line-through"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    {formatINR(prod.old_price!)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Mobile Stock & Action Controls */}
                          <div
                            className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Stock:
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStockChange(prod.id, prod.stock - 1)}
                                aria-label={`Decrease stock for ${prod.name}`}
                                className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--surface-elevated)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-main)',
                                }}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span
                                className="w-9 text-center text-xs font-bold tabular-nums"
                                style={{ color: 'var(--text-main)' }}
                              >
                                {prod.stock}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStockChange(prod.id, prod.stock + 1)}
                                aria-label={`Increase stock for ${prod.name}`}
                                className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--surface-elevated)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-main)',
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setIsProductModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--surface-elevated)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--primary)',
                                }}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              {confirmDeleteId === prod.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(prod.id)}
                                    className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2.5 py-1.5 border rounded-lg text-xs cursor-pointer"
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
                                  className="px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer"
                                  style={{
                                    backgroundColor: 'var(--error-bg)',
                                    borderColor: 'var(--error-border)',
                                    color: 'var(--error-text)',
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div
                    className="hidden md:block overflow-x-auto border rounded-xl shadow-xs"
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
                          <th className="p-3">Photo</th>
                          <th className="p-3">Product Details</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Stock</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {filteredProducts.map((prod) => {
                          const hasDiscount =
                            Boolean(prod.old_price) && Number(prod.old_price) > Number(prod.price);
                          return (
                            <tr key={prod.id}>
                              <td className="p-3">
                                <img
                                  src={resolveSafeProductImage(prod)}
                                  alt={prod.name}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80';
                                  }}
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
                                <span
                                  className="text-[11px] block"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {prod.fabric || 'Handcrafted Ethnic Wear'}
                                  {prod.sizes && prod.sizes.length > 0
                                    ? ` · Sizes: ${prod.sizes.join(', ')}`
                                    : ''}
                                </span>
                              </td>
                              <td className="p-3">
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  {prod.category}
                                </span>
                              </td>
                              <td className="p-3 tabular-nums">
                                <strong
                                  className="font-semibold block"
                                  style={{ color: 'var(--primary)' }}
                                >
                                  {formatINR(prod.price)}
                                </strong>
                                {hasDiscount && (
                                  <span
                                    className="text-[11px] line-through"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    {formatINR(prod.old_price!)}
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min={0}
                                  aria-label={`Stock count for ${prod.name}`}
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
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProduct(prod);
                                      setIsProductModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                    style={{
                                      backgroundColor: 'var(--surface-elevated)',
                                      borderColor: 'var(--border)',
                                      color: 'var(--primary)',
                                    }}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>

                                  {confirmDeleteId === prod.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteProduct(prod.id)}
                                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2.5 py-1.5 border rounded-lg text-xs cursor-pointer"
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
                                      className="p-1.5 rounded-lg border transition-colors cursor-pointer"
                                      style={{
                                        backgroundColor: 'var(--surface)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--text-muted)',
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* SECTION 3: ORDERS (Mobile Cards + Desktop Table)                  */}
              {/* ================================================================= */}
              {activeTab === 'orders' && (
                <div key="orders" className="space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3
                        className="font-serif text-xl sm:text-2xl font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        Customer Orders ({orders.length})
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        View delivery addresses, customer phone numbers, and update order status.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'all', label: `All (${orders.length})` },
                          { id: 'in_progress', label: `Active (${inProgressOrders.length})` },
                          { id: 'completed', label: `Delivered (${completedOrders.length})` },
                          { id: 'cancelled', label: 'Cancelled' },
                        ] as const
                      ).map((f) => {
                        const active = orderFilter === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setOrderFilter(f.id)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                            style={{
                              backgroundColor: active ? 'var(--primary)' : 'var(--surface-elevated)',
                              color: active ? 'var(--btn-text)' : 'var(--text-secondary)',
                              borderColor: active ? 'var(--primary)' : 'var(--border)',
                            }}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div
                      className="p-10 text-center border rounded-xl text-xs"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No orders found in this view.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 rounded-xl border space-y-3"
                          style={{
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--border)',
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-2">
                              <span
                                className="font-mono text-xs font-bold"
                                style={{ color: 'var(--primary)' }}
                              >
                                #{ord.id}
                              </span>
                              <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                · {new Date(ord.created_at).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-medium"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {ord.payment_method === 'UPI'
                                  ? 'UPI QR Payment'
                                  : ord.payment_method === 'RAZORPAY'
                                  ? 'Online Payment'
                                  : 'Cash on Delivery'}
                              </span>
                              <strong
                                className="font-sans text-base font-bold tabular-nums"
                                style={{ color: 'var(--primary)' }}
                              >
                                {formatINR(ord.total)}
                              </strong>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <span
                                className="text-[11px] font-semibold block mb-0.5"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Customer
                              </span>
                              <div className="font-semibold flex items-center gap-1" style={{ color: 'var(--text-main)' }}>
                                <User className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                                <span>{ord.customer_details.name}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <a
                                  href={`tel:${ord.customer_details.phone}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium tabular-nums cursor-pointer hover:opacity-85"
                                  style={{
                                    backgroundColor: 'var(--surface-elevated)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--text-main)',
                                  }}
                                  title="Call customer"
                                >
                                  <Phone className="w-3 h-3 shrink-0" style={{ color: 'var(--primary)' }} />
                                  <span>Call</span>
                                </a>

                                {merchantWaValidation.isValid ? (
                                  <a
                                    href={buildWhatsAppLink(
                                      ord.customer_details.phone,
                                      buildCustomerOrderWhatsAppMessage(
                                        ord,
                                        storeSettings.storeName,
                                        merchantWaValidation.formattedDisplay
                                      )
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium cursor-pointer hover:opacity-85"
                                    style={{
                                      backgroundColor: 'var(--surface-elevated)',
                                      borderColor: 'var(--border)',
                                      color: 'var(--success-text)',
                                    }}
                                    title={`Contact customer on WhatsApp with prefilled order details (From ${merchantWaValidation.formattedDisplay})`}
                                  >
                                    <MessageCircle className="w-3 h-3 shrink-0" />
                                    <span>WhatsApp Customer</span>
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('settings');
                                      setBanner({
                                        type: 'info',
                                        message: 'Please add your WhatsApp number in Store Settings so you can contact customers with order details.',
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium cursor-pointer hover:opacity-85"
                                    style={{
                                      backgroundColor: 'rgba(217, 119, 6, 0.08)',
                                      borderColor: 'rgba(217, 119, 6, 0.3)',
                                      color: '#b45309',
                                    }}
                                    title="Add your merchant WhatsApp number in Store Settings"
                                  >
                                    <MessageCircle className="w-3 h-3 shrink-0" />
                                    <span>Add WhatsApp in Settings</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div>
                              <span
                                className="text-[11px] font-semibold block mb-0.5"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Delivery Address
                              </span>
                              <div className="flex items-start gap-1" style={{ color: 'var(--text-secondary)' }}>
                                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>
                                  {ord.customer_details.address}
                                  {ord.customer_details.city ? `, ${ord.customer_details.city}` : ''}
                                  {ord.customer_details.pincode
                                    ? ` - ${ord.customer_details.pincode}`
                                    : ''}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span
                                className="text-[11px] font-semibold block mb-0.5"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                Outfits Ordered
                              </span>
                              <ul className="space-y-0.5" style={{ color: 'var(--text-main)' }}>
                                {ord.items.map((it, idx) => (
                                  <li key={idx}>
                                    <strong className="tabular-nums">{it.qty}x</strong> {it.name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div
                            className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                              Order Status:
                            </span>
                            <select
                              aria-label={`Update status for order ${ord.id}`}
                              value={ord.status}
                              onChange={(e) =>
                                handleStatusChange(ord.id, e.target.value as Order['status'])
                              }
                              className="p-2 border rounded-lg text-xs font-semibold cursor-pointer"
                              style={{
                                backgroundColor: 'var(--input-bg)',
                                borderColor: 'var(--border)',
                                color: 'var(--text-main)',
                              }}
                            >
                              <option value="Pending">Pending (Order Received)</option>
                              {ord.status === 'Order Received' && (
                                <option value="Order Received">Order Received</option>
                              )}
                              <option value="Confirmed">Confirmed</option>
                              <option value="Packed">Packed</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                              {ord.status === 'Pending UPI Payment' && (
                                <option value="Pending UPI Payment">Pending UPI Payment (Legacy)</option>
                              )}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* SECTION 4: CUSTOMIZE STORE (Homepage, Colors & Store Information) */}
              {/* ================================================================= */}
              {activeTab === 'customize' && (
                <div key="customize" className="animate-fadeIn">
                  <StoreCustomization
                    storeSettings={storeSettings}
                    isSaving={isSavingSettings}
                    onChangeSettings={setStoreSettings}
                    onSaveSettings={handleSaveSettings}
                    onCancelChanges={handleCancelSettingsChanges}
                    onSelectPresetTheme={(themeId, mode) =>
                      onThemePreviewChange?.(
                        themeId,
                        mode || storeSettings.defaultAppearance || 'light'
                      )
                    }
                    onBanner={(b) => {
                      setBanner(b);
                      setTimeout(() => setBanner(null), 4000);
                    }}
                  />
                </div>
              )}

              {/* ================================================================= */}
              {/* SECTION 5: STORE SETTINGS (Delivery Charges, Payments & Hours)    */}
              {/* ================================================================= */}
              {activeTab === 'settings' && (
                <form key="settings" onSubmit={(e) => handleSaveSettings(e)} className="space-y-6 animate-fadeIn">
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div>
                      <h3
                        className="font-serif text-xl sm:text-2xl font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        Store Settings
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Manage delivery charges, payment methods, announcement banner, and store hours.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleCancelSettingsChanges}
                        className="px-4 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Cancel
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
                        {isSavingSettings ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  {/* 1. Top Announcement Bar */}
                  <div
                    className="p-4 sm:p-5 rounded-xl border space-y-4"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4
                          className="font-serif text-lg font-semibold"
                          style={{ color: 'var(--text-main)' }}
                        >
                          1. Top Announcement Banner
                        </h4>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Short message shown at the very top of your shop (e.g. free delivery offer).
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={storeSettings.announcementEnabled !== false}
                          onChange={(e) =>
                            setStoreSettings({
                              ...storeSettings,
                              announcementEnabled: e.target.checked,
                            })
                          }
                          className="accent-current w-4 h-4"
                        />
                        <span>Show Banner</span>
                      </label>
                    </div>

                    <div>
                      <label
                        htmlFor="setting-announcement"
                        className="block text-xs font-semibold mb-1"
                        style={{ color: 'var(--text-main)' }}
                      >
                        Banner Message
                      </label>
                      <input
                        id="setting-announcement"
                        type="text"
                        value={storeSettings.announcementText}
                        onChange={(e) =>
                          setStoreSettings({ ...storeSettings, announcementText: e.target.value })
                        }
                        placeholder="Example: Free delivery on orders above ₹1,999 · Handcrafted Indian Ethnic Wear"
                        className="w-full p-2.5 border rounded-lg text-xs"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      />
                    </div>
                  </div>

                  {/* 2. Delivery Charges */}
                  <div
                    className="p-4 sm:p-5 rounded-xl border space-y-4"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div>
                      <h4
                        className="font-serif text-lg font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        2. Delivery Charges
                      </h4>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Set how much customers spend to get free delivery.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="setting-free-shipping-threshold"
                          className="block text-xs font-semibold mb-1"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Free Delivery on Orders Above (₹)
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
                          htmlFor="setting-standard-shipping-fee"
                          className="block text-xs font-semibold mb-1"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Standard Delivery Fee Below That Amount (₹)
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
                          className="w-full p-2.5 border rounded-lg text-xs tabular-nums"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Merchant WhatsApp Number & Store Contact */}
                  <div
                    className="p-4 sm:p-5 rounded-xl border space-y-4"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className="font-serif text-lg font-semibold flex items-center gap-2"
                          style={{ color: 'var(--text-main)' }}
                        >
                          <MessageCircle className="w-5 h-5 text-emerald-600" />
                          <span>3. Merchant WhatsApp & Phone Number</span>
                        </h4>
                        {merchantWaValidation.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Configured</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-amber-700 bg-amber-500/10 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Not Configured</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Configure your official merchant WhatsApp number for manual verification, customer inquiries, and one-click order follow-ups. Saved to Firebase Firestore.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* WhatsApp Number with +91 Country Code & Validation */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="setting-whatsapp"
                          className="block text-xs font-semibold"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Merchant WhatsApp Number
                        </label>
                        <div className="flex rounded-lg border overflow-hidden focus-within:ring-2 focus-within:ring-primary/40" style={{ borderColor: 'var(--border)' }}>
                          <span
                            className="px-3 py-2.5 text-xs font-semibold border-r flex items-center gap-1 select-none shrink-0"
                            style={{
                              backgroundColor: 'var(--surface)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            🇮🇳 +91
                          </span>
                          <input
                            id="setting-whatsapp"
                            type="text"
                            inputMode="tel"
                            value={storeSettings.whatsapp}
                            onChange={(e) =>
                              setStoreSettings({ ...storeSettings, whatsapp: e.target.value })
                            }
                            placeholder="e.g. 98765 43210"
                            className="w-full p-2.5 text-xs font-mono tabular-nums bg-transparent focus:outline-none"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              color: 'var(--text-main)',
                            }}
                          />
                        </div>

                        {/* Live Validation Guidance */}
                        {storeSettings.whatsapp.trim().length === 0 ? (
                          <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>No WhatsApp number configured yet. Enter your 10-digit mobile number above.</span>
                          </p>
                        ) : merchantWaValidation.isValid ? (
                          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Valid Indian mobile number ({merchantWaValidation.formattedDisplay}).</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{merchantWaValidation.error || 'Please enter a valid 10-digit Indian mobile number.'}</span>
                          </p>
                        )}
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          Accepts 10 digits with or without spaces/dashes. Automatically prefixes India (+91) country code.
                        </p>
                      </div>

                      {/* Store Phone Number */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="setting-store-phone"
                          className="block text-xs font-semibold"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Merchant Store Voice Phone
                        </label>
                        <input
                          id="setting-store-phone"
                          type="text"
                          inputMode="tel"
                          value={storeSettings.phone}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, phone: e.target.value })
                          }
                          placeholder="e.g. +91 98765 43210"
                          className="w-full p-2.5 border rounded-lg text-xs tabular-nums"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          Displayed in the website footer for regular phone calls.
                        </p>
                      </div>
                    </div>

                    {/* Test WhatsApp Contact Button & Manual Verification Card */}
                    <div
                      className="p-3.5 sm:p-4 rounded-xl border space-y-2.5"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div>
                          <h5 className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                            Manual WhatsApp Contact Verification
                          </h5>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {merchantWaValidation.isValid
                              ? `Ready to test contact with ${merchantWaValidation.formattedDisplay}`
                              : 'Enter a valid 10-digit WhatsApp number above to enable manual testing'}
                          </p>
                        </div>

                        {merchantWaValidation.isValid ? (
                          <a
                            href={buildWhatsAppLink(
                              merchantWaValidation.waId,
                              `Namaste! This is a manual test message from ${storeSettings.storeName} to verify that the merchant WhatsApp contact (${merchantWaValidation.formattedDisplay}) is configured properly.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition shadow-xs cursor-pointer shrink-0"
                            title="Open WhatsApp chat with configured number"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Test WhatsApp Contact</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border opacity-50 cursor-not-allowed shrink-0"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Test WhatsApp Contact</span>
                          </button>
                        )}
                      </div>

                      <div
                        className="p-2.5 rounded-lg border text-[11px] leading-relaxed flex items-start gap-2"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Manual Test Notice:</strong> This button opens WhatsApp in your browser or phone with a pre-filled test message so you can manually verify that your number opens and receives messages properly. This is a manual test, <em>not</em> an automatic background message, and does not incur any paid WhatsApp API fees.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Store Opening Hours & Email */}
                  <div
                    className="p-4 sm:p-5 rounded-xl border space-y-4"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div>
                      <h4
                        className="font-serif text-lg font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        4. Store Timings & Support Email
                      </h4>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Displayed in the website footer.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label
                          htmlFor="setting-email"
                          className="block text-xs font-semibold mb-1"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Support Email
                        </label>
                        <input
                          id="setting-email"
                          type="email"
                          value={storeSettings.email}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, email: e.target.value })
                          }
                          placeholder="Example: care@indianishq.in"
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
                          className="block text-xs font-semibold mb-1"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Monday – Saturday Timings
                        </label>
                        <input
                          id="setting-weekday-hours"
                          type="text"
                          value={storeSettings.weekdayHours}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, weekdayHours: e.target.value })
                          }
                          placeholder="Example: 10:30 AM – 8:30 PM"
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
                          className="block text-xs font-semibold mb-1"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Sunday Timings
                        </label>
                        <input
                          id="setting-sunday-hours"
                          type="text"
                          value={storeSettings.sundayHours}
                          onChange={(e) =>
                            setStoreSettings({ ...storeSettings, sundayHours: e.target.value })
                          }
                          placeholder="Example: 11:00 AM – 7:00 PM"
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

                  {/* Bottom Save, Cancel & Reset Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    {confirmResetSettings ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--warning-text)' }}>
                          Reset all settings to defaults?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setStoreSettings({ ...DEFAULT_STORE_SETTINGS });
                            setConfirmResetSettings(false);
                            setBanner({
                              type: 'info',
                              message:
                                'Default settings loaded. Tap "Save Changes" to apply them.',
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Yes, Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmResetSettings(false)}
                          className="px-3 py-2 rounded-lg border text-xs cursor-pointer"
                          style={{
                            backgroundColor: 'var(--surface-elevated)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        >
                          Keep Current
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmResetSettings(true)}
                        className="px-3.5 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Reset to Defaults
                      </button>
                    )}

                    <div className="flex items-center gap-2.5 ml-auto">
                      <button
                        type="button"
                        onClick={handleCancelSettingsChanges}
                        className="px-4 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingSettings}
                        className="px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50 shadow-sm"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--btn-text)',
                        }}
                      >
                        {isSavingSettings ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* MOBILE BOTTOM NAVIGATION BAR (5 Main Sections for Easy One-Hand Phone Use) */}
        {isAuthenticated && !isCheckingAuth && (
          <nav
            aria-label="Mobile merchant navigation"
            className="sm:hidden grid grid-cols-5 border-t shrink-0"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            {MAIN_SECTIONS.map((sec) => {
              const active = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveTab(sec.id)}
                  className="py-2.5 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--primary)' : 'transparent',
                    color: active ? 'var(--btn-text)' : 'var(--text-secondary)',
                  }}
                >
                  {sec.icon}
                  <span className="truncate max-w-full">{sec.mobileLabel}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* ADD / EDIT PRODUCT MODAL */}
        <ProductModal
          isOpen={isProductModalOpen}
          initialProduct={editingProduct}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          onProductCreated={(newProd) => {
            setProducts((prev) => [newProd, ...prev.filter((p) => p.id !== newProd.id)]);
            onCatalogChanged();
            setBanner({
              type: 'success',
              message: `"${newProd.name}" added to your store!`,
            });
            setTimeout(() => setBanner(null), 3500);
          }}
          onProductUpdated={(updatedProd) => {
            setProducts((prev) =>
              prev.map((p) => (p.id === updatedProd.id ? updatedProd : p))
            );
            onCatalogChanged();
            setBanner({
              type: 'success',
              message: `"${updatedProd.name}" updated!`,
            });
            setTimeout(() => setBanner(null), 3500);
          }}
        />
      </div>
    </div>
  );
};
