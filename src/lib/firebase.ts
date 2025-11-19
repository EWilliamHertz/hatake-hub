import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration for HatakeSocial (Production)
const firebaseConfig = {
  apiKey: "AIzaSyD0tW409QaoigwAeSkkrreKIObc8QY7FAQ",
  authDomain: "hatakesocial-88b5e.firebaseapp.com",
  projectId: "hatakesocial-88b5e",
  storageBucket: "hatakesocial-88b5e.firebasestorage.app",
  messagingSenderId: "1091697032506",
  appId: "1:1091697032506:android:b25b45e3f1624254b22403"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
