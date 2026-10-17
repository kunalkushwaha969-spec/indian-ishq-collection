import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'ishq_supabase_custom_url';
const STORAGE_KEY_KEY = 'ishq_supabase_custom_key';

export function sanitizeUrl(val: unknown): string {
  const fallback = 'https://totetycoeeqrsxsduhwx.supabase.co';
  if (!val || typeof val !== 'string') return fallback;

  const cleaned = val
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/[^a-zA-Z0-9/]+$/, '')
    .trim();

  try {
    const url = new URL(cleaned);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.origin;
    }
  } catch {}

  return fallback;
}

export function sanitizeKey(val: unknown): string {
  const fallback = 'sb_publishable_H0rCbTz0yw118dY-2P8VIw_XrOVAFr1';
  if (!val || typeof val !== 'string') return fallback;

  const cleaned = val.replace(/^[^a-zA-Z0-9_.-]+|[^a-zA-Z0-9_.-]+$/g, '').trim();
  return cleaned || fallback;
}

export function getEffectiveSupabaseUrl(): string {
  try {
    const custom = localStorage.getItem(STORAGE_URL_KEY);
    if (custom && custom.trim().startsWith('http')) {
      return sanitizeUrl(custom);
    }
  } catch {}
  return sanitizeUrl(import.meta.env.VITE_SUPABASE_URL);
}

export function getEffectiveSupabaseKey(): string {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_KEY);
    if (custom && custom.trim().length > 15) {
      return sanitizeKey(custom);
    }
  } catch {}
  return sanitizeKey(import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function saveCustomSupabaseCredentials(url: string, key: string): void {
  try {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, key.trim());
    window.dispatchEvent(new CustomEvent('ishq:supabase-config-updated'));
  } catch {}
}

export function isPlaceholderSupabaseUrl(url: string = getEffectiveSupabaseUrl()): boolean {
  return (
    url.includes('totetycoeeqrsxsduhwx') ||
    url.includes('your-project') ||
    url.includes('placeholder')
  );
}

export const SUPABASE_URL = getEffectiveSupabaseUrl();
export const SUPABASE_ANON_KEY = getEffectiveSupabaseKey();

// Pure REST/HTTP client configuration — Realtime WebSockets explicitly disabled
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  },
});

try {
  if (supabase && (supabase as any).realtime) {
    (supabase as any).realtime.disconnect();
  }
} catch {}
