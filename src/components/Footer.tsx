import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Heart,
  Instagram,
  Facebook,
  Twitter,
  Shield,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { isRazorpayConfigured } from '../utils/ecommerce';
import {
  type StoreSettings,
  getLocalStoreSettings,
  fetchStoreSettings,
  subscribeToStoreSettings,
} from '../services/settings';

interface FooterProps {
  storeSettings?: StoreSettings;
  onOpenMerchant?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ storeSettings: propSettings, onOpenMerchant }) => {
  const [localSettings, setLocalSettings] = useState<StoreSettings>(() => getLocalStoreSettings());
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    fetchStoreSettings().then(setLocalSettings).catch(() => {});
    const unsub = subscribeToStoreSettings((live) => setLocalSettings(live));

    const handleLocalUpdate = (e: Event) => {
      const custom = e as CustomEvent<StoreSettings>;
      if (custom.detail) {
        setLocalSettings(custom.detail);
      } else {
        setLocalSettings(getLocalStoreSettings());
      }
    };
    window.addEventListener('ishq:settings-updated', handleLocalUpdate);
    return () => {
      unsub();
      window.removeEventListener('ishq:settings-updated', handleLocalUpdate);
    };
  }, []);

  const settings = propSettings || localSettings;

  useEffect(() => {
    setLogoError(false);
  }, [settings.logoUrl]);

  const cleanPhoneHref = (settings.phone || '+919876543210').replace(/[^\d+]/g, '');
  const cleanWhatsapp = (settings.whatsapp || '919876543210').replace(/\D/g, '') || '919876543210';

  const enabledPayments = [
    settings.upiEnabled ? 'UPI QR' : null,
    isRazorpayConfigured(settings.razorpayKeyId, settings.razorpayEnabled) ? 'Razorpay' : null,
    settings.codEnabled ? 'COD' : null,
  ].filter(Boolean);

  return (
    <footer
      id="footer-contact"
      className="border-t pt-14 pb-10 transition-colors"
      style={{
        backgroundColor: 'var(--footer-bg, #240c13)',
        color: 'var(--footer-text, #f7ebe8)',
        borderColor: 'var(--border, #3d131f)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        {/* Main flex container: centered column on mobile, responsive multi-column row on desktop */}
        <div className="flex flex-col md:flex-row flex-wrap justify-between gap-10 pb-10 border-b border-white/15 items-center md:items-start text-center md:text-left">
          {/* 1. Brand, Logo & Description */}
          <div className="flex flex-col items-center md:items-start space-y-4 max-w-xs">
            <div className="flex items-center gap-2.5">
              {settings.logoUrl && !logoError && (
                <img
                  src={settings.logoUrl}
                  alt={`${settings.storeName} logo`}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-10 h-10 rounded-lg object-cover border border-white/20 shrink-0"
                />
              )}
              <span
                className="font-serif text-2xl font-bold tracking-wide"
                style={{ color: 'var(--accent, #d4af37)' }}
              >
                {settings.storeName}
              </span>
            </div>
            <p className="text-xs opacity-85 leading-relaxed font-sans">
              {settings.brandDescription}
            </p>
            <div className="flex items-center gap-2 text-xs opacity-75 pt-1">
              <span>Crafted with</span>
              <Heart className="w-3.5 h-3.5 text-red-400 fill-current" />
              <span>for ethnic wear lovers</span>
            </div>

            {/* Social Media Links */}
            {(settings.instagramUrl || settings.facebookUrl || settings.twitterUrl) && (
              <div className="pt-2">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
                  style={{ color: 'var(--accent, #d4af37)' }}
                >
                  Follow Our Journey
                </p>
                <div className="flex items-center justify-center md:justify-start gap-3">
                  {settings.instagramUrl && (
                    <a
                      href={settings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {settings.facebookUrl && (
                    <a
                      href={settings.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {settings.twitterUrl && (
                    <a
                      href={settings.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Contact Links (tel:, wa.me, mailto:) */}
          <div className="flex flex-col items-center md:items-start space-y-3">
            <h4
              className="font-serif text-base font-semibold tracking-wider uppercase"
              style={{ color: 'var(--accent, #d4af37)' }}
            >
              Get in Touch
            </h4>
            <ul className="flex flex-col items-center md:items-start space-y-2.5 text-xs">
              <li>
                <a
                  href={`tel:${cleanPhoneHref}`}
                  className="flex items-center gap-2.5 opacity-85 hover:opacity-100 transition-opacity group"
                >
                  <span className="p-1.5 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                    <Phone className="w-3.5 h-3.5" style={{ color: 'var(--accent, #d4af37)' }} />
                  </span>
                  <span className="tabular-nums">{settings.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                    `Hi ${settings.storeName}, I would like to inquire about your ethnic wear collection.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 opacity-85 hover:opacity-100 transition-opacity group"
                >
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
                  </span>
                  <span>WhatsApp Boutique ({settings.whatsapp})</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-2.5 opacity-85 hover:opacity-100 transition-opacity group"
                >
                  <span className="p-1.5 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                    <Mail className="w-3.5 h-3.5" style={{ color: 'var(--accent, #d4af37)' }} />
                  </span>
                  <span>{settings.email}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* 3. Business Hours */}
          <div className="flex flex-col items-center md:items-start space-y-3">
            <h4
              className="font-serif text-base font-semibold tracking-wider uppercase"
              style={{ color: 'var(--accent, #d4af37)' }}
            >
              Business Hours
            </h4>
            <div className="flex flex-col items-center md:items-start space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="p-1.5 rounded-lg bg-white/10 mt-0.5">
                  <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent, #d4af37)' }} />
                </span>
                <div className="text-center md:text-left">
                  <p className="font-medium">Monday – Saturday</p>
                  <p className="opacity-75 text-[11px] tabular-nums">{settings.weekdayHours}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <span className="p-1.5 rounded-lg bg-white/10 mt-0.5">
                  <Clock className="w-3.5 h-3.5 opacity-60" />
                </span>
                <div className="text-center md:text-left">
                  <p className="font-medium">Sunday</p>
                  <p className="opacity-75 text-[11px]">{settings.sundayHours}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Google Maps Link & Location */}
          <div className="flex flex-col items-center md:items-start space-y-3 max-w-xs">
            <h4
              className="font-serif text-base font-semibold tracking-wider uppercase"
              style={{ color: 'var(--accent, #d4af37)' }}
            >
              Store Location
            </h4>
            <div className="flex flex-col items-center md:items-start space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="p-1.5 rounded-lg bg-white/10 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent, #d4af37)' }} />
                </span>
                <div className="text-center md:text-left">
                  <p className="font-medium">Flagship Boutique</p>
                  <p className="opacity-80 text-[11px] leading-relaxed">{settings.address}</p>
                </div>
              </div>
              <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
                <a
                  href={settings.mapsUrl || 'https://maps.google.com/?q=Civil+Lines+New+Delhi'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent, #d4af37)' }} />
                  <span>View on Google Maps</span>
                </a>

                {onOpenMerchant && (
                  <button
                    type="button"
                    onClick={onOpenMerchant}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" style={{ color: 'var(--accent, #d4af37)' }} />
                    <span>Merchant Portal</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shipping & Return Policies Summary Row */}
        <div className="py-6 border-b border-white/15 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-white/10 shrink-0 mt-0.5">
              <Truck className="w-4 h-4" style={{ color: 'var(--accent, #d4af37)' }} />
            </span>
            <div>
              <h5
                className="font-semibold uppercase tracking-wider text-[11px] mb-1"
                style={{ color: 'var(--accent, #d4af37)' }}
              >
                Delivery & Shipping Policy
              </h5>
              <p className="opacity-80 leading-relaxed text-[11px]">{settings.deliveryPolicy}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-white/10 shrink-0 mt-0.5">
              <RotateCcw className="w-4 h-4" style={{ color: 'var(--accent, #d4af37)' }} />
            </span>
            <div>
              <h5
                className="font-semibold uppercase tracking-wider text-[11px] mb-1"
                style={{ color: 'var(--accent, #d4af37)' }}
              >
                Return & Exchange Policy
              </h5>
              <p className="opacity-80 leading-relaxed text-[11px]">{settings.returnPolicy}</p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] opacity-75 gap-4 text-center sm:text-left">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span>
              Secure Checkout (
              {enabledPayments.length > 0 ? enabledPayments.join(', ') : 'COD & UPI QR'})
            </span>
            <span aria-hidden="true">·</span>
            <span>Pan-India Express Shipping</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
