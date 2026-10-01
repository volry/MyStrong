import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import type { User as AuthUser } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { acceptInvite } from "@/data/actions/auth";
import { makeT, type TranslationKey } from "@/i18n/dictionaries";
import { deviceLocale } from "@/i18n/client";
import { Button } from "@/components/ui/button";

/**
 * Signed in, but without a profile: sign-up was interrupted (for instance the
 * connection dropped after the account was created). Finish it from the invite,
 * or explain that there is none.
 */
export function FinishSignUp({ user }: { user: AuthUser }) {
  const locale = deviceLocale();
  const t = makeT(locale);
  const [problem, setProblem] = useState<TranslationKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    acceptInvite(user, locale)
      .then((ok) => !cancelled && !ok && setProblem("login.inviteOnly"))
      .catch(() => !cancelled && setProblem(navigator.onLine ? "login.error" : "login.offline"));
    return () => {
      cancelled = true;
    };
  }, [user, locale]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className={problem ? "text-destructive" : "text-muted-foreground"}>
        {problem ? t(problem) : t("login.finishing")}
      </p>
      {problem && (
        <Button variant="outline" className="h-11" onClick={() => void signOut(auth)}>
          {t("login.signOut")}
        </Button>
      )}
    </main>
  );
}
