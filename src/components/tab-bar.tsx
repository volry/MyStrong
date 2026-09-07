"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, History, Home, Settings, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabItem = {
  href: string;
  label: string;
  icon: "home" | "users" | "settings" | "dumbbell" | "calendar" | "history" | "chart";
  /** Extra path prefixes that count as this tab being active. */
  also?: string[];
};

const ICONS = {
  home: Home,
  users: Users,
  settings: Settings,
  dumbbell: Dumbbell,
  calendar: CalendarDays,
  history: History,
  chart: TrendingUp,
};

export function TabBar({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active =
            (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ||
            (item.also?.some((p) => pathname.startsWith(p)) ?? false);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
