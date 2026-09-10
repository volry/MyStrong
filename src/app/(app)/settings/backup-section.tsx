import { CloudUpload } from "lucide-react";
import type { Locale, T } from "@/i18n/dictionaries";
import { getBackupConfig, googleConfigured } from "@/lib/backup";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { backupNow, disconnectBackup } from "./backup-actions";

/** Coach-only: weekly Google Drive backup status and controls. */
export async function BackupSection({ t, locale, flag }: { t: T; locale: Locale; flag?: string }) {
  const cfg = await getBackupConfig();
  const ready = googleConfigured();

  const notice: Record<string, { text: string; error?: boolean }> = {
    connected: { text: t("backup.connectedNow") },
    done: { text: t("backup.doneNow") },
    disconnected: { text: t("backup.disconnectedNow") },
    failed: { text: t("backup.failedNow"), error: true },
    denied: { text: t("backup.deniedNow"), error: true },
    unconfigured: { text: t("backup.unconfigured"), error: true },
  };
  const n = flag ? notice[flag] : undefined;

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h2 className="flex items-center gap-2 font-medium">
        <CloudUpload className="size-4 text-muted-foreground" />
        {t("backup.title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("backup.what")}</p>

      {n && <p className={`text-sm ${n.error ? "text-destructive" : "text-primary"}`}>{n.text}</p>}

      {!ready ? (
        <p className="text-sm text-destructive">{t("backup.unconfigured")}</p>
      ) : !cfg.connected ? (
        <Button render={<a href="/api/backup/google/start" />} className="h-12 w-full text-base">
          {t("backup.connect")}
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            {t("backup.connectedAs", { account: cfg.account || "Google" })}
            {cfg.folderId && (
              <>
                {" · "}
                <a
                  href={`https://drive.google.com/drive/folders/${cfg.folderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {t("backup.openFolder")}
                </a>
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {cfg.lastRunAt
              ? `${t("backup.lastRun")}: ${formatDate(cfg.lastRunAt, locale)} · ${cfg.lastStatus === "ok" ? cfg.lastFile : cfg.lastStatus}`
              : t("backup.neverRan")}
          </p>
          <form action={backupNow}>
            <Button type="submit" variant="secondary" className="h-11 w-full">
              {t("backup.now")}
            </Button>
          </form>
          <form action={disconnectBackup}>
            <ConfirmButton
              type="submit"
              variant="ghost"
              className="w-full text-muted-foreground"
              message={t("common.confirmDelete")}
            >
              {t("backup.disconnect")}
            </ConfirmButton>
          </form>
        </div>
      )}
    </section>
  );
}
