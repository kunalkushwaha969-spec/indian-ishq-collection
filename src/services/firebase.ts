import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
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
import { initialProducts, resolveSafeProductImage } from '../utils/ecommerce';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Safely initialize Firebase App, Auth, and Firestore
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
const googleProvider = new GoogleAuthProvider();

try {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  authInstance = getAuth(app);
} catch (err) {
  console.warn('Firebase initialization notice:', err);
}

export const db = dbInstance;
export const auth = authInstance;

export const AUTHORIZED_MERCHANT_EMAIL = 'kunalkushwaha969@gmail.com';

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'settings', 'store'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

export type MerchantRole = 'admin' | 'merchant';

export const ADMINS_COLLECTION = 'admins';

export function isValidMerchantRole(role: unknown): role is MerchantRole {
  return role === 'admin' || role === 'merchant';
}

export async function getMerchantRole(user: User | null): Promise<MerchantRole | null> {
  if (!user) return null;

  // 1. Check Firestore /admins/{uid} document first so explicit roles take precedence
  if (db && user.uid) {
    try {
      const adminSnap = await getDoc(doc(db, ADMINS_COLLECTION, user.uid));
      if (adminSnap.exists()) {
        const data = adminSnap.data();
        if (data && isValidMerchantRole(data.role)) {
          return data.role;
        }
      }
    } catch {
      // Non-admin user cannot read or does not have an admin document
    }
  }

  // 2. Preserve the initial store owner as default "admin"
  if (
    user.email &&
    user.email.toLowerCase() === AUTHORIZED_MERCHANT_EMAIL.toLowerCase() &&
    user.emailVerified
  ) {
    return 'admin';
  }

  return null;
}

export async function isAuthorizedMerchantUser(user: User | null): Promise<boolean> {
  const role = await getMerchantRole(user);
  return role === 'admin' || role === 'merchant';
}

export async function signInMerchantWithGoogle(): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized.');
  }
  const cred = await signInWithPopup(auth, googleProvider);
  const role = await getMerchantRole(cred.user);
  if (!role) {
    await signOut(auth);
    throw new Error(
      `Access denied: ${cred.user.email || 'This account'} (UID: ${cred.user.uid}) is not authorized in the Firestore "admins" collection.`
    );
  }
  return cred.user;
}

export async function signInMerchantWithEmail(email: string, password: string): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized.');
  }
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const role = await getMerchantRole(cred.user);
  if (!role) {
    await signOut(auth);
    throw new Error(
      `Access denied: ${cred.user.email || 'This account'} (UID: ${cred.user.uid}) is not authorized in the Firestore "admins" collection.`
    );
  }
  return cred.user;
}

export async function signOutMerchant(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function subscribeToMerchantAuth(
  callback: (user: User | null, isAdmin: boolean, role?: MerchantRole | null) => void
): () => void {
  if (!auth) {
    callback(null, false, null);
    return () => {};
  }
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, false, null);
      return;
    }
    const role = await getMerchantRole(user);
    callback(user, role !== null, role);
  });
}

const PRODUCTS_COLLECTION = 'products';
const ORDERS_COLLECTION = 'orders';

let isSeeding = false;
export async function seedFirestoreIfEmpty(): Promise<Product[]> {
  if (!db) return [...initialProducts];
  try {
    const prodsRef = collection(db, PRODUCTS_COLLECTION);
    const snap = await getDocs(prodsRef);
    if (snap.size > 1) {
      const items: Product[] = [];
      snap.forEach((d) => items.push(d.data() as Product));
      return items;
    }

    // Only attempt to seed Firestore if signed in as an admin
    if (!auth?.currentUser || isSeeding) return [...initialProducts];
    isSeeding = true;

    const existingMap = new Map<string, Product>();
    const batch = writeBatch(db);
    for (const prod of initialProducts) {
      const docRef = doc(db, PRODUCTS_COLLECTION, prod.id);
      batch.set(docRef, prod, { merge: true });
      existingMap.set(prod.id, prod);
    }
    await batch.commit();
    isSeeding = false;
    return Array.from(existingMap.values());
  } catch (err) {
    isSeeding = false;
    console.warn('Firestore seed notice:', err);
    return [...initialProducts];
  }
}

export async function fetchFirestoreProducts(): Promise<Product[]> {
  if (!db) return [...initialProducts];
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    if (snap.size <= 1) {
      return await seedFirestoreIfEmpty();
    }
    const list: Product[] = [];
    snap.forEach((d) => {
      const data = d.data() as Product;
      list.push({ ...data, image_url: resolveSafeProductImage(data) });
    });
    return list;
  } catch {
    try {
      if (!db) return [...initialProducts];
      const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
      if (snap.size <= 1) {
        return await seedFirestoreIfEmpty();
      }
      const list: Product[] = [];
      snap.forEach((d) => {
        const data = d.data() as Product;
        list.push({ ...data, image_url: resolveSafeProductImage(data) });
      });
      return list;
    } catch {
      return [...initialProducts];
    }
  }
}

export async function saveFirestoreProduct(product: Product): Promise<Product> {
  if (!db) {
    throw new Error('Firestore database is not initialized.');
  }
  const path = `${PRODUCTS_COLLECTION}/${product.id}`;
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
    await setDoc(docRef, product, { merge: true });
    return product;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateFirestoreProductStock(id: string, stock: number): Promise<void> {
  if (!db) {
    throw new Error('Firestore database is not initialized.');
  }
  const path = `${PRODUCTS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await updateDoc(docRef, { stock: Math.max(0, stock) });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteFirestoreProduct(id: string): Promise<void> {
  if (!db) {
    throw new Error('Firestore database is not initialized.');
  }
  const path = `${PRODUCTS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchFirestoreOrders(): Promise<Order[]> {
  if (!db) {
    throw new Error('Firestore database is not initialized.');
  }
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    const list: Order[] = [];
    snap.forEach((d) => list.push(d.data() as Order));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ORDERS_COLLECTION);
  }
}

export async function saveFirestoreOrder(order: Order): Promise<Order> {
  if (!db) {
    throw new Error('Firestore database is not initialized. Order could not be saved.');
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You appear to be offline. Order could not be saved to the store database.');
  }
  const path = `${ORDERS_COLLECTION}/${order.id}`;
  try {
    const docRef = doc(db, ORDERS_COLLECTION, order.id);
    await setDoc(docRef, order);
    return order;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateFirestoreOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<void> {
  if (!db) {
    throw new Error('Firestore database is not initialized.');
  }
  const path = `${ORDERS_COLLECTION}/${orderId}`;
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(docRef, { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeToFirestoreProducts(callback: (products: Product[]) => void): () => void {
  try {
    if (!db) return () => {};
    const colRef = collection(db, PRODUCTS_COLLECTION);
    return onSnapshot(
      colRef,
      (snap) => {
        if (snap.size <= 1) {
          seedFirestoreIfEmpty().then((seeded) => callback(seeded));
          return;
        }
        const items: Product[] = [];
        snap.forEach((d) => {
          const data = d.data() as Product;
          items.push({ ...data, image_url: resolveSafeProductImage(data) });
        });
        callback(items);
      },
      (error) => {
        console.warn('Real-time product snapshot notice:', error);
      }
    );
  } catch (err) {
    console.warn('subscribeToFirestoreProducts catch:', err);
    return () => {};
  }
}

export function subscribeToFirestoreOrders(callback: (orders: Order[]) => void): () => void {
  try {
    if (!db || !auth?.currentUser) return () => {};
    const colRef = collection(db, ORDERS_COLLECTION);
    return onSnapshot(
      colRef,
      (snap) => {
        const items: Order[] = [];
        snap.forEach((d) => items.push(d.data() as Order));
        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        callback(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, ORDERS_COLLECTION);
        } catch {
          // Logged via handleFirestoreError
        }
      }
    );
  } catch (err) {
    console.warn('subscribeToFirestoreOrders catch:', err);
    return () => {};
  }
}
