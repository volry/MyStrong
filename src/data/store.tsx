import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User as AuthUser } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { Exercise, Invite, Program, User, UserDoc, Workout } from "./types";

/**
 * The whole app reads from one in-memory copy of what the signed-in person may
 * see: their profile, the exercise library, programs and workouts (a coach sees
 * everyone's). It is a few hundred small documents, served from the on-device
 * cache first, so every screen renders at once and works offline; screens
 * derive what they need with the pure functions in `selectors.ts`.
 */

export type Data = {
  me: User;
  /** Coach: every profile. Client: only their own. */
  users: Map<string, User>;
  invites: Invite[];
  exercises: Map<string, Exercise>;
  programs: Program[];
  /** Newest first. */
  workouts: Workout[];
  exportToken: string | null;
  /** False while any collection is only from the device cache or has unsent writes. */
  synced: boolean;
};

export type Session =
  | { status: "loading" }
  | { status: "signed-out" }
  /** Signed in to Firebase, but no profile yet: sign-up is finished by accepting the invite. */
  | { status: "no-profile"; user: AuthUser }
  | { status: "ready"; user: AuthUser; data: Data };

const SessionContext = createContext<Session>({ status: "loading" });

type Coll<T> = { items: T[]; cached: boolean; pending: boolean } | null;

function listen<T>(
  q: Query<DocumentData>,
  map: (id: string, data: DocumentData) => T,
  set: (value: Coll<T>) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap: QuerySnapshot<DocumentData>) =>
      set({
        items: snap.docs.map((d) => map(d.id, d.data())),
        cached: snap.metadata.fromCache,
        pending: snap.metadata.hasPendingWrites,
      }),
    onError,
  );
}

const withId = <T,>(id: string, data: DocumentData) => ({ ...(data as T), id });

export function DataProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(undefined);
  const [profile, setProfile] = useState<{ uid: string; doc: User | null; cached: boolean } | null>(null);

  const [users, setUsers] = useState<Coll<User>>(null);
  const [invites, setInvites] = useState<Coll<Invite>>(null);
  const [exercises, setExercises] = useState<Coll<Exercise>>(null);
  const [programs, setPrograms] = useState<Coll<Program>>(null);
  const [workouts, setWorkouts] = useState<Coll<Workout>>(null);
  const [tokens, setTokens] = useState<Coll<string>>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setAuthUser(u)), []);

  // Profile first: the role decides what else to listen to.
  const uid = authUser?.uid;
  const [profileAttempt, setProfileAttempt] = useState(0);
  useEffect(() => {
    if (!uid) return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const stop = onSnapshot(
      doc(db, "users", uid),
      { includeMetadataChanges: true },
      (snap) =>
        setProfile({
          uid,
          doc: snap.exists() ? withId<UserDoc>(snap.id, snap.data()) : null,
          cached: snap.metadata.fromCache,
        }),
      // Right after an account is created the read can be refused before the
      // new token reaches Firestore. A failed listener stays dead, so listen again.
      (e) => {
        console.warn("[profile]", e.code);
        setProfile({ uid, doc: null, cached: false });
        retry = setTimeout(() => setProfileAttempt((n) => n + 1), 1500);
      },
    );
    return () => {
      stop();
      clearTimeout(retry);
    };
  }, [uid, profileAttempt]);

  const role = profile?.uid === uid ? profile?.doc?.role : undefined;
  useEffect(() => {
    if (!uid || !role) return;
    const coach = role === "coach";
    const fail = (e: Error) => console.error("[data]", e);
    const own = <T,>(name: string) =>
      coach ? collection(db, name) : query(collection(db, name), where("client_id", "==", uid)) as Query<T>;
    const stops = [
      listen(collection(db, "exercises"), withId<Exercise>, setExercises, fail),
      listen(own("programs"), withId<Program>, setPrograms, fail),
      listen(own("workouts"), withId<Workout>, setWorkouts, fail),
      listen(query(collection(db, "exportTokens"), where("user_id", "==", uid)), (id) => id, setTokens, fail),
    ];
    if (coach) {
      stops.push(listen(collection(db, "users"), withId<User>, setUsers, fail));
      stops.push(listen(collection(db, "invites"), (_id, d) => d as Invite, setInvites, fail));
    }
    return () => {
      stops.forEach((stop) => stop());
      setUsers(null);
      setInvites(null);
      setExercises(null);
      setPrograms(null);
      setWorkouts(null);
      setTokens(null);
    };
  }, [uid, role]);

  const session = useMemo<Session>(() => {
    if (authUser === undefined) return { status: "loading" };
    if (authUser === null) return { status: "signed-out" };
    if (!profile || profile.uid !== authUser.uid) return { status: "loading" };
    const me = profile.doc;
    if (!me) return { status: "no-profile", user: authUser };

    const coach = me.role === "coach";
    const colls = [exercises, programs, workouts, tokens, ...(coach ? [users, invites] : [])];
    if (colls.some((c) => c == null)) return { status: "loading" };

    const data: Data = {
      me,
      users: new Map((coach ? users!.items : [me]).map((u) => [u.id, u.id === me.id ? me : u])),
      invites: invites?.items ?? [],
      exercises: new Map(exercises!.items.map((e) => [e.id, e])),
      programs: programs!.items,
      workouts: [...workouts!.items].sort((a, b) => b.performed_at.localeCompare(a.performed_at)),
      exportToken: tokens!.items[0] ?? null,
      synced: !profile.cached && colls.every((c) => !c!.cached && !c!.pending),
    };
    return { status: "ready", user: authUser, data };
  }, [authUser, profile, users, invites, exercises, programs, workouts, tokens]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  return useContext(SessionContext);
}

/** For screens inside the signed-in layout, which renders only once data is ready. */
export function useData(): Data {
  const session = useContext(SessionContext);
  if (session.status !== "ready") throw new Error("useData outside the signed-in layout");
  return session.data;
}
