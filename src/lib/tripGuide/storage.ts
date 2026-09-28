import type { TripGuide } from "./types";

const GUIDE_KEY = "daedongyeojido_trip_guide";
const CHECK_KEY = "daedongyeojido_trip_guide_checks";
const DONE_KEY = "daedongyeojido_trip_guide_done";

export function saveTripGuide(guide: TripGuide): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUIDE_KEY, JSON.stringify(guide));
}

export function loadTripGuide(): TripGuide | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TripGuide;
    if (parsed?.version !== 1 || !Array.isArray(parsed.stops)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTripGuide(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUIDE_KEY);
}

export function loadChecklistState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CHECK_KEY) || "{}") as Record<
      string,
      boolean
    >;
  } catch {
    return {};
  }
}

export function saveChecklistState(state: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHECK_KEY, JSON.stringify(state));
}

export function loadCompletedStops(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) || "{}") as Record<
      string,
      boolean
    >;
  } catch {
    return {};
  }
}

export function saveCompletedStops(state: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DONE_KEY, JSON.stringify(state));
}
