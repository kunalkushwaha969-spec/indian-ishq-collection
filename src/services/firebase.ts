import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
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
import type {
  Product,
  Order,
  AdminRecordStatus,
  UserAccountStatus,
  RegisteredUserDoc,
  AdminRoleDoc,
  ManagedUserAccount,
} from '../utils/ecommerce';
import {
  initialProducts,
  resolveSafeProductImage,
  UNAUTHORIZED_MERCHANT_MESSAGE,
  REVOKED_MERCHANT_MESSAGE,
  INITIAL_OWNER_UID,
  isInitialOwnerUid,
  resolveEffectiveMerchantRole,
  buildManagedUserAccounts,
  validateRoleChangeSafety,
  canInitialOwnerHandover,
  validateEmailChangeForm,
} from '../utils/ecommerce';
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

export const AUTHORIZED_MERCHANT_UID = INITIAL_OWNER_UID;
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
export const USERS_COLLECTION = 'users';

const LOCAL_REGISTERED_USERS_KEY = 'ishq_registered_users_cache_v1';
const LOCAL_ADMIN_ROLES_KEY = 'ishq_admin_roles_cache_v1';

function getLocalRegisteredUsers(): RegisteredUserDoc[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_REGISTERED_USERS_KEY);
    return raw ? (JSON.parse(raw) as RegisteredUserDoc[]) : [];
  } catch {
    return [];
  }
}

function saveLocalRegisteredUser(entry: RegisteredUserDoc) {
  try {
    if (typeof window === 'undefined') return;
    const current = getLocalRegisteredUsers();
    const next = [entry, ...current.filter((u) => u.uid !== entry.uid)];
    localStorage.setItem(LOCAL_REGISTERED_USERS_KEY, JSON.stringify(next));
  } catch {}
}

function getLocalAdminRoles(): AdminRoleDoc[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_ADMIN_ROLES_KEY);
    return raw ? (JSON.parse(raw) as AdminRoleDoc[]) : [];
  } catch {
    return [];
  }
}

function saveLocalAdminRole(entry: AdminRoleDoc) {
  try {
    if (typeof window === 'undefined') return;
    const current = getLocalAdminRoles();
    const next = [entry, ...current.filter((a) => a.uid !== entry.uid)];
    localStorage.setItem(LOCAL_ADMIN_ROLES_KEY, JSON.stringify(next));
  } catch {}
}

export function isValidMerchantRole(role: unknown): role is MerchantRole {
  return role === 'admin' || role === 'merchant';
}

export async function recordRegisteredAccount(
  user: User,
  providerHint?: 'password' | 'google' | 'email',
  customDisplayName?: string
): Promise<RegisteredUserDoc | null> {
  if (!user || !user.uid) return null;

  const detectedProvider =
    providerHint ||
    (user.providerData?.some((p) => p.providerId === 'google.com') ? 'google' : 'password');
  const nowIso = new Date().toISOString();
  const email = (user.email || '').trim().toLowerCase();
  const displayName = (customDisplayName ?? user.displayName ?? '').trim();

  const record: RegisteredUserDoc = {
    uid: user.uid,
    email,
    ...(displayName ? { displayName } : {}),
    provider: detectedProvider,
    created_at: user.metadata?.creationTime
      ? new Date(user.metadata.creationTime).toISOString()
      : nowIso,
    updated_at: nowIso,
  };

  saveLocalRegisteredUser(record);

  if (db) {
    try {
      await setDoc(doc(db, USERS_COLLECTION, user.uid), record, { merge: true });
    } catch {
      // If /users rules are not yet deployed, local registration cache preserves visibility on this device
    }
  }

  return record;
}

export async function getMerchantAccountState(user: User | null): Promise<{
  role: MerchantRole | null;
  status: UserAccountStatus;
  isInitialOwner: boolean;
}> {
  if (!user) {
    return { role: null, status: 'pending', isInitialOwner: false };
  }

  let adminDocRole: unknown = undefined;
  let adminDocApprovedBy: string | null = null;

  if (db && user.uid) {
    try {
      const adminSnap = await getDoc(doc(db, ADMINS_COLLECTION, user.uid));
      if (adminSnap.exists()) {
        const data = adminSnap.data();
        adminDocRole = data?.role;
        adminDocApprovedBy =
          typeof data?.approved_by === 'string' ? data.approved_by : null;
      }
    } catch {
      // Non-admin user cannot read or does not have an admin document
    }
  }

  const isInitialOwner = Boolean(
    isInitialOwnerUid(user.uid) &&
    user.email &&
    user.email.toLowerCase() === AUTHORIZED_MERCHANT_EMAIL.toLowerCase()
  );

  const resolvedRole = resolveEffectiveMerchantRole({
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    adminDocRole,
    adminDocApprovedBy,
    initialOwnerEmail: AUTHORIZED_MERCHANT_EMAIL,
  });

  if (resolvedRole === 'admin') {
    return { role: 'admin', status: 'admin', isInitialOwner };
  }

  if (resolvedRole === 'merchant') {
    return { role: 'merchant', status: 'merchant', isInitialOwner };
  }

  if (adminDocRole === 'revoked') {
    return { role: null, status: 'revoked', isInitialOwner };
  }

  return { role: null, status: 'pending', isInitialOwner };
}

export async function getMerchantRole(user: User | null): Promise<MerchantRole | null> {
  const state = await getMerchantAccountState(user);
  return state.role;
}

export async function isAuthorizedMerchantUser(user: User | null): Promise<boolean> {
  const role = await getMerchantRole(user);
  return role === 'admin' || role === 'merchant';
}

export interface UnapprovedAccountDetails {
  uid: string;
  email: string;
  status: 'pending' | 'revoked';
  message: string;
}

export async function signInMerchantWithGoogle(): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized.');
  }
  const cred = await signInWithPopup(auth, googleProvider);
  await recordRegisteredAccount(cred.user, 'google');
  const state = await getMerchantAccountState(cred.user);
  if (!state.role) {
    const uid = cred.user.uid;
    const email = cred.user.email || '';
    await signOut(auth);
    const err = new Error(
      state.status === 'revoked' ? REVOKED_MERCHANT_MESSAGE : UNAUTHORIZED_MERCHANT_MESSAGE
    ) as Error & { pendingAccount?: UnapprovedAccountDetails };
    err.pendingAccount = {
      uid,
      email,
      status: state.status === 'revoked' ? 'revoked' : 'pending',
      message: err.message,
    };
    throw err;
  }
  return cred.user;
}

export async function signInMerchantWithEmail(email: string, password: string): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized.');
  }
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await recordRegisteredAccount(cred.user, 'password');
  const state = await getMerchantAccountState(cred.user);
  if (!state.role) {
    const uid = cred.user.uid;
    const userEmail = cred.user.email || email.trim();
    await signOut(auth);
    const err = new Error(
      state.status === 'revoked' ? REVOKED_MERCHANT_MESSAGE : UNAUTHORIZED_MERCHANT_MESSAGE
    ) as Error & { pendingAccount?: UnapprovedAccountDetails };
    err.pendingAccount = {
      uid,
      email: userEmail,
      status: state.status === 'revoked' ? 'revoked' : 'pending',
      message: err.message,
    };
    throw err;
  }
  return cred.user;
}

export async function registerMerchantWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<{
  user: User | null;
  uid: string;
  email: string;
  authorized: boolean;
  role: MerchantRole | null;
  status: UserAccountStatus;
  message: string;
}> {
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized.');
  }
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName && displayName.trim()) {
    try {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    } catch {}
  }

  // Record the registration in /users/{uid} so the store owner can view & approve in User Management.
  // Creating an account NEVER writes to /admins and NEVER automatically grants admin/merchant access.
  await recordRegisteredAccount(cred.user, 'password', displayName);

  const state = await getMerchantAccountState(cred.user);
  const uid = cred.user.uid;
  const registeredEmail = cred.user.email || email.trim();

  if (!state.role) {
    await signOut(auth);
    return {
      user: null,
      uid,
      email: registeredEmail,
      authorized: false,
      role: null,
      status: state.status,
      message:
        state.status === 'revoked' ? REVOKED_MERCHANT_MESSAGE : UNAUTHORIZED_MERCHANT_MESSAGE,
    };
  }
  return {
    user: cred.user,
    uid,
    email: registeredEmail,
    authorized: true,
    role: state.role,
    status: state.status,
    message: 'Account created and authorized.',
  };
}

export async function resetMerchantPassword(email: string): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

export async function changeMerchantPassword(params: {
  currentPassword: string;
  newPassword: string;
  email?: string;
}): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized.');
  }

  const currentUser = auth.currentUser;
  if (currentUser && currentUser.email) {
    const credential = EmailAuthProvider.credential(currentUser.email, params.currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, params.newPassword);
    return;
  }

  const targetEmail = (params.email || '').trim();
  if (!targetEmail) {
    throw new Error('Please enter your account email address.');
  }
  const cred = await signInWithEmailAndPassword(auth, targetEmail, params.currentPassword);
  try {
    await updatePassword(cred.user, params.newPassword);
  } finally {
    const role = await getMerchantRole(cred.user);
    if (!role) {
      await signOut(auth);
    }
  }
}

export async function changeMerchantEmail(params: {
  newEmail: string;
  currentPassword?: string;
}): Promise<{ verificationSentTo: string; message: string }> {
  if (!auth || !auth.currentUser) {
    throw new Error('You must be signed in to change your email address.');
  }

  const currentUser = auth.currentUser;
  const role = await getMerchantRole(currentUser);
  if (!role) {
    throw new Error('Unauthorized: Only authorized accounts can change account settings.');
  }

  const hasPasswordProvider = Boolean(
    currentUser.providerData?.some((p) => p.providerId === 'password')
  );
  const validation = validateEmailChangeForm({
    currentEmail: currentUser.email,
    newEmail: params.newEmail,
    currentPassword: params.currentPassword,
    requiresPassword: hasPasswordProvider,
  });
  if (!validation.valid) {
    throw new Error(validation.error || 'Please check your email details.');
  }

  const normalizedNewEmail = params.newEmail.trim().toLowerCase();

  // Reauthenticate first to satisfy Firebase recent-login security requirement
  if (hasPasswordProvider && currentUser.email && params.currentPassword) {
    const credential = EmailAuthProvider.credential(currentUser.email, params.currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
  } else if (currentUser.providerData?.some((p) => p.providerId === 'google.com')) {
    await reauthenticateWithPopup(currentUser, googleProvider);
  }

  // Use Firebase Authentication's supported verification flow before updating email
  await verifyBeforeUpdateEmail(currentUser, normalizedNewEmail);

  return {
    verificationSentTo: normalizedNewEmail,
    message: `Verification link sent to ${normalizedNewEmail}. Please open that email and click the verification link to complete your email change. Your UID and Admin permissions remain preserved.`,
  };
}

export async function updateMerchantDisplayName(displayName: string): Promise<string> {
  if (!auth || !auth.currentUser) {
    throw new Error('You must be signed in to update your profile.');
  }
  const currentUser = auth.currentUser;
  const role = await getMerchantRole(currentUser);
  if (!role) {
    throw new Error('Unauthorized: Only authorized accounts can update profile details.');
  }

  const trimmed = displayName.trim().slice(0, 100);
  await updateProfile(currentUser, { displayName: trimmed });
  await recordRegisteredAccount(currentUser, undefined, trimmed);

  if (db) {
    try {
      const adminRef = doc(db, ADMINS_COLLECTION, currentUser.uid);
      const snap = await getDoc(adminRef);
      if (snap.exists()) {
        await updateDoc(adminRef, {
          displayName: trimmed,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {}
  }

  return trimmed;
}

export async function fetchManagedUserAccounts(): Promise<ManagedUserAccount[]> {
  const currentUser = auth?.currentUser || null;
  const role = await getMerchantRole(currentUser);
  if (role !== 'admin') {
    throw new Error('Unauthorized: Only full Admins can view and manage user accounts.');
  }

  if (currentUser) {
    await recordRegisteredAccount(currentUser);
  }

  const registeredMap = new Map<string, RegisteredUserDoc>();
  const adminMap = new Map<string, AdminRoleDoc>();

  if (db) {
    try {
      const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
      usersSnap.forEach((d) => {
        const data = d.data() as Partial<RegisteredUserDoc>;
        const uid = data.uid || d.id;
        if (uid) {
          registeredMap.set(uid, {
            uid,
            email: data.email || '',
            displayName: data.displayName || '',
            provider: data.provider || 'password',
            created_at: data.created_at,
            updated_at: data.updated_at,
          });
        }
      });
    } catch {
      // Fallback to local registrations only if /users list is unavailable
      for (const localReg of getLocalRegisteredUsers()) {
        if (localReg?.uid) registeredMap.set(localReg.uid, localReg);
      }
    }

    try {
      const adminsSnap = await getDocs(collection(db, ADMINS_COLLECTION));
      adminsSnap.forEach((d) => {
        const data = d.data() as Partial<AdminRoleDoc>;
        const uid = data.uid || d.id;
        if (
          uid &&
          (data.role === 'admin' || data.role === 'merchant' || data.role === 'revoked')
        ) {
          adminMap.set(uid, {
            uid,
            role: data.role,
            email: data.email || '',
            displayName: data.displayName || '',
            approved_by: data.approved_by,
            handover_to_uid: data.handover_to_uid,
            created_at: data.created_at,
            updated_at: data.updated_at,
          });
        }
      });
      // Replace local cache with authoritative Firestore snapshot so stale localStorage entries never persist
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            LOCAL_ADMIN_ROLES_KEY,
            JSON.stringify(Array.from(adminMap.values()))
          );
        }
      } catch {}
    } catch {
      // If listing /admins fails before rules deployment, try reading current user's own /admins/{uid}
      if (currentUser?.uid) {
        try {
          const ownSnap = await getDoc(doc(db, ADMINS_COLLECTION, currentUser.uid));
          if (ownSnap.exists()) {
            const data = ownSnap.data() as Partial<AdminRoleDoc>;
            if (data.role === 'admin' || data.role === 'merchant' || data.role === 'revoked') {
              adminMap.set(currentUser.uid, {
                uid: currentUser.uid,
                role: data.role,
                email: data.email || currentUser.email || '',
                displayName: data.displayName || currentUser.displayName || '',
                approved_by: data.approved_by,
                handover_to_uid: data.handover_to_uid,
                created_at: data.created_at,
                updated_at: data.updated_at,
              });
            }
          }
        } catch {}
      }
    }
  }

  return buildManagedUserAccounts({
    registeredUsers: Array.from(registeredMap.values()),
    adminDocs: Array.from(adminMap.values()),
    initialOwnerEmail: AUTHORIZED_MERCHANT_EMAIL,
    currentUser: currentUser
      ? {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          provider: currentUser.providerData?.some((p) => p.providerId === 'google.com')
            ? 'google'
            : 'password',
          emailVerified: currentUser.emailVerified,
        }
      : null,
  });
}

export async function assignUserMerchantRole(params: {
  targetUid: string;
  targetEmail?: string;
  displayName?: string;
  nextStatus: AdminRecordStatus;
}): Promise<ManagedUserAccount[]> {
  const currentUser = auth?.currentUser || null;
  const actorRole = await getMerchantRole(currentUser);
  if (!currentUser || actorRole !== 'admin') {
    throw new Error('Unauthorized: Only full Admins can approve accounts or modify roles.');
  }

  const cleanUid = params.targetUid.trim();
  const currentAccounts = await fetchManagedUserAccounts();

  const safety = validateRoleChangeSafety({
    actorUid: currentUser.uid,
    actorEmail: currentUser.email,
    actorRole,
    targetUid: cleanUid,
    targetEmail: params.targetEmail,
    nextStatus: params.nextStatus,
    accounts: currentAccounts,
    initialOwnerEmail: AUTHORIZED_MERCHANT_EMAIL,
  });

  if (!safety.allowed) {
    throw new Error(safety.error || 'This role change is not permitted.');
  }

  if (!db) {
    throw new Error('Firestore database is not initialized.');
  }

  const existingAccount = currentAccounts.find((a) => a.uid === cleanUid);
  const nowIso = new Date().toISOString();
  const emailToSave = (params.targetEmail || existingAccount?.email || '').trim().toLowerCase();
  const displayNameToSave = (params.displayName || existingAccount?.displayName || '').trim();

  const payload: AdminRoleDoc = {
    uid: cleanUid,
    role: params.nextStatus,
    ...(emailToSave && !emailToSave.startsWith('uid:') ? { email: emailToSave } : {}),
    ...(displayNameToSave ? { displayName: displayNameToSave } : {}),
    approved_by: (currentUser.email || currentUser.uid).slice(0, 200),
    created_at: existingAccount?.created_at || nowIso,
    updated_at: nowIso,
  };

  const path = `${ADMINS_COLLECTION}/${cleanUid}`;
  try {
    await setDoc(doc(db, ADMINS_COLLECTION, cleanUid), payload, { merge: true });
    saveLocalAdminRole(payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }

  return await fetchManagedUserAccounts();
}

export async function revokeOwnInitialOwnerAccess(): Promise<void> {
  const currentUser = auth?.currentUser || null;
  const actorRole = await getMerchantRole(currentUser);
  if (!currentUser || actorRole !== 'admin') {
    throw new Error('Unauthorized: You must be signed in as an active Admin.');
  }

  const currentAccounts = await fetchManagedUserAccounts();
  const handoverCheck = canInitialOwnerHandover({
    currentUserUid: currentUser.uid,
    currentUserEmail: currentUser.email,
    accounts: currentAccounts,
    initialOwnerEmail: AUTHORIZED_MERCHANT_EMAIL,
  });

  if (!handoverCheck.isCurrentUserInitialOwner) {
    throw new Error('Only the initial verified owner account can perform the owner handover.');
  }
  if (!handoverCheck.canHandover || handoverCheck.activeOtherAdmins.length === 0) {
    throw new Error(
      handoverCheck.reason ||
        'Please approve at least one other Admin account before revoking your own website access.'
    );
  }

  if (!db) {
    throw new Error('Firestore database is not initialized.');
  }

  const replacementAdminUid = handoverCheck.activeOtherAdmins[0].uid;
  const nowIso = new Date().toISOString();
  const payload: AdminRoleDoc = {
    uid: currentUser.uid,
    role: 'revoked',
    email: AUTHORIZED_MERCHANT_EMAIL.toLowerCase(),
    ...(currentUser.displayName ? { displayName: currentUser.displayName } : {}),
    approved_by: AUTHORIZED_MERCHANT_EMAIL.toLowerCase(),
    handover_to_uid: replacementAdminUid,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const path = `${ADMINS_COLLECTION}/${currentUser.uid}`;
  try {
    await setDoc(doc(db, ADMINS_COLLECTION, currentUser.uid), payload, { merge: true });
    saveLocalAdminRole(payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }

  await signOut(auth!);
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
    if (!role) {
      callback(null, false, null);
      return;
    }
    await recordRegisteredAccount(user);
    callback(user, true, role);
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

    // Only attempt to seed Firestore if signed in as an authorized admin/merchant
    if (!auth?.currentUser || isSeeding) return [...initialProducts];
    const role = await getMerchantRole(auth.currentUser);
    if (!role) return [...initialProducts];
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
