import React, { useEffect } from 'react';
import type { CartItem, Product } from '../utils/ecommerce';
import { calculateCartSummary, formatINR } from '../utils/ecommerce';
import { ShoppingBag, X, Plus, Minus, ArrowRight, CheckCircle2 } from 'lucide-react';

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
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden border-l transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-main)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h2
              id="cart-heading"
              className="font-serif text-2xl font-semibold"
              style={{ color: 'var(--text-main)' }}
            >
              Your Shopping Bag ({itemCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text-main)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div
          className="px-6 py-3 border-b text-xs"
          style={{
            backgroundColor: freeShippingQualified && subtotal > 0 ? 'var(--success-bg)' : 'var(--surface-elevated)',
            borderColor: 'var(--border)',
            color: freeShippingQualified && subtotal > 0 ? 'var(--success-text)' : 'var(--text-secondary)',
          }}
        >
          {freeShippingQualified && subtotal > 0 ? (
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Complimentary Express Delivery unlocked!</span>
            </p>
          ) : (
            <p>
              Add <strong className="tabular-nums">{formatINR(amountNeededForFreeShipping)}</strong> more
              to unlock <strong>Complimentary Shipping</strong> (orders above ₹1,999)
            </p>
          )}
        </div>

        {/* Cart Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div
                className="w-14 h-14 rounded-full mx-auto flex items-center justify-center border"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--primary)',
                }}
              >
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="font-serif text-2xl" style={{ color: 'var(--text-main)' }}>
                Your bag is waiting for something lovely.
              </p>
              <p className="text-xs max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
                Explore our handcrafted kurtis, festive silhouettes, and Banarasi Katan silk sarees.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase cursor-pointer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                Explore Collection
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {cart.map((item) => {
                const prod = productMap.get(item.id);
                if (!prod) return null;

                return (
                  <div
                    key={item.id}
                    className="py-4 flex gap-4 items-center"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-20 object-cover rounded-lg shrink-0 border"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-serif text-base font-semibold truncate"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {prod.name}
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {prod.category}
                      </p>
                      <p
                        className="text-sm font-bold mt-1 tabular-nums"
                        style={{ color: 'var(--primary)' }}
                      >
                        {formatINR(prod.price)}
                      </p>
                    </div>

                    {/* Quantity Stepper & Remove */}
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center border rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, -1)}
                          aria-label={`Decrease quantity of ${prod.name}`}
                          className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
                          style={{ color: 'var(--text-main)' }}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span
                          className="w-8 text-center text-xs font-semibold tabular-nums"
                          style={{ color: 'var(--text-main)' }}
                        >
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, 1)}
                          aria-label={`Increase quantity of ${prod.name}`}
                          className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
                          style={{ color: 'var(--text-main)' }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Remove ${prod.name} from cart`}
                        className="p-1.5 rounded-lg transition-colors cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}
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
          <div
            className="p-6 border-t space-y-4"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--text-main)' }}>
                  {formatINR(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {shipping === 0 ? (
                    <span className="font-semibold uppercase" style={{ color: 'var(--success-text)' }}>
                      Complimentary
                    </span>
                  ) : (
                    formatINR(shipping)
                  )}
                </span>
              </div>
              <div
                className="flex justify-between text-base font-bold pt-2.5 border-t tabular-nums"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--primary)',
                }}
              >
                <span style={{ color: 'var(--text-main)' }}>Total Payable</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full py-3.5 px-5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-opacity hover:opacity-95 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
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
