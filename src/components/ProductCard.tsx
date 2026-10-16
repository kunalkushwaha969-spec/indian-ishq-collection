import React from 'react';
import type { Product } from '../utils/ecommerce';
import { formatINR } from '../utils/ecommerce';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onWishlistClick: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onWishlistClick,
}) => {
  const isOutOfStock = product.stock <= 0;

  return (
    <article className="group bg-white border border-[#eadfda] p-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between">
      <div>
        {/* Product Art Box */}
        <div className="relative h-64 overflow-hidden bg-[#ead4c7] rounded-sm">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-[#70283b] to-[#b78a4b] opacity-80 flex items-center justify-center text-white text-xs font-serif italic">
              {product.category}
            </div>
          )}

          {/* Badge */}
          <span className="absolute top-2.5 left-2.5 bg-[#fffdf0] text-[#70283b] text-[10px] font-semibold px-2 py-1 tracking-wider uppercase shadow-sm">
            {product.tag || 'CURATED'}
          </span>

          {/* Heart button */}
          <button
            type="button"
            onClick={() => onWishlistClick(product)}
            aria-label={`Add ${product.name} to wishlist`}
            className="absolute top-2 right-2 bg-white/90 hover:bg-white text-[#70283b] w-8 h-8 rounded-full flex items-center justify-center text-base shadow transition-colors"
          >
            ♡
          </button>

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
              <span className="bg-[#4c1727] text-white text-xs font-semibold px-3 py-1.5 rounded tracking-widest uppercase">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <h3 className="font-serif text-[17px] text-[#292222] mt-3 mb-1 line-clamp-1 font-medium">
          {product.name}
        </h3>

        {product.fabric && (
          <p className="text-[11px] text-[#776c6b] line-clamp-1 mb-2 italic">
            {product.fabric}
          </p>
        )}

        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-[#70283b] text-base">
              {formatINR(product.price)}
            </span>
            {product.old_price && product.old_price > product.price && (
              <span className="text-xs text-[#a99c98] line-through">
                {formatINR(product.old_price)}
              </span>
            )}
          </div>
          <small className={`text-[11px] font-medium ${isOutOfStock ? 'text-red-600' : 'text-[#776c6b]'}`}>
            {isOutOfStock ? 'Out of stock' : `${product.stock} left`}
          </small>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        disabled={isOutOfStock}
        onClick={() => onAddToCart(product)}
        aria-label={`Add ${product.name} to shopping bag`}
        className={`w-full py-2.5 px-3 border text-xs font-semibold tracking-wider transition-all duration-200 rounded-xs uppercase ${
          isOutOfStock
            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'border-[#70283b] text-[#70283b] bg-white hover:bg-[#70283b] hover:text-white'
        }`}
      >
        {isOutOfStock ? 'Out of stock' : 'Add to Bag +'}
      </button>
    </article>
  );
};
