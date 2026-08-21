"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PRINT_SETTINGS,
  type LocalPrintSettings,
  normalizePrintSettings,
  readPrintSettingsFromStorage,
  writePrintSettingsToStorage,
} from "@/lib/printing/settings";

export function usePrintSettings() {
  const [settings, setSettings] =
    useState<LocalPrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(readPrintSettingsFromStorage());
    setHydrated(true);
  }, []);

  const updateSettings = (
    next:
      | LocalPrintSettings
      | ((current: LocalPrintSettings) => LocalPrintSettings)
  ) => {
    setSettings((current) => {
      const resolved =
        typeof next === "function"
          ? (next as (value: LocalPrintSettings) => LocalPrintSettings)(current)
          : next;

      const normalized = normalizePrintSettings(resolved);
      writePrintSettingsToStorage(normalized);
      return normalized;
    });
  };

  return {
    hydrated,
    settings,
    updateSettings,
  };
}
