"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { makeT, type Locale, type TranslationKey } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";
const MIN_PASSWORD = 8;

export function LoginForm({
  locale,
  initialError,
}: {
  locale: Locale;
  initialError: TranslationKey | null;
}) {
  const t = makeT(locale);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(initialError);
  const [notice, setNotice] = useState<TranslationKey | null>(null);

  // Signed out: drop any pages the service worker cached for the previous user.
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage("clear-pages");
  }, []);

  function normalizedEmail() {
    return email.trim().toLowerCase();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < MIN_PASSWORD) {
      setError("login.weakPassword");
      return;
    }
    setBusy(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      if (error) {
        setBusy(false);
        const msg = error.message.toLowerCase();
        if (msg.includes("database error") || msg.includes("invitation")) {
          setError("login.inviteOnly");
        } else if (msg.includes("already registered") || msg.includes("already exists")) {
          setError("login.exists");
        } else if (msg.includes("password")) {
          setError("login.weakPassword");
        } else {
          setError("login.error");
        }
        return;
      }
      // Supabase returns a user with no identities when the email is already taken.
      if (data.user && data.user.identities?.length === 0) {
        setBusy(false);
        setError("login.exists");
        return;
      }
      if (!data.session) {
        // "Confirm email" is still on in the Supabase dashboard.
        setBusy(false);
        setMode("signin");
        setNotice("login.confirmSent");
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail(),
        password,
      });
      if (error) {
        setBusy(false);
        setError("login.invalid");
        return;
      }
    }

    router.replace("/");
    router.refresh();
  }

  async function forgotPassword() {
    setError(null);
    setNotice(null);
    const target = normalizedEmail();
    if (!target.includes("@")) {
      setError("login.resetNeedEmail");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    setBusy(false);
    if (error) {
      setError("login.error");
      return;
    }
    setNotice("login.resetSent");
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("login.email")}</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("login.password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={MIN_PASSWORD}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 text-base"
        />
      </div>

      {error && <p className="text-sm text-destructive">{t(error)}</p>}
      {notice && <p className="text-sm text-primary">{t(notice)}</p>}

      <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
        {busy ? t("login.working") : mode === "signup" ? t("login.createAccount") : t("login.signIn")}
      </Button>

      <div className="flex flex-col items-center gap-3 pt-2 text-sm">
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signup" ? t("login.haveAccount") : t("login.noAccount")}
        </button>
        {mode === "signin" && (
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:underline"
            onClick={forgotPassword}
            disabled={busy}
          >
            {t("login.forgot")}
          </button>
        )}
      </div>
    </form>
  );
}
