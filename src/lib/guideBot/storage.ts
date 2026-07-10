import type { GuideApiConfig } from "./types";

const STORAGE_KEY = "daedongyeojido-guide-api";

export function loadGuideApiConfig(): GuideApiConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuideApiConfig;
    if (!parsed.provider || !parsed.apiKey?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGuideApiConfig(config: GuideApiConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearGuideApiConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
