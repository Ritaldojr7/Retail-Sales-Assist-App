"use client";

import { useEffect } from "react";

export default function RegisterPwa() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker is optional; app still works without it.
    });
  }, []);

  return null;
}
