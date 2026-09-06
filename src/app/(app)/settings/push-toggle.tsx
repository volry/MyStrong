"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { makeT, type Locale } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { removePushSubscription, savePushSubscription } from "./push-actions";

type State = "loading" | "unsupported" | "needs-install" | "denied" | "on" | "off";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function readyWithTimeout(ms: number): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function PushToggle({ locale, publicKey }: { locale: Locale; publicKey: string }) {
  const t = makeT(locale);
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const detect = async () => {
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(isIOS && !standalone ? "needs-install" : "unsupported");
        return;
      }
      const reg = await readyWithTimeout(4000);
      if (!reg) {
        setState("unsupported");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      if (sub) setState("on");
      else setState(Notification.permission === "denied" ? "denied" : "off");
    };
    detect();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await readyWithTimeout(4000);
      if (!reg) {
        setState("unsupported");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      const result = await savePushSubscription({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      });
      setState(result.ok ? "on" : "off");
    } catch {
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await readyWithTimeout(4000);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await removePushSubscription(sub.endpoint);
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  const message: Record<State, string> = {
    loading: "…",
    unsupported: t("push.unsupported"),
    "needs-install": t("push.needsInstall"),
    denied: t("push.denied"),
    on: t("push.on"),
    off: t("push.off"),
  };

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h2 className="flex items-center gap-2 font-medium">
        {state === "on" ? <Bell className="size-4 text-primary" /> : <BellOff className="size-4 text-muted-foreground" />}
        {t("push.title")}
      </h2>
      <p className="text-sm text-muted-foreground">{message[state]}</p>
      {state === "off" && (
        <Button type="button" onClick={enable} disabled={busy} className="h-12 w-full text-base">
          {busy ? t("login.working") : t("push.enable")}
        </Button>
      )}
      {state === "on" && (
        <Button type="button" onClick={disable} disabled={busy} variant="outline" className="h-11 w-full">
          {busy ? t("login.working") : t("push.disable")}
        </Button>
      )}
    </section>
  );
}
