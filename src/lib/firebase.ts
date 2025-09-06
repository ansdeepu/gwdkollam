
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
// To use Analytics: import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// These environment variables need to be set in your .env file.
// You can find these values in your Firebase project settings.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
// We check if apps are already initialized to prevent errors during hot reloading in development.
let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// Initialize Firestore with long polling to avoid gRPC issues in some bundler environments.
const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true, // This can help with some data sanitization issues
});

const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);

// Example for Firebase Analytics (optional):
// let analytics: Analytics | undefined;
// if (typeof window !== 'undefined') { // Ensure it runs only on the client
//   isSupported().then(yes => { // Check if Firebase Analytics is supported in the current environment
//     if (yes) {
//       analytics = getAnalytics(app);
//     }
//   });
// }

export { app, auth, db, storage /*, analytics */ };
