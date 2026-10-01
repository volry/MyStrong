import { Navigate, useSearchParams } from "react-router";
import { useData } from "@/data/store";
import { useLocale } from "@/i18n/client";
import { ClientHome } from "@/components/client-home";

/** The coach's own training: same Today view a client gets. */
export default function MePage() {
  const { me } = useData();
  const locale = useLocale();
  const [search] = useSearchParams();
  if (me.role !== "coach") return <Navigate to="/" replace />;

  return (
    <ClientHome
      locale={locale}
      profile={me}
      flags={{ done: search.get("done"), skipped: search.get("skipped") }}
      manageHref={`/clients/${me.id}`}
    />
  );
}
