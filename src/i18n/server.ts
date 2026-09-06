import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, makeT, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "locale";

/**
 * Resolve the UI locale: explicit cookie (set from Settings), then the
 * profile's saved locale if given, then the browser's Accept-Language, then English.
 */
export async function getRequestLocale(profileLocale?: string | null): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  if (isLocale(profileLocale)) return profileLocale;

  const accept = (await headers()).get("accept-language") ?? "";
  if (/(^|,)\s*uk\b/i.test(accept)) return "uk";
  return DEFAULT_LOCALE;
}

export async function getT(locale?: Locale) {
  return makeT(locale ?? (await getRequestLocale()));
}
