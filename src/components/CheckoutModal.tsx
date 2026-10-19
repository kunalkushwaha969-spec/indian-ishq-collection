import React, { useState, useEffect } from 'react';
import type { CartItem, Product, CustomerDetails, Order } from '../utils/ecommerce';
import {
  calculateCartSummary,
  validateCustomerDetails,
  formatINR,
  generateUpiUri,
  isRazorpayConfigured,
  resolveDefaultPaymentMethod,
} from '../utils/ecommerce';
import { generateUpiQrCode, createOrder } from '../services/api';
import {
  type StoreSettings,
  getLocalStoreSettings,
  fetchStoreSettings,
} from '../services/settings';
import {
  QrCode,
  Truck,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  Loader2,
  ExternalLink,
  X,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  storeSettings?: StoreSettings;
  onOrderSuccess: (order: Order) => void;
}

function loadRazorpaySdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  products,
  storeSettings: propSettings,
  onOrderSuccess,
}) => {
  const [step, setStep] = useState<'details' | 'payment' | 'confirmed'>('details');
  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '',
    phone: '',
    address: '',
    city: 'Jaipur',
    pincode: '302001',
  });
  const [localSettings, setLocalSettings] = useState<StoreSettings>(() => getLocalStoreSettings());
  const storeSettings = propSettings || localSettings;

  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'RAZORPAY' | 'COD'>(() =>
    resolveDefaultPaymentMethod(storeSettings)
  );
  const [upiRefId, setUpiRefId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [upiUri, setUpiUri] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchStoreSettings().then(setLocalSettings).catch(() => {});
  }, [isOpen]);

  const { total, shipping } = calculateCartSummary(cart, products);
  const VPA_ADDRESS = storeSettings.upiVpa || 'indianishq@okaxis';
  const activeRazorpayKey = storeSettings.razorpayKeyId?.trim() || '';
  const razorpayAvailable = isRazorpayConfigured(activeRazorpayKey, storeSettings.razorpayEnabled);
  const upiAvailable = storeSettings.upiEnabled !== false;
  const codAvailable = storeSettings.codEnabled !== false;
  const cleanWhatsappNumber = (storeSettings.whatsapp || '919876543210').replace(/\D/g, '');
  const brandName = storeSettings.storeName || 'Indian Ishq Collection';

  useEffect(() => {
    if (
      (paymentMethod === 'RAZORPAY' && !razorpayAvailable) ||
      (paymentMethod === 'UPI' && !upiAvailable) ||
      (paymentMethod === 'COD' && !codAvailable)
    ) {
      setPaymentMethod(resolveDefaultPaymentMethod(storeSettings));
    }
  }, [razorpayAvailable, upiAvailable, codAvailable, paymentMethod, storeSettings]);

  // Generate UPI QR code whenever payment method is UPI and user reaches payment step
  useEffect(() => {
    if (step === 'payment' && paymentMethod === 'UPI' && upiAvailable) {
      const fetchQr = async () => {
        setIsGeneratingQr(true);
        setErrorMsg(null);
        try {
          const tempOrderRef = 'IIC-' + Math.floor(100000 + Math.random() * 900000);
          const data = await generateUpiQrCode({
            amount: total,
            orderRef: tempOrderRef,
            payeeName: brandName,
            vpa: VPA_ADDRESS,
          });
          setQrDataUrl(data.qrDataUrl);
          setUpiUri(data.upiUri);
        } catch {
          try {
            const uri = generateUpiUri({
              vpa: VPA_ADDRESS,
              payeeName: brandName,
              amount: total,
              transactionNote: 'Ethnic Wear Order',
            });
            setUpiUri(uri);
          } catch {}
        } finally {
          setIsGeneratingQr(false);
        }
      };
      fetchQr();
    }
  }, [step, paymentMethod, total, VPA_ADDRESS, brandName, upiAvailable]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'confirmed') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, onClose]);

  if (!isOpen) return null;

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCustomerDetails(customer);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Please fill in all details correctly');
      return;
    }
    setErrorMsg(null);
    setStep('payment');
  };

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(VPA_ADDRESS);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

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

  const buildWhatsAppOrderUrl = (orderId?: string) => {
    const itemsList = buildOrderItems()
      .map((it) => `• ${it.qty}x ${it.name} (${formatINR(it.price * it.qty)})`)
      .join('\n');
    const header = orderId
      ? `Namaste ${brandName}! I have placed Order *#${orderId}*.`
      : `Namaste ${brandName}! I would like to place an order:`;
    const message = [
      header,
      '',
      '*Items:*',
      itemsList,
      '',
      `*Total Payable:* ${formatINR(total)} (${paymentMethod === 'COD' ? 'Cash on Delivery' : 'UPI QR'})`,
      `*Customer:* ${customer.name} (${customer.phone})`,
      `*Delivery Address:* ${customer.address}, ${customer.city || ''} ${customer.pincode || ''}`.trim(),
    ].join('\n');
    return `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  const handleRazorpayPayment = async () => {
    if (!razorpayAvailable) {
      setErrorMsg(
        'Online payments via Razorpay are temporarily unavailable. Please choose Dynamic UPI QR or Cash on Delivery (COD).'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const sdkLoaded = await loadRazorpaySdk();
    if (!sdkLoaded || !window.Razorpay) {
      setIsSubmitting(false);
      setErrorMsg(
        'Unable to load Razorpay Checkout SDK. Please check your network connection or use Dynamic UPI QR / Cash on Delivery.'
      );
      return;
    }

    const orderItems = buildOrderItems();

    try {
      const rzp = new window.Razorpay({
        key: activeRazorpayKey,
        amount: Math.round(total * 100), // Amount in paise
        currency: 'INR',
        name: brandName,
        description: `Ethnic Wear Order (${orderItems.length} item${orderItems.length > 1 ? 's' : ''})`,
        prefill: {
          name: customer.name,
          contact: customer.phone,
        },
        theme: {
          color: '#70283b',
        },
        handler: async (response: { razorpay_payment_id?: string }) => {
          const verifiedPaymentId = response?.razorpay_payment_id?.trim();
          if (!verifiedPaymentId) {
            setErrorMsg(
              'Payment could not be verified (missing Razorpay payment ID). Your order was not marked as paid.'
            );
            setIsSubmitting(false);
            return;
          }
          try {
            const order = await createOrder({
              customer_details: customer,
              items: orderItems,
              payment_method: 'RAZORPAY',
              razorpay_payment_id: verifiedPaymentId,
              total,
            });
            setPlacedOrder(order);
            setStep('confirmed');
            onOrderSuccess(order);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to save order.';
            setErrorMsg(message);
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
          },
        },
      });

      rzp.on('payment.failed', (resp: unknown) => {
        const errObj = resp as { error?: { description?: string } };
        setErrorMsg(
          errObj?.error?.description ||
            'Razorpay payment was declined. You may retry or choose UPI QR / COD.'
        );
        setIsSubmitting(false);
      });

      rzp.open();
    } catch (err: unknown) {
      setIsSubmitting(false);
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not initialize Razorpay checkout window.'
      );
    }
  };

  const handleFinalSubmit = async () => {
    if (paymentMethod === 'RAZORPAY') {
      await handleRazorpayPayment();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const orderItems = buildOrderItems();

    try {
      const order = await createOrder({
        customer_details: customer,
        items: orderItems,
        payment_method: paymentMethod,
        upi_ref_id: paymentMethod === 'UPI' ? upiRefId.trim() : undefined,
        total,
      });

      setPlacedOrder(order);
      setStep('confirmed');
      onOrderSuccess(order);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to place order. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'confirmed') onClose();
      }}
    >
      <div
        className="w-full max-w-[640px] rounded-xl shadow-2xl border my-8 overflow-hidden transition-colors"
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
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2">
            {step === 'payment' && (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep('details');
                }}
                className="p-1.5 rounded-lg border mr-1 cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
                aria-label="Back to customer details"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2
              id="checkout-heading"
              className="font-serif text-2xl font-semibold"
              style={{ color: 'var(--text-main)' }}
            >
              {step === 'details' && 'Shipping & Customer Details'}
              {step === 'payment' && 'Payment (UPI, Razorpay & COD)'}
              {step === 'confirmed' && 'Order Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer"
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
            className="mx-6 mt-4 p-3.5 rounded-lg border text-xs flex items-start gap-2"
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

        <div className="p-6">
          {/* STEP 1: Customer Details */}
          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Radhika Sharma"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, '') })
                    }
                    className="w-full p-2.5 rounded-lg border text-sm tabular-nums"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Delivery Address (Flat / House No., Street, Colony) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Flat 302, Royal Palms, Tilak Nagar"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  className="w-full p-2.5 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    City / Town
                  </label>
                  <input
                    type="text"
                    value={customer.city}
                    onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                    className="w-full p-2.5 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    PIN Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={customer.pincode}
                    onChange={(e) => setCustomer({ ...customer, pincode: e.target.value })}
                    className="w-full p-2.5 rounded-lg border text-sm tabular-nums"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              </div>

              {/* Order quick summary */}
              <div
                className="p-3.5 rounded-lg border flex flex-wrap justify-between gap-2 text-xs tabular-nums"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>
                  Items: <strong>{cart.reduce((s, i) => s + i.qty, 0)} pcs</strong>
                </span>
                <span>
                  Shipping: <strong>{shipping === 0 ? 'FREE' : formatINR(shipping)}</strong>
                </span>
                <span className="font-bold text-sm" style={{ color: 'var(--primary)' }}>
                  Payable: {formatINR(total)}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-opacity hover:opacity-95 shadow-sm cursor-pointer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                Continue to Payment →
              </button>
            </form>
          )}

          {/* STEP 2: Payment (UPI / RAZORPAY / COD) */}
          {step === 'payment' && (
            <div className="space-y-5">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Select Payment Method
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    disabled={!upiAvailable}
                    aria-disabled={!upiAvailable}
                    onClick={() => {
                      if (!upiAvailable) return;
                      setErrorMsg(null);
                      setPaymentMethod('UPI');
                    }}
                    className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                      upiAvailable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                    }`}
                    style={{
                      backgroundColor:
                        paymentMethod === 'UPI' ? 'var(--surface-elevated)' : 'var(--surface)',
                      borderColor: paymentMethod === 'UPI' ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    <QrCode
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: upiAvailable ? 'var(--primary)' : 'var(--text-muted)' }}
                    />
                    <div>
                      <strong className="block text-xs" style={{ color: 'var(--text-main)' }}>
                        Dynamic UPI QR
                      </strong>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {upiAvailable ? 'GPay, PhonePe, Paytm' : 'Currently Disabled'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!razorpayAvailable}
                    aria-disabled={!razorpayAvailable}
                    onClick={() => {
                      if (!razorpayAvailable) return;
                      setErrorMsg(null);
                      setPaymentMethod('RAZORPAY');
                    }}
                    className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                      razorpayAvailable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                    }`}
                    style={{
                      backgroundColor:
                        paymentMethod === 'RAZORPAY'
                          ? 'var(--surface-elevated)'
                          : 'var(--surface)',
                      borderColor:
                        paymentMethod === 'RAZORPAY' ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    <CreditCard
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: razorpayAvailable ? 'var(--primary)' : 'var(--text-muted)' }}
                    />
                    <div>
                      <strong className="block text-xs" style={{ color: 'var(--text-main)' }}>
                        Online Payment
                      </strong>
                      <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                        {razorpayAvailable ? 'Razorpay Cards & Netbanking' : 'Temporarily Unavailable'}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!codAvailable}
                    aria-disabled={!codAvailable}
                    onClick={() => {
                      if (!codAvailable) return;
                      setErrorMsg(null);
                      setPaymentMethod('COD');
                    }}
                    className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                      codAvailable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                    }`}
                    style={{
                      backgroundColor:
                        paymentMethod === 'COD' ? 'var(--surface-elevated)' : 'var(--surface)',
                      borderColor: paymentMethod === 'COD' ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    <Truck
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: codAvailable ? 'var(--primary)' : 'var(--text-muted)' }}
                    />
                    <div>
                      <strong className="block text-xs" style={{ color: 'var(--text-main)' }}>
                        Cash on Delivery
                      </strong>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {codAvailable ? 'Pay at doorstep' : 'Currently Disabled'}
                      </span>
                    </div>
                  </button>
                </div>

                {!razorpayAvailable && (
                  <div
                    role="status"
                    className="mt-2.5 p-2.5 rounded-lg border text-[11px] flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                    <span>
                      <strong>Online Payment Temporarily Unavailable:</strong> Please complete your
                      order using <strong>Cash on Delivery (COD)</strong> or{' '}
                      <strong>Manual UPI QR</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Method Details Box */}
              {paymentMethod === 'UPI' ? (
                <div
                  className="p-5 rounded-xl border text-center space-y-4"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="inline-block px-3.5 py-1 rounded-lg text-xs font-semibold tabular-nums"
                    style={{
                      backgroundColor: 'var(--secondary)',
                      color: 'var(--primary)',
                    }}
                  >
                    Payable Amount: {formatINR(total)}
                  </div>

                  <div className="flex flex-col items-center justify-center min-h-[210px]">
                    {isGeneratingQr ? (
                      <div
                        className="flex flex-col items-center gap-2 text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Loader2
                          className="w-8 h-8 animate-spin"
                          style={{ color: 'var(--primary)' }}
                        />
                        <span>Generating custom UPI QR code...</span>
                      </div>
                    ) : qrDataUrl ? (
                      <div
                        className="p-3 bg-white border rounded-xl shadow-sm"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <img
                          src={qrDataUrl}
                          alt="Dynamic UPI QR Code"
                          className="w-48 h-48 object-contain mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center text-xs text-stone-600 border">
                        QR Code Ready
                      </div>
                    )}
                    <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                      Scan with any UPI app: Google Pay · PhonePe · Paytm · BHIM · CRED
                    </p>
                  </div>

                  {/* UPI VPA Copy Box */}
                  <div
                    className="flex items-center justify-between p-2.5 rounded-lg border text-xs"
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>
                      UPI ID:{' '}
                      <strong className="font-mono" style={{ color: 'var(--text-main)' }}>
                        {VPA_ADDRESS}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyVpa}
                      className="px-2.5 py-1 rounded border font-medium flex items-center gap-1 text-[11px] cursor-pointer"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--primary)',
                      }}
                    >
                      {copiedUpi ? (
                        <Check className="w-3.5 h-3.5" style={{ color: 'var(--success-text)' }} />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedUpi ? 'Copied!' : 'Copy ID'}</span>
                    </button>
                  </div>

                  {/* Direct mobile deep link */}
                  {upiUri && (
                    <a
                      href={upiUri}
                      className="inline-flex items-center gap-1.5 text-xs hover:underline font-semibold"
                      style={{ color: 'var(--primary)' }}
                    >
                      <span>Open directly in UPI App on this device</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Optional UTR / Reference ID */}
                  <div className="text-left pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <label
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      UPI Reference / UTR Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 402910482910"
                      value={upiRefId}
                      onChange={(e) => setUpiRefId(e.target.value)}
                      className="w-full p-2.5 rounded-lg border text-xs tabular-nums"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                </div>
              ) : paymentMethod === 'RAZORPAY' ? (
                <div
                  className="p-5 rounded-xl border space-y-3"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="flex items-center justify-between text-sm font-semibold tabular-nums"
                    style={{ color: 'var(--primary)' }}
                  >
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      <span>Razorpay Secure Gateway</span>
                    </span>
                    <span>{formatINR(total)}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Pay securely with Credit/Debit Cards, Netbanking, UPI, or Wallets via Razorpay.
                  </p>
                  {!razorpayAvailable && (
                    <div
                      className="p-3 rounded-lg border text-[11px] leading-relaxed"
                      style={{
                        backgroundColor: 'var(--warning-bg)',
                        borderColor: 'var(--warning-border)',
                        color: 'var(--warning-text)',
                      }}
                    >
                      <strong>Merchant Setup Note:</strong> Add your public Razorpay Key ID (
                      <code>rzp_test_...</code> or <code>rzp_live_...</code>) in{' '}
                      <strong>Merchant Workspace → Store Settings</strong> to activate live
                      card/netbanking popup checkout. In the meantime, Cash on Delivery, Dynamic UPI
                      QR, and WhatsApp ordering are ready for instant use.
                    </div>
                  )}
                </div>
              ) : (
                /* Cash on Delivery Notice */
                <div
                  className="p-5 rounded-xl border space-y-3"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="flex items-center gap-2 text-sm font-semibold tabular-nums"
                    style={{ color: 'var(--primary)' }}
                  >
                    <Truck className="w-5 h-5" />
                    <span>Pay ₹{Math.round(total)} at Doorstep</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    You can pay using Cash or UPI QR to the courier executive when your {brandName}{' '}
                    package arrives at your address. No advance payment required!
                  </p>
                  <p
                    className="text-[11px] leading-relaxed pt-1 border-t"
                    style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
                  >
                    {storeSettings.deliveryPolicy}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="w-full py-3.5 px-5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-opacity hover:opacity-95 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer tabular-nums"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <span>
                    {paymentMethod === 'RAZORPAY'
                      ? `Pay with Razorpay · ${formatINR(total)}`
                      : `Confirm & Place Order (${paymentMethod}) · ${formatINR(total)}`}
                  </span>
                )}
              </button>

              {cleanWhatsappNumber && (
                <a
                  href={buildWhatsAppOrderUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  <MessageCircle className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  <span>Or Send Order Details Directly on WhatsApp</span>
                </a>
              )}
            </div>
          )}

          {/* STEP 3: Order Confirmed */}
          {step === 'confirmed' && placedOrder && (
            <div className="text-center py-6 space-y-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto border"
                style={{
                  backgroundColor: 'var(--success-bg)',
                  borderColor: 'var(--success-border)',
                  color: 'var(--success-text)',
                }}
              >
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: 'var(--accent)' }}
                >
                  Order Successfully Placed
                </span>
                <h3 className="font-serif text-3xl mt-1" style={{ color: 'var(--text-main)' }}>
                  Thank You, {placedOrder.customer_details.name.split(' ')[0]}!
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Order ID:{' '}
                  <strong className="font-mono" style={{ color: 'var(--text-main)' }}>
                    {placedOrder.id}
                  </strong>
                </p>
              </div>

              <div
                className="p-4 rounded-xl text-left text-xs space-y-2 border"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
              >
                <div
                  className="flex justify-between font-semibold tabular-nums"
                  style={{ color: 'var(--text-main)' }}
                >
                  <span>Total Amount</span>
                  <span className="text-sm" style={{ color: 'var(--primary)' }}>
                    {formatINR(placedOrder.total)}
                  </span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                  <span>Payment Method</span>
                  <span className="font-medium" style={{ color: 'var(--text-main)' }}>
                    {placedOrder.payment_method === 'UPI'
                      ? 'UPI QR (Pending Verification)'
                      : placedOrder.payment_method === 'RAZORPAY'
                      ? 'Razorpay Online (Paid)'
                      : 'Cash on Delivery (Pay on Delivery)'}
                  </span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                  <span>Order Status</span>
                  <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                    {placedOrder.status}
                  </span>
                </div>
                {placedOrder.upi_ref_id && (
                  <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                    <span>UPI Reference</span>
                    <span className="font-mono" style={{ color: 'var(--text-main)' }}>
                      {placedOrder.upi_ref_id}
                    </span>
                  </div>
                )}
                {placedOrder.razorpay_payment_id && (
                  <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                    <span>Razorpay Payment ID</span>
                    <span className="font-mono" style={{ color: 'var(--text-main)' }}>
                      {placedOrder.razorpay_payment_id}
                    </span>
                  </div>
                )}
                <div
                  className="pt-2 border-t"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>Shipping to: </span>
                  <span className="font-medium" style={{ color: 'var(--text-main)' }}>
                    {placedOrder.customer_details.address}, {placedOrder.customer_details.city} (
                    {placedOrder.customer_details.phone})
                  </span>
                </div>
              </div>

              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                A confirmation has been recorded and is visible in real-time in the Merchant
                Workspace.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-opacity hover:opacity-95 shadow-sm cursor-pointer"
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
