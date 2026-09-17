import Link from "next/link";
import { ChevronRight, Dumbbell, Flame, Lock, Target, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Locale, T } from "@/i18n/dictionaries";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_HINT,
  achievementPercent,
  isWeightMetric,
  sortForDisplay,
  type Achievement,
  type AchievementCategory,
} from "@/lib/achievements";
import { formatDate } from "@/lib/format";
import { formatTonnage, formatWeight, type Unit } from "@/lib/units";
import { cn } from "@/lib/utils";

/** A colour and a face per family, so a badge is recognisable before it is read. */
const LOOK: Record<AchievementCategory, { icon: LucideIcon; earned: string }> = {
  consistency: { icon: Flame, earned: "bg-amber-100 text-amber-900" },
  records: { icon: Trophy, earned: "bg-violet-100 text-violet-800" },
  volume: { icon: Dumbbell, earned: "bg-blue-100 text-blue-800" },
  program: { icon: Target, earned: "bg-sky-100 text-sky-800" },
};

/** The badge's name; weight and volume badges carry their threshold. */
function achievementName(a: Achievement, t: T, unit: Unit, locale: Locale): string {
  if (a.metric === "topSet") return t(a.name, { w: formatWeight(a.target, unit), unit });
  if (isWeightMetric(a.metric)) return t(a.name, { v: formatTonnage(a.target, unit, locale) });
  return t(a.name);
}

/** Where the person stands on that measure — the same sentence, earned or not. */
function achievementHint(a: Achievement, t: T, unit: Unit, locale: Locale): string {
  const key = ACHIEVEMENT_HINT[a.metric];
  if (isWeightMetric(a.metric)) {
    const v = a.metric === "topSet" ? `${formatWeight(a.value, unit)} ${unit}` : formatTonnage(a.value, unit, locale);
    return t(key, { v });
  }
  return t(key, { n: a.value });
}

function Face({ a, size = "md" }: { a: Achievement; size?: "sm" | "md" }) {
  const { icon: Icon, earned } = LOOK[a.category];
  const box = size === "sm" ? "size-9" : "size-11";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        box,
        a.unlockedAt ? earned : "bg-muted text-muted-foreground",
      )}
    >
      {a.unlockedAt ? <Icon className="size-5" /> : <Lock className="size-4" />}
    </div>
  );
}

function Bar({ percent }: { percent: number }) {
  return (
    <div
      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function AchievementRow({
  a,
  t,
  unit,
  locale,
  highlight = false,
}: {
  a: Achievement;
  t: T;
  unit: Unit;
  locale: Locale;
  highlight?: boolean;
}) {
  const percent = achievementPercent(a);
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3",
        highlight && "border-primary bg-primary/5",
        !a.unlockedAt && "border-dashed",
      )}
    >
      <Face a={a} />
      <div className="min-w-0 flex-1">
        <div className={cn("font-medium leading-snug", !a.unlockedAt && "text-muted-foreground")}>
          {achievementName(a, t, unit, locale)}
        </div>
        {!a.unlockedAt && (
          <>
            <p className="truncate text-xs text-muted-foreground">{achievementHint(a, t, unit, locale)}</p>
            <Bar percent={percent} />
          </>
        )}
      </div>
      <div className="shrink-0 text-right text-xs text-muted-foreground">
        {a.unlockedAt ? formatDate(a.unlockedAt, locale) : `${percent}%`}
      </div>
    </div>
  );
}

/** Everything there is to earn, in families. */
export function AchievementList({
  achievements,
  t,
  unit,
  locale,
  highlight = [],
}: {
  achievements: Achievement[];
  t: T;
  unit: Unit;
  locale: Locale;
  highlight?: string[];
}) {
  return (
    <div className="space-y-5">
      {ACHIEVEMENT_CATEGORIES.map((c) => {
        const items = achievements.filter((a) => a.category === c);
        if (items.length === 0) return null;
        const earned = items.filter((a) => a.unlockedAt).length;
        return (
          <section key={c} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">{t(`ach.cat.${c}`)}</h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {earned}/{items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((a) => (
                <AchievementRow
                  key={a.id}
                  a={a}
                  t={t}
                  unit={unit}
                  locale={locale}
                  highlight={highlight.includes(a.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * The short version for the progress screen: what has been earned, and the one
 * that is closest. `href` is omitted when the coach looks at a client — there is
 * no page of someone else's badges to open.
 */
export function AchievementStrip({
  achievements,
  t,
  unit,
  locale,
  href,
}: {
  achievements: Achievement[];
  t: T;
  unit: Unit;
  locale: Locale;
  href?: string;
}) {
  const earned = sortForDisplay(achievements.filter((a) => a.unlockedAt));
  const next = sortForDisplay(achievements.filter((a) => !a.unlockedAt))[0];

  const header = (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="font-medium">{t("ach.title")}</div>
        <p className="text-xs text-muted-foreground">
          {t("ach.countOf", { n: earned.length, total: achievements.length })}
        </p>
      </div>
      {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border p-3">
      {href ? (
        <Link href={href} className="block">
          {header}
        </Link>
      ) : (
        header
      )}

      {earned.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("ach.empty")}</p>
      ) : (
        <div className="-mx-3 overflow-x-auto px-3">
          <div className="flex w-max gap-2">
            {earned.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className="flex w-24 shrink-0 flex-col items-center gap-1 text-center"
                title={achievementName(a, t, unit, locale)}
              >
                <Face a={a} size="sm" />
                <span className="line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                  {achievementName(a, t, unit, locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {next && (
        <div>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-muted-foreground">
              {t("ach.next")}: {achievementName(next, t, unit, locale)}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{achievementPercent(next)}%</span>
          </div>
          <Bar percent={achievementPercent(next)} />
        </div>
      )}
    </div>
  );
}
