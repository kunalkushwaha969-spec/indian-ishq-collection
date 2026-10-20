import React, { useState, useEffect, useRef } from 'react';
import type { CartItem, Product, CustomerDetails, Order } from '../utils/ecommerce';
import {
  calculateCartSummary,
  validateCustomerDetails,
  formatINR,
} from '../utils/ecommerce';
import { createOrder } from '../services/api';
import {
  type StoreSettings,
  getLocalStoreSettings,
  fetchStoreSettings,
} from '../services/settings';
import { useAnimatedMount } from '../utils/useAnimatedMount';
import {
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Package,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  Clock,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  storeSettings?: StoreSettings;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  products,
  storeSettings: propSettings,
  onOrderSuccess,
}) => {
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '',
    phone: '',
    address: '',
    city: 'Jaipur',
    pincode: '302001',
  });
  const [localSettings, setLocalSettings] = useState<StoreSettings>(() => getLocalStoreSettings());
  const storeSettings = propSettings || localSettings;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const { shouldRender, isEntered } = useAnimatedMount(isOpen, 240);

  useEffect(() => {
    if (!isOpen) return;
    fetchStoreSettings().then(setLocalSettings).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !placedOrder) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, placedOrder, onClose]);

  const { total, shipping, itemCount } = calculateCartSummary(
    cart,
    products,
    storeSettings.freeShippingThreshold,
    storeSettings.standardShippingFee
  );

  const brandName = storeSettings.storeName || 'Indian Ishq Collection';

  const buildOrderItems = () => {
    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    return cart.map((item) => {
      const p = productMap.get(item.id);
      return {
        id: item.id,
        name: p?.name || 'Handcrafted Ethnic Wear',
        price: p?.price || 0,
        qty: item.qty,
      };
    });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent accidental duplicate submissions synchronously and via state
    if (isSubmitting || submittingRef.current || placedOrder) return;

    const validation = validateCustomerDetails(customer);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Please fill in all required delivery details.');
      return;
    }

    if (cart.length === 0) {
      setErrorMsg('Your shopping bag is empty. Please select an outfit first.');
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrorMsg(null);

    const orderItems = buildOrderItems();

    try {
      const order = await createOrder({
        customer_details: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
          city: customer.city?.trim() || 'Jaipur',
          pincode: customer.pincode?.trim() || '302001',
        },
        items: orderItems,
        payment_method: 'COD',
        total,
      });

      setPlacedOrder(order);
      setIsSubmitting(false);
      submittingRef.current = false;
      onOrderSuccess(order);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to place your order. Please try again.'
      );
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleClose = () => {
    if (isSubmitting || submittingRef.current) return;
    setPlacedOrder(null);
    setErrorMsg(null);
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-heading"
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto transition-opacity duration-240 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isEntered ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !placedOrder) handleClose();
      }}
    >
      <div
        className={`w-full max-w-[580px] rounded-2xl shadow-2xl border my-4 sm:my-8 overflow-hidden transition-all duration-240 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isEntered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-main)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 sm:px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--secondary)',
                color: 'var(--primary)',
              }}
            >
              {placedOrder ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h2
                id="checkout-heading"
                className="font-serif text-lg sm:text-xl font-semibold truncate"
                style={{ color: 'var(--text-main)' }}
              >
                {placedOrder ? 'Order Received' : 'Place Your Order'}
              </h2>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                {placedOrder ? 'Saved to store records · Pending seller confirmation' : 'Direct order placement · No online payment'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close checkout"
            className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80 shrink-0"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-main)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div
            className="mx-5 sm:mx-6 mt-4 p-3.5 rounded-lg border text-xs flex items-start gap-2 animate-fadeIn"
            style={{
              backgroundColor: 'var(--error-bg)',
              borderColor: 'var(--error-border)',
              color: 'var(--error-text)',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
          {/* VIEW A: ORDER FORM */}
          {!placedOrder ? (
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Ordered Items Summary Preview */}
              <div
                className="p-3.5 rounded-xl border space-y-2.5 text-xs"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
              >
                <div
                  className="flex items-center justify-between font-semibold uppercase tracking-wider text-[11px] pb-1.5 border-b"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    Items in Bag ({itemCount})
                  </span>
                  <span>Amount</span>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const prod = products.find((p) => p.id === item.id);
                    const itemPrice = prod?.price || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {prod?.image_url && (
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-md object-cover border shrink-0"
                              style={{ borderColor: 'var(--border)' }}
                            />
                          )}
                          <div className="min-w-0">
                            <p
                              className="font-medium truncate max-w-[240px] sm:max-w-xs"
                              style={{ color: 'var(--text-main)' }}
                            >
                              {prod?.name || 'Artisanal Piece'}
                            </p>
                            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              Qty: {item.qty} × {formatINR(itemPrice)}
                            </span>
                          </div>
                        </div>
                        <span
                          className="font-semibold tabular-nums shrink-0"
                          style={{ color: 'var(--text-main)' }}
                        >
                          {formatINR(itemPrice * item.qty)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="pt-2 border-t flex flex-wrap justify-between items-center text-xs tabular-nums gap-1"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>
                    Delivery:{' '}
                    <strong style={{ color: 'var(--text-main)' }}>
                      {shipping === 0 ? 'FREE' : formatINR(shipping)}
                    </strong>
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                    Total Payable: {formatINR(total)}
                  </span>
                </div>
              </div>

              {/* Customer Details Inputs */}
              <div className="space-y-3 pt-1">
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Delivery Information
                </p>

                {/* Name */}
                <div>
                  <label
                    htmlFor="customer-name"
                    className="block text-xs font-semibold mb-1"
                    style={{ color: 'var(--text-main)' }}
                  >
                    Full Name <span style={{ color: 'var(--error-text)' }}>*</span>
                  </label>
                  <div className="relative">
                    <User
                      className="w-4 h-4 absolute left-3 top-3"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                      id="customer-name"
                      type="text"
                      required
                      placeholder="e.g. Priyanka Verma"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="customer-phone"
                    className="block text-xs font-semibold mb-1"
                    style={{ color: 'var(--text-main)' }}
                  >
                    Mobile Phone Number <span style={{ color: 'var(--error-text)' }}>*</span>
                  </label>
                  <div className="relative">
                    <Phone
                      className="w-4 h-4 absolute left-3 top-3"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                      id="customer-phone"
                      type="tel"
                      required
                      maxLength={14}
                      placeholder="10-digit mobile number (e.g. 9820112345)"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-xs tabular-nums"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Our boutique will contact you at this number to confirm delivery.
                  </p>
                </div>

                {/* Address */}
                <div>
                  <label
                    htmlFor="customer-address"
                    className="block text-xs font-semibold mb-1"
                    style={{ color: 'var(--text-main)' }}
                  >
                    Complete Delivery Address <span style={{ color: 'var(--error-text)' }}>*</span>
                  </label>
                  <div className="relative">
                    <MapPin
                      className="w-4 h-4 absolute left-3 top-3"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <textarea
                      id="customer-address"
                      required
                      rows={2}
                      placeholder="House / Flat no, apartment, street, landmark"
                      value={customer.address}
                      onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                </div>

                {/* City & PIN Code */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="customer-city"
                      className="block text-xs font-semibold mb-1"
                      style={{ color: 'var(--text-main)' }}
                    >
                      City / Town
                    </label>
                    <input
                      id="customer-city"
                      type="text"
                      placeholder="e.g. Jaipur"
                      value={customer.city}
                      onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-pincode"
                      className="block text-xs font-semibold mb-1"
                      style={{ color: 'var(--text-main)' }}
                    >
                      PIN Code
                    </label>
                    <input
                      id="customer-pincode"
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 302001"
                      value={customer.pincode}
                      onChange={(e) => setCustomer({ ...customer, pincode: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border text-xs tabular-nums"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* No Payment Required Notice */}
              <div
                className="p-3 rounded-xl border text-xs flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                <span>
                  <strong>Catalogue Order:</strong> No online payment is collected on this website.
                  After placing your order, the boutique will review your pieces and contact you to
                  coordinate dispatch.
                </span>
              </div>

              {/* Clear "Place Order" Button */}
              <button
                type="submit"
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3.5 px-5 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all duration-200 hover:opacity-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer tabular-nums active:scale-[0.99]"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Placing Your Order...</span>
                  </>
                ) : (
                  <span>Place Order · {formatINR(total)}</span>
                )}
              </button>
            </form>
          ) : (
            /* VIEW B: ORDER RECEIVED */
            <div className="text-center py-4 space-y-4 animate-fadeIn">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto border"
                style={{
                  backgroundColor: 'var(--success-bg)',
                  borderColor: 'var(--success-border)',
                  color: 'var(--success-text)',
                }}
              >
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: 'var(--accent)' }}
                >
                  Order Received
                </span>
                <h3 className="font-serif text-2xl mt-1 font-semibold" style={{ color: 'var(--text-main)' }}>
                  Thank You, {placedOrder.customer_details.name.split(' ')[0]}!
                </h3>
                <p className="text-xs sm:text-sm mt-1.5 font-medium" style={{ color: 'var(--text-main)' }}>
                  Your order has been received. The seller will contact you to confirm it.
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Recorded with {brandName}.
                </p>
              </div>

              {/* Order Details Card */}
              <div
                className="p-4 rounded-xl text-left text-xs space-y-2.5 border"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Order Reference</span>
                  <span className="font-mono font-bold text-sm" style={{ color: 'var(--primary)' }}>
                    #{placedOrder.id}
                  </span>
                </div>

                <div className="flex justify-between items-center" style={{ color: 'var(--text-muted)' }}>
                  <span>Order Status</span>
                  <span className="font-semibold px-2 py-0.5 rounded-full text-[11px]" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}>
                    {placedOrder.status}
                  </span>
                </div>

                <div className="flex justify-between items-center" style={{ color: 'var(--text-muted)' }}>
                  <span>Placed At</span>
                  <span className="tabular-nums" style={{ color: 'var(--text-main)' }}>
                    {new Date(placedOrder.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Items Ordered ({placedOrder.items.reduce((s, i) => s + i.qty, 0)})
                  </span>
                  {placedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="truncate max-w-[260px]" style={{ color: 'var(--text-main)' }}>
                        <strong>{item.qty}×</strong> {item.name}
                      </span>
                      <span className="tabular-nums font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {formatINR(item.price * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t flex justify-between items-center font-bold text-sm tabular-nums" style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>
                  <span>Total Amount</span>
                  <span>{formatINR(placedOrder.total)}</span>
                </div>

                <div
                  className="pt-2 border-t text-xs space-y-1"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <p>
                    <strong style={{ color: 'var(--text-main)' }}>Contact Phone:</strong>{' '}
                    <span className="tabular-nums">{placedOrder.customer_details.phone}</span>
                  </p>
                  <p>
                    <strong style={{ color: 'var(--text-main)' }}>Delivery Address:</strong>{' '}
                    <span>
                      {placedOrder.customer_details.address}
                      {placedOrder.customer_details.city ? `, ${placedOrder.customer_details.city}` : ''}
                      {placedOrder.customer_details.pincode ? ` - ${placedOrder.customer_details.pincode}` : ''}
                    </span>
                  </p>
                </div>
              </div>

              <div
                className="p-3 rounded-xl border text-xs"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <p>
                  Your order has been received. The seller will contact you to confirm it and coordinate dispatch to your delivery address.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3.5 px-5 rounded-xl text-xs font-semibold tracking-widest uppercase transition-opacity hover:opacity-95 shadow-md cursor-pointer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                Back to Collection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
