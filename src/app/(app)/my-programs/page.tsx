import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewBadge } from "@/components/review-badge";
import { createMyProgram, useCoachProgram } from "./actions";

export default async function MyProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: all } = await supabase
    .from("programs")
    .select("id, name, start_date, is_active, review_status, created_by, program_days(count)")
    .eq("client_id", profile.id)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  const programs = (all ?? []).filter((p) => p.created_by === profile.id);
  const fromCoach = (all ?? []).filter((p) => p.created_by !== profile.id);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/program" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {t("nav.program")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("mine.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("mine.subtitle")}</p>
      </div>

      {programs.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {programs.map((p) => (
            <li key={p.id}>
              <Link href={`/my-programs/${p.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    {p.is_active && <Badge>{t("client.active")}</Badge>}
                    <ReviewBadge status={p.review_status} t={t} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("mine.days", { n: p.program_days[0]?.count ?? 0 })}
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
          <form action={createMyProgram} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">{t("prog.name")}</Label>
              <Input id="name" name="name" required maxLength={120} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">{t("prog.startDate")}</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={today}
                className="h-12 text-base"
              />
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
                  <div className="text-sm text-muted-foreground">
                    {t("mine.days", { n: p.program_days[0]?.count ?? 0 })}
                  </div>
                </div>
                {!p.is_active && (
                  <form action={useCoachProgram}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value="1" />
                    <Button type="submit" variant="outline" size="sm">
                      {t("mine.switchTo")}
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("mine.switchHint")}</p>
        </section>
      )}

      <Button render={<Link href="/exercises" />} variant="outline" className="h-12 w-full text-base">
        <Dumbbell className="size-4" />
        {t("ex.title")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("mine.libraryHint")}</p>
    </div>
  );
}
