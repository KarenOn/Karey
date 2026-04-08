"use client";

import { useEffect, useMemo, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function PushManager() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setSupported(ok);
    setPermission(Notification.permission);
  }, []);

  async function refreshSubscriptionState() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setSubscribed(!!sub);
  }

  useEffect(() => {
    if (!supported) return;
    refreshSubscriptionState().catch(() => {});
  }, [supported]);

  const canAsk = supported && vapidPublicKey;

  const subscribe = async () => {
    if (!canAsk) return;

    // Debe ser por interacción del usuario (click)
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });

    setSubscribed(true);
  };

  const unsubscribe = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });

    await sub.unsubscribe();
    setSubscribed(false);
  };

  if (!supported) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600">
        Notificaciones:{" "}
        <b>{subscribed ? "Activadas" : permission === "denied" ? "Bloqueadas" : "Desactivadas"}</b>
      </span>

      {!subscribed ? (
        <button
          onClick={subscribe}
          className="px-3 py-2 rounded-xl bg-teal-600 text-white text-sm"
        >
          Activar
        </button>
      ) : (
        <button
          onClick={unsubscribe}
          className="px-3 py-2 rounded-xl bg-slate-200 text-slate-800 text-sm"
        >
          Desactivar
        </button>
      )}
    </div>
  );
}
