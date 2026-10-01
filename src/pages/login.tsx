import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { Dumbbell } from "lucide-react";
import { useSession } from "@/data/store";
import { resetPassword, signIn, signUp } from "@/data/actions/auth";
import { dictionaries, makeT, type TranslationKey } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";
const MIN_PASSWORD = 8;

export default function LoginPage() {
  const session = useSession();
  const locale = useLocale();
  const t = makeT(locale);
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);

  if (session.status === "ready" || session.status === "no-profile") return <Navigate to="/" replace />;

  const normalizedEmail = () => email.trim().toLowerCase();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < MIN_PASSWORD) {
      setError("login.weakPassword");
      return;
    }
    setBusy(true);
    const failure =
      mode === "signup"
        ? await signUp(normalizedEmail(), password, locale)
        : await signIn(normalizedEmail(), password);
    setBusy(false);
    if (failure) setError(failure);
    else navigate("/", { replace: true });
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
    const failure = await resetPassword(target, locale);
    setBusy(false);
    if (failure) setError(failure);
    else setNotice("login.resetSent");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 ring-1 ring-border">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Dumbbell className="size-8" />
        </div>
        <h1 className="mb-1 text-center text-3xl font-semibold tracking-tight">{dictionaries[locale].appName}</h1>

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

          <Button type="submit" className="h-12 w-full text-base" disabled={busy || session.status === "loading"}>
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
      </div>
    </main>
  );
}
