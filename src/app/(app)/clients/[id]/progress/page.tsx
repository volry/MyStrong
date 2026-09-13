import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireCoach } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { getProgress } from "@/lib/progress";
import { getAchievements } from "@/lib/achievements";
import { ProgressView } from "@/components/progress-view";
import { AchievementStrip } from "@/components/achievements";

export default async function ClientProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const coach = await requireCoach();
  const locale = await getRequestLocale(coach.locale);
  const t = makeT(locale);
  const { id } = await params;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", id)
    .maybeSingle();
  if (!client || (client.role !== "client" && client.id !== coach.id)) notFound();

  const [summary, achievements] = await Promise.all([
    getProgress(client.id),
    getAchievements(client.id),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/clients/${client.id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {client.full_name ?? client.email}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("progress.title")}</h1>
      </div>
      <AchievementStrip achievements={achievements} t={t} unit={coach.unit} locale={locale} />
      <ProgressView summary={summary} unit={coach.unit} locale={locale} />
    </div>
  );
}
