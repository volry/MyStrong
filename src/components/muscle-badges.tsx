import type { MuscleGroup, T } from "@/i18n/dictionaries";
import { isMuscleGroup, MUSCLE_BADGE } from "@/lib/muscles";
import { Badge } from "@/components/ui/badge";

/** One muscle group, in its own colour. Renders nothing for an unset group. */
export function MuscleBadge({ group, t }: { group: string | null | undefined; t: T }) {
  if (!isMuscleGroup(group)) return null;
  return <Badge className={MUSCLE_BADGE[group]}>{t(`muscle.${group}`)}</Badge>;
}

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
        <MuscleBadge key={g} group={g} t={t} />
      ))}
      {rest > 0 && <Badge variant="outline">+{rest}</Badge>}
    </div>
  );
}
