"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Friendly fallback for unexpected errors inside the app, with a retry. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="mb-4 size-10 text-destructive" />
      <h1 className="text-xl font-semibold">Something went wrong / Щось пішло не так</h1>
      {error.digest && <p className="mt-1 text-xs text-muted-foreground">#{error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <Button type="button" onClick={reset} className="h-11">
          Try again / Спробувати ще раз
        </Button>
        <Button render={<Link href="/" />} variant="outline" className="h-11">
          Home / На головну
        </Button>
      </div>
    </div>
  );
}
