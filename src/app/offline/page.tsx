import { WifiOff } from "lucide-react";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { RetryButton } from "./retry-button";

export default async function OfflinePage() {
  const t = makeT(await getRequestLocale());

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <WifiOff className="mb-4 size-10 text-muted-foreground" />
      <h1 className="text-2xl font-semibold tracking-tight">{t("offline.title")}</h1>
      <p className="mt-2 max-w-xs text-muted-foreground">{t("offline.body")}</p>
      <RetryButton label={t("offline.retry")} />
    </main>
  );
}
