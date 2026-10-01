import { useEffect, useRef, useState } from "react";
import { Download, Sheet } from "lucide-react";
import type { T } from "@/i18n/dictionaries";
import { useData } from "@/data/store";
import { regenerateExportToken } from "@/data/actions/account";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";

export function ExportSection({ t }: { t: T }) {
  const { me, exportToken: token } = useData();
  const [renewed, setRenewed] = useState(false);
  const created = useRef(false);

  // The link is made on the first visit to Settings.
  useEffect(() => {
    if (token || created.current) return;
    created.current = true;
    regenerateExportToken(me, null);
  }, [me, token]);

  if (!token) return null;

  const csvUrl = `${window.location.origin}/api/export/sets.csv?token=${token}`;
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
        <ConfirmButton
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground"
          message={t("common.confirmDelete")}
          onClick={() => {
            regenerateExportToken(me, token);
            setRenewed(true);
          }}
        >
          {t("export.regenerate")}
        </ConfirmButton>
      </div>
    </section>
  );
}
