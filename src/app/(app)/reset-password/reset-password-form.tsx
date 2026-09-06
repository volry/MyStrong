"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { makeT, type Locale, type TranslationKey } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD = 8;

export function ResetPasswordForm({ locale }: { locale: Locale }) {
  const t = makeT(locale);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError("login.weakPassword");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError("login.error");
      return;
    }
    setDone(true);
  }

  if (done) {
    return <p className="text-primary">{t("reset.done")}</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">{t("reset.newPassword")}</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 text-base"
        />
      </div>
      {error && <p className="text-sm text-destructive">{t(error)}</p>}
      <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
        {busy ? t("login.working") : t("reset.save")}
      </Button>
    </form>
  );
}
