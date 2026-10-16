import React from 'react';
import type { CartItem, Product } from '../utils/ecommerce';
import { calculateCartSummary, formatINR } from '../utils/ecommerce';
import { ShoppingBag, X, Plus, Minus, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  products,
  onUpdateQty,
  onRemoveItem,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const { subtotal, itemCount, shipping, total, freeShippingQualified, freeShippingThreshold } =
    calculateCartSummary(cart, products);

  const productMap = new Map<string, Product>();
  products.forEach((p) => productMap.set(p.id, p));

  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#fffdf9] w-full max-w-[580px] max-h-[90vh] rounded-md shadow-2xl flex flex-col overflow-hidden border border-[#eadfda]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eadfda] bg-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#70283b]" />
            <h2 id="cart-heading" className="font-serif text-2xl text-[#70283b]">
              Your Shopping Bag ({itemCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="text-2xl text-[#70283b] hover:opacity-70 p-1 leading-none"
          >
            ×
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div className="bg-[#fcf5f3] px-6 py-2.5 border-b border-[#eadfda] text-xs text-[#70283b]">
          {freeShippingQualified && subtotal > 0 ? (
            <p className="font-medium text-emerald-800 flex items-center gap-1.5">
              <span>🎉</span> You've unlocked Complimentary Express Delivery!
            </p>
          ) : (
            <p>
              Add <strong>{formatINR(amountNeededForFreeShipping)}</strong> more to unlock{' '}
              <strong>Free Shipping</strong> (orders above ₹1,999)
            </p>
          )}
        </div>

        {/* Cart Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-[#776c6b]">
              <div className="text-4xl mb-3">🧺</div>
              <p className="font-serif text-lg text-[#292222]">Your bag is waiting for something lovely.</p>
              <p className="text-xs text-[#776c6b] mt-1">Explore our kurtis, festive wear and banarasi sarees.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 px-6 py-2.5 bg-[#70283b] text-white text-xs font-semibold rounded tracking-wider uppercase"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#eadfda]">
              {cart.map((item) => {
                const prod = productMap.get(item.id);
                if (!prod) return null;

                return (
                  <div key={item.id} className="py-4 flex gap-4 items-center">
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className="w-16 h-20 object-cover rounded bg-[#ead4c7] shrink-0 border border-[#eadfda]"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-base text-[#292222] truncate font-medium">
                        {prod.name}
                      </h4>
                      <p className="text-xs text-[#776c6b] mt-0.5">{prod.category}</p>
                      <p className="text-sm font-semibold text-[#70283b] mt-1">
                        {formatINR(prod.price)}
                      </p>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-[#eadfda] rounded bg-white">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, -1)}
                          aria-label={`Decrease quantity of ${prod.name}`}
                          className="w-7 h-7 flex items-center justify-center text-[#70283b] hover:bg-[#f8eeeb]"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, 1)}
                          aria-label={`Increase quantity of ${prod.name}`}
                          className="w-7 h-7 flex items-center justify-center text-[#70283b] hover:bg-[#f8eeeb]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Remove ${prod.name} from cart`}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {cart.length > 0 && (
          <div className="p-6 bg-white border-t border-[#eadfda] space-y-3">
            <div className="space-y-1.5 text-xs text-[#776c6b]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-[#292222]">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {shipping === 0 ? (
                    <span className="text-emerald-700 font-semibold uppercase">Free</span>
                  ) : (
                    formatINR(shipping)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#70283b] pt-2 border-t border-[#eadfda]">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full py-3.5 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold rounded tracking-widest uppercase transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
