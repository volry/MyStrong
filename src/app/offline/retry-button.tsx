"use client";

import { Button } from "@/components/ui/button";

export function RetryButton({ label }: { label: string }) {
  return (
    <Button type="button" className="mt-6 h-12 px-8 text-base" onClick={() => window.location.replace("/")}>
      {label}
    </Button>
  );
}
