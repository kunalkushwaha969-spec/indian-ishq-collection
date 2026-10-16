import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product, CartItem } from './ecommerce.ts';
import {
  generateUpiUri,
  validateIndianPhone,
  validateCustomerDetails,
  filterProducts,
  calculateCartSummary,
  formatINR,
} from './ecommerce.ts';

test('generateUpiUri builds valid NPCI URI', () => {
  const uri = generateUpiUri({
    vpa: 'indianishq@okaxis',
    payeeName: 'Indian Ishq Collection',
    amount: 1899,
    transactionNote: 'Order #IIC12345',
    transactionRef: 'IIC12345',
  });

  assert.ok(uri.startsWith('upi://pay?pa=indianishq@okaxis'));
  assert.ok(uri.includes('am=1899.00'));
  assert.ok(uri.includes('cu=INR'));
  assert.ok(uri.includes('pn=Indian%20Ishq%20Collection'));
  assert.ok(uri.includes('tn=Order%20%23IIC12345'));
  assert.ok(uri.includes('tr=IIC12345'));
});

test('generateUpiUri throws error on invalid VPA or zero amount', () => {
  assert.throws(() => {
    generateUpiUri({
      vpa: 'invalid-vpa',
      payeeName: 'Store',
      amount: 100,
      transactionNote: 'Note',
    });
  }, /Invalid UPI VPA/);

  assert.throws(() => {
    generateUpiUri({
      vpa: 'store@upi',
      payeeName: 'Store',
      amount: 0,
      transactionNote: 'Note',
    });
  }, /amount must be greater than 0/);
});

test('validateIndianPhone checks 10 digit Indian mobile numbers', () => {
  assert.equal(validateIndianPhone('9876543210'), true);
  assert.equal(validateIndianPhone('+91 9876543210'), true);
  assert.equal(validateIndianPhone('8123456789'), true);
  assert.equal(validateIndianPhone('12345'), false);
  assert.equal(validateIndianPhone('1234567890'), false); // starts with 1
});

test('validateCustomerDetails verifies required checkout inputs', () => {
  const valid = validateCustomerDetails({
    name: 'Ananya Sharma',
    phone: '9876543210',
    address: 'Flat 402, Lotus Enclave, MG Road, Jaipur 302001',
  });
  assert.equal(valid.valid, true);

  const invalidPhone = validateCustomerDetails({
    name: 'Ananya',
    phone: '12345',
    address: 'Jaipur, Rajasthan',
  });
  assert.equal(invalidPhone.valid, false);

  const shortAddress = validateCustomerDetails({
    name: 'Ananya',
    phone: '9876543210',
    address: 'Home',
  });
  assert.equal(shortAddress.valid, false);
});

test('filterProducts filters by category and search keyword', () => {
  const dummyProducts: Product[] = [
    { id: '1', name: 'Gulabi Noor Anarkali', category: 'Festive', price: 1899, stock: 5, image_url: 'img1.jpg' },
    { id: '2', name: 'Mogra Cotton Kurti', category: 'Kurtis', price: 899, stock: 8, image_url: 'img2.jpg' },
    { id: '3', name: 'Noor Banarasi Saree', category: 'Sarees', price: 2499, stock: 2, image_url: 'img3.jpg' },
  ];

  const festive = filterProducts(dummyProducts, 'Festive', '');
  assert.equal(festive.length, 1);
  assert.equal(festive[0].name, 'Gulabi Noor Anarkali');

  const searchNoor = filterProducts(dummyProducts, 'All', 'Noor');
  assert.equal(searchNoor.length, 2);

  const all = filterProducts(dummyProducts, 'All', '');
  assert.equal(all.length, 3);
});

test('calculateCartSummary computes totals and shipping rules correctly', () => {
  const dummyProducts: Product[] = [
    { id: '1', name: 'Gulabi Noor Anarkali', category: 'Festive', price: 1000, stock: 5, image_url: 'img1.jpg' },
    { id: '2', name: 'Mogra Cotton Kurti', category: 'Kurtis', price: 500, stock: 8, image_url: 'img2.jpg' },
  ];

  // Under ₹1,999 threshold -> standard ₹99 shipping
  const cartUnder: CartItem[] = [{ id: '1', qty: 1 }];
  const summary1 = calculateCartSummary(cartUnder, dummyProducts);
  assert.equal(summary1.subtotal, 1000);
  assert.equal(summary1.shipping, 99);
  assert.equal(summary1.total, 1099);
  assert.equal(summary1.freeShippingQualified, false);

  // Over ₹1,999 threshold -> free shipping
  const cartOver: CartItem[] = [
    { id: '1', qty: 2 }, // 2000
  ];
  const summary2 = calculateCartSummary(cartOver, dummyProducts);
  assert.equal(summary2.subtotal, 2000);
  assert.equal(summary2.shipping, 0);
  assert.equal(summary2.total, 2000);
  assert.equal(summary2.freeShippingQualified, true);
});

test('formatINR formats currency strings with rupee sign', () => {
  assert.equal(formatINR(1899), '₹1,899');
  assert.equal(formatINR(25000), '₹25,000');
});
