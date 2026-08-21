"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { useLanguage } from "@/context/LanguageContext";
import { getAllPlaces, type IndexedPlace } from "@/lib/places";
import { resolveKoreanField, resolveLocalizedField } from "@/lib/i18n";
import { getPlaceMapLinks } from "@/lib/mapLinks";
import { encodeSchedule, decodeSchedule } from "@/lib/plannerCodec";
import { PlannerMap } from "@/components/PlannerMap";

const LOCAL_STORAGE_KEY = "daedongyeojido_planner";

function PlannerContent() {
  const { locale, t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const allPlaces = getAllPlaces();

  // Itinerary state: array of arrays of slugs (index corresponds to Day 1, Day 2, etc.)
  const [schedule, setSchedule] = useState<string[][]>([]);
  const [isSharedView, setIsSharedView] = useState(false);
  const [sharedImported, setSharedImported] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Initialize from LocalStorage or URL params
  useEffect(() => {
    const queryData = searchParams.get("data");
    if (queryData) {
      const decoded = decodeSchedule(queryData);
      if (decoded) {
        setSchedule(decoded);
        setIsSharedView(true);
        return;
      }
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(Array.isArray)) {
          setSchedule(parsed);
          return;
        }
      } catch (err) {
        console.error("Failed to parse saved planner", err);
      }
    }

    // Default: Start with single empty Day 1
    setSchedule([[]]);
  }, [searchParams]);

  // Persist to local storage (only when NOT in shared view, or after importing)
  const saveToLocal = (nextSchedule: string[][]) => {
    setSchedule(nextSchedule);
    if (!isSharedView) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextSchedule));
    }
  };

  const handleImportShared = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(schedule));
    setIsSharedView(false);
    setSharedImported(true);
    // Clear URL parameters
    router.replace("/planner");
    setTimeout(() => setSharedImported(false), 3000);
  };

  const handleAddDay = () => {
    const next = [...schedule, []];
    saveToLocal(next);
  };

  const handleRemoveDay = (dayIndex: number) => {
    if (schedule.length <= 1) return;
    const next = schedule.filter((_, idx) => idx !== dayIndex);
    saveToLocal(next);
  };

  const handleClearAll = () => {
    if (confirm(t.clearTrip + "?")) {
      saveToLocal([[]]);
      if (isSharedView) {
        setIsSharedView(false);
        router.replace("/planner");
      }
    }
  };

  const handleRemovePlace = (dayIndex: number, placeIndex: number) => {
    const next = schedule.map((day, dIdx) => {
      if (dIdx !== dayIndex) return day;
      return day.filter((_, pIdx) => pIdx !== placeIndex);
    });
    saveToLocal(next);
  };

  const handleMovePlace = (
    dayIndex: number,
    placeIndex: number,
    direction: "up" | "down"
  ) => {
    const day = [...schedule[dayIndex]];
    if (direction === "up" && placeIndex > 0) {
      const temp = day[placeIndex];
      day[placeIndex] = day[placeIndex - 1];
      day[placeIndex - 1] = temp;
    } else if (direction === "down" && placeIndex < day.length - 1) {
      const temp = day[placeIndex];
      day[placeIndex] = day[placeIndex + 1];
      day[placeIndex + 1] = temp;
    }

    const next = schedule.map((d, dIdx) => (dIdx === dayIndex ? day : d));
    saveToLocal(next);
  };

  const handleMoveToDay = (
    fromDayIndex: number,
    placeIndex: number,
    toDayIndex: number
  ) => {
    if (toDayIndex < 0 || toDayIndex >= schedule.length) return;
    const slug = schedule[fromDayIndex][placeIndex];

    const next = schedule.map((day, dIdx) => {
      if (dIdx === fromDayIndex) {
        return day.filter((_, pIdx) => pIdx !== placeIndex);
      }
      if (dIdx === toDayIndex) {
        return [...day, slug];
      }
      return day;
    });
    
    // Immediately save and force render update
    setSchedule(next);
    if (!isSharedView) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    }
  };

  const handleShareTrip = () => {
    const encoded = encodeSchedule(schedule);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/planner?data=${encoded}`;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      })
      .catch((err) => {
        console.error("Failed to copy link", err);
      });
  };

  // Map place slugs to IndexedPlace objects
  const getPlacesForDay = (slugs: string[]): IndexedPlace[] => {
    return slugs
      .map((slug) => allPlaces.find((p) => p.slug === slug))
      .filter((p): p is IndexedPlace => p !== undefined);
  };

  const allSelectedPlaces = schedule.flatMap((slugs) => getPlacesForDay(slugs));
  const isScheduleEmpty = schedule.every((day) => day.length === 0);

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Banner/Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-stone-200 pb-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">
                {t.plannerPageTitle}
              </h1>
              {isSharedView && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm animate-pulse">
                  Shared Plan
                </span>
              )}
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-muted)] sm:text-base">
              {t.plannerPageSub}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isSharedView && (
              <button
                type="button"
                onClick={handleImportShared}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 active:scale-95"
              >
                💾 Save to Local Planner
              </button>
            )}
            {!isScheduleEmpty && (
              <button
                type="button"
                onClick={handleShareTrip}
                className="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-stone-800 active:scale-95"
              >
                {copySuccess ? "✓ " + t.copiedToClipboard : "🔗 " + t.shareTrip}
              </button>
            )}
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 active:scale-95"
            >
              🗑️ {t.clearTrip}
            </button>
          </div>
        </div>

        {sharedImported && (
          <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800 shadow-sm">
            ✓ Shared itinerary successfully imported and saved to your device!
          </div>
        )}

        {isScheduleEmpty ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50/50 p-12 text-center text-stone-500 shadow-inner">
            <span className="text-5xl" aria-hidden>🗺️</span>
            <h3 className="mt-4 text-lg font-semibold text-stone-800">{t.plannerPageTitle}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
              {t.emptyPlannerDesc}
            </p>
            <a
              href="/"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-trip-green)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-trip-green-dark)]"
            >
              🔍 Browse Places
            </a>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_minmax(350px,450px)]">
            {/* Days list & place cards */}
            <div className="space-y-8">
              {schedule.map((daySlugs, dayIndex) => {
                const dayPlaces = getPlacesForDay(daySlugs);
                return (
                  <section
                    key={dayIndex}
                    className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
                  >
                    <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
                      <h2 className="font-serif text-xl font-bold text-stone-800">
                        🗓️ {t.dayLabel.replace("{day}", String(dayIndex + 1))}
                      </h2>
                      {schedule.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDay(dayIndex)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          {t.removeDay}
                        </button>
                      )}
                    </div>

                    {dayPlaces.length === 0 ? (
                      <p className="py-6 text-center text-sm text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                        No places added for this day yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dayPlaces.map((place, placeIndex) => {
                          const nameKo = resolveKoreanField(place.name);
                          const nameLocalized = resolveLocalizedField(place.name, locale);
                          const { googleUrl, naverUrl } = getPlaceMapLinks(place.slug, place);

                          return (
                            <div
                              key={place.slug + "-" + placeIndex}
                              className="flex flex-col gap-3 rounded-2xl border border-stone-100 bg-stone-50/50 p-4 transition hover:bg-stone-50 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="flex items-center gap-3">
                                {/* Thumbnail */}
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={place.imageUrl || "/theme-fallback.jpg"}
                                    alt={nameKo}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div>
                                  <h4 className="font-serif text-sm font-bold text-stone-800">
                                    {nameKo}
                                  </h4>
                                  {nameLocalized !== nameKo && (
                                    <p className="text-[10px] text-stone-400">
                                      {nameLocalized}
                                    </p>
                                  )}
                                  <div className="mt-1 flex gap-2">
                                    <a
                                      href={naverUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] font-semibold text-[#03C75A] hover:underline"
                                    >
                                      Naver Map
                                    </a>
                                    {!place.localGem && (
                                      <a
                                        href={googleUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-semibold text-stone-500 hover:underline"
                                      >
                                        Google Maps
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Reordering buttons */}
                                <div className="flex rounded-lg border border-stone-200 bg-white p-0.5 shadow-sm">
                                  <button
                                    type="button"
                                    disabled={placeIndex === 0}
                                    onClick={() => handleMovePlace(dayIndex, placeIndex, "up")}
                                    className="px-2 py-1 text-xs font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-30 rounded-l"
                                    title="Move Up"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={placeIndex === dayPlaces.length - 1}
                                    onClick={() => handleMovePlace(dayIndex, placeIndex, "down")}
                                    className="px-2 py-1 text-xs font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-30 rounded-r"
                                    title="Move Down"
                                  >
                                    ▼
                                  </button>
                                </div>

                                {/* Shift Day dropdown */}
                                <select
                                  value={dayIndex}
                                  onChange={(e) =>
                                    handleMoveToDay(
                                      dayIndex,
                                      placeIndex,
                                      Number.parseInt(e.target.value)
                                    )
                                  }
                                  className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600 shadow-sm outline-none"
                                >
                                  {schedule.map((_, dIdx) => (
                                    <option key={dIdx} value={dIdx}>
                                      Day {dIdx + 1}
                                    </option>
                                  ))}
                                </select>

                                {/* Remove Button */}
                                <button
                                  type="button"
                                  onClick={() => handleRemovePlace(dayIndex, placeIndex)}
                                  className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                                >
                                  {t.removeFromPlanner}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}

              <button
                type="button"
                onClick={handleAddDay}
                className="w-full rounded-2xl border-2 border-dashed border-stone-300 py-4 text-center text-sm font-semibold text-stone-600 hover:border-[var(--color-trip-green)] hover:text-[var(--color-trip-green-dark)] transition"
              >
                ➕ {t.addDay}
              </button>
            </div>

            {/* Sidebar with Sticky Map & Route Insights */}
            <div className="space-y-6 lg:sticky lg:top-24 lg:h-[calc(100vh-140px)] flex flex-col min-h-0">
              <div className="flex-1 min-h-[350px] relative">
                <PlannerMap places={allSelectedPlaces} />
              </div>

              {/* Day stats and Route info */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <h3 className="font-serif text-lg font-bold text-stone-800 mb-3">📍 Route Overview</h3>
                <dl className="grid grid-cols-2 gap-4 text-center text-sm">
                  <div className="rounded-xl bg-stone-50 p-3 border border-stone-100">
                    <dt className="text-xs text-stone-400 uppercase font-bold tracking-wider">Total Days</dt>
                    <dd className="text-lg font-bold text-[var(--color-trip-green-dark)] mt-1">{schedule.length}</dd>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3 border border-stone-100">
                    <dt className="text-xs text-stone-400 uppercase font-bold tracking-wider">Total Places</dt>
                    <dd className="text-lg font-bold text-[var(--color-trip-green-dark)] mt-1">{allSelectedPlaces.length}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading travel planner...</div>}>
      <PlannerContent />
    </Suspense>
  );
}
