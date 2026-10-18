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
  subscribeToFirestoreProducts,
  subscribeToFirestoreOrders,
} from '../services/api';
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
  CheckCircle,
  Bell,
  Clock,
  CheckCheck,
  Filter,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogChanged: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onCatalogChanged,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [password, setPassword] = useState('ishq2026');
  const [email, setEmail] = useState('admin@indianishq.com');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'inventory' | 'orders' | 'activity'
  >('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [recentOrderFilter, setRecentOrderFilter] = useState<'all' | 'completed' | 'in_progress'>('all');

  // In-app Merchant Notification & Activity Log state
  const [activities, setActivities] = useState<MerchantActivity[]>(() => getMerchantActivities());
  const [unreadCount, setUnreadCount] = useState<number>(() => getUnreadActivityCount());
  const [activityFilter, setActivityFilter] = useState<'all' | 'order' | 'inventory' | 'status'>('all');

  // Synchronize store activity log in real-time
  useEffect(() => {
    const updateActivities = () => {
      setActivities(getMerchantActivities());
      setUnreadCount(getUnreadActivityCount());
    };
    window.addEventListener('ishq:activity-updated', updateActivities);
    return () => window.removeEventListener('ishq:activity-updated', updateActivities);
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

  // Real-time synchronization across devices (updates instantly when modified on phone or laptop)
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
      const [prods, ords] = await Promise.all([
        fetchProducts('All', '').catch(() => []),
        fetchOrders().catch(() => []),
      ]);
      setProducts(prods);
      setOrders(ords);
      setActivities(getMerchantActivities());
      setUnreadCount(getUnreadActivityCount());
    } catch {} finally {
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
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
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
  const avgOrderValue = nonCancelledOrders.length > 0 ? Math.round(totalRevenue / nonCancelledOrders.length) : 0;
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
                  Store Administration
                </span>
                {isAuthenticated && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Live Session Active
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
              Verifying merchant authorization...
            </div>
          ) : !isAuthenticated ? (
            /* LOCK SCREEN */
            <div className="max-w-md mx-auto my-12 p-8 bg-white border border-[#eadfda] rounded-lg shadow-sm text-center">
              <div className="w-14 h-14 bg-[#f8eeeb] text-[#70283b] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#eadfda]">
                <Lock className="w-7 h-7" />
              </div>

              <h3 className="font-serif text-2xl text-[#292222]">Merchant Login</h3>
              <p className="text-xs text-[#776c6b] mt-1 mb-6 leading-relaxed">
                Sign in to manage catalog items, review incoming customer orders, and update inventory stock counts.
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
                    Admin Password
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
                  Enter Workspace
                </button>
              </form>
            </div>
          ) : (
            /* AUTHENTICATED MERCHANT DASHBOARD */
            <div className="p-4 sm:p-6 space-y-6">
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

              {/* Clean Store Management Tabs */}
              <div className="flex border-b border-[#eadfda] gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'inventory', label: `Products (${products.length})` },
                  { id: 'orders', label: `Orders (${orders.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#70283b] text-white'
                        : 'bg-transparent text-[#776c6b] hover:text-[#70283b]'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* DEDICATED RECENT ORDERS SECTION */}
                  <div className="space-y-4 bg-white p-5 rounded-xl border border-[#eadfda] shadow-xs">
                    {/* Section Header & Performance Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#eadfda] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-5 h-5 text-[#70283b]" />
                          <h3 className="font-serif text-xl font-bold text-[#70283b]">Recent Orders</h3>
                          {completedOrders.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{completedOrders.length} Completed</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#776c6b] mt-0.5">
                          Track customer details, fulfillment progress, and completed sales performance.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                        {/* Status Filter Pills */}
                        <div className="flex items-center bg-[#fcf9f5] p-1 rounded-lg border border-[#eadfda] text-xs">
                          {(
                            [
                              { id: 'all', label: `All (${orders.length})` },
                              { id: 'completed', label: `Completed (${completedOrders.length})` },
                              { id: 'in_progress', label: `In Progress (${inProgressOrders.length})` },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setRecentOrderFilter(tab.id)}
                              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                                recentOrderFilter === tab.id
                                  ? 'bg-[#70283b] text-white shadow-xs font-semibold'
                                  : 'text-[#776c6b] hover:text-[#70283b]'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={loadData}
                          className="px-2.5 py-1.5 bg-[#fcf9f5] border border-[#eadfda] hover:bg-[#f8eeeb] text-[#70283b] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Refresh live orders from database"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">Sync</span>
                        </button>
                      </div>
                    </div>

                    {/* Performance Mini-Stats Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#fdfaf7] p-3 rounded-lg border border-[#f0e6e1] text-xs">
                      <div>
                        <span className="text-[#776c6b] text-[10px] uppercase font-semibold block">Completed Revenue</span>
                        <strong className="text-sm font-bold text-emerald-800 font-serif">
                          {formatINR(completedRevenue)}
                        </strong>
                        <span className="text-[10px] text-gray-500 block">{completedOrders.length} delivered orders</span>
                      </div>
                      <div>
                        <span className="text-[#776c6b] text-[10px] uppercase font-semibold block">Total Active Sales</span>
                        <strong className="text-sm font-bold text-[#70283b] font-serif">
                          {formatINR(totalRevenue)}
                        </strong>
                        <span className="text-[10px] text-gray-500 block">{nonCancelledOrders.length} valid orders</span>
                      </div>
                      <div>
                        <span className="text-[#776c6b] text-[10px] uppercase font-semibold block">Avg Order Value (AOV)</span>
                        <strong className="text-sm font-bold text-[#292222] font-serif">
                          {formatINR(avgOrderValue)}
                        </strong>
                        <span className="text-[10px] text-gray-500 block">per customer basket</span>
                      </div>
                      <div>
                        <span className="text-[#776c6b] text-[10px] uppercase font-semibold block">Fulfillment Rate</span>
                        <strong className="text-sm font-bold text-[#b78a4b] font-serif">
                          {nonCancelledOrders.length > 0
                            ? Math.round((completedOrders.length / nonCancelledOrders.length) * 100)
                            : 0}%
                        </strong>
                        <span className="text-[10px] text-gray-500 block">delivered to customer</span>
                      </div>
                    </div>

                    {/* Orders Table */}
                    {displayedRecentOrders.length === 0 ? (
                      <div className="p-8 text-center bg-[#fffdfa] border border-[#eadfda] rounded-lg text-xs text-[#776c6b]">
                        No {recentOrderFilter === 'completed' ? 'completed' : recentOrderFilter === 'in_progress' ? 'in-progress' : ''} orders recorded yet. Customer checkouts will automatically appear here.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-[#eadfda] rounded-lg shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#fcf9f5] border-b border-[#eadfda] text-[#776c6b] font-semibold text-[11px] uppercase tracking-wider">
                            <tr>
                              <th className="p-3">Order & Date</th>
                              <th className="p-3">Customer Details</th>
                              <th className="p-3">Items Ordered</th>
                              <th className="p-3">Payment</th>
                              <th className="p-3">Total Amount</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#eadfda]">
                            {displayedRecentOrders.map((ord) => (
                              <tr key={ord.id} className="hover:bg-[#fcfbf9] transition-colors">
                                <td className="p-3 align-top font-mono font-medium text-[#292222]">
                                  <div className="font-bold text-[#70283b]">{ord.id}</div>
                                  <div className="text-[10px] text-gray-500 font-sans mt-0.5">
                                    {new Date(ord.created_at).toLocaleString('en-IN', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </td>

                                <td className="p-3 align-top max-w-[220px]">
                                  <div className="font-semibold text-[#292222] flex items-center gap-1">
                                    <User className="w-3 h-3 text-[#70283b] shrink-0" />
                                    <span>{ord.customer_details.name}</span>
                                  </div>
                                  <div className="text-[11px] text-[#776c6b] flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                                    <span>{ord.customer_details.phone}</span>
                                  </div>
                                  <div className="text-[11px] text-[#776c6b] flex items-start gap-1 mt-0.5 leading-tight">
                                    <MapPin className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                                    <span>
                                      {ord.customer_details.address}
                                      {ord.customer_details.city ? `, ${ord.customer_details.city}` : ''}
                                      {ord.customer_details.pincode ? ` (${ord.customer_details.pincode})` : ''}
                                    </span>
                                  </div>
                                </td>

                                <td className="p-3 align-top max-w-[200px]">
                                  <div className="space-y-1">
                                    {ord.items.map((it, idx) => (
                                      <div key={idx} className="text-[#292222] text-[11px] leading-tight">
                                        <span className="font-bold text-[#70283b]">{it.qty}x</span> {it.name}
                                        {it.price && (
                                          <span className="text-gray-400 ml-1">({formatINR(it.price)})</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </td>

                                <td className="p-3 align-top">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      ord.payment_method === 'UPI'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-[#fcf5f3] text-[#70283b] border border-[#eadfda]'
                                    }`}
                                  >
                                    {ord.payment_method === 'UPI' ? 'UPI QR (Instant)' : 'Cash on Delivery'}
                                  </span>
                                  {ord.upi_ref_id && (
                                    <div className="text-[10px] font-mono text-gray-500 mt-1">
                                      UTR: {ord.upi_ref_id}
                                    </div>
                                  )}
                                </td>

                                <td className="p-3 align-top">
                                  <strong className="font-serif text-sm font-bold text-[#70283b]">
                                    {formatINR(ord.total)}
                                  </strong>
                                </td>

                                <td className="p-3 align-top">
                                  <select
                                    value={ord.status}
                                    onChange={(e) => handleStatusChange(ord.id, e.target.value as any)}
                                    className={`p-1.5 border rounded text-xs font-semibold focus:outline-[#b78a4b] cursor-pointer ${
                                      ord.status === 'Delivered'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : ord.status === 'Shipped'
                                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                                        : ord.status === 'Packed'
                                        ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                        : ord.status === 'Confirmed'
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : 'bg-red-50 text-red-800 border-red-300'
                                    }`}
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
                  <div className="p-5 bg-white border border-[#eadfda] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#70283b]" />
                        <h4 className="font-serif text-lg text-[#292222]">Store Activity Stream</h4>
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
                        <span>Merchant Activity Log & Alerts</span>
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

