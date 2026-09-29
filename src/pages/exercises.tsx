import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Plus, Search, Video } from "lucide-react";
import { useData } from "@/data/store";
import { makeT, MUSCLE_GROUPS } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/client";
import { isMuscleGroup } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MuscleBadge } from "@/components/muscle-badges";

export default function ExercisesPage() {
  const { me, exercises: library } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const group = searchParams.get("group");
  const activeGroup = isMuscleGroup(group) ? group : null;

  const exercises = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase(locale);
    return [...library.values()]
      .filter((e) => !needle || e.name.toLocaleLowerCase(locale).includes(needle))
      .filter((e) => !activeGroup || e.muscle_group === activeGroup)
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [library, q, activeGroup, locale]);

  // Keep the search text when switching group, and vice versa.
  const href = (g: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (g) params.set("group", g);
    const qs = params.toString();
    return qs ? `/exercises?${qs}` : "/exercises";
  };

  function setQuery(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("q", value);
    else params.delete("q");
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="space-y-4">
      {me.role !== "coach" && (
        <Link to="/my-programs" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {t("mine.title")}
        </Link>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-[2rem] leading-tight font-bold">{t("ex.title")}</h1>
        <Button render={<Link to="/exercises/new" />} size="sm">
          <Plus className="size-4" />
          {t("ex.add")}
        </Button>
      </div>

      <form className="relative" onSubmit={(e) => e.preventDefault()}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("ex.search")}
          className="h-11 pl-9 text-base"
        />
      </form>

      {/* Muscle group filter */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          <GroupChip href={href(null)} label={t("ex.allGroups")} active={!activeGroup} />
          {MUSCLE_GROUPS.map((g) => (
            <GroupChip key={g} href={href(g)} label={t(`muscle.${g}`)} active={activeGroup === g} />
          ))}
        </div>
      </div>

      {exercises.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {q || activeGroup ? t("ex.noMatch") : t("ex.empty")}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t("ex.count", { n: exercises.length })}</p>
          <ul className="divide-y rounded-xl border">
            {exercises.map((e) => (
              <li key={e.id}>
                <Link to={`/exercises/${e.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.name}</div>
                    <div className="mt-1">
                      <MuscleBadge group={e.muscle_group} t={t} />
                    </div>
                  </div>
                  {e.youtube_url && <Video className="size-4 text-muted-foreground" />}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function GroupChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      to={href}
      replace
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );
}
