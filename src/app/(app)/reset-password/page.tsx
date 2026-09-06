import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("reset.title")}</h1>
      <ResetPasswordForm locale={locale} />
    </div>
  );
}
