import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Search, Video } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT, MUSCLE_GROUPS } from "@/i18n/dictionaries";
import { isMuscleGroup, muscleLabel } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const t = makeT(await getRequestLocale(profile.locale));
  const { q, group } = await searchParams;
  const activeGroup = isMuscleGroup(group) ? group : null;

  const supabase = await createClient();
  let query = supabase
    .from("exercises")
    .select("id, name, muscle_group, youtube_url")
    .order("name");
  if (q) query = query.ilike("name", `%${q}%`);
  if (activeGroup) query = query.eq("muscle_group", activeGroup);
  const { data: exercises } = await query;

  // Keep the search text when switching group, and vice versa.
  const href = (g: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (g) params.set("group", g);
    const qs = params.toString();
    return qs ? `/exercises?${qs}` : "/exercises";
  };

  return (
    <div className="space-y-4">
      {profile.role !== "coach" && (
        <Link href="/my-programs" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {t("mine.title")}
        </Link>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("ex.title")}</h1>
        <Button render={<Link href="/exercises/new" />} size="sm">
          <Plus className="size-4" />
          {t("ex.add")}
        </Button>
      </div>

      <form method="get" className="relative">
        {activeGroup && <input type="hidden" name="group" value={activeGroup} />}
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={q ?? ""}
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

      {!exercises || exercises.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {q || activeGroup ? t("ex.noMatch") : t("ex.empty")}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t("ex.count", { n: exercises.length })}</p>
          <ul className="divide-y rounded-xl border">
            {exercises.map((e) => (
              <li key={e.id}>
                <Link href={`/exercises/${e.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{e.name}</div>
                    {muscleLabel(t, e.muscle_group) && (
                      <Badge variant="secondary" className="mt-1">
                        {muscleLabel(t, e.muscle_group)}
                      </Badge>
                    )}
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
      href={href}
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
