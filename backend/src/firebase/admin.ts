import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;
let firestoreDb: admin.firestore.Firestore | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storageBucket: any = null;

export function initializeFirebaseAdmin(): {
  app: admin.app.App | null;
  db: admin.firestore.Firestore | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bucket: any;
  isInitialized: boolean;
} {
  if (adminApp) {
    return { app: adminApp, db: firestoreDb, bucket: storageBucket, isInitialized: true };
  }

  // Prevent re-initialization if default app already exists
  if (admin.apps.length > 0 && admin.apps[0]) {
    adminApp = admin.apps[0];
    firestoreDb = admin.firestore(adminApp);
    storageBucket = admin.storage(adminApp).bucket();
    return { app: adminApp, db: firestoreDb, bucket: storageBucket, isInitialized: true };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "social-publisher-dev";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  try {
    if (clientEmail && privateKey) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      });
      console.log(`[Firebase Admin] Initialized with service account for project: ${projectId}`);
    } else if (process.env.FIRESTORE_EMULATOR_HOST || process.env.NODE_ENV === "development") {
      // Local development or emulator mode fallback
      adminApp = admin.initializeApp({
        projectId,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      });
      console.log(`[Firebase Admin] Initialized default app for project: ${projectId}`);
    }

    if (adminApp) {
      firestoreDb = admin.firestore(adminApp);
      storageBucket = admin.storage(adminApp).bucket();
      return { app: adminApp, db: firestoreDb, bucket: storageBucket, isInitialized: true };
    }
  } catch (err) {
    console.warn("[Firebase Admin Initialization Warning]:", err instanceof Error ? err.message : err);
  }

  return { app: null, db: null, bucket: null, isInitialized: false };
}

const initialized = initializeFirebaseAdmin();
export const getFirestoreDb = () => initialized.db;
export const getStorageBucket = () => initialized.bucket;
export const getAdminAuth = () => (initialized.app ? admin.auth(initialized.app) : null);
export const isFirebaseConfigured = () =>
  initialized.isInitialized &&
  Boolean(initialized.db) &&
  Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
    (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
