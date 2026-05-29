"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de la app (Fase 6a — caché de lectura offline).
 * Solo en producción, para no interferir con el hot-reload en desarrollo.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[sw] registration failed:", err);
      });
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
