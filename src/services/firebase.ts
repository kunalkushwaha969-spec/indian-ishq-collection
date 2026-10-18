import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import type { Product, Order } from '../utils/ecommerce';
import { initialProducts } from '../utils/ecommerce';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const PRODUCTS_COLLECTION = 'products';
const ORDERS_COLLECTION = 'orders';

/**
 * Ensures initial ethnic wear products are seeded into Firestore on first load.
 */
let isSeeding = false;
export async function seedFirestoreIfEmpty(): Promise<Product[]> {
  try {
    const prodsRef = collection(db, PRODUCTS_COLLECTION);
    const snap = await getDocs(prodsRef);
    if (!snap.empty) {
      const items: Product[] = [];
      snap.forEach((d) => items.push(d.data() as Product));
      return items;
    }

    if (isSeeding) return [...initialProducts];
    isSeeding = true;

    const batch = writeBatch(db);
    for (const prod of initialProducts) {
      const docRef = doc(db, PRODUCTS_COLLECTION, prod.id);
      batch.set(docRef, prod);
    }
    await batch.commit();
    isSeeding = false;
    return [...initialProducts];
  } catch (err) {
    console.warn('Firestore seed notice:', err);
    return [...initialProducts];
  }
}

/**
 * Fetch all products from Firestore, sorted by creation date or catalog priority.
 */
export async function fetchFirestoreProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    if (snap.empty) {
      return await seedFirestoreIfEmpty();
    }
    const list: Product[] = [];
    snap.forEach((d) => list.push(d.data() as Product));
    return list;
  } catch (err) {
    // If empty or orderBy index not yet built, fetch by collection
    try {
      const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
      if (snap.empty) {
        return await seedFirestoreIfEmpty();
      }
      const list: Product[] = [];
      snap.forEach((d) => list.push(d.data() as Product));
      return list;
    } catch (innerErr) {
      console.warn('Firestore fetch products fallback:', innerErr);
      return [];
    }
  }
}

/**
 * Save or create a product in Firestore.
 */
export async function saveFirestoreProduct(product: Product): Promise<Product> {
  const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
  await setDoc(docRef, product, { merge: true });
  return product;
}

/**
 * Update stock count for a specific product in Firestore.
 */
export async function updateFirestoreProductStock(id: string, stock: number): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  await updateDoc(docRef, { stock: Math.max(0, stock) });
}

/**
 * Delete a product from Firestore.
 */
export async function deleteFirestoreProduct(id: string): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Fetch orders from Firestore.
 */
export async function fetchFirestoreOrders(): Promise<Order[]> {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    const list: Order[] = [];
    snap.forEach((d) => list.push(d.data() as Order));
    return list;
  } catch {
    try {
      const snap = await getDocs(collection(db, ORDERS_COLLECTION));
      const list: Order[] = [];
      snap.forEach((d) => list.push(d.data() as Order));
      return list;
    } catch {
      return [];
    }
  }
}

/**
 * Save a new order to Firestore.
 */
export async function saveFirestoreOrder(order: Order): Promise<Order> {
  const docRef = doc(db, ORDERS_COLLECTION, order.id);
  await setDoc(docRef, order);
  return order;
}

/**
 * Update order status in Firestore.
 */
export async function updateFirestoreOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(docRef, { status });
}

/**
 * Subscribe to real-time product updates (instant cross-device sync without refresh).
 */
export function subscribeToFirestoreProducts(callback: (products: Product[]) => void): () => void {
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    return onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const items: Product[] = [];
          snap.forEach((d) => items.push(d.data() as Product));
          callback(items);
        }
      },
      (error) => {
        console.warn('Real-time sync snapshot error:', error);
      }
    );
  } catch {
    return () => {};
  }
}

/**
 * Subscribe to real-time order updates.
 */
export function subscribeToFirestoreOrders(callback: (orders: Order[]) => void): () => void {
  try {
    const colRef = collection(db, ORDERS_COLLECTION);
    return onSnapshot(
      colRef,
      (snap) => {
        const items: Order[] = [];
        snap.forEach((d) => items.push(d.data() as Order));
        callback(items);
      },
      (error) => {
        console.warn('Real-time order snapshot error:', error);
      }
    );
  } catch {
    return () => {};
  }
}
