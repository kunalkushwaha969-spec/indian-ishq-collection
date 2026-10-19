import React, { useState } from 'react';
import type { Product, StoreSettings } from '../utils/ecommerce';
import { formatINR, DEFAULT_STORE_SETTINGS } from '../utils/ecommerce';
import {
  Heart,
  Eye,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  storeSettings?: StoreSettings;
  onAddToCart: (product: Product) => void;
  onWishlistClick: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  storeSettings = DEFAULT_STORE_SETTINGS,
  onAddToCart,
  onWishlistClick,
  onSelectProduct,
}) => {
  const [wishlisted, setWishlisted] = useState(false);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;

  const showDiscountPrice = storeSettings.showDiscountPrice !== false;
  const showStockCount = storeSettings.showStockCount !== false;
  const showFabricInfo = storeSettings.showFabricInfo !== false;
  const showWishlistButton = storeSettings.showWishlistButton !== false;
  const showWhatsappInquiry =
    storeSettings.showWhatsappInquiry !== false &&
    storeSettings.whatsappOrderEnabled !== false;

  const cleanWhatsapp = (storeSettings.whatsapp || DEFAULT_STORE_SETTINGS.whatsapp).replace(
    /\D/g,
    ''
  );
  const brandName = storeSettings.storeName || DEFAULT_STORE_SETTINGS.storeName;

  const discountPct =
    product.old_price && product.old_price > product.price
      ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
      : 0;

  return (
    <article
      className="rounded-xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between group min-w-0 max-w-full"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <div>
        <div
          className="relative aspect-[3/4] overflow-hidden cursor-pointer"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
          onClick={() => onSelectProduct(product)}
        >
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
              isOutOfStock ? 'opacity-50 grayscale' : ''
            }`}
          />

          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start max-w-[78%]">
            {product.tag && (
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded tracking-wider uppercase shadow-sm truncate max-w-full"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                {product.tag}
              </span>
            )}
            {showDiscountPrice && discountPct > 0 && !isOutOfStock && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase shadow-xs"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#1b1114',
                }}
              >
                {discountPct}% OFF
              </span>
            )}
          </div>

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-800 text-white text-xs font-bold tracking-widest uppercase px-4 py-2 rounded shadow-lg">
                Sold Out
              </span>
            </div>
          )}

          <div className="absolute top-2.5 right-2.5 flex flex-col gap-2">
            {showWishlistButton && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setWishlisted(!wishlisted);
                  onWishlistClick(product);
                }}
                aria-label={`Save ${product.name} to wishlist`}
                className="w-9 h-9 rounded-full backdrop-blur-xs flex items-center justify-center shadow-md transition hover:scale-105 cursor-pointer border"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: wishlisted ? '#dc2626' : 'var(--primary)',
                }}
              >
                <Heart className={`w-4 h-4 ${wishlisted ? 'fill-red-600 text-red-600' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectProduct(product);
              }}
              aria-label={`Quick view ${product.name}`}
              title="View Details"
              className="w-9 h-9 rounded-full backdrop-blur-xs flex items-center justify-center shadow-md transition hover:scale-105 cursor-pointer border"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--primary)',
              }}
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 min-w-0">
          <div className="flex items-center justify-between text-[11px] font-medium gap-2 min-w-0">
            <span
              className="uppercase tracking-wider truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {product.category}
            </span>
            {showStockCount && (
              <span className="shrink-0">
                {isOutOfStock ? (
                  <span
                    className="font-semibold flex items-center gap-1"
                    style={{ color: 'var(--error-text)' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Out of Stock</span>
                  </span>
                ) : isLowStock ? (
                  <span
                    className="font-semibold flex items-center gap-1"
                    style={{ color: 'var(--warning-text)' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Only {product.stock} left</span>
                  </span>
                ) : (
                  <span
                    className="font-medium flex items-center gap-1"
                    style={{ color: 'var(--success-text)' }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{product.stock} in stock</span>
                  </span>
                )}
              </span>
            )}
          </div>

          <h4
            onClick={() => onSelectProduct(product)}
            className="font-serif text-lg sm:text-xl font-semibold mt-1 cursor-pointer transition-colors line-clamp-1 break-words"
            style={{ color: 'var(--text-main)' }}
          >
            {product.name}
          </h4>

          {showFabricInfo && product.fabric && (
            <p
              className="text-xs mt-1 line-clamp-2 min-h-[2rem] leading-relaxed break-words"
              style={{ color: 'var(--text-secondary)' }}
            >
              {product.fabric}
            </p>
          )}
        </div>
      </div>

      <div
        className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-2 border-t flex flex-col gap-2 min-w-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <strong
              className="text-base sm:text-lg font-bold tracking-tight block truncate tabular-nums"
              style={{ color: 'var(--primary)' }}
            >
              {formatINR(product.price)}
            </strong>
            {showDiscountPrice && product.old_price && product.old_price > product.price && (
              <span
                className="text-xs line-through block tabular-nums"
                style={{ color: 'var(--text-muted)' }}
              >
                {formatINR(product.old_price)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => onAddToCart(product)}
            className="px-3 sm:px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isOutOfStock ? 'var(--border)' : 'var(--primary)',
              color: isOutOfStock ? 'var(--text-muted)' : 'var(--btn-text)',
            }}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>{isOutOfStock ? 'Unavailable' : 'Add to Bag'}</span>
          </button>
        </div>

        {showWhatsappInquiry && cleanWhatsapp && (
          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
              `Namaste ${brandName}! I am interested in "${product.name}" (${formatINR(
                product.price
              )}). Is it available?`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-1.5 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition hover:opacity-90"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Ask on WhatsApp</span>
          </a>
        )}
      </div>
    </article>
  );
};
