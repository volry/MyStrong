import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User as AuthUser,
} from "firebase/auth";
import { doc, getDocFromServer, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { Locale, TranslationKey } from "@/i18n/dictionaries";
import type { InviteDoc, UserDoc } from "../types";
import { now } from "../write";

/** Firebase error code -> message. */
function explain(error: unknown): TranslationKey {
  const code = (error as { code?: string })?.code ?? "";
  if (code === "auth/network-request-failed" || code === "unavailable") return "login.offline";
  if (code === "auth/email-already-in-use") return "login.exists";
  if (code === "auth/weak-password") return "login.weakPassword";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-email")
    return "login.invalid";
  return "login.error";
}

/**
 * Sign-up is by invitation: the account becomes usable once a profile exists,
 * and the rules only let a profile be created for an invited email, with the
 * invite's role. Returns false when there is no invite.
 */
export function acceptInvite(user: AuthUser, locale: Locale): Promise<boolean> {
  // Sign-up and the "finish sign-up" screen both ask; do it once per account.
  let pending = accepting.get(user.uid);
  if (!pending) {
    pending = createProfile(user, locale);
    accepting.set(user.uid, pending);
    pending.catch(() => accepting.delete(user.uid));
  }
  return pending;
}

const accepting = new Map<string, Promise<boolean>>();

async function createProfile(user: AuthUser, locale: Locale): Promise<boolean> {
  const email = user.email?.toLowerCase();
  if (!email) return false;
  let invite: InviteDoc | null = null;
  try {
    const snap = await getDocFromServer(doc(db, "invites", email));
    invite = snap.exists() ? (snap.data() as InviteDoc) : null;
  } catch {
    invite = null;
  }
  if (!invite) return false;
  const profile: UserDoc = {
    email,
    full_name: invite.full_name,
    role: invite.role,
    // A client belongs to the coach who invited them; a coach to themself.
    coach_id: invite.role === "coach" ? user.uid : invite.invited_by,
    unit: "kg",
    locale,
    rest_timer_sec: 0,
    focus: {},
    created_at: now(),
  };
  await setDoc(doc(db, "users", user.uid), profile);
  await updateDoc(doc(db, "invites", email), { accepted_at: now() });
  return true;
}

export async function signIn(email: string, password: string): Promise<TranslationKey | null> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return null;
  } catch (error) {
    return explain(error);
  }
}

export async function signUp(email: string, password: string, locale: Locale): Promise<TranslationKey | null> {
  let user: AuthUser;
  try {
    user = (await createUserWithEmailAndPassword(auth, email, password)).user;
  } catch (error) {
    return explain(error);
  }
  try {
    if (await acceptInvite(user, locale)) return null;
    // Not invited: leave no account behind.
    await deleteUser(user).catch(() => signOut(auth));
    return "login.inviteOnly";
  } catch (error) {
    return explain(error);
  }
}

export async function resetPassword(email: string, locale: Locale): Promise<TranslationKey | null> {
  try {
    auth.languageCode = locale;
    await sendPasswordResetEmail(auth, email);
    return null;
  } catch (error) {
    const code = explain(error);
    // Do not reveal whether an email has an account.
    return code === "login.invalid" ? null : code;
  }
}
