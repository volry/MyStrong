import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { getRequestLocale } from "@/i18n/server";
import { makeT, type Locale, type T } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { ClientHome } from "@/components/client-home";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inviteClient, removeInvite } from "./actions";

type Search = { invited?: string; error?: string; done?: string; skipped?: string };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);
  const params = await searchParams;

  if (profile.role === "coach") {
    // A finished workout redirects to "/?done=1"; for the coach that belongs on /me.
    if (params.done || params.skipped) redirect(`/me?${params.done ? "done=1" : "skipped=1"}`);
    return <CoachHome t={t} locale={locale} params={params} />;
  }
  return <ClientHome locale={locale} profile={profile} flags={params} />;
}

async function CoachHome({ t, locale, params }: { t: T; locale: Locale; params: Search }) {
  const supabase = await createClient();
  const [{ data: clients }, { data: invites }, { data: workouts }, { data: reads }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .eq("role", "client")
      .order("created_at"),
    supabase
      .from("invites")
      .select("email, created_at")
      .is("accepted_at", null)
      .order("created_at"),
    supabase
      .from("workouts")
      .select("id, client_id, performed_at, client_comment")
      .order("performed_at", { ascending: false }),
    supabase.from("coach_reads").select("workout_id"),
  ]);

  const seen = new Set((reads ?? []).map((r) => r.workout_id));
  const stats = new Map<string, { last: string; unread: number }>();
  for (const w of workouts ?? []) {
    const s = stats.get(w.client_id) ?? { last: w.performed_at, unread: 0 };
    if (w.client_comment && !seen.has(w.id)) s.unread += 1;
    stats.set(w.client_id, s);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("coach.clients")}</h1>

      {clients && clients.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {clients.map((c) => {
            const s = stats.get(c.id);
            return (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.full_name ?? c.email}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {t("client.lastWorkout")}: {s ? formatDate(s.last, locale) : t("client.never")}
                    </div>
                  </div>
                  {s && s.unread > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      {t("coach.unread", { n: s.unread })}
                    </span>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground">{t("coach.noClients")}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("coach.invite")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={inviteClient} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t("login.email")}</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                required
                className="h-12 text-base"
              />
            </div>
            {params.error === "exists" && (
              <p className="text-sm text-destructive">{t("coach.inviteExists")}</p>
            )}
            {params.invited && <p className="text-sm text-primary">{t("coach.invited")}</p>}
            <Button type="submit" className="h-12 w-full text-base">
              {t("coach.inviteSend")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("coach.inviteHint")}</p>
          </form>
        </CardContent>
      </Card>

      {invites && invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t("coach.pending")}</h2>
          <ul className="divide-y rounded-xl border">
            {invites.map((i) => (
              <li key={i.email} className="flex items-center justify-between px-4 py-2">
                <span className="text-sm">{i.email}</span>
                <form action={removeInvite}>
                  <input type="hidden" name="email" value={i.email} />
                  <Button type="submit" variant="ghost" size="sm">
                    ×
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
