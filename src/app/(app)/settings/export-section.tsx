import { Download, Sheet } from "lucide-react";
import { headers } from "next/headers";
import type { T } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "./copy-button";
import { getOrCreateExportToken, regenerateExportToken } from "./export-actions";

export async function ExportSection({ t, renewed }: { t: T; renewed: boolean }) {
  const token = await getOrCreateExportToken();
  if (!token) return null;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "mystrong.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const csvUrl = `${proto}://${host}/api/export/sets.csv?token=${token}`;
  const formula = `=IMPORTDATA("${csvUrl}")`;

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h2 className="flex items-center gap-2 font-medium">
        <Sheet className="size-4 text-muted-foreground" />
        {t("export.title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("export.what")}</p>

      <Button render={<a href={`${csvUrl}&download=1`} />} className="h-12 w-full text-base">
        <Download className="size-4" />
        {t("export.download")}
      </Button>

      <div className="space-y-2 border-t pt-3">
        <h3 className="text-sm font-medium">{t("export.sheets")}</h3>
        <p className="text-xs text-muted-foreground">{t("export.sheetsHint")}</p>
        <input
          readOnly
          value={formula}
          className="h-11 w-full rounded-lg border border-input bg-muted px-3 font-mono text-xs"
        />
        <CopyButton text={formula} label={t("export.copy")} copiedLabel={t("export.copied")} />
        {renewed && <p className="text-sm text-primary">{t("export.renewed")}</p>}
        <form action={regenerateExportToken}>
          <ConfirmButton
            type="submit"
            variant="ghost"
            className="w-full text-muted-foreground"
            message={t("common.confirmDelete")}
          >
            {t("export.regenerate")}
          </ConfirmButton>
        </form>
      </div>
    </section>
  );
}
