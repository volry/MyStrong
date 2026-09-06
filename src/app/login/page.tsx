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
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-3xl font-semibold tracking-tight">
          {dictionaries[locale].appName}
        </h1>
        <LoginForm locale={locale} initialError={error === "link" ? "login.linkError" : null} />
      </div>
    </main>
  );
}
