import { Dumbbell } from "lucide-react";
import { getRequestLocale } from "@/i18n/server";
import { dictionaries } from "@/i18n/dictionaries";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const locale = await getRequestLocale();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,oklch(0.9_0.05_175),transparent_60%)] px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-[0_8px_30px_oklch(0.34_0.075_180/10%)]">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Dumbbell className="size-8" />
        </div>
        <h1 className="mb-1 text-center text-3xl font-semibold tracking-tight">
          {dictionaries[locale].appName}
        </h1>
        <LoginForm locale={locale} initialError={error === "link" ? "login.linkError" : null} />
      </div>
    </main>
  );
}
