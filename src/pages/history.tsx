import { Link } from "react-router";
import { ChevronRight, MessageSquare } from "lucide-react";
import { useData } from "@/data/store";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export default function HistoryPage() {
  const { me: profile, workouts: all } = useData();
  const locale = useLocale();
  const t = makeT(locale);

  // Newest first.
  const workouts = all.filter((w) => w.client_id === profile.id).slice(0, 200);

  return (
    <div className="space-y-4">
      <h1 className="text-[2rem] leading-tight font-bold">{t("history.title")}</h1>

      {workouts.length === 0 ? (
        <p className="text-muted-foreground">{t("history.empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {workouts.map((w) => (
            <li key={w.id}>
              <Link to={`/history/${w.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatDate(w.performed_at, locale)}</span>
                    {w.status === "skipped" && <Badge variant="secondary">{t("history.skipped")}</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {w.day
                      ? `${t("prog.week", { n: w.day.week_no })} · ${t("prog.day", { n: w.day.day_no })}${w.day.title ? ` · ${w.day.title}` : ""}`
                      : ""}
                    {w.status === "done" && ` · ${t("history.sets", { n: w.sets.length })}`}
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
