import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, type User } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, doc, getDoc, setDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc } from "firebase/firestore";

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

export const initFirebase = (config: Record<string, string>) => {
  if (!getApps().length) {
    app = initializeApp(config as unknown as Record<string, string>);
    auth = getAuth(app);
    db = getFirestore(app);
    // Try to enable offline persistence; ignore errors (multi-tab/server envs)
    void enableIndexedDbPersistence(db).catch(() => {
      // persistence may fail in some environments; fallback to memory-only
    });
  }
  return { app, auth, db };
};

export const getFirebaseAuth = () => auth;
export const getFirestoreDb = () => db;

export const signInWithGoogleProvider = async () => {
  if (!auth) throw new Error("Firebase auth not initialized");
  const provider = new GoogleAuthProvider();
  // request email and profile
  provider.addScope("profile");
  provider.addScope("email");
  const result = await signInWithPopup(auth, provider);
  return result.user as User;
};

export const onAuthChanged = (cb: (user: User | null) => void) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, cb);
};

export { doc, getDoc, setDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc };
