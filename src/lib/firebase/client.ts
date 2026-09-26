import { initializeApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, initializeAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// The web config is public by design; access is decided by Security Rules.
const config = {
  apiKey: "AIzaSyAuyd5aimdTlhi5h23uX8ORlTZVsdPekHs",
  authDomain: "mystrong-vvr-2026.firebaseapp.com",
  projectId: "mystrong-vvr-2026",
  appId: "1:1087417621958:web:b31cff672f2173f006a6c7",
};

const emulators = import.meta.env.VITE_FIREBASE_EMULATORS === "true";

export const app = initializeApp(emulators ? { ...config, projectId: "demo-mystrong" } : config);

// No popup/redirect resolver: email + password only, which keeps the bundle small.
export const auth = initializeAuth(app, { persistence: browserLocalPersistence });

// Everything the person has seen stays on the phone, so the app opens and logs
// workouts without a connection; writes are queued and sent when it returns.
export const db = initializeFirestore(
  app,
  { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
  "default",
);

if (emulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
