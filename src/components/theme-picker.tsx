import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import type { T } from "@/i18n/dictionaries";
import { getThemePref, setThemePref, THEME_PREFS, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICON = { system: Monitor, dark: Moon, light: Sun } as const;

/** Applies at once and is remembered on this device; nothing to save. */
export function ThemePicker({ t }: { t: T }) {
  const [pref, setPref] = useState<ThemePref>(getThemePref);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("settings.theme")}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {THEME_PREFS.map((option) => {
          const Icon = ICON[option];
          const active = option === pref;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setPref(option);
                setThemePref(option);
              }}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {t(`theme.${option}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
