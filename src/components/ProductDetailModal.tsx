import React, { useState, useEffect } from 'react';
import type { Product, StoreSettings } from '../utils/ecommerce';
import { formatINR, DEFAULT_STORE_SETTINGS } from '../utils/ecommerce';
import { useAnimatedMount } from '../utils/useAnimatedMount';
import {
  X,
  ShoppingBag,
  Heart,
  ShieldCheck,
  Truck,
  Sparkles,
  RotateCcw,
  MessageCircle,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  storeSettings?: StoreSettings;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onWishlistClick: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  storeSettings = DEFAULT_STORE_SETTINGS,
  onClose,
  onAddToCart,
  onWishlistClick,
}) => {
  const [renderedProduct, setRenderedProduct] = useState<Product | null>(product);
  const { shouldRender, isEntered } = useAnimatedMount(Boolean(product), 220);

  useEffect(() => {
    if (product) {
      setRenderedProduct(product);
    }
  }, [product]);

  const activeProduct = product || renderedProduct;
  const isSaree = activeProduct?.category.toLowerCase() === 'sarees';
  const availableSizes =
    activeProduct?.sizes && activeProduct.sizes.length > 0
      ? activeProduct.sizes
      : isSaree
      ? ['Free Size (5.5m + Blouse)']
      : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const [selectedSize, setSelectedSize] = useState<string>(availableSizes[0]);

  useEffect(() => {
    if (product) {
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      } else {
        const saree = product.category.toLowerCase() === 'sarees';
        setSelectedSize(saree ? 'Free Size (5.5m + Blouse)' : 'M');
      }
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!shouldRender || !activeProduct) return null;

  const isOutOfStock = activeProduct.stock <= 0;
  const cleanWhatsapp = (storeSettings.whatsapp || '').replace(/\D/g, '');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-modal-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto transition-opacity duration-220 ease-out ${
        isEntered ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-4xl rounded-xl border shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 my-auto transition-all duration-240 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isEntered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.96] translate-y-2'
        }`}
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-main)',
        }}
      >
        {/* Left Column: Product Photography */}
        <div
          className="relative aspect-[3/4] md:aspect-auto md:min-h-[480px] overflow-hidden"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          {activeProduct.image_url ? (
            <img
              src={activeProduct.image_url}
              alt={activeProduct.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.03]"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-serif italic text-lg"
              style={{ color: 'var(--text-muted)' }}
            >
              {activeProduct.category}
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span
                className="px-4 py-2 text-xs font-semibold tracking-widest uppercase rounded"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--btn-text)' }}
              >
                Currently Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Contiguous Purchase Module */}
        <div className="p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Top Metadata & Close Button */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="uppercase tracking-widest font-semibold" style={{ color: 'var(--accent)' }}>
                  {activeProduct.category}
                </span>
                {activeProduct.tag && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{activeProduct.tag}</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close product details"
                className="btn-luxury p-2 rounded-lg cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title */}
            <h2
              id="pdp-modal-title"
              className="font-serif text-2xl sm:text-3xl font-semibold leading-tight mb-3"
              style={{ color: 'var(--text-main)' }}
            >
              {activeProduct.name}
            </h2>

            {/* Price & Availability */}
            <div
              className="flex items-baseline gap-3 pb-4 mb-5 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                {formatINR(activeProduct.price)}
              </span>
              {activeProduct.old_price && activeProduct.old_price > activeProduct.price && (
                <span
                  className="text-sm line-through tabular-nums"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {formatINR(activeProduct.old_price)}
                </span>
              )}
              <span
                className="ml-auto text-xs font-medium tabular-nums"
                style={{ color: isOutOfStock ? 'var(--error-text)' : 'var(--text-muted)' }}
              >
                {isOutOfStock ? 'Out of stock' : `${activeProduct.stock} pieces available`}
              </span>
            </div>

            {/* Craft & Fabric Details */}
            <div className="space-y-3 mb-6">
              {activeProduct.description && (
                <div>
                  <span
                    className="text-xs font-semibold uppercase tracking-wider block mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Description
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
                    {activeProduct.description}
                  </p>
                </div>
              )}
              <div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider block mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Fabric & Craftsmanship
                </span>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {activeProduct.fabric ||
                    'Handcrafted Indian ethnic silhouette tailored with breathable heritage textiles and artisanal finishing.'}
                </p>
              </div>

              {/* Size Selection */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span
                    className="font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Select Size
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>True to Indian Ethnic Sizing</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => {
                    const active = selectedSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className="btn-luxury px-3.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer"
                        style={{
                          backgroundColor: active ? 'var(--primary)' : 'var(--input-bg)',
                          color: active ? 'var(--btn-text)' : 'var(--text-main)',
                          borderColor: active ? 'var(--primary)' : 'var(--border)',
                        }}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Delivery & Return Policy Box */}
              <div
                className="p-3 rounded-lg border space-y-1.5 text-[11px]"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <div className="flex items-start gap-2">
                  <Truck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                  <span>{storeSettings.deliveryPolicy}</span>
                </div>
                <div className="flex items-start gap-2">
                  <RotateCcw className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                  <span>{storeSettings.returnPolicy}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions & Trust Highlights */}
          <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => {
                  onAddToCart(activeProduct);
                  onClose();
                }}
                className="btn-luxury flex-1 py-3.5 px-5 rounded-lg text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isOutOfStock ? 'Out of Stock' : 'Add to Shopping Bag'}</span>
              </button>

              <button
                type="button"
                onClick={() => onWishlistClick(activeProduct)}
                aria-label={`Save ${activeProduct.name} to wishlist`}
                className="btn-luxury px-4 py-3.5 rounded-lg border flex items-center justify-center cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--primary)',
                }}
              >
                <Heart className="w-4 h-4" />
              </button>
            </div>

            {cleanWhatsapp && (
              <a
                href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                  `Hi ${storeSettings.storeName}, I have a question about "${activeProduct.name}" (Size: ${selectedSize}, ${formatINR(activeProduct.price)}).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-luxury w-full py-2.5 px-4 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                <span>Inquire on WhatsApp about this piece</span>
              </a>
            )}

            <div
              className="grid grid-cols-3 gap-2 pt-1 text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                <span>Free delivery ₹1,999+</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                <span>Authentic Craft</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                <span>{storeSettings.storeName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
