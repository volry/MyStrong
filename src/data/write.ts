import { collection, doc, getDoc, getDocFromCache, type DocumentReference } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/**
 * Writes are not awaited: Firestore applies them to the on-device copy at once
 * and sends them when there is a connection, so saving works in a gym with no
 * signal. A write the server refuses is reported to the layout, which shows it.
 */
const listeners = new Set<(error: unknown) => void>();

export function onWriteError(fn: (error: unknown) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function fire(write: Promise<unknown>): void {
  write.catch((error) => {
    console.error("[write]", error);
    listeners.forEach((fn) => fn(error));
  });
}

export function newId(name: string): string {
  return doc(collection(db, name)).id;
}

export function now(): string {
  return new Date().toISOString();
}

/** The latest local copy (listeners keep the cache fresh), falling back to the server. */
export async function read<T>(ref: DocumentReference): Promise<T | null> {
  try {
    const snap = await getDocFromCache(ref);
    if (snap.exists()) return snap.data() as T;
  } catch {
    // not cached
  }
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as T) : null;
}
