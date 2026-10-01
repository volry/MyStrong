import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { useData } from "@/data/store";
import { createMyProgram, setProgramActive } from "@/data/actions/programs";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { go } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewBadge } from "@/components/review-badge";

export default function MyProgramsPage() {
  const { me, programs: allPrograms } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const [search] = useSearchParams();
  const error = search.get("error");

  const all = useMemo(
    () =>
      allPrograms
        .filter((p) => p.client_id === me.id)
        .sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.created_at.localeCompare(a.created_at)),
    [allPrograms, me.id],
  );
  const programs = all.filter((p) => p.created_by === me.id);
  const fromCoach = all.filter((p) => p.created_by !== me.id);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div>
        <Link to="/program" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {t("nav.program")}
        </Link>
        <h1 className="text-[2rem] leading-tight font-bold">{t("mine.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("mine.subtitle")}</p>
      </div>

      {programs.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {programs.map((p) => (
            <li key={p.id}>
              <Link to={`/my-programs/${p.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    {p.is_active && <Badge>{t("client.active")}</Badge>}
                    <ReviewBadge status={p.review_status} t={t} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("mine.days", { n: p.days.length })}
                    {p.start_date ? ` · ${formatDate(p.start_date, locale)}` : ""}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("mine.new")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={(fd) => createMyProgram(me, fd)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">{t("prog.name")}</Label>
              <Input id="name" name="name" required maxLength={120} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">{t("prog.startDate")}</Label>
              <Input id="start_date" name="start_date" type="date" defaultValue={today} className="h-12 text-base" />
            </div>
            {error === "1" && <p className="text-sm text-destructive">{t("common.error")}</p>}
            <Button type="submit" className="h-12 w-full text-base">
              {t("mine.create")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {fromCoach.length > 0 && (
        <section className="space-y-2 border-t pt-5">
          <h2 className="text-sm font-medium text-muted-foreground">{t("mine.fromCoach")}</h2>
          <ul className="divide-y rounded-xl border">
            {fromCoach.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    {p.is_active && <Badge>{t("client.active")}</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">{t("mine.days", { n: p.days.length })}</div>
                </div>
                {!p.is_active && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProgramActive(me, allPrograms, p, true);
                      go("/program");
                    }}
                  >
                    {t("mine.switchTo")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("mine.switchHint")}</p>
        </section>
      )}

      <Button render={<Link to="/exercises" />} variant="outline" className="h-12 w-full text-base">
        <Dumbbell className="size-4" />
        {t("ex.title")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("mine.libraryHint")}</p>
    </div>
  );
}
