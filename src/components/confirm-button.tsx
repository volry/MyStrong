"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/** Submit button that asks for confirmation before the form is sent. */
export function ConfirmButton({
  message,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
