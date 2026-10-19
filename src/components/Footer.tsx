import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Lock,
  ExternalLink,
  Instagram,
  Facebook,
  MessageCircle,
  Truck,
  RefreshCcw,
  Clock,
} from 'lucide-react';
import {
  type StoreSettings,
  DEFAULT_STORE_SETTINGS,
  isRazorpayConfigured,
} from '../utils/ecommerce';

interface FooterProps {
  storeSettings?: StoreSettings;
  onOpenMerchant: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  storeSettings = DEFAULT_STORE_SETTINGS,
  onOpenMerchant,
}) => {
  const [activeInfoModal, setActiveInfoModal] = useState<'shipping' | 'returns' | 'privacy' | null>(
    null
  );

  const brandName = storeSettings.storeName || DEFAULT_STORE_SETTINGS.storeName;
  const brandDesc = storeSettings.brandDescription || DEFAULT_STORE_SETTINGS.brandDescription;
  const addressText = storeSettings.address || '';
  const phoneText = storeSettings.phone || '';
  const emailText = storeSettings.email || '';
  const whatsappClean = (storeSettings.whatsapp || '').replace(/\D/g, '');
  const mapsUrl =
    storeSettings.mapsUrl ||
    (addressText
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${brandName} ${addressText}`
        )}`
      : '');
  const razorpayReady = isRazorpayConfigured(
    storeSettings.razorpayKeyId,
    storeSettings.razorpayEnabled
  );

  const showSocialLinks = storeSettings.showFooterSocial !== false;
  const showFooterHours = storeSettings.showFooterHours !== false;
  const showFooterMap = storeSettings.showFooterMap !== false;
  const showPolicyLinks = storeSettings.showFooterPolicies !== false;

  return (
    <footer
      className="border-t mt-12 transition-colors overflow-x-hidden max-w-full"
      style={{
        backgroundColor: 'var(--footer-bg)',
        borderColor: 'var(--border)',
        color: 'var(--text-main)',
      }}
    >
      <div className="max-w-[1240px] mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 min-w-0">
        {/* Col 1: Brand & Heritage */}
        <div className="space-y-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {storeSettings.logoUrl ? (
              <img
                src={storeSettings.logoUrl}
                alt={brandName}
                className="w-9 h-9 rounded-full object-cover border shrink-0"
                style={{ borderColor: 'var(--border)' }}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-base shrink-0"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                {brandName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h4
              className="font-serif text-xl font-bold tracking-wide truncate"
              style={{ color: 'var(--primary)' }}
            >
              {brandName}
            </h4>
          </div>
          <p className="text-xs leading-relaxed break-words" style={{ color: 'var(--text-secondary)' }}>
            {brandDesc}
          </p>

          {/* Social & Direct WhatsApp Links */}
          {showSocialLinks && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {whatsappClean && (
                <a
                  href={`https://wa.me/${whatsappClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              )}
              {storeSettings.instagramUrl && (
                <a
                  href={storeSettings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  <Instagram className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                  <span>Instagram</span>
                </a>
              )}
              {storeSettings.facebookUrl && (
                <a
                  href={storeSettings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  <Facebook className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                  <span>Facebook</span>
                </a>
              )}
            </div>
          )}

          <div
            className="pt-1 flex items-center gap-2 text-xs font-medium"
            style={{ color: 'var(--primary)' }}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>100% Handloom & Craft Mark Certified</span>
          </div>
        </div>

        {/* Col 2: Quick Navigation */}
        <div className="space-y-2.5 min-w-0">
          <h5
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--text-main)' }}
          >
            Collections
          </h5>
          <ul className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <li>
              <a href="#catalog" className="hover:underline transition">
                Royal Silk Sarees
              </a>
            </li>
            <li>
              <a href="#catalog" className="hover:underline transition">
                Festive & Bridal Wear
              </a>
            </li>
            <li>
              <a href="#catalog" className="hover:underline transition">
                Everyday Mulmul Kurtis
              </a>
            </li>
            <li>
              <a href="#story" className="hover:underline transition">
                Our Craftsmanship Story
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Customer Care & Policies */}
        <div className="space-y-2.5 min-w-0">
          <h5
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--text-main)' }}
          >
            Customer Care & Policies
          </h5>
          {showPolicyLinks && (
            <ul className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveInfoModal('shipping')}
                  className="hover:underline transition cursor-pointer text-left flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                  <span>Shipping & Delivery Policy</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveInfoModal('returns')}
                  className="hover:underline transition cursor-pointer text-left flex items-center gap-1.5"
                >
                  <RefreshCcw className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                  <span>Returns & Exchange Policy</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveInfoModal('privacy')}
                  className="hover:underline transition cursor-pointer text-left"
                >
                  Privacy & Payment Security
                </button>
              </li>
            </ul>
          )}

          {/* Available Payment Methods Summary */}
          <div className="pt-2">
            <span
              className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              Accepted Payment Methods
            </span>
            <div className="flex flex-wrap gap-1.5">
              {storeSettings.upiEnabled && (
                <span
                  className="px-2 py-0.5 rounded border text-[10px] font-semibold"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  UPI QR
                </span>
              )}
              {storeSettings.codEnabled && (
                <span
                  className="px-2 py-0.5 rounded border text-[10px] font-semibold"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  Cash on Delivery
                </span>
              )}
              {razorpayReady && (
                <span
                  className="px-2 py-0.5 rounded border text-[10px] font-semibold"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  Cards / NetBanking
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Col 4: Contact & Location */}
        <div className="space-y-3 min-w-0">
          <h5
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--text-main)' }}
          >
            Visit or Contact Us
          </h5>
          <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {addressText && (
              <p className="flex items-start gap-2">
                <MapPin
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: 'var(--primary)' }}
                />
                <span className="break-words">{addressText}</span>
              </p>
            )}

            {phoneText && (
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                <a href={`tel:${phoneText.replace(/\s+/g, '')}`} className="hover:underline break-all">
                  {phoneText}
                </a>
              </p>
            )}

            {emailText && (
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                <a href={`mailto:${emailText}`} className="hover:underline break-all">
                  {emailText}
                </a>
              </p>
            )}

            {showFooterHours && (storeSettings.weekdayHours || storeSettings.sundayHours) && (
              <div className="pt-1 flex items-start gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                <div>
                  {storeSettings.weekdayHours && <div>Mon–Sat: {storeSettings.weekdayHours}</div>}
                  {storeSettings.sundayHours && <div>Sun: {storeSettings.sundayHours}</div>}
                </div>
              </div>
            )}
          </div>

          {showFooterMap && mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border transition cursor-pointer"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--primary)',
              }}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Get Directions</span>
              <ExternalLink className="w-3 h-3 ml-0.5 shrink-0" />
            </a>
          )}
        </div>
      </div>

      {/* Bottom Legal & Subtle Merchant Portal Bar */}
      <div
        className="border-t py-4 px-4"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-center sm:text-left">
          <p className="break-words" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <span style={{ color: 'var(--text-muted)' }}>
              {[
                storeSettings.upiEnabled ? 'UPI QR' : null,
                razorpayReady ? 'Razorpay' : null,
                storeSettings.codEnabled ? 'COD' : null,
              ]
                .filter(Boolean)
                .join(' • ') || 'Secure Checkout'}
            </span>
            <button
              type="button"
              onClick={onOpenMerchant}
              className="inline-flex items-center gap-1 font-medium hover:underline cursor-pointer transition-opacity opacity-75 hover:opacity-100"
              style={{ color: 'var(--text-muted)' }}
              title="Merchant Store Management"
            >
              <Lock className="w-3 h-3 shrink-0" />
              <span>Merchant Login</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Care Information Modal */}
      {activeInfoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'var(--overlay)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveInfoModal(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-main)',
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <h4 className="font-serif text-xl font-bold" style={{ color: 'var(--primary)' }}>
                {activeInfoModal === 'shipping' && 'Shipping & Delivery Policy'}
                {activeInfoModal === 'returns' && 'Returns & Exchange Policy'}
                {activeInfoModal === 'privacy' && 'Privacy & Payment Security'}
              </h4>
              <button
                type="button"
                onClick={() => setActiveInfoModal(null)}
                aria-label="Close information dialog"
                className="text-xs font-bold px-2 py-1 rounded border cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
              >
                ✕
              </button>
            </div>

            <div
              className="text-xs leading-relaxed space-y-2.5 whitespace-pre-line break-words"
              style={{ color: 'var(--text-secondary)' }}
            >
              {activeInfoModal === 'shipping' && (
                <p>{storeSettings.deliveryPolicy || DEFAULT_STORE_SETTINGS.deliveryPolicy}</p>
              )}
              {activeInfoModal === 'returns' && (
                <p>{storeSettings.returnPolicy || DEFAULT_STORE_SETTINGS.returnPolicy}</p>
              )}
              {activeInfoModal === 'privacy' && (
                <>
                  <p>
                    • <strong>Secure Payments:</strong> Choose between Dynamic UPI QR,{' '}
                    {razorpayReady ? 'Razorpay Online Checkout, ' : ''}or Cash on Delivery.
                  </p>
                  <p>
                    • <strong>Data Privacy:</strong> Customer contact numbers and delivery addresses
                    are used strictly for order fulfillment and courier tracking updates.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveInfoModal(null)}
              className="w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};
