import Link from "next/link";
import { ChevronRight, Plus, Search, Video } from "lucide-react";
import { requireCoach } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT, MUSCLE_GROUPS, type MuscleGroup } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const coach = await requireCoach();
  const t = makeT(await getRequestLocale(coach.locale));
  const { q } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("exercises")
    .select("id, name, muscle_group, youtube_url")
    .order("name");
  if (q) query = query.ilike("name", `%${q}%`);
  const { data: exercises } = await query;

  const muscleLabel = (g: string | null) =>
    g && (MUSCLE_GROUPS as readonly string[]).includes(g) ? t(`muscle.${g as MuscleGroup}`) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("ex.title")}</h1>
        <Button render={<Link href="/exercises/new" />} size="sm">
          <Plus className="size-4" />
          {t("ex.add")}
        </Button>
      </div>

      <form method="get" className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder={t("ex.search")}
          className="h-11 pl-9 text-base"
        />
      </form>

      {!exercises || exercises.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {q ? t("ex.noMatch") : t("ex.empty")}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {exercises.map((e) => (
            <li key={e.id}>
              <Link href={`/exercises/${e.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.name}</div>
                  {muscleLabel(e.muscle_group) && (
                    <Badge variant="secondary" className="mt-1">
                      {muscleLabel(e.muscle_group)}
                    </Badge>
                  )}
                </div>
                {e.youtube_url && <Video className="size-4 text-muted-foreground" />}
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
