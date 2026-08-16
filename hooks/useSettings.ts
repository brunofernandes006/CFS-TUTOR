"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "cfs-tutor-settings";

export interface AppSettings {
  student_name: string;
  daily_goal_minutes: number;
  focus_discipline: string;
  sound_enabled: boolean;
  notifications_enabled: boolean;
  dark_mode: boolean;
  spaced_review_interval: number;
  session_duration: number;
  tutor_ia_enabled: boolean;
}

const DEFAULTS: AppSettings = {
  student_name: "",
  daily_goal_minutes: 60,
  focus_discipline: "Todas",
  sound_enabled: true,
  notifications_enabled: true,
  dark_mode: true,
  spaced_review_interval: 1,
  session_duration: 45,
  tutor_ia_enabled: false,
};

function readSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function writeSettings(s: AppSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
    setLoaded(true);
  }, []);

  const update = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      writeSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
    writeSettings(DEFAULTS);
  }, []);

  return { settings, loaded, update, reset };
}

export function getSettingsSnapshot(): AppSettings {
  return readSettings();
}
