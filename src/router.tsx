import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { setNavigate } from "@/lib/nav";
import { AppLayout } from "@/components/app-layout";
import { RouteError } from "@/components/route-error";
import LoginPage from "@/pages/login";

/** Screens load on demand; the service worker precaches every chunk for offline use. */
const page = (load: () => Promise<{ default: React.ComponentType }>): Pick<RouteObject, "lazy"> => ({
  lazy: () => load().then((m) => ({ Component: m.default })),
});

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppLayout />,
    HydrateFallback: () => null,
    errorElement: <RouteError />,
    children: [
      { index: true, ...page(() => import("@/pages/home")) },
      { path: "me", ...page(() => import("@/pages/me")) },
      { path: "workout/:dayId", ...page(() => import("@/pages/workout")) },
      { path: "program", ...page(() => import("@/pages/program")) },
      { path: "progress", ...page(() => import("@/pages/progress")) },
      { path: "achievements", ...page(() => import("@/pages/achievements")) },
      { path: "history", ...page(() => import("@/pages/history")) },
      { path: "history/:id", ...page(() => import("@/pages/history-detail")) },
      { path: "history/:id/edit", ...page(() => import("@/pages/history-edit")) },
      { path: "my-programs", ...page(() => import("@/pages/my-programs")) },
      { path: "my-programs/:id", ...page(() => import("@/pages/my-program")) },
      { path: "my-programs/:id/days/:dayId", ...page(() => import("@/pages/my-program-day")) },
      { path: "clients/:id", ...page(() => import("@/pages/client")) },
      { path: "clients/:id/log", ...page(() => import("@/pages/client-log")) },
      { path: "clients/:id/progress", ...page(() => import("@/pages/client-progress")) },
      { path: "programs/:id", ...page(() => import("@/pages/program-editor")) },
      { path: "programs/:id/days/:dayId", ...page(() => import("@/pages/program-day")) },
      { path: "exercises", ...page(() => import("@/pages/exercises")) },
      { path: "exercises/new", ...page(() => import("@/pages/exercise-new")) },
      { path: "exercises/:id", ...page(() => import("@/pages/exercise")) },
      { path: "settings", ...page(() => import("@/pages/settings")) },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

setNavigate((to, opts) => void router.navigate(to, opts));
