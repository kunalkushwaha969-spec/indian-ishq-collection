import React from 'react';
import type { CartItem, Product, StoreSettings } from '../utils/ecommerce';
import { calculateCartSummary, formatINR } from '../utils/ecommerce';
import { useAnimatedMount } from '../utils/useAnimatedMount';
import { X, ShoppingBag, Trash2, Plus, Minus, Truck, ShieldCheck } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  storeSettings?: StoreSettings;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  products,
  storeSettings,
  onUpdateQty,
  onRemoveItem,
  onProceedToCheckout,
}) => {
  const { shouldRender, isEntered } = useAnimatedMount(isOpen, 280);

  if (!shouldRender) return null;

  const summary = calculateCartSummary(
    cart,
    products,
    storeSettings?.freeShippingThreshold,
    storeSettings?.standardShippingFee
  );
  const amountRemainingForFree = Math.max(0, summary.freeShippingThreshold - summary.subtotal);
  const progressPct =
    summary.freeShippingThreshold > 0
      ? Math.min(100, Math.round((summary.subtotal / summary.freeShippingThreshold) * 100))
      : 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      className={`fixed inset-0 z-50 flex justify-end overflow-x-hidden transition-opacity duration-280 ease-out ${
        isEntered ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-md h-full flex flex-col justify-between shadow-2xl border-l min-w-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isEntered ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-main)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-5 py-4 border-b flex items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ShoppingBag className="w-5 h-5 shrink-0" style={{ color: 'var(--primary)' }} />
            <h3
              id="cart-drawer-title"
              className="font-serif text-xl sm:text-2xl font-semibold truncate"
            >
              Your Shopping Bag
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0 tabular-nums"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              {summary.itemCount}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping bag"
            className="btn-luxury w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-main)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        {cart.length > 0 && summary.freeShippingThreshold > 0 && (
          <div
            className="px-4 sm:px-5 py-3 border-b"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-medium mb-1.5">
              <Truck className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
              {summary.freeShippingQualified ? (
                <span className="font-semibold" style={{ color: 'var(--success-text)' }}>
                  Congratulations! Your order qualifies for FREE Express Delivery
                </span>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>
                  Add{' '}
                  <strong className="tabular-nums" style={{ color: 'var(--primary)' }}>
                    {formatINR(amountRemainingForFree)}
                  </strong>{' '}
                  more for{' '}
                  <strong style={{ color: 'var(--success-text)' }}>FREE Express Delivery</strong>
                </span>
              )}
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--border)' }}
            >
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: summary.freeShippingQualified
                    ? 'var(--success-text)'
                    : 'var(--primary)',
                }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-w-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-3 border"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--primary)',
                }}
              >
                <ShoppingBag className="w-7 h-7 opacity-60" />
              </div>
              <p className="font-serif text-xl font-semibold">Your bag is currently empty</p>
              <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                Explore our handcrafted sarees, bridal lehengas, and festive silhouettes to start
                building your collection.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-luxury mt-5 px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                Browse Collection
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const prod = products.find((p) => p.id === item.id);
              if (!prod) return null;
              const maxStock = prod.stock;
              return (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-xl border shadow-2xs transition-all duration-200 min-w-0"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-24 rounded-lg object-cover border shrink-0"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-serif text-base font-semibold leading-snug truncate">
                          {prod.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          aria-label={`Remove ${prod.name} from bag`}
                          className="btn-luxury p-1 rounded cursor-pointer shrink-0 hover:opacity-80"
                          style={{ color: 'var(--text-muted)' }}
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div
                        className="flex items-center gap-2 mt-0.5 text-[11px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span>{prod.category}</span>
                        <span>•</span>
                        <span className="tabular-nums">{formatINR(prod.price)} each</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div
                        className="flex items-center border rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, -1)}
                          aria-label={`Decrease quantity of ${prod.name}`}
                          className="w-7 h-7 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                          style={{ color: 'var(--text-main)' }}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          disabled={item.qty >= maxStock}
                          onClick={() => onUpdateQty(item.id, 1)}
                          aria-label={`Increase quantity of ${prod.name}`}
                          className="w-7 h-7 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-40 cursor-pointer"
                          style={{ color: 'var(--text-main)' }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <strong className="text-sm font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
                        {formatINR(prod.price * item.qty)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div
            className="p-4 sm:p-5 border-t space-y-3"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span>Bag Subtotal ({summary.itemCount} items)</span>
                <span className="font-medium tabular-nums" style={{ color: 'var(--text-main)' }}>
                  {formatINR(summary.subtotal)}
                </span>
              </div>
              <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span>Shipping & Handling</span>
                <span className="font-medium">
                  {summary.shipping === 0 ? (
                    <span className="font-semibold" style={{ color: 'var(--success-text)' }}>
                      FREE
                    </span>
                  ) : (
                    <span className="tabular-nums" style={{ color: 'var(--text-main)' }}>
                      {formatINR(summary.shipping)}
                    </span>
                  )}
                </span>
              </div>
              <div
                className="border-t pt-2 flex justify-between items-baseline text-base font-bold"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--primary)',
                }}
              >
                <span>Total Amount</span>
                <span className="text-lg tabular-nums">{formatINR(summary.total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToCheckout}
              className="btn-luxury w-full py-3.5 rounded-lg text-xs font-semibold uppercase tracking-widest shadow-md cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Proceed to Place Order</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
