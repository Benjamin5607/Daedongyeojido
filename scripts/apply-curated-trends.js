#!/usr/bin/env node
/**
 * Apply curated/local trend tags without a full news crawl.
 * Useful for seeding "거제 야호!" style tags onto matching places.
 */
const fs = require("fs");
const path = require("path");
const { extractTrendsLocally } = require("../scraper/trends/extract");
const { placeMatchesTrend } = require("../scraper/trends");
const { MAX_TREND_QUERIES } = require("../scraper/trends/config");

const PLACES_PATH = path.join(__dirname, "../src/data/crawled_places.json");
const TRENDS_PATH = path.join(__dirname, "../src/data/travel_trends.json");

function main() {
  const places = JSON.parse(fs.readFileSync(PLACES_PATH, "utf8"));
  const signals = extractTrendsLocally([
    {
      title: "리센느 거제 야호 열풍… 덕포·옥포 성지 관광객 몰려",
      snippet: "모래성포차 매미성 평화족발 산봉쌈밥 해금강",
      keyword: "거제 야호",
    },
  ]);

  const now = new Date().toISOString();
  let tagged = 0;
  let regionBoosts = 0;

  const updated = places.map((place) => {
    // Clear previous curated tags so re-runs stay precise
    const { trend: _oldTrend, forcePhotoRefresh: _f, ...base } = place;

    let best = null;
    for (const signal of signals) {
      const strength = placeMatchesTrend(base, signal);
      if (!strength) continue;
      if (!best || (strength === "place" && best.strength !== "place")) {
        best = { signal, strength };
      }
    }
    if (!best) return base;

    if (best.strength === "place") {
      tagged += 1;
      return {
        ...base,
        trend: {
          label: best.signal.label,
          source: best.signal.source,
          updatedAt: now,
        },
      };
    }

    regionBoosts += 1;
    return base;
  });

  const priorityQueries = [];
  const seen = new Set();
  for (const signal of signals) {
    for (const q of signal.queries) {
      const key = `${q.theme}|${q.query}`;
      if (seen.has(key)) continue;
      seen.add(key);
      priorityQueries.push({ ...q, trendLabel: signal.label });
      if (priorityQueries.length >= MAX_TREND_QUERIES) break;
    }
  }

  const snapshot = {
    updatedAt: now,
    articleCount: 1,
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
    matchedExistingCount: tagged,
    regionBoostCount: regionBoosts,
  };

  fs.writeFileSync(PLACES_PATH, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  fs.writeFileSync(TRENDS_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Tagged ${tagged} places (region boosts noted: ${regionBoosts}).`);
}

main();
