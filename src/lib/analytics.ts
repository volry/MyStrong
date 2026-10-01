/**
 * Google Analytics 4 through Firebase Analytics. Loaded after the first screen
 * and never in development or against the emulators. Nothing personal goes in:
 * pages are reported by their route pattern (`/clients/:id`, not an id), the
 * person only by role, and events only by counts.
 */
import type { Analytics } from "firebase/analytics";
import type { createBrowserRouter } from "react-router";
import { app } from "@/lib/firebase/client";

type Params = Record<string, string | number>;

const enabled = import.meta.env.PROD && import.meta.env.VITE_FIREBASE_EMULATORS !== "true";

let ready: Promise<{ analytics: Analytics; log: typeof import("firebase/analytics") } | null> | null = null;

function load() {
  ready ??= import("firebase/analytics")
    .then(async (mod) => {
      if (!(await mod.isSupported())) return null;
      // Page views are sent below with the route pattern instead of the real URL.
      const analytics = mod.initializeAnalytics(app, { config: { send_page_view: false } });
      return { analytics, log: mod };
    })
    .catch(() => null);
  return ready;
}

/** Record an event. Fire and forget; silently nothing when analytics is off or blocked. */
export function track(name: string, params?: Params) {
  if (!enabled) return;
  void load().then((a) => a?.log.logEvent(a.analytics, name, params));
}

/** Whether the person is a coach or a client, for splitting every report. */
export function setRole(role: "coach" | "client") {
  if (!enabled) return;
  void load().then((a) => a?.log.setUserProperties(a.analytics, { role }));
}

type RouterLike = Pick<ReturnType<typeof createBrowserRouter>, "subscribe" | "state">;

/** One page_view per screen, named by its route pattern. */
export function trackPages(router: RouterLike) {
  if (!enabled) return;
  let last = "";
  const report = () => {
    const { matches, navigation } = router.state;
    if (navigation.state !== "idle") return;
    const pattern = `/${matches
      .map((m) => m.route.path ?? "")
      .filter(Boolean)
      .join("/")}`.replace(/\/+/g, "/");
    if (pattern === last) return;
    last = pattern;
    track("page_view", {
      page_title: pattern,
      page_location: `${location.origin}${pattern}`,
      page_path: pattern,
    });
  };
  // Wait for the first screen before loading anything.
  setTimeout(report, 1500);
  router.subscribe(report);
}
