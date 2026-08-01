/**
 * Select places for social drafts.
 *
 * Content-mix targets (weekly ~14 posts ≈ 2/day) — see docs/meta-setup.md:
 *   ~40% place cards (photo + story caption)
 *   ~30% trend / pilgrimage spots (place.trend + travel_trends.json) — higher weight
 *   ~20% reels scripts (format flagged; video pipeline later)
 *   ~10% series (province/theme TOP — format flagged)
 *
 * Slot heuristics:
 *   morning (KST 11:00) → prefer trend-tagged places
 *   evening (KST 19:00) → theme rotation: food → hallyu → culture → nature → beauty
 *
 * Hard rules: skip slugs published/queued in last 14 days; prefer imageUrl + rating.
 */
const {
  THEMES,
  loadPlaces,
  loadTrends,
  resolveEnglishName,
} = require("./placeUtils");

const RECENT_DAYS = 14;

/** Theme order for evening rotation */
const EVENING_THEME_ROTATION = [
  "k-food",
  "hallyu",
  "k-culture",
  "urban-nature",
  "k-beauty",
];

/**
 * @param {object[]} queueItems
 * @returns {Set<string>}
 */
function recentSlugs(queueItems, now = Date.now()) {
  const cutoff = now - RECENT_DAYS * 24 * 60 * 60 * 1000;
  const blocked = new Set();
  for (const item of queueItems || []) {
    const ts = Date.parse(item.publishedAt || item.approvedAt || item.createdAt || "");
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    if (item.slug) blocked.add(item.slug);
  }
  return blocked;
}

function themeForEveningSlot(queueItems) {
  const eveningCount = (queueItems || []).filter(
    (i) => i.slot === "evening" && (i.status === "published" || i.status === "approved" || i.status === "draft")
  ).length;
  return EVENING_THEME_ROTATION[eveningCount % EVENING_THEME_ROTATION.length];
}

/**
 * Score a place for selection. Higher = better.
 * Trend tags get a strong boost (Phase 3 growth ops).
 */
function scorePlace(place, { slot, preferredTheme, trendLabels }) {
  let score = (place.rating || 0) * 10;

  if (place.imageUrl) score += 15;
  else score -= 40;

  if (place.localGem) score += 12;

  // Trend / pilgrimage weight (~30% mix target → favor these heavily when present)
  if (place.trend?.label) {
    score += 45;
    if (trendLabels.has(String(place.trend.label).toLowerCase())) {
      score += 20;
    }
  }

  if (slot === "morning" && place.trend?.label) score += 25;
  if (slot === "evening" && preferredTheme && place.theme === preferredTheme) {
    score += 18;
  }

  // Mild theme diversity nudge
  if (THEMES.includes(place.theme)) score += 2;

  return score;
}

/**
 * Infer content format label for queue metadata / future reels pipeline.
 */
function inferFormat(place, slot) {
  if (place.trend?.label) return "trend";
  // Occasional series flag for high-rated theme anchors
  if ((place.rating || 0) >= 4.7 && place.localGem) return "series";
  // Evening every ~5th conceptually → reels placeholder (caller can override)
  if (slot === "evening" && !place.trend) return "place_card";
  return "place_card";
}

/**
 * Pick N places for drafting.
 * @param {{ count?: number; slot?: "morning"|"evening"|"auto"; queueItems?: object[]; now?: Date }} opts
 */
function pickPlaces(opts = {}) {
  const count = opts.count ?? 2;
  const queueItems = opts.queueItems || [];
  const now = opts.now || new Date();
  const hourKst = (now.getUTCHours() + 9) % 24;

  let slot = opts.slot || "auto";
  if (slot === "auto") {
    slot = hourKst < 15 ? "morning" : "evening";
  }

  const places = loadPlaces();
  const trends = loadTrends();
  const trendLabels = new Set(
    (trends.signals || []).map((s) => String(s.label || "").toLowerCase()).filter(Boolean)
  );
  const blocked = recentSlugs(queueItems, now.getTime());
  const preferredTheme = slot === "evening" ? themeForEveningSlot(queueItems) : null;

  const candidates = places
    .filter((p) => p.slug && !blocked.has(p.slug))
    .map((place) => ({
      place,
      score: scorePlace(place, { slot, preferredTheme, trendLabels }),
      format: inferFormat(place, slot),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || resolveEnglishName(b.place).localeCompare(resolveEnglishName(a.place)));

  // Prefer distinct themes when picking multiple
  const picked = [];
  const usedThemes = new Set();
  const usedProvinces = new Set();

  for (const candidate of candidates) {
    if (picked.length >= count) break;
    const theme = candidate.place.theme;
    const province = candidate.place.region?.province;
    // Soft diversity: skip same theme if we already have alternatives of similar score
    if (
      picked.length > 0 &&
      usedThemes.has(theme) &&
      candidates.some(
        (c) =>
          !picked.includes(c) &&
          !usedThemes.has(c.place.theme) &&
          c.score >= candidate.score - 15
      )
    ) {
      continue;
    }
    if (
      picked.length > 0 &&
      province &&
      usedProvinces.has(province) &&
      candidates.some(
        (c) =>
          !picked.includes(c) &&
          c.place.region?.province !== province &&
          c.score >= candidate.score - 20
      )
    ) {
      continue;
    }
    picked.push(candidate);
    if (theme) usedThemes.add(theme);
    if (province) usedProvinces.add(province);
  }

  // Fill remaining without diversity filters
  for (const candidate of candidates) {
    if (picked.length >= count) break;
    if (picked.includes(candidate)) continue;
    picked.push(candidate);
  }

  return {
    slot,
    preferredTheme,
    picks: picked.map((c) => ({
      slug: c.place.slug,
      theme: c.place.theme,
      score: c.score,
      format: c.format,
      place: c.place,
    })),
  };
}

module.exports = {
  RECENT_DAYS,
  EVENING_THEME_ROTATION,
  recentSlugs,
  themeForEveningSlot,
  scorePlace,
  inferFormat,
  pickPlaces,
};
