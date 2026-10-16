/**
 * Indian Ishq Collection - Firebase v10 Client & Firestore Services
 * Import via ES Modules from gstatic:
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// 1. Fetch live products from Firestore 'products' collection
export async function getLiveFirestoreProducts(category = 'All') {
  const productsRef = collection(db, "products");
  let q = query(productsRef, orderBy("created_at", "desc"));

  if (category && category !== 'All') {
    q = query(productsRef, where("category", "==", category));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 2. Insert new order into Firestore 'orders' collection
export async function createFirestoreOrder({ customer_details, items, payment_method, upi_ref_id, total }) {
  const orderId = 'IIC-' + Math.floor(100000 + Math.random() * 900000);
  const orderDocRef = doc(db, "orders", orderId);

  const orderData = {
    id: orderId,
    customer_details,
    items,
    payment_method,
    upi_ref_id: upi_ref_id || null,
    status: 'Confirmed',
    total: Number(total),
    created_at: new Date().toISOString()
  };

  await setDoc(orderDocRef, orderData);
  return orderData;
}

// 3. Direct Image Upload to Firebase Storage
export async function uploadImageToFirebase(file) {
  if (!file) throw new Error("No file selected");
  const storageRef = ref(storage, `product-images/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}
