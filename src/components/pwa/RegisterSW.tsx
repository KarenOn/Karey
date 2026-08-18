"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const workerUrl = "/service-worker.js";
    let reloading = false;

    async function registerWorker() {
      const registrations = await navigator.serviceWorker.getRegistrations();

      await Promise.all(
        registrations.map(async (registration) => {
          const activeWorker =
            registration.active || registration.waiting || registration.installing;
          const scriptUrl = activeWorker?.scriptURL || "";

          if (scriptUrl.endsWith("/sw.js")) {
            await registration.unregister();
          }
        })
      );

      const registration = await navigator.serviceWorker.register(workerUrl, {
        scope: "/",
        updateViaCache: "none",
      });

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const nextWorker = registration.installing;
          if (!nextWorker) return;

          nextWorker.addEventListener("statechange", () => {
            if (
              nextWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              nextWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        });

      registration.update().catch(() => undefined);
    }

    registerWorker().catch((error) =>
      console.error("SW register failed:", error)
    );
  }, []);

  return null;
}
