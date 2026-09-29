import { useState } from "react";
import { useSearchParams } from "react-router";
import { useData } from "@/data/store";
import { signOut, updateProfile } from "@/data/actions/account";
import { resetPassword } from "@/data/actions/auth";
import { LOCALES, makeT, type TranslationKey } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/client";
import { REST_TIMER_CHOICES, formatClock } from "@/lib/rest-timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PushToggle } from "@/components/push-toggle";
import { ExportSection } from "@/components/export-section";

export default function SettingsPage() {
  const { me: profile } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const [searchParams] = useSearchParams();
  const saved = searchParams.get("saved");
  const error = searchParams.get("error");
  const [passwordNote, setPasswordNote] = useState<TranslationKey | null>(null);

  const selectClass = "h-12 w-full rounded-lg border border-input bg-background px-3 text-base";

  async function changePassword() {
    setPasswordNote(null);
    const failure = await resetPassword(profile.email, locale);
    setPasswordNote(failure ?? "login.resetSent");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[2rem] leading-tight font-bold">{t("settings.title")}</h1>

      {/* Keyed on the saved values so the fields show them after a save. */}
      <form
        key={`${profile.full_name}|${profile.unit}|${profile.rest_timer_sec}|${profile.locale}`}
        action={(formData) => updateProfile(profile, formData)}
        className="space-y-4"
      >
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
          <Label htmlFor="rest_timer_sec">{t("settings.restTimer")}</Label>
          <select
            id="rest_timer_sec"
            name="rest_timer_sec"
            defaultValue={profile.rest_timer_sec}
            className={selectClass}
          >
            {REST_TIMER_CHOICES.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 0 ? t("settings.restTimerOff") : formatClock(sec)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t("settings.restTimerHint")}</p>
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

      <PushToggle locale={locale} />

      <ExportSection t={t} />

      <div className="space-y-2">
        <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={changePassword}>
          {t("settings.changePassword")}
        </Button>
        {passwordNote && (
          <p className={passwordNote === "login.resetSent" ? "text-sm text-primary" : "text-sm text-destructive"}>
            {t(passwordNote)}
          </p>
        )}
      </div>

      <Button type="button" variant="outline" className="h-12 w-full text-base" onClick={() => void signOut()}>
        {t("settings.signOut")}
      </Button>
    </div>
  );
}
