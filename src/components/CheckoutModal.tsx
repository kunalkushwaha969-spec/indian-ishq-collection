import React, { useState, useEffect } from 'react';
import type { CartItem, Product, CustomerDetails, Order } from '../utils/ecommerce';
import {
  calculateCartSummary,
  validateCustomerDetails,
  formatINR,
  generateUpiUri,
} from '../utils/ecommerce';
import { generateUpiQrCode, createOrder } from '../services/api';
import { QrCode, Truck, CheckCircle2, Copy, Check, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  products,
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
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'COD'>('UPI');
  const [upiRefId, setUpiRefId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [upiUri, setUpiUri] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const { total, subtotal, shipping } = calculateCartSummary(cart, products);
  const VPA_ADDRESS = 'indianishq@okaxis';

  // Generate UPI QR code whenever payment method is UPI and user reaches payment step
  useEffect(() => {
    if (step === 'payment' && paymentMethod === 'UPI') {
      const fetchQr = async () => {
        setIsGeneratingQr(true);
        setErrorMsg(null);
        try {
          const tempOrderRef = 'IIC-' + Math.floor(100000 + Math.random() * 900000);
          const data = await generateUpiQrCode({
            amount: total,
            orderRef: tempOrderRef,
            payeeName: 'Indian Ishq Collection',
            vpa: VPA_ADDRESS,
          });
          setQrDataUrl(data.qrDataUrl);
          setUpiUri(data.upiUri);
        } catch (err: any) {
          // Client-side fallback if offline
          try {
            const uri = generateUpiUri({
              vpa: VPA_ADDRESS,
              payeeName: 'Indian Ishq Collection',
              amount: total,
              transactionNote: 'Ethnic Wear Order',
            });
            setUpiUri(uri);
          } catch (e) {}
        } finally {
          setIsGeneratingQr(false);
        }
      };
      fetchQr();
    }
  }, [step, paymentMethod, total]);

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

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    const orderItems = cart.map((item) => {
      const p = productMap.get(item.id);
      return {
        id: item.id,
        name: p?.name || 'Handcrafted Ethnic Wear',
        price: p?.price || 0,
        qty: item.qty,
      };
    });

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
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'confirmed') onClose();
      }}
    >
      <div className="bg-[#fffdf9] w-full max-w-[620px] rounded-lg shadow-2xl border border-[#eadfda] my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eadfda] bg-white">
          <div className="flex items-center gap-2">
            {step === 'payment' && (
              <button
                type="button"
                onClick={() => setStep('details')}
                className="p-1 text-[#70283b] hover:bg-[#f8eeeb] rounded mr-1"
                aria-label="Back to customer details"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 id="checkout-heading" className="font-serif text-2xl text-[#70283b]">
              {step === 'details' && 'Shipping & Customer Details'}
              {step === 'payment' && 'Payment (UPI & Cash on Delivery)'}
              {step === 'confirmed' && 'Order Confirmed!'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="text-2xl text-[#70283b] hover:opacity-75 p-1 leading-none"
          >
            ×
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-r">
            {errorMsg}
          </div>
        )}

        <div className="p-6">
          {/* STEP 1: Customer Details */}
          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Radhika Sharma"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full p-2.5 bg-[#fffdf9] border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2.5 bg-[#fffdf9] border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                  Delivery Address (Flat / House No., Street, Colony) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Flat 302, Royal Palms, Tilak Nagar"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  className="w-full p-2.5 bg-[#fffdf9] border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    value={customer.city}
                    onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                    className="w-full p-2.5 bg-[#fffdf9] border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={customer.pincode}
                    onChange={(e) => setCustomer({ ...customer, pincode: e.target.value })}
                    className="w-full p-2.5 bg-[#fffdf9] border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
                  />
                </div>
              </div>

              {/* Order quick summary */}
              <div className="bg-[#fcf5f3] p-3.5 rounded border border-[#eadfda] flex justify-between text-xs text-[#776c6b]">
                <span>
                  Items: <strong>{cart.reduce((s, i) => s + i.qty, 0)} pcs</strong>
                </span>
                <span>
                  Shipping:{' '}
                  <strong>{shipping === 0 ? 'FREE' : formatINR(shipping)}</strong>
                </span>
                <span className="text-[#70283b] font-bold text-sm">
                  Payable: {formatINR(total)}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold tracking-widest uppercase rounded transition-colors shadow-md"
              >
                Continue to Payment →
              </button>
            </form>
          )}

          {/* STEP 2: Payment (UPI / COD) */}
          {step === 'payment' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-2">
                  Select Payment Method
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3.5 rounded border text-left flex items-start gap-3 transition-all ${
                      paymentMethod === 'UPI'
                        ? 'border-[#70283b] bg-[#fcf5f3] ring-1 ring-[#70283b]'
                        : 'border-[#eadfda] bg-white hover:bg-gray-50'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-[#70283b] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm text-[#292222]">Dynamic UPI QR</strong>
                      <span className="text-[11px] text-[#776c6b]">Instant via GPay, PhonePe, Paytm</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('COD')}
                    className={`p-3.5 rounded border text-left flex items-start gap-3 transition-all ${
                      paymentMethod === 'COD'
                        ? 'border-[#70283b] bg-[#fcf5f3] ring-1 ring-[#70283b]'
                        : 'border-[#eadfda] bg-white hover:bg-gray-50'
                    }`}
                  >
                    <Truck className="w-5 h-5 text-[#70283b] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm text-[#292222]">Cash on Delivery</strong>
                      <span className="text-[11px] text-[#776c6b]">Pay cash or UPI at doorstep</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* UPI QR Code Generation Box */}
              {paymentMethod === 'UPI' ? (
                <div className="bg-white p-5 rounded-lg border border-[#eadfda] shadow-xs text-center space-y-4">
                  <div className="inline-block bg-[#fcf5f3] px-3 py-1 rounded-full text-xs font-semibold text-[#70283b]">
                    Payable Amount: {formatINR(total)}
                  </div>

                  <div className="flex flex-col items-center justify-center min-h-[220px]">
                    {isGeneratingQr ? (
                      <div className="flex flex-col items-center gap-2 text-xs text-[#776c6b]">
                        <Loader2 className="w-8 h-8 animate-spin text-[#70283b]" />
                        <span>Generating custom UPI QR code...</span>
                      </div>
                    ) : qrDataUrl ? (
                      <div className="p-3 bg-white border border-[#eadfda] rounded-md shadow-sm">
                        <img
                          src={qrDataUrl}
                          alt="Dynamic UPI QR Code"
                          className="w-52 h-52 object-contain mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                        QR Code Ready
                      </div>
                    )}
                    <p className="text-[11px] text-[#776c6b] mt-2">
                      Scan with any UPI app: Google Pay · PhonePe · Paytm · BHIM · CRED
                    </p>
                  </div>

                  {/* UPI VPA Copy Box */}
                  <div className="flex items-center justify-between p-2.5 bg-[#fcf5f3] border border-[#eadfda] rounded text-xs">
                    <span className="text-[#776c6b]">
                      UPI ID: <strong className="text-[#292222] font-mono">{VPA_ADDRESS}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyVpa}
                      className="px-2.5 py-1 bg-white border border-[#eadfda] hover:border-[#70283b] rounded text-[#70283b] font-medium flex items-center gap-1 text-[11px]"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUpi ? 'Copied!' : 'Copy ID'}</span>
                    </button>
                  </div>

                  {/* Direct mobile deep link */}
                  {upiUri && (
                    <a
                      href={upiUri}
                      className="inline-flex items-center gap-1.5 text-xs text-[#70283b] hover:underline font-semibold"
                    >
                      <span>Open directly in UPI App on this device</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Optional UTR / Reference ID */}
                  <div className="text-left pt-2 border-t border-[#eadfda]">
                    <label className="block text-[11px] font-semibold text-[#776c6b] uppercase mb-1">
                      UPI Reference / UTR Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 402910482910"
                      value={upiRefId}
                      onChange={(e) => setUpiRefId(e.target.value)}
                      className="w-full p-2 bg-[#fffdf9] border border-[#eadfda] rounded text-xs text-[#292222] focus:outline-[#b78a4b]"
                    />
                  </div>
                </div>
              ) : (
                /* Cash on Delivery Notice */
                <div className="bg-[#fcf5f3] p-5 rounded-lg border border-[#eadfda] space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#70283b]">
                    <Truck className="w-5 h-5" />
                    <span>Pay ₹{Math.round(total)} at Doorstep</span>
                  </div>
                  <p className="text-xs text-[#776c6b] leading-relaxed">
                    You can pay using Cash or UPI QR to the courier executive when your Indian Ishq
                    package arrives at your address. No advance payment required!
                  </p>
                  <ul className="text-[11px] text-[#776c6b] space-y-1 list-disc pl-4">
                    <li>Dispatched within 24 hours from Jaipur, Rajasthan</li>
                    <li>Estimated delivery time: 3-5 business days</li>
                    <li>Tamper-proof heritage packaging</li>
                  </ul>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="w-full py-3.5 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold tracking-widest uppercase rounded transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Placing Your Order...</span>
                  </>
                ) : (
                  <span>
                    Confirm & Place Order ({paymentMethod === 'UPI' ? 'UPI' : 'COD'}) · {formatINR(total)}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* STEP 3: Order Confirmed */}
          {step === 'confirmed' && placedOrder && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold text-[#b78a4b] tracking-widest uppercase">
                  Order Successfully Placed
                </span>
                <h3 className="font-serif text-3xl text-[#70283b] mt-1">
                  Thank You, {placedOrder.customer_details.name.split(' ')[0]}!
                </h3>
                <p className="text-xs text-[#776c6b] mt-1">
                  Order ID: <strong className="text-[#292222] font-mono">{placedOrder.id}</strong>
                </p>
              </div>

              <div className="bg-[#fcf5f3] p-4 rounded text-left text-xs space-y-2 border border-[#eadfda]">
                <div className="flex justify-between font-semibold text-[#292222]">
                  <span>Total Amount</span>
                  <span className="text-[#70283b] text-sm">{formatINR(placedOrder.total)}</span>
                </div>
                <div className="flex justify-between text-[#776c6b]">
                  <span>Payment Method</span>
                  <span className="font-medium text-[#292222]">
                    {placedOrder.payment_method === 'UPI' ? 'UPI Payment' : 'Cash on Delivery (COD)'}
                  </span>
                </div>
                {placedOrder.upi_ref_id && (
                  <div className="flex justify-between text-[#776c6b]">
                    <span>UPI Reference</span>
                    <span className="font-mono text-[#292222]">{placedOrder.upi_ref_id}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#eadfda] text-[#776c6b]">
                  <span>Shipping to: </span>
                  <span className="text-[#292222] font-medium">
                    {placedOrder.customer_details.address}, {placedOrder.customer_details.city} ({placedOrder.customer_details.phone})
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#776c6b] italic">
                A confirmation has been sent to your phone. It is also visible in real-time in the
                Merchant Dashboard.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold tracking-widest uppercase rounded transition-colors shadow-md"
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
