import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'ishq_supabase_custom_url';
const STORAGE_KEY_KEY = 'ishq_supabase_custom_key';

// Official Production Default Supabase Project
export const DEFAULT_PROJECT_REF = 'totetycoeeqrsxsduhwx';
export const DEFAULT_SUPABASE_URL = 'https://totetycoeeqrsxsduhwx.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_H0rCbTz0yw118dY-2P8VIw_XrOVAFr1';

export function extractProjectRef(val: unknown): string {
  if (!val || typeof val !== 'string') return DEFAULT_PROJECT_REF;
  const raw = val.trim();
  const match = raw.match(/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) return match[1].toLowerCase();

  const domainMatch = raw.match(/https?:\/\/([a-zA-Z0-9_-]+)\.supabase\.co/i);
  if (domainMatch && domainMatch[1]) return domainMatch[1].toLowerCase();

  if (/^[a-z0-9_-]{15,30}$/i.test(raw)) return raw.toLowerCase();
  return DEFAULT_PROJECT_REF;
}

export function sanitizeUrl(val: unknown): string {
  if (!val || typeof val !== 'string') return DEFAULT_SUPABASE_URL;

  const raw = val.trim();
  // If user pasted their Supabase Dashboard URL (e.g. https://supabase.com/dashboard/project/totetycoeeqrsxsduhwx/...)
  const dashMatch = raw.match(/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashMatch && dashMatch[1]) {
    return `https://${dashMatch[1].toLowerCase()}.supabase.co`;
  }

  // If user entered only the project reference ID
  if (/^[a-z0-9_-]{15,30}$/i.test(raw)) {
    return `https://${raw.toLowerCase()}.supabase.co`;
  }

  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    // Prevent sending API calls to supabase.com dashboard directly (causes CORS errors)
    if (url.hostname === 'supabase.com' || url.hostname === 'app.supabase.com') {
      const ref = extractProjectRef(raw);
      return `https://${ref}.supabase.co`;
    }
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.origin;
    }
  } catch {}

  return DEFAULT_SUPABASE_URL;
}

export function sanitizeKey(val: unknown): string {
  if (!val || typeof val !== 'string') return DEFAULT_SUPABASE_ANON_KEY;
  const cleaned = val.replace(/^[^a-zA-Z0-9_.-]+|[^a-zA-Z0-9_.-]+$/g, '').trim();
  return cleaned || DEFAULT_SUPABASE_ANON_KEY;
}

export function isPlaceholderSupabaseUrl(val: unknown): boolean {
  if (!val || typeof val !== 'string') return true;
  const cleaned = val.trim().toLowerCase();
  return (
    cleaned === '' ||
    cleaned.includes('placeholder') ||
    cleaned.includes('your-project') ||
    cleaned.includes('example.com') ||
    cleaned.includes('<project-id>') ||
    !cleaned.startsWith('http')
  );
}

export function getEffectiveSupabaseUrl(): string {
  try {
    const custom = localStorage.getItem(STORAGE_URL_KEY);
    if (custom && custom.trim().length > 0) {
      const sanitized = sanitizeUrl(custom);
      // Auto-heal localStorage if user had stored a dashboard URL or malformed origin
      if (sanitized !== custom.trim()) {
        localStorage.setItem(STORAGE_URL_KEY, sanitized);
      }
      return sanitized;
    }
  } catch {}
  return sanitizeUrl(import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL);
}

export function getEffectiveSupabaseKey(): string {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_KEY);
    if (custom && custom.trim().length > 15) {
      return sanitizeKey(custom);
    }
  } catch {}
  return sanitizeKey(import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY);
}

export function saveCustomSupabaseCredentials(url: string, key: string): void {
  try {
    const cleanUrl = sanitizeUrl(url);
    const cleanKey = sanitizeKey(key);
    localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
    localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
    window.dispatchEvent(new CustomEvent('ishq:supabase-config-updated'));
  } catch {}
}

export function resetSupabaseCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_KEY_KEY);
    window.dispatchEvent(new CustomEvent('ishq:supabase-config-updated'));
  } catch {}
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
