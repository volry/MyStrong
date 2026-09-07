"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, History, Home, Settings, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabItem } from "@/components/tab-bar";

const ICONS = {
  home: Home,
  users: Users,
  settings: Settings,
  dumbbell: Dumbbell,
  calendar: CalendarDays,
  history: History,
  chart: TrendingUp,
};

/** Desktop navigation (md and up). Same items as the mobile tab bar. */
export function SideNav({ items, userLabel }: { items: TabItem[]; userLabel: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r bg-card md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Dumbbell className="size-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">myStrong</span>
      </div>
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active =
              (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ||
              (item.also?.some((p) => pathname.startsWith(p)) ?? false);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="truncate border-t px-5 py-4 text-xs text-muted-foreground">{userLabel}</div>
    </aside>
  );
}
