import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredFirebaseEnv = [
  ["VITE_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["VITE_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
  ["VITE_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
  ["VITE_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket],
  ["VITE_FIREBASE_MESSAGING_SENDER_ID", firebaseConfig.messagingSenderId],
  ["VITE_FIREBASE_APP_ID", firebaseConfig.appId],
];

const missingFirebaseEnv = requiredFirebaseEnv
  .filter(([, value]) => !value || value.startsWith("your_") || value.includes("your-project"))
  .map(([name]) => name);

if (missingFirebaseEnv.length > 0) {
  console.error(
    `Firebase is missing production config: ${missingFirebaseEnv.join(", ")}. ` +
      "Set these VITE_* variables in Vercel and redeploy the dashboard."
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Connect to Firebase Auth emulator only when explicitly requested.
if (import.meta.env.DEV && import.meta.env.VITE_USE_AUTH_EMULATOR === "true") {
  const authEmulatorHost = import.meta.env.VITE_AUTH_EMULATOR_HOST || 'localhost:9099';
  connectAuthEmulator(auth, `http://${authEmulatorHost}`);
}
