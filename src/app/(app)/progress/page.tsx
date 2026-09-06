import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { getProgress } from "@/lib/progress";
import { ProgressView } from "@/components/progress-view";

export default async function ProgressPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);

  const summary = await getProgress(profile.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("progress.title")}</h1>
      <ProgressView summary={summary} unit={profile.unit} locale={locale} />
    </div>
  );
}
