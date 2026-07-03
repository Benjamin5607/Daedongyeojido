import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GEOJE_PLACES } from "./geoje-places.mjs";
import { syncRegionLabels } from "./sync-region-labels.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "../src/data/crawled_places.json");
const NAVER_KO_PATH = path.join(__dirname, "../src/data/naver_search_ko.json");
const GEOJE_TOTAL = 100;

const THEMES = ["k-food", "hallyu", "k-beauty", "k-culture", "urban-nature"];
const TOURIST_PROVINCES = ["seoul", "busan", "jeju", "gyeonggi", "gangwon", "gyeongbuk", "jeonbuk"];
const EIGHT_DO = ["gyeonggi", "gangwon", "chungbuk", "chungnam", "jeonbuk", "jeonnam", "gyeongbuk", "gyeongnam"];

/** @param {Record<string, string>} en, ja, zh, vi, id */
function loc(en, ja, zh, vi, id) {
  return { en, ja, zh, vi, id };
}

/** @param {string} [ko] */
function locWithKo(en, ja, zh, vi, id, ko) {
  return ko ? { en, ja, zh, vi, id, ko } : { en, ja, zh, vi, id };
}

/**
 * @param {{ theme: string, region: object, rating: number, name: object, address: object, description: object, localGem?: boolean }} p
 */
function buildPlace({ theme, region, rating, name, address, description, localGem = false }) {
  return { theme, region, rating, name, address, description, ...(localGem ? { localGem: true } : {}) };
}

function fromRaw(row, localGem = false) {
  const subCode = row.length > 19 ? row[19] : undefined;
  const nKo = row.length > 20 ? row[20] : undefined;
  const addressKo = row.length > 21 ? row[21] : undefined;
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
    name: locWithKo(nEn, nJa, nZh, nVi, nId, nKo),
    address: locWithKo(aEn, aJa, aZh, aVi, aId, addressKo),
    description: loc(dEn, dJa, dZh, dVi, dId),
    localGem,
  });
}

/** @param {import("./geoje-places.mjs").GEOJE_PLACES[number]} p */
function fromGeoje(p) {
  const adminMatch = p.addressKo.match(/거제시\s+(\S+)/);
  const adminKo = adminMatch ? adminMatch[1] : "";

  return buildPlace({
    theme: p.theme,
    region: { province: "gyeongnam", city: "geoje", district: p.district },
    rating: p.rating,
    name: locWithKo(p.en, p.ja, p.zh, p.vi, p.id, p.ko),
    address: locWithKo(
      p.addressEn,
      `巨濟市 ${adminKo}`,
      p.addressKo.replace(/^경상남도\s+/, "").replace("거제시", "巨济市"),
      p.addressEn,
      p.addressEn,
      p.addressKo
    ),
    description: p.description,
    localGem: false,
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
  ...GEOJE_PLACES.map(fromGeoje),
];

function placeKey(place) {
  const name =
    typeof place.name === "string"
      ? place.name
      : place.name?.ko ?? place.name?.en ?? "";
  return `${place.theme}|${String(name).toLowerCase().trim()}`;
}

function preserveImageUrls(nextPlaces, existingPlaces) {
  const imageByKey = new Map(
    existingPlaces
      .filter((place) => place.imageUrl)
      .map((place) => [placeKey(place), place.imageUrl])
  );

  return nextPlaces.map((place) => {
    const imageUrl = place.imageUrl ?? imageByKey.get(placeKey(place));
    return imageUrl ? { ...place, imageUrl } : place;
  });
}

let existingPlaces = [];
if (fs.existsSync(OUT_PATH)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
    existingPlaces = Array.isArray(parsed) ? parsed : [];
  } catch {
    existingPlaces = [];
  }
}

const outputPlaces = preserveImageUrls(places, existingPlaces);

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
  return list.filter(
    (p) => p.localGem && p.region.province === province && p.region.city !== "geoje"
  ).length;
}

function countLocalThemes(list, province) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const p of list) {
    if (!p.localGem || p.region.province !== province || p.region.city === "geoje") continue;
    out[p.theme] = (out[p.theme] ?? 0) + 1;
  }
  return out;
}

syncRegionLabels(outputPlaces);
fs.writeFileSync(OUT_PATH, `${JSON.stringify(outputPlaces, null, 2)}\n`);

const naverKo = JSON.parse(fs.readFileSync(NAVER_KO_PATH, "utf8"));
for (const p of outputPlaces) {
  if (typeof p.name === "object" && p.name.ko) {
    naverKo[p.name.en] = p.name.ko;
  }
}
fs.writeFileSync(NAVER_KO_PATH, `${JSON.stringify(naverKo, null, 2)}\n`);

const total = outputPlaces.length;
const localTotal = outputPlaces.filter((p) => p.localGem).length;
const byProvince = countByProvince(outputPlaces);

console.log(`Wrote ${total} places (${localTotal} Naver local gems) to ${OUT_PATH}`);
console.log("Count by province:", byProvince);

const expectedTotal = 300 + GEOJE_TOTAL;
if (total !== expectedTotal) {
  console.error(`ERROR: expected ${expectedTotal} places, got ${total}`);
  process.exit(1);
}

const geojePlaces = outputPlaces.filter((p) => p.region.city === "geoje");
if (geojePlaces.length !== GEOJE_TOTAL) {
  console.error(`ERROR: expected ${GEOJE_TOTAL} Geoje places, got ${geojePlaces.length}`);
  process.exit(1);
}
for (const theme of THEMES) {
  const geojeThemeCount = geojePlaces.filter((p) => p.theme === theme).length;
  if (geojeThemeCount !== 20) {
    console.error(`ERROR: Geoje/${theme} has ${geojeThemeCount}, expected 20`);
    process.exit(1);
  }
}

if (localTotal !== 160) {
  console.error(`ERROR: expected 160 local gems, got ${localTotal}`);
  process.exit(1);
}

for (const prov of TOURIST_PROVINCES) {
  const touristCount = outputPlaces.filter((p) => !p.localGem && p.region.province === prov).length;
  if (touristCount !== 20) {
    console.error(`ERROR: tourist ${prov} has ${touristCount}, expected 20`);
    process.exit(1);
  }
}

for (const prov of EIGHT_DO) {
  const localCount = countLocalByProvince(outputPlaces, prov);
  if (localCount !== 20) {
    console.error(`ERROR: local gems ${prov} has ${localCount}, expected 20`);
    process.exit(1);
  }
  for (const theme of THEMES) {
    if ((countLocalThemes(outputPlaces, prov)[theme] ?? 0) !== 4) {
      console.error(`ERROR: local ${prov}/${theme} expected 4`);
      process.exit(1);
    }
  }
}

console.log("Validation passed.");
