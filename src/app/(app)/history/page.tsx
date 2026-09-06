import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessageSquare } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export default async function HistoryPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);

  const supabase = await createClient();
  const { data: workouts } = await supabase
    .from("workouts")
    .select(
      "id, performed_at, status, client_comment, program_day:program_days(week_no, day_no, title, program:programs(name)), set_logs(count)",
    )
    .eq("client_id", profile.id)
    .order("performed_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("history.title")}</h1>

      {!workouts || workouts.length === 0 ? (
        <p className="text-muted-foreground">{t("history.empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {workouts.map((w) => (
            <li key={w.id}>
              <Link href={`/history/${w.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatDate(w.performed_at, locale)}</span>
                    {w.status === "skipped" && <Badge variant="secondary">{t("history.skipped")}</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {w.program_day
                      ? `${t("prog.week", { n: w.program_day.week_no })} · ${t("prog.day", { n: w.program_day.day_no })}${w.program_day.title ? ` · ${w.program_day.title}` : ""}`
                      : ""}
                    {w.status === "done" && ` · ${t("history.sets", { n: w.set_logs[0]?.count ?? 0 })}`}
                  </div>
                  {w.client_comment && (
                    <div className="mt-1 flex items-start gap-1 text-sm">
                      <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-1">{w.client_comment}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
