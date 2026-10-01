import { Link, Navigate, useSearchParams } from "react-router";
import { ChevronRight } from "lucide-react";
import { useData } from "@/data/store";
import { useLocale } from "@/i18n/client";
import { makeT, type Locale, type T } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { go } from "@/lib/nav";
import { inviteClient, removeInvite } from "@/data/actions/account";
import { ClientHome } from "@/components/client-home";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Search = { invited: string | null; error: string | null; done: string | null; skipped: string | null };

export default function HomePage() {
  const { me } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const [search] = useSearchParams();
  const params: Search = {
    invited: search.get("invited"),
    error: search.get("error"),
    done: search.get("done"),
    skipped: search.get("skipped"),
  };

  if (me.role === "coach") {
    // A finished workout lands on "/?done=1"; for the coach that belongs on /me.
    if (params.done || params.skipped) return <Navigate to={`/me?${params.done ? "done=1" : "skipped=1"}`} replace />;
    return <CoachHome t={t} locale={locale} params={params} />;
  }
  return <ClientHome locale={locale} profile={me} flags={params} />;
}

function CoachHome({ t, locale, params }: { t: T; locale: Locale; params: Search }) {
  const { me, users, invites: allInvites, workouts, programs } = useData();
  const clients = [...users.values()]
    .filter((u) => u.role === "client")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const invites = allInvites
    .filter((i) => i.accepted_at == null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  // Programs clients wrote themselves and sent over for approval.
  const toReview = programs
    .filter((p) => p.review_status === "pending")
    .sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""));

  // Workouts arrive newest first.
  const stats = new Map<string, { last: string; unread: number }>();
  for (const w of workouts) {
    const s = stats.get(w.client_id) ?? { last: w.performed_at, unread: 0 };
    if (w.client_comment && !w.coach_seen_at) s.unread += 1;
    stats.set(w.client_id, s);
  }

  function invite(fd: FormData) {
    // An existing invite or account: say so rather than overwrite the invite.
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    if (allInvites.some((i) => i.email === email) || [...users.values()].some((u) => u.email === email)) {
      go("/?error=exists", { replace: true });
      return;
    }
    inviteClient(me, fd);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[2rem] leading-tight font-bold">{t("coach.clients")}</h1>

      <div className="space-y-6 md:grid md:grid-cols-[1fr_360px] md:items-start md:gap-8 md:space-y-0">
      <div className="space-y-6">
      {toReview.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t("coach.toReview")}</h2>
          <ul className="divide-y rounded-xl border border-primary/40">
            {toReview.map((p) => {
              const client = users.get(p.client_id);
              return (
                <li key={p.id}>
                  <Link to={`/programs/${p.id}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="truncate text-sm text-muted-foreground">
                        {t("coach.reviewFrom", { name: client?.full_name ?? client?.email ?? "" })}
                        {p.submitted_at ? ` · ${formatDate(p.submitted_at, locale)}` : ""}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {clients.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {clients.map((c) => {
            const s = stats.get(c.id);
            return (
              <li key={c.id}>
                <Link to={`/clients/${c.id}`} className="flex items-center gap-3 px-4 py-3">
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
      </div>

      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("coach.invite")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={invite} className="space-y-3">
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

      {invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t("coach.pending")}</h2>
          <ul className="divide-y rounded-xl border">
            {invites.map((i) => (
              <li key={i.email} className="flex items-center justify-between px-4 py-2">
                <span className="text-sm">{i.email}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeInvite(i.email)}>
                  ×
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      </div>
      </div>
    </div>
  );
}
