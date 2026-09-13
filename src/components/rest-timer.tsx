"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { T } from "@/i18n/dictionaries";
import { formatClock } from "@/lib/rest-timer";
import { cn } from "@/lib/utils";

export type RestTimerHandle = { start: (seconds: number) => void };

/** A short beep when the rest is over. Created on a tap so iOS lets it play. */
function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null);

  function prime() {
    if (ctxRef.current) return;
    try {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) ctxRef.current = new Ctor();
    } catch {
      // no audio available; the bar still counts down
    }
  }

  function beep() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    try {
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // ignore
    }
  }

  return { prime, beep };
}

/**
 * Rest countdown, pinned above the tab bar. Starts when a set is ticked and the
 * client turned the timer on in Settings; it never blocks anything — the workout
 * stays fully usable while it runs.
 */
export function RestTimer({
  t,
  onReady,
}: {
  t: T;
  /** Receives the handle used to start a rest from the set list. */
  onReady: (handle: RestTimerHandle) => void;
}) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [left, setLeft] = useState(0);
  const { prime, beep } = useBeep();
  const doneRef = useRef(false);

  useEffect(() => {
    onReady({
      start: (seconds: number) => {
        prime();
        doneRef.current = false;
        setTotal(seconds);
        setEndsAt(Date.now() + seconds * 1000);
        setLeft(seconds);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (endsAt == null) return;
    const tick = () => {
      const remaining = (endsAt - Date.now()) / 1000;
      setLeft(remaining);
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        beep();
        navigator.vibrate?.([180, 90, 180]);
        // leave the finished bar up briefly, then clear it
        window.setTimeout(() => setEndsAt((current) => (current === endsAt ? null : current)), 4000);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  if (endsAt == null) return null;

  const over = left <= 0;
  const percent = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;

  function shift(seconds: number) {
    setEndsAt((current) => {
      if (current == null) return current;
      const next = Math.max(Date.now() + 1000, current + seconds * 1000);
      doneRef.current = false;
      setTotal((tot) => Math.max(tot + seconds, 5));
      return next;
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-4 md:left-56">
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-xl border bg-card p-2 shadow-lg md:max-w-2xl">
        {/*
          Amber, not the app's teal: the rest bar has to be spotted at a glance on a
          screen that is already green. The text is dark in both states, so it stays
          readable as the fill drains away from under it.
        */}
        <div className="relative h-11 flex-1 overflow-hidden rounded-lg bg-amber-100">
          <div
            className={cn(
              "absolute inset-y-0 left-0 transition-[width] duration-200",
              over ? "bg-amber-200" : "bg-amber-400",
            )}
            style={{ width: `${over ? 100 : percent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-3 text-amber-950">
            <span className="text-sm font-medium">{over ? t("rest.over") : t("rest.title")}</span>
            <span className="text-base font-semibold tabular-nums">{formatClock(Math.max(0, left))}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => shift(-15)}
          className="flex h-11 w-10 items-center justify-center rounded-lg border text-muted-foreground"
          aria-label={t("rest.minus")}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => shift(15)}
          className="flex h-11 w-10 items-center justify-center rounded-lg border text-muted-foreground"
          aria-label={t("rest.plus")}
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setEndsAt(null)}
          className="flex h-11 w-10 items-center justify-center rounded-lg border text-muted-foreground"
          aria-label={t("rest.skip")}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
