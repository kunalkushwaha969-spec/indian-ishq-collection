export interface MerchantActivity {
  id: string;
  type: 'order' | 'inventory' | 'status';
  title: string;
  detail: string;
  timestamp: string;
  read: boolean;
}

const STORAGE_KEY = 'ishq_merchant_activity_log';

const defaultActivities: MerchantActivity[] = [
  {
    id: 'act-1',
    type: 'order',
    title: 'New Customer Order Received',
    detail: 'Order #IIC-555958 placed by Ananya Sharma (₹1,998 via UPI QR)',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
  },
  {
    id: 'act-2',
    type: 'order',
    title: 'New Customer Order Received',
    detail: 'Order #IIC-902148 placed by Priyanka Verma (₹1,899 via UPI QR)',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
  },
  {
    id: 'act-3',
    type: 'inventory',
    title: 'Initial Catalog Synchronized',
    detail: 'Cloud catalog seeded with 8 handcrafted ethnic wear pieces',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    read: true,
  },
];

export function getMerchantActivities(): MerchantActivity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultActivities));
      return defaultActivities;
    }
    return JSON.parse(raw);
  } catch {
    return defaultActivities;
  }
}

export function addMerchantActivity(
  item: Omit<MerchantActivity, 'id' | 'timestamp' | 'read'>
): MerchantActivity {
  const newActivity: MerchantActivity = {
    ...item,
    id: 'act-' + Date.now(),
    timestamp: new Date().toISOString(),
    read: false,
  };

  try {
    const existing = getMerchantActivities();
    const updated = [newActivity, ...existing].slice(0, 50); // keep 50 recent
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ishq:activity-updated'));
  } catch (e) {
    console.warn('Failed to save activity log:', e);
  }

  return newActivity;
}

export function markActivitiesAsRead(): void {
  try {
    const existing = getMerchantActivities();
    const updated = existing.map((a) => ({ ...a, read: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ishq:activity-updated'));
  } catch (e) {
    console.warn('Failed to mark activities as read:', e);
  }
}

export function getUnreadActivityCount(): number {
  const list = getMerchantActivities();
  return list.filter((a) => !a.read).length;
}
