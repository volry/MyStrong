import Link from "next/link";
import { ChevronRight, PencilRuler, Play, Settings2 } from "lucide-react";
import type { Profile } from "@/lib/profile";
import { makeT, type Locale } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { getActiveProgram } from "@/lib/client-data";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** "Today" view: next workout of the active program. Used by clients at `/` and by the coach at `/me`. */
export async function ClientHome({
  locale,
  profile,
  flags,
  manageHref,
}: {
  locale: Locale;
  profile: Profile;
  flags: { done?: string; skipped?: string };
  /** Coach only: link to manage their own programs. */
  manageHref?: string;
}) {
  const t = makeT(locale);
  const supabase = await createClient();
  const [data, { data: last }] = await Promise.all([
    getActiveProgram(profile.id),
    supabase
      .from("workouts")
      .select("id, performed_at, status, program_day:program_days(week_no, day_no, title)")
      .eq("client_id", profile.id)
      .eq("status", "done")
      .order("performed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("home.hello", { name: profile.full_name ?? "" })}
      </h1>

      {flags.done && (
        <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{t("today.saved")}</p>
      )}
      {flags.skipped && (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t("today.skipped")}</p>
      )}

      {!data ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-muted-foreground">{t("home.noProgram")}</p>
            {!manageHref && (
              <>
                <Button
                  render={<Link href="/my-programs" />}
                  variant="outline"
                  className="h-12 w-full text-base"
                >
                  <PencilRuler className="size-4" />
                  {t("mine.startOwn")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("mine.subtitle")}</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : data.nextDay ? (
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">
              {t("today.next")} · {data.program.name}
            </p>
            <CardTitle className="text-xl">
              {t("prog.week", { n: data.nextDay.week_no })} · {t("prog.day", { n: data.nextDay.day_no })}
              {data.nextDay.title ? ` · ${data.nextDay.title}` : ""}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("prog.exercises", { n: data.nextDay.program_exercises[0]?.count ?? 0 })}
            </p>
          </CardHeader>
          <CardContent>
            <Button render={<Link href={`/workout/${data.nextDay.id}`} />} className="h-14 w-full text-lg">
              <Play className="size-5" fill="currentColor" />
              {t("today.start")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p>{t("today.allDone")}</p>
            <Button render={<Link href="/program" />} variant="outline" className="h-12 w-full text-base">
              {t("nav.program")}
            </Button>
          </CardContent>
        </Card>
      )}

      {data?.program.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {data.program.created_by === profile.id ? t("mine.notes") : t("today.coachNotes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{data.program.notes}</CardContent>
        </Card>
      )}

      {last && (
        <Link href={`/history/${last.id}`} className="flex items-center gap-3 rounded-xl border px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground">{t("today.lastWorkout")}</div>
            <div className="font-medium">
              {formatDate(last.performed_at, locale)}
              {last.program_day
                ? ` · ${t("prog.week", { n: last.program_day.week_no })} · ${t("prog.day", { n: last.program_day.day_no })}`
                : ""}
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      {manageHref && (
        <Button render={<Link href={manageHref} />} variant="outline" className="h-12 w-full text-base">
          <Settings2 className="size-4" />
          {t("me.manage")}
        </Button>
      )}

      {!manageHref && <p className="text-xs text-muted-foreground">{t("install.hint")}</p>}
    </div>
  );
}
