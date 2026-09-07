#!/usr/bin/env node
/**
 * One-shot migration: garbage POI purge + name/region normalization
 * for src/data/crawled_places.json
 */
const fs = require("fs");
const path = require("path");
const {
  isGarbagePoiName,
  normalizePlaceRecord,
  resolveNameText,
  validatePlaceRecord,
} = require("../scraper/placeQuality");

const FILE_PATH = path.join(__dirname, "../src/data/crawled_places.json");

function main() {
  const places = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
  if (!Array.isArray(places)) {
    throw new Error("crawled_places.json must be an array");
  }

  const before = places.length;
  const removed = [];
  const kept = [];

  for (const place of places) {
    if (isGarbagePoiName(place.name)) {
      removed.push(resolveNameText(place.name));
      continue;
    }
    kept.push(normalizePlaceRecord(place));
  }

  // Dedupe by theme|ko name after normalize
  const seen = new Map();
  const deduped = [];
  for (const place of kept) {
    const key = `${place.theme}|${String(place.name.ko || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.set(key, true);
    deduped.push(place);
  }

  fs.writeFileSync(FILE_PATH, `${JSON.stringify(deduped, null, 2)}\n`, "utf8");

  let invalid = 0;
  for (const place of deduped) {
    const { ok } = validatePlaceRecord(place);
    if (!ok) invalid += 1;
  }

  const stringNames = deduped.filter((p) => typeof p.name === "string").length;
  const hangulProvince = deduped.filter((p) =>
    /[가-힣]/.test(p.region?.province || "")
  ).length;
  const hangulCity = deduped.filter((p) =>
    /[가-힣]/.test(p.region?.city || "")
  ).length;
  const missingKo = deduped.filter(
    (p) => p.name && typeof p.name === "object" && !p.name.ko
  ).length;

  console.log(
    JSON.stringify(
      {
        before,
        removed: removed.length,
        removedSamples: removed.slice(0, 20),
        after: deduped.length,
        dedupedAway: kept.length - deduped.length,
        stringNames,
        hangulProvince,
        hangulCity,
        missingKo,
        stillInvalid: invalid,
      },
      null,
      2
    )
  );
}

main();
