import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { Product, Order } from '../utils/ecommerce';
import { initialProducts } from '../utils/ecommerce';
import firebaseConfig from '../../firebase-applet-config.json';

// Safely initialize Firestore instance with fallback
let dbInstance: Firestore | null = null;
try {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.warn('Firebase initialization notice:', err);
}

export const db = dbInstance;

const PRODUCTS_COLLECTION = 'products';
const ORDERS_COLLECTION = 'orders';

let isSeeding = false;
export async function seedFirestoreIfEmpty(): Promise<Product[]> {
  if (!db) return [...initialProducts];
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

export async function fetchFirestoreProducts(): Promise<Product[]> {
  if (!db) return [...initialProducts];
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
    try {
      if (!db) return [...initialProducts];
      const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
      if (snap.empty) {
        return await seedFirestoreIfEmpty();
      }
      const list: Product[] = [];
      snap.forEach((d) => list.push(d.data() as Product));
      return list;
    } catch {
      return [...initialProducts];
    }
  }
}

export async function saveFirestoreProduct(product: Product): Promise<Product> {
  if (!db) return product;
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
    await setDoc(docRef, product, { merge: true });
    return product;
  } catch (err) {
    console.warn('Firestore save product warning:', err);
    return product;
  }
}

export async function updateFirestoreProductStock(id: string, stock: number): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await updateDoc(docRef, { stock: Math.max(0, stock) });
  } catch (err) {
    console.warn('Firestore stock update warning:', err);
  }
}

export async function deleteFirestoreProduct(id: string): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore delete product warning:', err);
  }
}

export async function fetchFirestoreOrders(): Promise<Order[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    const list: Order[] = [];
    snap.forEach((d) => list.push(d.data() as Order));
    return list;
  } catch {
    try {
      if (!db) return [];
      const snap = await getDocs(collection(db, ORDERS_COLLECTION));
      const list: Order[] = [];
      snap.forEach((d) => list.push(d.data() as Order));
      return list;
    } catch {
      return [];
    }
  }
}

export async function saveFirestoreOrder(order: Order): Promise<Order> {
  if (!db) return order;
  try {
    const docRef = doc(db, ORDERS_COLLECTION, order.id);
    await setDoc(docRef, order);
    return order;
  } catch (err) {
    console.warn('Firestore save order warning:', err);
    return order;
  }
}

export async function updateFirestoreOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(docRef, { status });
  } catch (err) {
    console.warn('Firestore update order status warning:', err);
  }
}

export function subscribeToFirestoreProducts(callback: (products: Product[]) => void): () => void {
  try {
    if (!db) return () => {};
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
        console.warn('Real-time sync snapshot notice:', error);
      }
    );
  } catch (err) {
    console.warn('subscribeToFirestoreProducts catch:', err);
    return () => {};
  }
}

export function subscribeToFirestoreOrders(callback: (orders: Order[]) => void): () => void {
  try {
    if (!db) return () => {};
    const colRef = collection(db, ORDERS_COLLECTION);
    return onSnapshot(
      colRef,
      (snap) => {
        const items: Order[] = [];
        snap.forEach((d) => items.push(d.data() as Order));
        callback(items);
      },
      (error) => {
        console.warn('Real-time order snapshot notice:', error);
      }
    );
  } catch (err) {
    console.warn('subscribeToFirestoreOrders catch:', err);
    return () => {};
  }
}
