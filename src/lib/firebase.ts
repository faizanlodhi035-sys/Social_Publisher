import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBrfFnYqvm_3DHLtInQOxWECxcYaPWo7sA",
  authDomain: "social-publisher027.firebaseapp.com",
  projectId: "social-publisher027",
  storageBucket: "social-publisher027.firebasestorage.app",
  messagingSenderId: "947911018686",
  appId: "1:947911018686:web:fbcd89cd81ce116b28f6ef",
  measurementId: "G-DPD6WQKY1X"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
