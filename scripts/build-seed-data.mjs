import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "../src/data/crawled_places.json");
const LABELS_PATH = path.join(__dirname, "region-labels-additions.json");
const EXISTING_LABELS_PATH = path.join(__dirname, "../src/data/region_labels.json");

const THEMES = ["k-food", "hallyu", "k-beauty", "k-culture", "urban-nature"];
const PROVINCES = ["seoul", "busan", "jeju", "gyeonggi", "gangwon", "gyeongbuk", "jeonbuk"];

/** @param {Record<string, string>} fields */
function ml(fields) {
  return { ko: fields.ko, en: fields.en, ja: fields.ja, zh: fields.zh, vi: fields.vi, id: fields.id };
}

/**
 * @param {{ theme: string, region: object, rating: number, name: object, address: object, description: object }} p
 */
function buildPlace({ theme, region, rating, name, address, description }) {
  return { theme, region, rating, name, address, description };
}

const REGION_LABEL_ADDITIONS = {
  cities: {
    "seogwipo-si": ml({ ko: "서귀포시", en: "Seogwipo", ja: "西帰浦市", zh: "西归浦市", vi: "Seogwipo", id: "Seogwipo" }),
    paju: ml({ ko: "파주시", en: "Paju", ja: "坡州市", zh: "坡州市", vi: "Paju", id: "Paju" }),
    gapyeong: ml({ ko: "가평군", en: "Gapyeong", ja: "加平郡", zh: "加平郡", vi: "Gapyeong", id: "Gapyeong" }),
    yongin: ml({ ko: "용인시", en: "Yongin", ja: "龍仁市", zh: "龙仁市", vi: "Yongin", id: "Yongin" }),
    icheon: ml({ ko: "이천시", en: "Icheon", ja: "利川市", zh: "利川市", vi: "Icheon", id: "Icheon" }),
    chuncheon: ml({ ko: "춘천시", en: "Chuncheon", ja: "春川市", zh: "春川市", vi: "Chuncheon", id: "Chuncheon" }),
    sokcho: ml({ ko: "속초시", en: "Sokcho", ja: "束草市", zh: "束草市", vi: "Sokcho", id: "Sokcho" }),
    pyeongchang: ml({ ko: "평창군", en: "Pyeongchang", ja: "平昌郡", zh: "平昌郡", vi: "Pyeongchang", id: "Pyeongchang" }),
    yangyang: ml({ ko: "양양군", en: "Yangyang", ja: "襄陽郡", zh: "襄阳郡", vi: "Yangyang", id: "Yangyang" }),
    pohang: ml({ ko: "포항시", en: "Pohang", ja: "浦項市", zh: "浦项市", vi: "Pohang", id: "Pohang" }),
    cheongsong: ml({ ko: "청송군", en: "Cheongsong", ja: "青松郡", zh: "青松郡", vi: "Cheongsong", id: "Cheongsong" }),
    jinan: ml({ ko: "진안군", en: "Jinan", ja: "鎮安郡", zh: "镇安郡", vi: "Jinan", id: "Jinan" }),
    muju: ml({ ko: "무주군", en: "Muju", ja: "茂朱郡", zh: "茂朱郡", vi: "Muju", id: "Muju" }),
  },
  districts: {
    yeongdeungpo: ml({ ko: "영등포구", en: "Yeongdeungpo-gu", ja: "永登浦区", zh: "永登浦区", vi: "Yeongdeungpo-gu", id: "Yeongdeungpo-gu" }),
    seodaemun: ml({ ko: "서대문구", en: "Seodaemun-gu", ja: "西大門区", zh: "西大门区", vi: "Seodaemun-gu", id: "Seodaemun-gu" }),
    suyeong: ml({ ko: "수영구", en: "Suyeong-gu", ja: "水営区", zh: "水营区", vi: "Suyeong-gu", id: "Suyeong-gu" }),
    saha: ml({ ko: "사하구", en: "Saha-gu", ja: "沙下区", zh: "沙下区", vi: "Saha-gu", id: "Saha-gu" }),
    geumjeong: ml({ ko: "금정구", en: "Geumjeong-gu", ja: "金井区", zh: "金井区", vi: "Geumjeong-gu", id: "Geumjeong-gu" }),
    gijang: ml({ ko: "기장군", en: "Gijang-gun", ja: "機張郡", zh: "机张郡", vi: "Gijang-gun", id: "Gijang-gun" }),
    yeongdo: ml({ ko: "영도구", en: "Yeongdo-gu", ja: "影島区", zh: "影岛区", vi: "Yeongdo-gu", id: "Yeongdo-gu" }),
    "nam-busan": ml({ ko: "남구", en: "Nam-gu", ja: "南区", zh: "南区", vi: "Nam-gu", id: "Nam-gu" }),
    seongsan: ml({ ko: "성산읍", en: "Seongsan-eup", ja: "城山邑", zh: "城山邑", vi: "Seongsan-eup", id: "Seongsan-eup" }),
    pyoseon: ml({ ko: "표선면", en: "Pyoseon-myeon", ja: "表善面", zh: "表善面", vi: "Pyoseon-myeon", id: "Pyoseon-myeon" }),
    gujwa: ml({ ko: "구좌읍", en: "Gujwa-eup", ja: "旧左邑", zh: "旧左邑", vi: "Gujwa-eup", id: "Gujwa-eup" }),
    imjingak: ml({ ko: "임진각", en: "Imjingak", ja: "臨津閣", zh: "临津阁", vi: "Imjingak", id: "Imjingak" }),
    yangdong: ml({ ko: "양동면", en: "Yangdong-myeon", ja: "陽東面", zh: "阳东面", vi: "Yangdong-myeon", id: "Yangdong-myeon" }),
    deokjin: ml({ ko: "덕진구", en: "Deokjin-gu", ja: "德津区", zh: "德津区", vi: "Deokjin-gu", id: "Deokjin-gu" }),
  },
};

/** @param {Record<string, string>} fields */
function loc(en, ja, zh, vi, id) {
  return { en, ja, zh, vi, id };
}

/**
 * Raw tuple: [theme, province, regionCode, rating, ...15 i18n fields]
 * regionCode maps to district (metro) or city (provincial); optional 4th segment after rating for district in provincial cities.
 */
function fromRaw(row) {
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
  });
}

function collectRegionCodes(places) {
  const cities = new Set();
  const districts = new Set();
  for (const place of places) {
    const { region } = place;
    if (region.city) cities.add(region.city);
    if (region.district) districts.add(region.district);
  }
  return { cities, districts };
}

const PART_FILES = [
  "places-data-part1.json",
  "places-data-part2.json",
  "places-data-part3.json",
  "places-data-part4.json",
  "places-data-part5.json",
  "places-data-part6.json",
  "places-data-part7.json",
];

const PLACES_RAW = PART_FILES.flatMap((file) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, file), "utf8"))
);

const places = PLACES_RAW.map(fromRaw);

function countByProvince(list) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const p of list) {
    counts[p.region.province] = (counts[p.region.province] ?? 0) + 1;
  }
  return counts;
}

function countThemesByProvince(list) {
  /** @type {Record<string, Record<string, number>>} */
  const out = {};
  for (const p of list) {
    const prov = p.region.province;
    out[prov] ??= {};
    out[prov][p.theme] = (out[prov][p.theme] ?? 0) + 1;
  }
  return out;
}

function buildLabelAdditions(list) {
  const existing = JSON.parse(fs.readFileSync(EXISTING_LABELS_PATH, "utf8"));
  const { cities, districts } = collectRegionCodes(list);
  /** @type {{ cities: Record<string, object>, districts: Record<string, object> }} */
  const additions = { cities: {}, districts: {} };
  for (const code of cities) {
    if (!existing.cities[code] && REGION_LABEL_ADDITIONS.cities[code]) {
      additions.cities[code] = REGION_LABEL_ADDITIONS.cities[code];
    }
  }
  for (const code of districts) {
    if (!existing.districts[code] && REGION_LABEL_ADDITIONS.districts[code]) {
      additions.districts[code] = REGION_LABEL_ADDITIONS.districts[code];
    }
  }
  return additions;
}

fs.writeFileSync(OUT_PATH, `${JSON.stringify(places, null, 2)}\n`);

const labelAdditions = buildLabelAdditions(places);
fs.writeFileSync(LABELS_PATH, `${JSON.stringify(labelAdditions, null, 2)}\n`);

const total = places.length;
const byProvince = countByProvince(places);
const byTheme = countThemesByProvince(places);

console.log(`Wrote ${total} places to ${OUT_PATH}`);
console.log("Count by province:", byProvince);
console.log("Themes per province:", byTheme);
console.log(
  "New region codes:",
  Object.keys(labelAdditions.cities).length,
  "cities,",
  Object.keys(labelAdditions.districts).length,
  "districts"
);

if (total !== 140) {
  console.error(`ERROR: expected 140 places, got ${total}`);
  process.exit(1);
}

for (const prov of PROVINCES) {
  if (byProvince[prov] !== 20) {
    console.error(`ERROR: ${prov} has ${byProvince[prov] ?? 0} places, expected 20`);
    process.exit(1);
  }
  for (const theme of THEMES) {
    if ((byTheme[prov]?.[theme] ?? 0) !== 4) {
      console.error(`ERROR: ${prov}/${theme} has ${byTheme[prov]?.[theme] ?? 0}, expected 4`);
      process.exit(1);
    }
  }
}
