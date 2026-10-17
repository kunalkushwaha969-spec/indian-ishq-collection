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
  getStoredToken,
  setStoredToken,
  testSupabaseConnection,
} from '../services/api';
import {
  getEffectiveSupabaseUrl,
  getEffectiveSupabaseKey,
  saveCustomSupabaseCredentials,
  isPlaceholderSupabaseUrl,
} from '../services/supabase';
import {
  type MerchantActivity,
  getMerchantActivities,
  markActivitiesAsRead,
  getUnreadActivityCount,
} from '../services/activity';
import { ProductModal } from './ProductModal';
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
  Database,
  CheckCircle,
  Truck,
  ExternalLink,
  Bell,
  Clock,
  CheckCheck,
  Tag,
  Filter,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogChanged: () => void;
  onOpenCloudDocs: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onCatalogChanged,
  onOpenCloudDocs,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [password, setPassword] = useState('ishq2026');
  const [email, setEmail] = useState('admin@indianishq.com');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'inventory' | 'orders' | 'activity' | 'cloud'
  >('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // In-app Merchant Notification & Activity Log state
  const [activities, setActivities] = useState<MerchantActivity[]>(() => getMerchantActivities());
  const [unreadCount, setUnreadCount] = useState<number>(() => getUnreadActivityCount());
  const [activityFilter, setActivityFilter] = useState<'all' | 'order' | 'inventory' | 'status'>('all');

  // Live Supabase connection management
  const [supabaseUrlInput, setSupabaseUrlInput] = useState<string>(() => {
    const url = getEffectiveSupabaseUrl();
    return isPlaceholderSupabaseUrl(url) ? '' : url;
  });
  const [supabaseKeyInput, setSupabaseKeyInput] = useState<string>(() => {
    const url = getEffectiveSupabaseUrl();
    return isPlaceholderSupabaseUrl(url) ? '' : getEffectiveSupabaseKey();
  });
  const [isTestingConn, setIsTestingConn] = useState<boolean>(false);
  const [connFeedback, setConnFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [activeDbUrl, setActiveDbUrl] = useState<string>(() => getEffectiveSupabaseUrl());

  // Synchronize activity log in real-time
  useEffect(() => {
    const updateActivities = () => {
      setActivities(getMerchantActivities());
      setUnreadCount(getUnreadActivityCount());
    };
    window.addEventListener('ishq:activity-updated', updateActivities);
    return () => window.removeEventListener('ishq:activity-updated', updateActivities);
  }, []);

  // Listen to custom credentials updates
  useEffect(() => {
    const handleCredUpdate = () => {
      setActiveDbUrl(getEffectiveSupabaseUrl());
    };
    window.addEventListener('ishq:supabase-config-updated', handleCredUpdate);
    return () => window.removeEventListener('ishq:supabase-config-updated', handleCredUpdate);
  }, []);

  // Check auth session on open
  useEffect(() => {
    if (isOpen) {
      const checkAuth = async () => {
        setIsCheckingAuth(true);
        const valid = await verifyAdminSession();
        setIsAuthenticated(valid);
        setIsCheckingAuth(false);
        if (valid) {
          loadData();
        }
      };
      checkAuth();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [prods, ords] = await Promise.all([
        fetchProducts('All', '').catch((e) => {
          console.warn('Admin fetchProducts handled:', e);
          return [];
        }),
        fetchOrders().catch((e) => {
          console.warn('Admin fetchOrders handled:', e);
          return [];
        }),
      ]);
      setProducts(prods);
      setOrders(ords);
      setActivities(getMerchantActivities());
      setUnreadCount(getUnreadActivityCount());
    } catch (err: any) {
      console.warn('Admin data load notice:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      await loginAdmin(password, email);
      setIsAuthenticated(true);
      loadData();
    } catch (err: any) {
      setLoginError(err.message || 'Unauthorized: Invalid password or admin email');
    }
  };

  const handleLogout = () => {
    setStoredToken(null);
    setIsAuthenticated(false);
  };

  const handleStockChange = async (id: string, newStock: number) => {
    try {
      await updateProductStock(id, newStock);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p))
      );
      onCatalogChanged();
      setBanner({ type: 'success', message: 'Stock updated successfully.' });
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
      setBanner({ type: 'success', message: 'Product removed from live catalog.' });
      setTimeout(() => setBanner(null), 3000);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to delete product.' });
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      setBanner({ type: 'success', message: `Order #${orderId} marked as ${newStatus}.` });
      setTimeout(() => setBanner(null), 3000);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed to update order status.' });
    }
  };

  const handleMarkAllRead = () => {
    markActivitiesAsRead();
    setActivities(getMerchantActivities());
    setUnreadCount(0);
    setBanner({ type: 'success', message: 'All merchant notifications marked as read.' });
    setTimeout(() => setBanner(null), 2500);
  };

  const handleTestAndSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnFeedback(null);
    setIsTestingConn(true);

    const cleanUrl = supabaseUrlInput.trim().replace(/\/+$/, '');
    const cleanKey = supabaseKeyInput.trim();

    if (!cleanUrl.startsWith('http')) {
      setConnFeedback({
        ok: false,
        message: 'Invalid Project URL. Must start with https:// (e.g. https://xyz.supabase.co)',
      });
      setIsTestingConn(false);
      return;
    }

    if (cleanKey.length < 20) {
      setConnFeedback({
        ok: false,
        message: 'Invalid API Key. Please paste your public anon key from Supabase.',
      });
      setIsTestingConn(false);
      return;
    }

    const res = await testSupabaseConnection(cleanUrl, cleanKey);
    setConnFeedback(res);
    setIsTestingConn(false);

    if (res.ok) {
      saveCustomSupabaseCredentials(cleanUrl, cleanKey);
      setActiveDbUrl(cleanUrl);
      loadData();
      onCatalogChanged();
      setBanner({
        type: 'success',
        message: 'Connected to your Supabase project! Live database sync is now active.',
      });
    }
  };

  if (!isOpen) return null;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? o.total : 0), 0);
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const filteredActivities = activities.filter((a) => {
    if (activityFilter === 'all') return true;
    return a.type === activityFilter;
  });
  const hasPlaceholderDb = isPlaceholderSupabaseUrl(activeDbUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-[#fffdf9] w-full max-w-5xl rounded-xl shadow-2xl border border-[#eadfda] flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* HEADER BAR */}
        <div className="p-4 sm:p-5 border-b border-[#eadfda] flex items-center justify-between bg-[#fcf9f5]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f8eeeb] text-[#70283b] rounded-lg border border-[#eadfda]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-widest uppercase font-semibold text-[#b78a4b]">
                  Backend Protected Route
                </span>
                {isAuthenticated && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Live Session Active
                  </span>
                )}
                {hasPlaceholderDb ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('cloud')}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Demo Fallback Mode</span>
                    <span>(Connect DB)</span>
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Supabase Live</span>
                  </span>
                )}
              </div>
              <h2 id="admin-title" className="font-serif text-2xl text-[#70283b] leading-tight">
                Merchant Workspace
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                {/* Notification Bell Badge Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('activity');
                    handleMarkAllRead();
                  }}
                  className="relative p-2 text-[#70283b] hover:bg-white rounded-lg border border-[#eadfda] transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Merchant Activity & Order Alerts"
                >
                  <Bell className="w-4 h-4" />
                  <span className="text-xs font-semibold hidden sm:inline">Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-bold animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenCloudDocs}
                  className="px-3 py-2 border border-[#eadfda] bg-[#fcf9f5] hover:bg-white text-[#70283b] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cloud Blueprints</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close merchant dashboard"
              className="text-2xl text-[#70283b] hover:opacity-75 p-1 leading-none ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto">
          {isCheckingAuth ? (
            <div className="py-20 text-center text-[#776c6b] text-xs">
              Verifying backend merchant authorization token...
            </div>
          ) : !isAuthenticated ? (
            /* LOCK SCREEN */
            <div className="max-w-md mx-auto my-12 p-8 bg-white border border-[#eadfda] rounded-lg shadow-sm text-center">
              <div className="w-14 h-14 bg-[#f8eeeb] text-[#70283b] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#eadfda]">
                <Lock className="w-7 h-7" />
              </div>

              <h3 className="font-serif text-2xl text-[#292222]">Protected /admin Route</h3>
              <p className="text-xs text-[#776c6b] mt-1 mb-6 leading-relaxed">
                This endpoint requires authenticated credentials. Unauthorized visitors cannot view
                order streams, sales totals, or modify inventory.
              </p>

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs text-left rounded-r">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-[#776c6b] uppercase mb-1">
                    Merchant Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#fffdf9] border border-[#eadfda] rounded text-xs text-[#292222] focus:outline-[#b78a4b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#776c6b] uppercase mb-1">
                    Admin Access Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 bg-[#fffdf9] border border-[#eadfda] rounded text-xs text-[#292222] focus:outline-[#b78a4b]"
                  />
                </div>

                <div className="bg-[#fcf5f3] p-3 rounded text-[11px] text-[#70283b] border border-[#eadfda]">
                  Demo Merchant Password: <strong className="font-mono">ishq2026</strong>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold tracking-wider uppercase rounded transition-colors shadow cursor-pointer"
                >
                  Verify & Enter Workspace
                </button>
              </form>
            </div>
          ) : (
            /* AUTHENTICATED MERCHANT DASHBOARD */
            <div className="p-4 sm:p-6 space-y-6">
              {/* Notice Banner if running on demo fallback without real Supabase connection */}
              {hasPlaceholderDb && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <strong className="font-semibold block sm:inline">Database Notice: </strong>
                      <span>
                        Running on local resilient cache. To synchronize real-time product edits and customer orders with your live Supabase project, link your Project URL in Cloud Architecture.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cloud')}
                    className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Connect Supabase
                  </button>
                </div>
              )}

              {/* Inline Notification Banner */}
              {banner && (
                <div
                  role="status"
                  className={`p-3 rounded text-xs flex items-center justify-between border transition-all ${
                    banner.type === 'error'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {banner.type === 'error' ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    )}
                    <span>{banner.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBanner(null)}
                    aria-label="Dismiss notification"
                    className="text-xs font-bold px-1.5 py-0.5 text-gray-500 hover:text-gray-800 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#f8eeeb] p-4 rounded-xl border border-[#eadfda]">
                  <div className="flex items-center justify-between text-[#776c6b] text-xs">
                    <span>Total Sales</span>
                    <TrendingUp className="w-4 h-4 text-[#70283b]" />
                  </div>
                  <strong className="block font-serif text-2xl text-[#70283b] mt-2">
                    {formatINR(totalRevenue)}
                  </strong>
                </div>

                <div className="bg-[#f8eeeb] p-4 rounded-xl border border-[#eadfda]">
                  <div className="flex items-center justify-between text-[#776c6b] text-xs">
                    <span>Live Orders</span>
                    <ShoppingBag className="w-4 h-4 text-[#70283b]" />
                  </div>
                  <strong className="block font-serif text-2xl text-[#70283b] mt-2 flex items-center gap-2">
                    <span>{orders.length}</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white font-sans font-bold">
                        +{unreadCount}
                      </span>
                    )}
                  </strong>
                </div>

                <div className="bg-[#f8eeeb] p-4 rounded-xl border border-[#eadfda]">
                  <div className="flex items-center justify-between text-[#776c6b] text-xs">
                    <span>Catalog Items</span>
                    <Package className="w-4 h-4 text-[#70283b]" />
                  </div>
                  <strong className="block font-serif text-2xl text-[#70283b] mt-2">
                    {products.length}
                  </strong>
                </div>

                <div className="bg-[#f8eeeb] p-4 rounded-xl border border-[#eadfda]">
                  <div className="flex items-center justify-between text-[#776c6b] text-xs">
                    <span>Low / Sold Out</span>
                    <AlertTriangle className="w-4 h-4 text-[#b78a4b]" />
                  </div>
                  <strong className="block font-serif text-2xl text-[#70283b] mt-2">
                    {outOfStockCount}
                  </strong>
                </div>
              </div>

              {/* Navigation Tabs with Badges */}
              <div className="flex border-b border-[#eadfda] gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'inventory', label: `Inventory (${products.length})` },
                  { id: 'orders', label: `Orders (${orders.length})` },
                  {
                    id: 'activity',
                    label: 'Activity & Notifications',
                    badge: unreadCount,
                  },
                  { id: 'cloud', label: 'Cloud Architecture & Sync' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (tab.id === 'activity') {
                        handleMarkAllRead();
                      }
                    }}
                    className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#70283b] text-white'
                        : 'bg-transparent text-[#776c6b] hover:text-[#70283b]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Recent Customer Orders Card */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-serif text-xl text-[#70283b]">Recent Customer Orders</h3>
                      <button
                        onClick={loadData}
                        className="text-xs text-[#70283b] flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {orders.length === 0 ? (
                      <div className="p-8 text-center bg-white border border-[#eadfda] rounded text-xs text-[#776c6b]">
                        No orders recorded yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto bg-white border border-[#eadfda] rounded-xl shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#fcf9f5] border-b border-[#eadfda] text-[#776c6b]">
                            <tr>
                              <th className="p-3">Order ID</th>
                              <th className="p-3">Customer</th>
                              <th className="p-3">Items</th>
                              <th className="p-3">Payment</th>
                              <th className="p-3">Total</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#eadfda]">
                            {orders.slice(0, 5).map((ord) => (
                              <tr key={ord.id} className="hover:bg-gray-50">
                                <td className="p-3 font-mono font-medium text-[#292222]">
                                  {ord.id}
                                </td>
                                <td className="p-3">
                                  <div className="font-medium text-[#292222]">
                                    {ord.customer_details.name}
                                  </div>
                                  <div className="text-[11px] text-[#776c6b]">
                                    {ord.customer_details.phone}
                                  </div>
                                </td>
                                <td className="p-3">
                                  {ord.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                                </td>
                                <td className="p-3">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-[#fcf5f3] text-[#70283b]">
                                    {ord.payment_method === 'UPI' ? 'UPI QR' : 'COD'}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-[#70283b]">
                                  {formatINR(ord.total)}
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-1 bg-[#f7e5c7] text-[#775019] rounded-full text-[10px] font-semibold">
                                    {ord.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Real-time Merchant Activity Preview Card */}
                  <div className="p-5 bg-white border border-[#eadfda] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#70283b]" />
                        <h4 className="font-serif text-lg text-[#292222]">Live Merchant Activity Stream</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('activity');
                          handleMarkAllRead();
                        }}
                        className="text-xs text-[#70283b] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Full Log ({activities.length})</span>
                        <span>→</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {activities.slice(0, 3).map((act) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-lg border border-[#f0e6e1] bg-[#fffdfa] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                act.type === 'order'
                                  ? 'bg-emerald-500'
                                  : act.type === 'inventory'
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-500'
                              }`}
                            />
                            <div>
                              <strong className="text-[#292222] font-semibold">{act.title}: </strong>
                              <span className="text-[#776c6b]">{act.detail}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-stone-400 whitespace-nowrap font-mono">
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
                      <h3 className="font-serif text-xl text-[#70283b]">Products & Stock Management</h3>
                      <p className="text-xs text-[#776c6b]">
                        Live catalog manager. Edit stock counts directly or add items with photos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="px-4 py-2 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold rounded uppercase tracking-wider flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Product</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto bg-white border border-[#eadfda] rounded-xl shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#fcf9f5] border-b border-[#eadfda] text-[#776c6b]">
                        <tr>
                          <th className="p-3">Image</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Stock Count</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eadfda]">
                        {products.map((prod) => (
                          <tr key={prod.id} className="hover:bg-gray-50">
                            <td className="p-3">
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="w-12 h-14 object-cover rounded border border-[#eadfda] bg-[#ead4c7]"
                              />
                            </td>
                            <td className="p-3">
                              <strong className="text-[#292222] block font-serif text-sm">
                                {prod.name}
                              </strong>
                              <span className="text-[10px] text-[#776c6b]">{prod.tag || 'CURATED'}</span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 text-[11px]">
                                {prod.category}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-[#70283b]">
                              {formatINR(prod.price)}
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min={0}
                                value={prod.stock}
                                onChange={(e) => handleStockChange(prod.id, parseInt(e.target.value, 10) || 0)}
                                className="w-16 p-1.5 border border-[#eadfda] rounded text-center font-semibold text-xs text-[#292222] focus:outline-[#b78a4b]"
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
                                    className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(prod.id)}
                                  aria-label={`Delete ${prod.name}`}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
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
                      <h3 className="font-serif text-xl text-[#70283b]">Customer Orders</h3>
                      <p className="text-xs text-[#776c6b]">
                        Manage shipments, verify UPI transaction IDs, and handle Cash on Delivery orders.
                      </p>
                    </div>
                    <button
                      onClick={loadData}
                      className="text-xs text-[#70283b] flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="p-12 text-center bg-white border border-[#eadfda] rounded text-xs text-[#776c6b]">
                      No orders recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white border border-[#eadfda] rounded-xl shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#fcf9f5] border-b border-[#eadfda] text-[#776c6b]">
                          <tr>
                            <th className="p-3">Order Ref</th>
                            <th className="p-3">Customer Details</th>
                            <th className="p-3">Delivery Address</th>
                            <th className="p-3">Items</th>
                            <th className="p-3">Payment & Total</th>
                            <th className="p-3">Update Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eadfda]">
                          {orders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-gray-50">
                              <td className="p-3 align-top font-mono text-[#292222]">
                                <div className="font-bold">{ord.id}</div>
                                <div className="text-[10px] text-[#776c6b]">
                                  {new Date(ord.created_at).toLocaleDateString('en-IN')}
                                </div>
                              </td>

                              <td className="p-3 align-top">
                                <div className="font-semibold text-[#292222]">
                                  {ord.customer_details.name}
                                </div>
                                <div className="text-xs text-[#70283b]">
                                  📞 {ord.customer_details.phone}
                                </div>
                              </td>

                              <td className="p-3 align-top max-w-[200px]">
                                <div className="text-xs text-[#292222]">
                                  {ord.customer_details.address}
                                </div>
                                <div className="text-[11px] text-[#776c6b]">
                                  {ord.customer_details.city} {ord.customer_details.pincode}
                                </div>
                              </td>

                              <td className="p-3 align-top">
                                <ul className="space-y-1">
                                  {ord.items.map((it, idx) => (
                                    <li key={idx} className="text-[#292222]">
                                      <span className="font-semibold">{it.qty}x</span> {it.name}
                                    </li>
                                  ))}
                                </ul>
                              </td>

                              <td className="p-3 align-top">
                                <div className="font-bold text-[#70283b] text-sm">
                                  {formatINR(ord.total)}
                                </div>
                                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#fcf5f3] text-[#70283b]">
                                  {ord.payment_method === 'UPI' ? 'UPI QR' : 'Cash on Delivery'}
                                </span>
                                {ord.upi_ref_id && (
                                  <div className="text-[10px] font-mono text-gray-500 mt-1">
                                    UTR: {ord.upi_ref_id}
                                  </div>
                                )}
                              </td>

                              <td className="p-3 align-top">
                                <select
                                  value={ord.status}
                                  onChange={(e) => handleStatusChange(ord.id, e.target.value as any)}
                                  className="p-1.5 bg-white border border-[#eadfda] rounded text-xs font-medium text-[#292222] focus:outline-[#b78a4b]"
                                >
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
                      <h3 className="font-serif text-xl text-[#70283b] flex items-center gap-2">
                        <span>Merchant Activity Log & Real-time Alerts</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-600 text-white font-sans font-bold">
                            {unreadCount} new
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[#776c6b]">
                        Live audit log of all customer orders, stock adjustments, and inventory modifications.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="px-3 py-1.5 bg-white border border-[#eadfda] hover:bg-gray-50 text-[#70283b] text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark All as Read</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 border-b border-[#eadfda] pb-2 text-xs">
                    <span className="text-[#776c6b] flex items-center gap-1 mr-2 text-[11px] font-semibold uppercase">
                      <Filter className="w-3 h-3" /> Filter:
                    </span>
                    {(['all', 'order', 'inventory', 'status'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setActivityFilter(filter)}
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors cursor-pointer ${
                          activityFilter === filter
                            ? 'bg-[#70283b] text-white'
                            : 'bg-[#fcf9f5] text-[#776c6b] hover:bg-[#f8eeeb] hover:text-[#70283b]'
                        }`}
                      >
                        {filter === 'all'
                          ? 'All Events'
                          : filter === 'order'
                          ? 'Orders'
                          : filter === 'inventory'
                          ? 'Inventory'
                          : 'Status Updates'}
                      </button>
                    ))}
                  </div>

                  {/* Activity Timeline List */}
                  {filteredActivities.length === 0 ? (
                    <div className="p-12 text-center bg-white border border-[#eadfda] rounded-xl text-xs text-[#776c6b]">
                      No activity events found for the selected filter.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredActivities.map((act) => (
                        <div
                          key={act.id}
                          className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                            act.read
                              ? 'bg-white border-[#eadfda]'
                              : 'bg-[#fffaf9] border-[#e8c5b9] shadow-xs'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {act.type === 'order' && (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4" />
                              </div>
                            )}
                            {act.type === 'inventory' && (
                              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            {act.type === 'status' && (
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center">
                                <Clock className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-semibold text-xs text-[#292222] flex items-center gap-2">
                                <span>{act.title}</span>
                                {!act.read && (
                                  <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[9px] font-bold rounded uppercase">
                                    New
                                  </span>
                                )}
                              </h4>
                              <span className="text-[10px] text-[#776c6b] font-mono whitespace-nowrap">
                                {new Date(act.timestamp).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-[#776c6b] mt-0.5 leading-relaxed">
                              {act.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CLOUD ARCHITECTURE & SUPABASE CONNECTION */}
              {activeTab === 'cloud' && (
                <div className="space-y-6">
                  {/* LIVE SUPABASE PROJECT LINKER */}
                  <div className="bg-white p-6 rounded-xl border border-[#b78a4b]/40 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eadfda] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#fcf9f5] border border-[#b78a4b]/30 rounded-xl text-[#70283b]">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-serif text-lg text-[#292222]">
                            Supabase Cloud Connection Settings
                          </h4>
                          <p className="text-xs text-[#776c6b]">
                            Link your live Supabase project to synchronize orders and catalog modifications instantly.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasPlaceholderDb ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Demo Local Cache</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Connected to Live Cloud</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {connFeedback && (
                      <div
                        className={`p-3.5 rounded-lg text-xs flex items-center gap-2 border ${
                          connFeedback.ok
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-red-50 text-red-900 border-red-200'
                        }`}
                      >
                        {connFeedback.ok ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>{connFeedback.message}</span>
                      </div>
                    )}

                    <form onSubmit={handleTestAndSaveSupabase} className="space-y-4 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                          Supabase Project URL *
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://your-project-id.supabase.co"
                          value={supabaseUrlInput}
                          onChange={(e) => setSupabaseUrlInput(e.target.value)}
                          className="w-full p-2.5 bg-[#fcf9f5] border border-[#eadfda] rounded-lg text-xs text-[#292222] font-mono focus:outline-[#b78a4b]"
                        />
                        <span className="text-[11px] text-[#776c6b] mt-1 block">
                          Found in Supabase: <strong>Project Settings ➔ Configuration ➔ API ➔ Project URL</strong>
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                          Supabase Public Anon Key *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          value={supabaseKeyInput}
                          onChange={(e) => setSupabaseKeyInput(e.target.value)}
                          className="w-full p-2.5 bg-[#fcf9f5] border border-[#eadfda] rounded-lg text-xs text-[#292222] font-mono focus:outline-[#b78a4b]"
                        />
                        <span className="text-[11px] text-[#776c6b] mt-1 block">
                          Found in Supabase: <strong>Project Settings ➔ Configuration ➔ API ➔ Project API keys ➔ `anon public`</strong>
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={isTestingConn}
                          className="px-5 py-2.5 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          <span>{isTestingConn ? 'Verifying Cloud Connection...' : 'Verify & Connect Live Database'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={onOpenCloudDocs}
                          className="text-xs text-[#70283b] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>View SQL Schema Scripts</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Database Architecture Details */}
                  <div className="bg-white p-6 rounded-xl border border-[#eadfda] space-y-4">
                    <h4 className="font-serif text-lg text-[#292222]">
                      Database Architecture & Table Schemas
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#fcf9f5] border border-[#eadfda] rounded-xl">
                        <strong className="block text-xs font-bold text-[#70283b] uppercase mb-1">
                          Table 1: Products
                        </strong>
                        <p className="text-[11px] text-[#776c6b] mb-2">
                          Fields: <code className="text-[#292222]">id, name, category, price, stock, image_url, tag, created_at</code>
                        </p>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
                          Public Read · Merchant Write (RLS Protected)
                        </span>
                      </div>

                      <div className="p-4 bg-[#fcf9f5] border border-[#eadfda] rounded-xl">
                        <strong className="block text-xs font-bold text-[#70283b] uppercase mb-1">
                          Table 2: Orders
                        </strong>
                        <p className="text-[11px] text-[#776c6b] mb-2">
                          Fields: <code className="text-[#292222]">id, customer_details, items, payment_method, upi_ref_id, status, total</code>
                        </p>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
                          Public Create · Merchant Read/Update (RLS Protected)
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={onOpenCloudDocs}
                        className="px-4 py-2 bg-[#70283b] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open SQL & JavaScript Code Blueprints</span>
                      </button>
                    </div>
                  </div>
                </div>
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
