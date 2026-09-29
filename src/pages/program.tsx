import { useMemo } from "react";
import { Link } from "react-router";
import { Check, ChevronRight, Circle, PencilRuler } from "lucide-react";
import { useData } from "@/data/store";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { getActiveProgram } from "@/lib/client-data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ReviewBadge } from "@/components/review-badge";
import { MuscleBadges } from "@/components/muscle-badges";

export default function ProgramPage() {
  const { me: profile, programs, workouts, exercises } = useData();
  const locale = useLocale();
  const t = makeT(locale);

  const data = useMemo(
    () => getActiveProgram(profile.id, programs, workouts, exercises),
    [profile.id, programs, workouts, exercises],
  );

  const ownProgramsLink = (
    <div className="space-y-2 border-t pt-5">
      <Button render={<Link to="/my-programs" />} variant="outline" className="h-12 w-full text-base">
        <PencilRuler className="size-4" />
        {t("mine.title")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("mine.subtitle")}</p>
    </div>
  );

  if (!data) {
    return (
      <div className="space-y-5">
        <h1 className="text-[2rem] leading-tight font-bold">{t("program.title")}</h1>
        <p className="text-muted-foreground">{t("program.none")}</p>
        {ownProgramsLink}
      </div>
    );
  }

  const weeks = new Map<number, typeof data.days>();
  for (const d of data.days) {
    const list = weeks.get(d.week_no) ?? [];
    list.push(d);
    weeks.set(d.week_no, list);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[2rem] leading-tight font-bold">{data.program.name}</h1>
          {data.program.created_by === profile.id && (
            <ReviewBadge status={data.program.review_status} t={t} />
          )}
        </div>
        {data.program.start_date && (
          <p className="text-sm text-muted-foreground">
            {t("program.starts", { date: formatDate(data.program.start_date, locale) })}
          </p>
        )}
      </div>

      {[...weeks.entries()].map(([weekNo, days]) => (
        <section key={weekNo} className="space-y-2">
          <h2 className="font-medium">{t("prog.week", { n: weekNo })}</h2>
          <ul className="divide-y rounded-xl border">
            {days.map((d) => {
              const doneAt = data.doneMap.get(d.id);
              const isNext = data.nextDay?.id === d.id;
              return (
                <li key={d.id}>
                  <Link
                    to={`/workout/${d.id}`}
                    className={cn("flex items-center gap-3 px-4 py-3", isNext && "bg-primary/5")}
                  >
                    {doneAt ? (
                      <span className="flex size-7 items-center justify-center rounded-full bg-plate-green text-white">
                        <Check className="size-4" strokeWidth={3} />
                      </span>
                    ) : (
                      <Circle className={cn("size-7", isNext ? "text-primary" : "text-muted-foreground/40")} />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-medium">
                        {t("prog.day", { n: d.day_no })}
                        {d.title ? ` · ${d.title}` : ""}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {doneAt
                          ? t("program.doneOn", { date: formatDate(doneAt, locale) })
                          : t("prog.exercises", { n: d.exercises })}
                      </div>
                      <MuscleBadges groups={d.muscles} t={t} max={3} />
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {ownProgramsLink}
    </div>
  );
}
