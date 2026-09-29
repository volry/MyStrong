import { useId } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import type { Locale, T } from "@/i18n/dictionaries";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_HINT,
  achievementPercent,
  isWeightMetric,
  sortForDisplay,
  type Achievement,
  type AchievementTier,
} from "@/lib/achievements";
import { formatDate } from "@/lib/format";
import { formatTonnage, formatWeight, kgToUnit, type Unit } from "@/lib/units";
import { cn } from "@/lib/utils";

/**
 * Plate colours by weight, lightest to heaviest: 5 kg white, 10 green, 15
 * yellow, 20 blue, 25 red, chrome for the top of a ladder. The ink is what is
 * stamped on the plate. Fixed colours: a plate is the same colour in any theme.
 */
const PLATE: Record<AchievementTier, { face: string; rim: string; ink: string }> = {
  1: { face: "#ECEBE6", rim: "#CFCDC5", ink: "#23262A" },
  2: { face: "#3E9E55", rim: "#2F7D42", ink: "#FFFFFF" },
  3: { face: "#F2C230", rim: "#CFA21C", ink: "#2A2206" },
  4: { face: "#2F6FDB", rim: "#2457B0", ink: "#FFFFFF" },
  5: { face: "#D8433B", rim: "#AF322B", ink: "#FFFFFF" },
  6: { face: "#AEB4BA", rim: "#8E959C", ink: "#1E2226" },
};

/** The badge's name; weight and volume badges carry their threshold. */
function achievementName(a: Achievement, t: T, unit: Unit, locale: Locale): string {
  if (a.metric === "topSet") return t(a.name, { w: formatWeight(a.target, unit), unit });
  if (isWeightMetric(a.metric)) return t(a.name, { v: formatTonnage(a.target, unit, locale) });
  return t(a.name, { n: a.target });
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

/** What is stamped on the plate: the threshold, and its unit when it has one. */
function plateLabel(a: Achievement, unit: Unit, locale: Locale): { value: string; unit: string | null } {
  const uk = locale === "uk";
  switch (a.metric) {
    case "topSet":
      return { value: formatWeight(a.target, unit), unit };
    case "tonnage":
    case "dayVolume":
      return unit === "kg"
        ? { value: String(a.target / 1000), unit: uk ? "т" : "t" }
        : { value: `${Math.round(kgToUnit(a.target, unit) / 1000)}k`, unit: "lb" };
    case "streak":
    case "programWeeks":
      return { value: String(a.target), unit: uk ? "тиж" : "wk" };
    default:
      return { value: String(a.target), unit: null };
  }
}

/**
 * A badge as a weight plate. Earned: the plate in its colour. Locked: bare
 * rubber, with the plate's colour running round the rim as far as the person
 * has got.
 */
export function Plate({
  a,
  unit,
  locale,
  size = 72,
  className,
}: {
  a: Achievement;
  unit: Unit;
  locale: Locale;
  size?: number;
  className?: string;
}) {
  const gradient = useId();
  const earned = Boolean(a.unlockedAt);
  const look = PLATE[a.tier];
  const stamped = plateLabel(a, unit, locale);
  // Too small to read a unit: the number alone.
  const label = size < 56 ? { ...stamped, unit: null } : stamped;
  const percent = achievementPercent(a);
  const ring = 2 * Math.PI * 46;
  const long = label.value.length > 3;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${gradient}chrome`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4F6F7" />
          <stop offset="0.45" stopColor="#AEB4BA" />
          <stop offset="0.55" stopColor="#D9DDE0" />
          <stop offset="1" stopColor="#7E858C" />
        </linearGradient>
      </defs>

      {earned ? (
        <>
          <circle cx="50" cy="50" r="49" fill={look.rim} />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill={a.tier === 6 ? `url(#${gradient}chrome)` : look.face}
          />
          {/* The raised lip where the plate grips the bar. */}
          <circle cx="50" cy="50" r="34" fill="none" stroke={look.rim} strokeWidth="1.5" opacity="0.7" />
        </>
      ) : (
        <>
          <circle cx="50" cy="50" r="49" className="fill-muted" />
          <circle cx="50" cy="50" r="34" fill="none" className="stroke-border" strokeWidth="1.5" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={a.tier === 6 ? "#AEB4BA" : look.face}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${(ring * percent) / 100} ${ring}`}
            transform="rotate(-90 50 50)"
          />
        </>
      )}

      <text
        x="50"
        y={label.unit ? 51 : 57}
        textAnchor="middle"
        className={cn("font-display", !earned && "fill-muted-foreground")}
        fill={earned ? look.ink : undefined}
        fontWeight="700"
        fontSize={long ? 24 : 32}
      >
        {label.value}
      </text>
      {label.unit && (
        <text
          x="50"
          y="68"
          textAnchor="middle"
          className={cn("font-display", !earned && "fill-muted-foreground")}
          fill={earned ? look.ink : undefined}
          fontWeight="500"
          fontSize="13"
          opacity="0.85"
        >
          {label.unit}
        </text>
      )}
    </svg>
  );
}

/** A freshly earned badge: the plate slides onto the bar once. */
export function AchievementRow({
  a,
  t,
  unit,
  locale,
}: {
  a: Achievement;
  t: T;
  unit: Unit;
  locale: Locale;
}) {
  return (
    <div className="flex items-center gap-4">
      <Plate a={a} unit={unit} locale={locale} size={84} className="animate-plate-on" />
      <div className="min-w-0">
        <div className="font-display text-xl leading-tight font-bold">{achievementName(a, t, unit, locale)}</div>
        <p className="text-sm text-muted-foreground">{achievementHint(a, t, unit, locale)}</p>
      </div>
    </div>
  );
}

/** Everything there is to earn: each family is a bar, loaded with plates in order. */
export function AchievementList({
  achievements,
  t,
  unit,
  locale,
}: {
  achievements: Achievement[];
  t: T;
  unit: Unit;
  locale: Locale;
}) {
  return (
    <div className="space-y-7">
      {ACHIEVEMENT_CATEGORIES.map((c) => {
        const items = achievements.filter((a) => a.category === c);
        if (items.length === 0) return null;
        const earned = items.filter((a) => a.unlockedAt).length;
        return (
          <section key={c} className="space-y-3">
            <div className="flex items-baseline justify-between border-b pb-1.5">
              <h2 className="text-xl font-bold">{t(`ach.cat.${c}`)}</h2>
              <span className="font-display text-sm tabular-nums text-muted-foreground">
                {earned}/{items.length}
              </span>
            </div>
            <ul className="grid grid-cols-3 gap-x-3 gap-y-5">
              {items.map((a) => (
                <li key={a.id} className="flex flex-col items-center text-center">
                  <Plate a={a} unit={unit} locale={locale} />
                  <span
                    className={cn(
                      "mt-2 text-xs leading-tight font-medium",
                      !a.unlockedAt && "text-muted-foreground",
                    )}
                  >
                    {achievementName(a, t, unit, locale)}
                  </span>
                  <span className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                    {a.unlockedAt ? formatDate(a.unlockedAt, locale) : `${achievementPercent(a)}%`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * The short version for the progress screen: the plates earned so far, and the
 * one that is closest. `href` is omitted when the coach looks at a client —
 * there is no page of someone else's badges to open.
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
        <div className="font-display text-lg font-bold">{t("ach.title")}</div>
        <p className="text-xs text-muted-foreground">
          {t("ach.countOf", { n: earned.length, total: achievements.length })}
        </p>
      </div>
      {href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      {href ? (
        <Link to={href} className="block">
          {header}
        </Link>
      ) : (
        header
      )}

      {earned.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("ach.empty")}</p>
      ) : (
        <div className="-mx-3 overflow-x-auto px-3">
          <div className="flex w-max gap-1.5">
            {earned.slice(0, 12).map((a) => (
              <span key={a.id} title={achievementName(a, t, unit, locale)}>
                <Plate a={a} unit={unit} locale={locale} size={48} />
              </span>
            ))}
          </div>
        </div>
      )}

      {next && (
        <div className="flex items-center gap-3 border-t pt-3">
          <Plate a={next} unit={unit} locale={locale} size={44} />
          <div className="min-w-0 text-xs">
            <div className="text-muted-foreground">{t("ach.next")}</div>
            <div className="truncate font-medium">{achievementName(next, t, unit, locale)}</div>
            <div className="truncate text-muted-foreground">{achievementHint(next, t, unit, locale)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
