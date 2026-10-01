import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { CloudOff } from "lucide-react";
import { useSession } from "@/data/store";
import { onWriteError } from "@/data/write";
import { makeT, isLocale } from "@/i18n/dictionaries";
import { rememberLocale } from "@/i18n/client";
import { setRole } from "@/lib/analytics";
import { TabBar, type TabItem } from "@/components/tab-bar";
import { SideNav } from "@/components/side-nav";
import { FinishSignUp } from "@/components/finish-sign-up";
import { cn } from "@/lib/utils";

/** Skeleton while the on-device copy opens (usually a blink). */
function Loading() {
  return (
    <div className="mx-auto w-full max-w-md animate-pulse space-y-4 px-4 pt-[max(1rem,env(safe-area-inset-top))]" aria-busy="true">
      <div className="h-8 w-40 rounded-lg bg-muted" />
      <div className="h-36 rounded-xl bg-muted" />
      <div className="h-14 rounded-xl bg-muted" />
      <div className="h-14 rounded-xl bg-muted" />
    </div>
  );
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function AppLayout() {
  const session = useSession();
  const { pathname } = useLocation();
  const online = useOnline();
  const [writeError, setWriteError] = useState(false);

  useEffect(() => onWriteError(() => setWriteError(true)), []);
  // Newer browsers return a promise from scrollTo; an effect must not return it.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const locale = session.status === "ready" && isLocale(session.data.me.locale) ? session.data.me.locale : null;
  const role = session.status === "ready" ? session.data.me.role : null;
  useEffect(() => {
    if (role) setRole(role);
  }, [role]);
  useEffect(() => {
    if (locale) rememberLocale(locale);
  }, [locale]);

  if (session.status === "loading") return <Loading />;
  if (session.status === "signed-out") return <Navigate to="/login" replace />;
  if (session.status === "no-profile") return <FinishSignUp user={session.user} />;

  const { me } = session.data;
  const t = makeT(locale ?? "en");
  const isCoach = me.role === "coach";

  const tabs: TabItem[] = isCoach
    ? [
        { href: "/", label: t("nav.clients"), icon: "users", also: ["/clients", "/programs"] },
        { href: "/exercises", label: t("nav.exercises"), icon: "dumbbell" },
        { href: "/me", label: t("nav.me"), icon: "home", also: ["/workout", "/program", "/progress", "/history", "/achievements"] },
        { href: "/settings", label: t("nav.settings"), icon: "settings" },
      ]
    : [
        { href: "/", label: t("nav.today"), icon: "home", also: ["/workout", "/achievements"] },
        { href: "/program", label: t("nav.program"), icon: "calendar", also: ["/my-programs"] },
        { href: "/progress", label: t("nav.progress"), icon: "chart" },
        { href: "/history", label: t("nav.history"), icon: "history" },
        { href: "/settings", label: t("nav.settings"), icon: "settings" },
      ];

  return (
    <div className="flex min-h-dvh flex-col md:pl-56">
      <SideNav items={tabs} userLabel={me.full_name ?? me.email} />
      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pb-10 md:pt-8",
          isCoach ? "max-w-md md:max-w-6xl" : "max-w-md md:max-w-2xl",
        )}
      >
        {!online && (
          <p className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <CloudOff className="size-4 shrink-0" />
            {t("sync.offline")}
          </p>
        )}
        {writeError && (
          <button
            type="button"
            onClick={() => setWriteError(false)}
            className="mb-3 w-full rounded-lg bg-destructive/10 px-3 py-2 text-left text-sm text-destructive"
          >
            {t("sync.error")}
          </button>
        )}
        <Outlet />
      </main>
      <TabBar items={tabs} />
    </div>
  );
}
