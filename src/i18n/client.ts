import { DEFAULT_LOCALE, isLocale, makeT, type Locale } from "./dictionaries";
import { useSession } from "@/data/store";

const KEY = "mystrong:locale";

/** Kept on the device so the login screen speaks the last language used. */
export function rememberLocale(locale: Locale) {
  try {
    localStorage.setItem(KEY, locale);
  } catch {
    // storage is optional
  }
  document.documentElement.lang = locale;
}

/** Before sign-in: the last language used here, else the browser's. */
export function deviceLocale(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // storage is optional
  }
  return navigator.languages?.some((l) => /^uk\b/i.test(l)) ? "uk" : DEFAULT_LOCALE;
}

/** The profile's language once signed in, the device's before. */
export function useLocale(): Locale {
  const session = useSession();
  if (session.status === "ready" && isLocale(session.data.me.locale)) return session.data.me.locale;
  return deviceLocale();
}

export function useT() {
  return makeT(useLocale());
}
