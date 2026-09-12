import type { MuscleGroup, T } from "@/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";

/** Which muscle groups a workout day covers. */
export function MuscleBadges({
  groups,
  t,
  max = 4,
}: {
  groups: MuscleGroup[];
  t: T;
  max?: number;
}) {
  if (groups.length === 0) return null;
  const shown = groups.slice(0, max);
  const rest = groups.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((g) => (
        <Badge key={g} variant="secondary">
          {t(`muscle.${g}`)}
        </Badge>
      ))}
      {rest > 0 && <Badge variant="outline">+{rest}</Badge>}
    </div>
  );
}
