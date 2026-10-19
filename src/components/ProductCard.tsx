import React, { useState } from 'react';
import type { Product } from '../utils/ecommerce';
import { formatINR } from '../utils/ecommerce';
import { Heart, ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onWishlistClick: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onWishlistClick,
  onSelectProduct,
}) => {
  const [imgError, setImgError] = useState(false);
  const isOutOfStock = product.stock <= 0;

  return (
    <article
      className="group rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-main)',
      }}
    >
      <div>
        {/* Product Image Container */}
        <div
          className="relative aspect-[3/4] w-full overflow-hidden rounded-lg mb-3.5"
          style={{ backgroundColor: 'var(--surface-elevated)' }}
        >
          <button
            type="button"
            onClick={() => onSelectProduct?.(product)}
            aria-label={`View details for ${product.name}`}
            className="w-full h-full block text-left cursor-pointer focus:outline-none"
          >
            {product.image_url && !imgError ? (
              <img
                src={product.image_url}
                alt={product.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
              >
                <span className="font-serif italic text-base font-medium">{product.name}</span>
                <span className="text-[11px] uppercase tracking-widest mt-1 opacity-75">
                  {product.category}
                </span>
              </div>
            )}
          </button>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={() => onWishlistClick(product)}
            aria-label={`Save ${product.name} to wishlist`}
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--primary)',
              border: '1px solid var(--border)',
            }}
          >
            <Heart className="w-4 h-4" />
          </button>

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
              <span
                className="text-xs font-semibold px-3.5 py-1.5 rounded tracking-widest uppercase"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--btn-text)' }}
              >
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Clean Unboxed Metadata */}
        <div
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-medium mb-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <span style={{ color: 'var(--accent)' }}>{product.category}</span>
          {product.tag && (
            <>
              <span aria-hidden="true">·</span>
              <span>{product.tag}</span>
            </>
          )}
        </div>

        {/* Product Title */}
        <h3 className="font-serif text-lg font-semibold leading-snug mb-1 line-clamp-1">
          <button
            type="button"
            onClick={() => onSelectProduct?.(product)}
            className="text-left hover:underline focus:outline-none cursor-pointer"
            style={{ color: 'var(--text-main)' }}
          >
            {product.name}
          </button>
        </h3>

        {/* Fabric Subtitle */}
        <p
          className="text-xs line-clamp-1 mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          {product.fabric || 'Handcrafted Indian Ethnic Wear'}
        </p>

        {/* Price & Stock Row */}
        <div className="flex items-baseline justify-between gap-2 mb-3.5 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="font-bold text-base" style={{ color: 'var(--primary)' }}>
              {formatINR(product.price)}
            </span>
            {product.old_price && product.old_price > product.price && (
              <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>
                {formatINR(product.old_price)}
              </span>
            )}
          </div>
          <span
            className="text-[11px] font-medium tabular-nums shrink-0"
            style={{ color: isOutOfStock ? 'var(--error-text)' : 'var(--text-muted)' }}
          >
            {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </span>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        disabled={isOutOfStock}
        onClick={() => onAddToCart(product)}
        aria-label={`Add ${product.name} to shopping bag`}
        className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
        style={{
          backgroundColor: isOutOfStock ? 'var(--surface-elevated)' : 'var(--primary)',
          color: isOutOfStock ? 'var(--text-muted)' : 'var(--btn-text)',
          border: `1px solid ${isOutOfStock ? 'var(--border)' : 'var(--primary)'}`,
        }}
      >
        <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
        <span>{isOutOfStock ? 'Out of Stock' : 'Add to Bag'}</span>
      </button>
    </article>
  );
};
