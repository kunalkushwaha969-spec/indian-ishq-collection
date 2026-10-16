import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function sanitizeUrl(val: unknown): string {
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

function sanitizeKey(val: unknown): string {
  const fallback = 'sb_publishable_H0rCbTz0yw118dY-2P8VIw_XrOVAFr1';
  if (!val || typeof val !== 'string') return fallback;

  const cleaned = val.replace(/^[^a-zA-Z0-9_.-]+|[^a-zA-Z0-9_.-]+$/g, '').trim();
  return cleaned || fallback;
}

export const SUPABASE_URL = sanitizeUrl(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = sanitizeKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

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

// Explicitly disconnect and terminate any default socket listener
try {
  if (supabase && (supabase as any).realtime) {
    (supabase as any).realtime.disconnect();
  }
} catch (e) {
  // Ignore in environments where realtime is already dormant
}
