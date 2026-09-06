import { requireCoach } from "@/lib/coach";
import { getRequestLocale } from "@/i18n/server";
import { ClientHome } from "@/components/client-home";

/** The coach's own training: same Today view a client gets. */
export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; skipped?: string }>;
}) {
  const coach = await requireCoach();
  const locale = await getRequestLocale(coach.locale);
  const flags = await searchParams;

  return <ClientHome locale={locale} profile={coach} flags={flags} manageHref={`/clients/${coach.id}`} />;
}
