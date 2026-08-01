const fs = require("fs");
const path = require("path");
const { discoverTrendArticles } = require("./discover");
const { extractTrendSignals } = require("./extract");
const { MAX_TREND_QUERIES } = require("./config");

const TRENDS_OUTPUT = path.join(__dirname, "../../src/data/travel_trends.json");

/**
 * @param {string|object} name
 */
function resolveNameText(name) {
  if (typeof name === "string") return name;
  if (!name || typeof name !== "object") return "";
  return [name.ko, name.en, ...Object.values(name)].filter(Boolean).join(" ");
}

/**
 * @param {object} place
 * @param {import('./extract').TrendSignal} signal
 * @returns {'place'|'region'|null}
 */
function placeMatchesTrend(place, signal) {
  const nameText = resolveNameText(place.name).toLowerCase();
  const regionText = [
    resolveNameText(place.address),
    place.region?.city,
    place.region?.district,
    place.region?.province,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const placeHints = (signal.placeHints || [])
    .map((h) => h.toLowerCase())
    .filter((h) => h.length >= 2);
  // Concrete POI hints should match the place name, not street names in the address.
  if (placeHints.some((hint) => nameText.includes(hint))) return "place";

  const regionHints = (signal.regionHints || [])
    .map((h) => h.toLowerCase())
    .filter((h) => h.length >= 2);
  const haystack = `${nameText} ${regionText}`;
  if (regionHints.some((hint) => haystack.includes(hint))) return "region";

  const label = String(signal.label || "").toLowerCase();
  if (label.length >= 2 && nameText.includes(label)) return "place";

  return null;
}

/**
 * Build prioritized crawl queries and tag existing places that match trends.
 * @param {object[]} existingPlaces
 */
async function buildTrendCrawlPlan(existingPlaces = []) {
  console.log("[trend] discovering media/travel trends...");
  const articles = await discoverTrendArticles();
  const signals = await extractTrendSignals(articles);
  console.log(`[trend] ${signals.length} trend signal(s)`);

  /** @type {{ theme: string; query: string; trendLabel: string }[]} */
  const priorityQueries = [];
  const seenQuery = new Set();

  for (const signal of signals) {
    for (const q of signal.queries) {
      const key = `${q.theme}|${q.query}`;
      if (seenQuery.has(key)) continue;
      seenQuery.add(key);
      priorityQueries.push({
        theme: q.theme,
        query: q.query,
        trendLabel: signal.label,
      });
      if (priorityQueries.length >= MAX_TREND_QUERIES) break;
    }
    if (priorityQueries.length >= MAX_TREND_QUERIES) break;
  }

  const now = new Date().toISOString();
  /** @type {object[]} */
  const matchedExisting = [];
  let regionBoosts = 0;

  for (const place of existingPlaces) {
    let best = /** @type {{ signal: import('./extract').TrendSignal; strength: 'place'|'region' } | null} */ (
      null
    );
    for (const signal of signals) {
      const strength = placeMatchesTrend(place, signal);
      if (!strength) continue;
      if (!best || (strength === "place" && best.strength !== "place")) {
        best = { signal, strength };
      }
      if (best.strength === "place") break;
    }
    if (!best) continue;

    // Badge only for concrete place-hint hits; region hits still get photo priority.
    if (best.strength === "place") {
      place.trend = {
        label: best.signal.label,
        source: best.signal.source,
        updatedAt: now,
      };
      matchedExisting.push(place);
    } else {
      regionBoosts += 1;
    }
    place.forcePhotoRefresh = true;
  }

  const snapshot = {
    updatedAt: now,
    articleCount: articles.length,
    signals: signals.map((s) => ({
      label: s.label,
      source: s.source,
      score: s.score,
      regionHints: s.regionHints,
      placeHints: s.placeHints,
      theme: s.theme,
      queryCount: s.queries.length,
    })),
    priorityQueries,
    matchedExistingCount: matchedExisting.length,
    regionBoostCount: regionBoosts,
  };

  fs.mkdirSync(path.dirname(TRENDS_OUTPUT), { recursive: true });
  fs.writeFileSync(TRENDS_OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(
    `[trend] priorityQueries=${priorityQueries.length}, taggedPlaces=${matchedExisting.length}, regionBoosts=${regionBoosts}`
  );

  return {
    signals,
    priorityQueries,
    matchedExisting,
    snapshot,
  };
}

/**
 * Attach trend metadata onto newly crawled places using query → label map.
 * @param {object[]} places
 * @param {{ theme: string; query: string; trendLabel: string }[]} priorityQueries
 */
function applyTrendTagsToIncoming(places, priorityQueries) {
  const byQuery = new Map(
    priorityQueries.map((q) => [q.query, q.trendLabel])
  );
  const now = new Date().toISOString();

  return places.map((place) => {
    const label = place.query && byQuery.get(place.query);
    if (!label) return place;
    return {
      ...place,
      trend: {
        label,
        source: "trend-crawl",
        updatedAt: now,
      },
    };
  });
}

module.exports = {
  buildTrendCrawlPlan,
  applyTrendTagsToIncoming,
  placeMatchesTrend,
  TRENDS_OUTPUT,
};
