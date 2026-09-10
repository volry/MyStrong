import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getRequestLocale } from "@/i18n/server";
import { LOCALES, makeT } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOut, updateProfile } from "../actions";
import { PushToggle } from "./push-toggle";
import { ExportSection } from "./export-section";
import { BackupSection } from "./backup-section";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; export?: string; backup?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);
  const { saved, error, export: exportFlag, backup } = await searchParams;

  const selectClass =
    "h-12 w-full rounded-lg border border-input bg-background px-3 text-base";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>

      <form action={updateProfile} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">{t("settings.name")}</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={profile.full_name ?? ""}
            autoComplete="name"
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">{t("settings.unit")}</Label>
          <select id="unit" name="unit" defaultValue={profile.unit} className={selectClass}>
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locale">{t("settings.language")}</Label>
          <select id="locale" name="locale" defaultValue={locale} className={selectClass}>
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {t(`lang.${l}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-muted-foreground">
          {t("settings.role")}: {t(`role.${profile.role}`)} · {profile.email}
        </div>

        {saved && <p className="text-sm text-primary">{t("settings.saved")}</p>}
        {error && <p className="text-sm text-destructive">{t("login.error")}</p>}

        <Button type="submit" className="h-12 w-full text-base">
          {t("settings.save")}
        </Button>
      </form>

      {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
        <PushToggle locale={locale} publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      )}

      <ExportSection t={t} renewed={exportFlag === "new"} />

      {profile.role === "coach" && <BackupSection t={t} locale={locale} flag={backup} />}

      <form action={signOut}>
        <Button type="submit" variant="outline" className="h-12 w-full text-base">
          {t("settings.signOut")}
        </Button>
      </form>
    </div>
  );
}
