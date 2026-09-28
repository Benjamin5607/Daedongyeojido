"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { loadGuideApiConfig } from "@/lib/guideBot/storage";
import type { TripGuide, TripGuideCategory } from "@/lib/tripGuide/types";
import {
  loadChecklistState,
  loadCompletedStops,
  saveChecklistState,
  saveCompletedStops,
  saveTripGuide,
} from "@/lib/tripGuide/storage";

type GuideTab = "schedule" | "transit" | "checklist" | "sos";

const CATEGORY_STYLE: Record<TripGuideCategory, string> = {
  transit: "bg-sky-100 text-sky-800",
  sightseeing: "bg-violet-100 text-violet-800",
  food: "bg-orange-100 text-orange-800",
  shopping: "bg-pink-100 text-pink-800",
  nature: "bg-emerald-100 text-emerald-800",
  hiking: "bg-lime-100 text-lime-900",
  culture: "bg-amber-100 text-amber-900",
  rest: "bg-stone-100 text-stone-700",
};

interface TripGuideViewProps {
  guide: TripGuide;
  onGuideChange: (guide: TripGuide) => void;
  onClose?: () => void;
}

export function TripGuideView({
  guide,
  onGuideChange,
  onClose,
}: TripGuideViewProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<GuideTab>("schedule");
  const [day, setDay] = useState(guide.meta.days[0]?.day ?? 1);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichOk, setEnrichOk] = useState(false);

  useEffect(() => {
    setChecks(loadChecklistState());
    setDone(loadCompletedStops());
  }, []);

  useEffect(() => {
    if (guide.meta.days.length && !guide.meta.days.some((d) => d.day === day)) {
      setDay(guide.meta.days[0].day);
    }
  }, [guide.meta.days, day]);

  const dayStops = useMemo(
    () => guide.stops.filter((s) => s.dayNumber === day),
    [guide.stops, day]
  );

  const categoryLabel = (cat: TripGuideCategory) => {
    const map: Record<TripGuideCategory, string> = {
      transit: t.tripGuideCatTransit,
      sightseeing: t.tripGuideCatSightseeing,
      food: t.tripGuideCatFood,
      shopping: t.tripGuideCatShopping,
      nature: t.tripGuideCatNature,
      hiking: t.tripGuideCatHiking,
      culture: t.tripGuideCatCulture,
      rest: t.tripGuideCatRest,
    };
    return map[cat];
  };

  const toggleCheck = (id: string) => {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    saveChecklistState(next);
  };

  const toggleDone = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    saveCompletedStops(next);
  };

  const handleEnrich = async () => {
    setEnrichError(null);
    setEnrichOk(false);
    const config = loadGuideApiConfig();
    if (!config || config.provider !== "nvidia" || !config.apiKey) {
      setEnrichError(t.tripGuideEnrichNeedKey);
      return;
    }
    setEnriching(true);
    try {
      const res = await fetch("/api/trip-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, guide }),
      });
      const body = await res.text();
      if (!res.ok) {
        let detail = body.slice(0, 200);
        try {
          const parsed = JSON.parse(body) as { error?: string };
          if (parsed.error) detail = parsed.error;
        } catch {
          /* keep */
        }
        throw new Error(detail);
      }
      const data = JSON.parse(body) as { guide: TripGuide };
      onGuideChange(data.guide);
      saveTripGuide(data.guide);
      setEnrichOk(true);
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : String(err));
    } finally {
      setEnriching(false);
    }
  };

  const tabs: { id: GuideTab; label: string }[] = [
    { id: "schedule", label: t.tripGuideTabSchedule },
    { id: "transit", label: t.tripGuideTabTransit },
    { id: "checklist", label: t.tripGuideTabChecklist },
    { id: "sos", label: t.tripGuideTabSos },
  ];

  return (
    <section className="mt-10 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-sm">
      <div className="border-b border-stone-100 bg-gradient-to-br from-[var(--color-trip-green)]/10 via-white to-[var(--color-accent-soft)]/40 px-4 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-trip-green-dark)]">
              {t.tripGuideEyebrow}
            </p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-[var(--color-ink)] sm:text-3xl">
              {guide.meta.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {guide.meta.subtitle}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {t.tripGuideSource}: {guide.source === "nvidia" ? "NVIDIA NIM" : t.tripGuideSourceLocal}
            </p>
          </div>
          <div className="action-row w-full sm:w-auto">
            <button
              type="button"
              onClick={handleEnrich}
              disabled={enriching}
              className="btn-touch inline-flex items-center rounded-full bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60"
            >
              {enriching ? t.tripGuideEnriching : t.tripGuideEnrich}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn-touch inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2.5 text-xs font-medium text-stone-700"
              >
                {t.tripGuideHide}
              </button>
            )}
          </div>
        </div>
        {enrichError && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {enrichError}{" "}
            <Link href="/themes/sanhaeng" className="underline">
              {t.tripGuideOpenGuideBot}
            </Link>
          </p>
        )}
        {enrichOk && (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            {t.tripGuideEnrichOk}
          </p>
        )}
      </div>

      <div className="sticky-under-header border-b border-stone-100 px-4 py-3 sm:px-8">
        <div className="chip-scroll" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`btn-touch rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                tab === item.id
                  ? "bg-[var(--color-trip-green)] text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8">
        {tab === "schedule" && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {guide.meta.days.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setDay(d.day)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    day === d.day
                      ? "bg-stone-900 text-white"
                      : "border border-stone-200 text-stone-600"
                  }`}
                >
                  {d.label}
                  {d.city ? ` · ${d.city}` : ""}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {dayStops.length === 0 ? (
                <p className="text-sm text-stone-400">{t.tripGuideEmptyDay}</p>
              ) : (
                dayStops.map((stop) => (
                  <article
                    key={stop.id}
                    className={`rounded-2xl border p-4 sm:p-5 ${
                      done[stop.id]
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-stone-200 bg-stone-50/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[var(--color-trip-green-dark)]">
                            {stop.timeSlot}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CATEGORY_STYLE[stop.category]}`}
                          >
                            {categoryLabel(stop.category)}
                          </span>
                          {stop.difficulty && (
                            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                              {t.difficultyLabel}: {stop.difficulty}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 font-serif text-lg font-semibold text-stone-900">
                          {stop.title}
                        </h3>
                        <p className="text-xs text-stone-500">
                          {stop.locationName}
                          {stop.regionLabel ? ` · ${stop.regionLabel}` : ""}
                        </p>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
                        <input
                          type="checkbox"
                          checked={!!done[stop.id]}
                          onChange={() => toggleDone(stop.id)}
                        />
                        {t.tripGuideMarkDone}
                      </label>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white/80 p-3 ring-1 ring-stone-100">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">
                          {t.tripGuideTransit}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-stone-700">
                          {stop.transitGuide}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-3 ring-1 ring-stone-100">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          {t.tripGuideTip}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-stone-700">
                          {stop.tip}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-stone-600">
                      {stop.description}
                    </p>

                    {(stop.foodName || stop.foodFeature) && (
                      <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-orange-800">
                          {t.tripGuideFood}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-stone-800">
                          {stop.foodName}
                        </p>
                        {stop.foodMenu && (
                          <p className="text-xs text-stone-500">{stop.foodMenu}</p>
                        )}
                        {stop.foodFeature && (
                          <p className="mt-1 text-xs leading-relaxed text-stone-600">
                            {stop.foodFeature}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="action-row mt-3">
                      {stop.slug && (
                        <Link
                          href={`/places/${stop.slug}`}
                          className="btn-touch inline-flex items-center rounded-full bg-[var(--color-trip-green)] px-3 py-2 text-[11px] font-semibold text-white"
                        >
                          {t.viewDetails}
                        </Link>
                      )}
                      {stop.naverUrl && (
                        <a
                          href={stop.naverUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-touch inline-flex items-center rounded-full border border-[#03C75A]/40 px-3 py-2 text-[11px] font-semibold text-[#03C75A]"
                        >
                          {t.directionsOnNaver}
                        </a>
                      )}
                      {stop.googleUrl && (
                        <a
                          href={stop.googleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-touch inline-flex items-center rounded-full border border-stone-300 px-3 py-2 text-[11px] font-semibold text-stone-600"
                        >
                          {t.viewOnGoogleMaps}
                        </a>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>

            {guide.alternatives.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <h3 className="font-serif text-base font-semibold text-amber-900">
                  {t.tripGuideAlternatives}
                </h3>
                <ul className="mt-3 space-y-3">
                  {guide.alternatives
                    .filter((a) => a.dayNumber === day)
                    .map((alt) => (
                      <li key={alt.id} className="text-sm text-stone-700">
                        <span className="font-semibold">{alt.originalTitle}</span>
                        <span className="text-stone-400"> · {alt.situation}</span>
                        <p className="mt-0.5 text-xs text-stone-600">
                          → {alt.alternativeTitle}: {alt.description}
                        </p>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "transit" && (
          <div className="space-y-3">
            {guide.transitTips.map((tip) => (
              <article
                key={tip.id}
                className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4"
              >
                <h3 className="font-serif text-base font-semibold text-stone-900">
                  {tip.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                  {tip.body}
                </p>
              </article>
            ))}
          </div>
        )}

        {tab === "checklist" && (
          <ul className="space-y-2">
            {guide.checklists.map((item) => (
              <li
                key={item.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  checks[item.id]
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-stone-200 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!checks[item.id]}
                  onChange={() => toggleCheck(item.id)}
                />
                <div>
                  <p className="text-sm font-medium text-stone-800">{item.title}</p>
                  <p className="text-[10px] uppercase tracking-wide text-stone-400">
                    {item.category}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "sos" && (
          <div className="space-y-3">
            {guide.contacts.map((c) => (
              <article
                key={c.id}
                className="rounded-2xl border border-red-100 bg-red-50/40 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-base font-semibold text-stone-900">
                    {c.name}
                  </h3>
                  <a
                    href={`tel:${c.phone}`}
                    className="font-mono text-lg font-bold text-red-700"
                  >
                    {c.phone}
                  </a>
                </div>
                <p className="mt-1 text-sm text-stone-600">{c.note}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
