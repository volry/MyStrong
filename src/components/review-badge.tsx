import type { Database } from "@/lib/database.types";
import type { T } from "@/i18n/dictionaries";
import { Badge } from "@/components/ui/badge";

export type ReviewStatus = Database["public"]["Enums"]["program_review"];

const VARIANT = {
  self: "outline",
  pending: "default",
  approved: "secondary",
  changes_requested: "destructive",
} as const;

const LABEL = {
  self: "mine.status.self",
  pending: "mine.status.pending",
  approved: "mine.status.approved",
  changes_requested: "mine.status.changes",
} as const;

/** Where a client-written program stands with the coach. Coach-written programs don't show it. */
export function ReviewBadge({ status, t }: { status: ReviewStatus; t: T }) {
  return <Badge variant={VARIANT[status]}>{t(LABEL[status])}</Badge>;
}
