import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { TabBar, type TabItem } from "@/components/tab-bar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);

  const tabs: TabItem[] =
    profile.role === "coach"
      ? [
          { href: "/", label: t("nav.clients"), icon: "users", also: ["/clients", "/programs"] },
          { href: "/exercises", label: t("nav.exercises"), icon: "dumbbell" },
          { href: "/me", label: t("nav.me"), icon: "home", also: ["/workout", "/program", "/progress", "/history"] },
          { href: "/settings", label: t("nav.settings"), icon: "settings" },
        ]
      : [
          { href: "/", label: t("nav.today"), icon: "home", also: ["/workout"] },
          { href: "/program", label: t("nav.program"), icon: "calendar" },
          { href: "/progress", label: t("nav.progress"), icon: "chart" },
          { href: "/history", label: t("nav.history"), icon: "history" },
          { href: "/settings", label: t("nav.settings"), icon: "settings" },
        ];

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))]">
        {children}
      </main>
      <TabBar items={tabs} />
    </div>
  );
}
