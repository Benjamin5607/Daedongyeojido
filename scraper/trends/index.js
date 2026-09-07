const fs = require("fs");
const path = require("path");
const { discoverTrendArticles } = require("./discover");
const { extractTrendSignals } = require("./extract");
const { MAX_TREND_QUERIES } = require("./config");

const TRENDS_OUTPUT = path.join(__dirname, "../../src/data/travel_trends.json");

/** Rough region bucket from Korean query/label text for nationwide quota. */
const REGION_BUCKETS = [
  { id: "gyeongnam", re: /거제|통영|창원|진주|경남/ },
  { id: "busan", re: /부산|해운대|영도|광안/ },
  { id: "jeju", re: /제주|서귀포|애월|월정/ },
  { id: "gangwon", re: /양양|강릉|속초|평창|강원/ },
  { id: "gyeongbuk", re: /경주|안동|포항|경북/ },
  { id: "seoul", re: /서울|성수|연남|홍대|강남/ },
  { id: "gyeonggi", re: /파주|수원|경기|헤이리/ },
  { id: "jeonbuk", re: /전주|전북|군산/ },
  { id: "jeonnam", re: /여수|순천|목포|전남/ },
  { id: "chungcheong", re: /공주|대전|충남|충북|천안/ },
];

/**
 * @param {string} text
 */
function regionBucket(text) {
  for (const bucket of REGION_BUCKETS) {
    if (bucket.re.test(text)) return bucket.id;
  }
  return "other";
}

/**
 * Prefer queries that diversify regions (round-robin by bucket).
 * @param {{ theme: string; query: string; trendLabel: string }[]} queries
 * @param {number} limit
 */
function balanceQueriesByRegion(queries, limit) {
  /** @type {Map<string, typeof queries>} */
  const byBucket = new Map();
  for (const q of queries) {
    const bucket = regionBucket(`${q.query} ${q.trendLabel}`);
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket).push(q);
  }

  const buckets = [...byBucket.keys()].sort((a, b) => {
    // Prefer named regions over "other"; then larger pools first
    if (a === "other") return 1;
    if (b === "other") return -1;
    return (byBucket.get(b)?.length || 0) - (byBucket.get(a)?.length || 0);
  });

  /** @type {typeof queries} */
  const out = [];
  let guard = 0;
  while (out.length < limit && guard < limit * 4) {
    guard += 1;
    let added = false;
    for (const bucket of buckets) {
      const list = byBucket.get(bucket);
      if (!list || list.length === 0) continue;
      out.push(list.shift());
      added = true;
      if (out.length >= limit) break;
    }
    if (!added) break;
  }
  return out;
}

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
    }
  }

  const balancedQueries = balanceQueriesByRegion(
    priorityQueries,
    MAX_TREND_QUERIES
  );

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
    priorityQueries: balancedQueries,
    matchedExistingCount: matchedExisting.length,
    regionBoostCount: regionBoosts,
    regionBuckets: Object.fromEntries(
      [...new Set(balancedQueries.map((q) => regionBucket(`${q.query} ${q.trendLabel}`)))]
        .map((id) => [
          id,
          balancedQueries.filter((q) => regionBucket(`${q.query} ${q.trendLabel}`) === id)
            .length,
        ])
    ),
  };

  fs.mkdirSync(path.dirname(TRENDS_OUTPUT), { recursive: true });
  fs.writeFileSync(TRENDS_OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(
    `[trend] priorityQueries=${balancedQueries.length}, taggedPlaces=${matchedExisting.length}, regionBoosts=${regionBoosts}, buckets=${JSON.stringify(snapshot.regionBuckets)}`
  );

  return {
    signals,
    priorityQueries: balancedQueries,
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
  const { isGarbagePoiName, resolveNameText } = require("../placeQuality");

  return places
    .filter((place) => {
      if (isGarbagePoiName(place.name)) {
        console.log(
          `[security] Filtered out generic/forbidden POI entry from crawled list: "${resolveNameText(place.name)}"`
        );
        return false;
      }
      return true;
    })
    .map((place) => {
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
  balanceQueriesByRegion,
  regionBucket,
  TRENDS_OUTPUT,
};
