import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBR-RZA2caNRQ8MOuj0VaJxhj30H7CyXwE",
  authDomain: "civicpath-85263.firebaseapp.com",
  projectId: "civicpath-85263",
  storageBucket: "civicpath-85263.firebasestorage.app",
  messagingSenderId: "1079524218284",
  appId: "1:1079524218284:web:64da8439cd2c8767979609",
  measurementId: "G-YX3KQ1DPJ9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
