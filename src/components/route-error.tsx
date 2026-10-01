import { useEffect } from "react";
import { Link, useRouteError } from "react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Friendly fallback for unexpected errors inside the app, with a retry. */
export function RouteError() {
  const error = useRouteError();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <AlertTriangle className="mb-4 size-10 text-destructive" />
      <h1 className="text-xl font-semibold">Something went wrong / Щось пішло не так</h1>
      <div className="mt-6 flex gap-3">
        <Button type="button" onClick={() => window.location.reload()} className="h-11">
          Try again / Спробувати ще раз
        </Button>
        <Button render={<Link to="/" />} variant="outline" className="h-11">
          Home / На головну
        </Button>
      </div>
    </div>
  );
}
