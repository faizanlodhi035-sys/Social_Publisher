import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== "your_firebase_web_api_key_here" 
    ? import.meta.env.VITE_FIREBASE_API_KEY 
    : "AIzaSyDemoFirebaseKeyForLocalDev12345",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "social-publisher-dev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "social-publisher-dev",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "social-publisher-dev.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
