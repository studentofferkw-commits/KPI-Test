
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "gen-lang-client-0762353481.firebaseapp.com",
  projectId: "gen-lang-client-0762353481",
  storageBucket: "gen-lang-client-0762353481.firebasestorage.app",
  messagingSenderId: "295805539111",
  appId: "1:295805539111:web:b39fde57f54d4a77448f02",
  measurementId: "G-VWVCJ4Z0HT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
