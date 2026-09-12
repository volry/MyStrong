import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { requireCoach } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { getActiveProgram } from "@/lib/client-data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MuscleBadges } from "@/components/muscle-badges";

/** Coach picks any day of the client's active program to log on their behalf. */
export default async function ClientLogPage({ params }: { params: Promise<{ id: string }> }) {
  const coach = await requireCoach();
  const locale = await getRequestLocale(coach.locale);
  const t = makeT(locale);
  const { id } = await params;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", id)
    .eq("role", "client")
    .maybeSingle();
  if (!client) notFound();
  const clientName = client.full_name ?? client.email;

  const data = await getActiveProgram(client.id);

  const weeks = new Map<number, NonNullable<typeof data>["days"]>();
  for (const d of data?.days ?? []) {
    const list = weeks.get(d.week_no) ?? [];
    list.push(d);
    weeks.set(d.week_no, list);
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/clients/${client.id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {clientName}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("coach.logFor", { name: clientName })}</h1>
        {data && <p className="text-muted-foreground">{data.program.name}</p>}
      </div>

      {!data ? (
        <p className="text-muted-foreground">{t("coach.logNoProgram")}</p>
      ) : (
        [...weeks.entries()].map(([weekNo, days]) => (
          <section key={weekNo} className="space-y-2">
            <h2 className="font-medium">{t("prog.week", { n: weekNo })}</h2>
            <ul className="divide-y rounded-xl border">
              {days.map((d) => {
                const doneAt = data.doneMap.get(d.id);
                const isNext = data.nextDay?.id === d.id;
                return (
                  <li key={d.id}>
                    <Link
                      href={`/workout/${d.id}?for=${client.id}`}
                      className={cn("flex items-center gap-3 px-4 py-3", isNext && "bg-primary/5")}
                    >
                      {doneAt ? (
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
        ))
      )}
    </div>
  );
}
