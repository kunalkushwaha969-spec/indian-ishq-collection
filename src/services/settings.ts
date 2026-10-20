import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { verifyAdminSession } from './api';
import { addMerchantActivity } from './activity';
import {
  type StoreSettings,
  type HeroSlide,
  type HomepageSectionConfig,
  type HomepageSectionId,
  type CustomColorOverrides,
  type PromoBannerConfig,
  type StoreTestimonial,
  DEFAULT_STORE_SETTINGS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_CUSTOM_COLORS,
  DEFAULT_PROMO_BANNER,
  DEFAULT_TESTIMONIALS,
  mergeAndSanitizeStoreSettings,
  sanitizeHeroSlides,
  getActiveHeroSlides,
  reorderHeroSlides,
  sanitizeHomepageSections,
  reorderHomepageSections,
  validateIndianWhatsAppNumber,
  buildWhatsAppLink,
  buildCustomerOrderWhatsAppMessage,
  type WhatsAppValidationResult,
} from '../utils/ecommerce';

export {
  type StoreSettings,
  type HeroSlide,
  type HomepageSectionConfig,
  type HomepageSectionId,
  type CustomColorOverrides,
  type PromoBannerConfig,
  type StoreTestimonial,
  DEFAULT_STORE_SETTINGS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_CUSTOM_COLORS,
  DEFAULT_PROMO_BANNER,
  DEFAULT_TESTIMONIALS,
  mergeAndSanitizeStoreSettings,
  sanitizeHeroSlides,
  getActiveHeroSlides,
  reorderHeroSlides,
  sanitizeHomepageSections,
  reorderHomepageSections,
  validateIndianWhatsAppNumber,
  buildWhatsAppLink,
  buildCustomerOrderWhatsAppMessage,
  type WhatsAppValidationResult,
};

export const STORE_SETTINGS_STORAGE_KEY = 'ishq_store_settings_v1';

export function getLocalStoreSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(STORE_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoreSettings>;
      return mergeAndSanitizeStoreSettings(parsed, DEFAULT_STORE_SETTINGS);
    }
  } catch {}
  return { ...DEFAULT_STORE_SETTINGS };
}

export function setLocalStoreSettings(settings: StoreSettings): void {
  try {
    localStorage.setItem(STORE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ishq:settings-updated', { detail: settings }));
  }
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const localFallback = getLocalStoreSettings();
  if (!db) return localFallback;
  try {
    const docRef = doc(db, 'settings', 'store');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const merged = mergeAndSanitizeStoreSettings(
        snap.data() as Partial<StoreSettings>,
        localFallback
      );
      setLocalStoreSettings(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Firestore fetch settings notice:', err);
  }
  return localFallback;
}

export async function saveStoreSettings(
  settings: Partial<StoreSettings>
): Promise<StoreSettings> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    throw new Error('Unauthorized: Only authenticated administrators can update Store Settings.');
  }

  if (!db) {
    throw new Error('Firestore database is not initialized. Settings could not be saved.');
  }

  const currentSettings = getLocalStoreSettings();
  const clean: StoreSettings = {
    ...mergeAndSanitizeStoreSettings(settings, currentSettings),
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'settings', 'store');
    await setDoc(docRef, clean, { merge: true });
  } catch (err) {
    console.error('Firestore save settings error:', err);
    throw new Error('Failed to save Store Settings to Firestore. Please verify administrator permissions and connection.');
  }

  setLocalStoreSettings(clean);

  addMerchantActivity({
    type: 'status',
    title: 'Store Settings Updated',
    detail: `Updated settings for "${clean.storeName}" (${[
      clean.codEnabled ? 'COD' : null,
      clean.upiEnabled ? 'UPI QR' : null,
      clean.razorpayEnabled && clean.razorpayKeyId ? 'Razorpay' : null,
    ]
      .filter(Boolean)
      .join(', ')})`,
  });

  return clean;
}

export function subscribeToStoreSettings(
  callback: (settings: StoreSettings) => void
): () => void {
  if (!db) return () => {};
  try {
    const docRef = doc(db, 'settings', 'store');
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const merged = mergeAndSanitizeStoreSettings(
            snap.data() as Partial<StoreSettings>,
            getLocalStoreSettings()
          );
          setLocalStoreSettings(merged);
          callback(merged);
        }
      },
      () => {}
    );
  } catch {
    return () => {};
  }
}
