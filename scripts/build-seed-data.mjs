import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncRegionLabels } from "./sync-region-labels.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "../src/data/crawled_places.json");

const THEMES = ["k-food", "hallyu", "k-beauty", "k-culture", "urban-nature"];
const TOURIST_PROVINCES = ["seoul", "busan", "jeju", "gyeonggi", "gangwon", "gyeongbuk", "jeonbuk"];
const EIGHT_DO = ["gyeonggi", "gangwon", "chungbuk", "chungnam", "jeonbuk", "jeonnam", "gyeongbuk", "gyeongnam"];

/** @param {Record<string, string>} en, ja, zh, vi, id */
function loc(en, ja, zh, vi, id) {
  return { en, ja, zh, vi, id };
}

/**
 * @param {{ theme: string, region: object, rating: number, name: object, address: object, description: object, localGem?: boolean }} p
 */
function buildPlace({ theme, region, rating, name, address, description, localGem = false }) {
  return { theme, region, rating, name, address, description, ...(localGem ? { localGem: true } : {}) };
}

function fromRaw(row, localGem = false) {
  const subCode = row.length > 19 ? row[19] : undefined;
  const [
    theme,
    province,
    code,
    rating,
    nEn,
    nJa,
    nZh,
    nVi,
    nId,
    aEn,
    aJa,
    aZh,
    aVi,
    aId,
    dEn,
    dJa,
    dZh,
    dVi,
    dId,
  ] = row;
  const metro = province === "seoul" || province === "busan";
  const region = metro
    ? { province, district: code }
    : subCode
      ? { province, city: code, district: subCode }
      : { province, city: code };

  return buildPlace({
    theme,
    region,
    rating,
    name: loc(nEn, nJa, nZh, nVi, nId),
    address: loc(aEn, aJa, aZh, aVi, aId),
    description: loc(dEn, dJa, dZh, dVi, dId),
    localGem,
  });
}

const TOURIST_PARTS = [
  "places-data-part1.json",
  "places-data-part2.json",
  "places-data-part3.json",
  "places-data-part4.json",
  "places-data-part5.json",
  "places-data-part6.json",
  "places-data-part7.json",
];

const LOCAL_PARTS = [
  "places-data-local-gyeonggi.json",
  "places-data-local-gangwon.json",
  "places-data-local-chungbuk.json",
  "places-data-local-chungnam.json",
  "places-data-local-jeonbuk.json",
  "places-data-local-jeonnam.json",
  "places-data-local-gyeongbuk.json",
  "places-data-local-gyeongnam.json",
];

function loadPart(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, file), "utf8"));
}

const touristRaw = TOURIST_PARTS.flatMap(loadPart);
const localRaw = LOCAL_PARTS.flatMap(loadPart);

const places = [
  ...touristRaw.map((row) => fromRaw(row, false)),
  ...localRaw.map((row) => fromRaw(row, true)),
];

function countByProvince(list) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const p of list) {
    counts[p.region.province] = (counts[p.region.province] ?? 0) + 1;
  }
  return counts;
}

function countThemesByProvince(list, provinceFilter) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const p of list) {
    if (provinceFilter && p.region.province !== provinceFilter) continue;
    if (p.localGem) continue;
    out[p.theme] = (out[p.theme] ?? 0) + 1;
  }
  return out;
}

function countLocalByProvince(list, province) {
  return list.filter((p) => p.localGem && p.region.province === province).length;
}

function countLocalThemes(list, province) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const p of list) {
    if (!p.localGem || p.region.province !== province) continue;
    out[p.theme] = (out[p.theme] ?? 0) + 1;
  }
  return out;
}

syncRegionLabels(places);
fs.writeFileSync(OUT_PATH, `${JSON.stringify(places, null, 2)}\n`);

const total = places.length;
const localTotal = places.filter((p) => p.localGem).length;
const byProvince = countByProvince(places);

console.log(`Wrote ${total} places (${localTotal} Naver local gems) to ${OUT_PATH}`);
console.log("Count by province:", byProvince);

if (total !== 300) {
  console.error(`ERROR: expected 300 places, got ${total}`);
  process.exit(1);
}

if (localTotal !== 160) {
  console.error(`ERROR: expected 160 local gems, got ${localTotal}`);
  process.exit(1);
}

for (const prov of TOURIST_PROVINCES) {
  const touristCount = places.filter((p) => !p.localGem && p.region.province === prov).length;
  if (touristCount !== 20) {
    console.error(`ERROR: tourist ${prov} has ${touristCount}, expected 20`);
    process.exit(1);
  }
}

for (const prov of EIGHT_DO) {
  const localCount = countLocalByProvince(places, prov);
  if (localCount !== 20) {
    console.error(`ERROR: local gems ${prov} has ${localCount}, expected 20`);
    process.exit(1);
  }
  for (const theme of THEMES) {
    if ((countLocalThemes(places, prov)[theme] ?? 0) !== 4) {
      console.error(`ERROR: local ${prov}/${theme} expected 4`);
      process.exit(1);
    }
  }
}

console.log("Validation passed.");
