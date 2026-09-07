/**
 * Shared place-quality gates: garbage POI detection, region code normalization,
 * and localized name enforcement. Used by crawler, processor, trends, and
 * one-shot migration / validate scripts.
 */

const path = require("path");
const fs = require("fs");

const FORBIDDEN_NAME_SUFFIX =
  /(관광|여행|음식|음식점|맛집|트렌드|명소|핫플|핫플레이스|지역|성지|숙소)$/;

const GARBAGE_EXACT = new Set([
  "검색 결과",
  "Search Results",
  "야호",
  "거제시",
  "거제시리",
  "거제 관광",
  "거제 여행",
  "거제 음식",
  "거제 음식점",
  "거제 맛집",
  "거제 트렌드",
  "거제 야호 맛집",
  "거제 야호 성지",
  "거제 옥포 맛집",
  "제주 관광",
  "서울 맛집",
  "부산 맛집",
  "인기 관광지",
  "서울 돼지고기 맛집",
  "서울 전통시장",
]);

/** Hangul / alias → canonical province code (region_labels.json keys). */
const PROVINCE_ALIASES = {
  seoul: "seoul",
  서울: "seoul",
  서울시: "seoul",
  서울특별시: "seoul",
  busan: "busan",
  부산: "busan",
  부산시: "busan",
  부산광역시: "busan",
  jeju: "jeju",
  제주: "jeju",
  제주도: "jeju",
  제주특별자치도: "jeju",
  gyeonggi: "gyeonggi",
  경기: "gyeonggi",
  경기도: "gyeonggi",
  gangwon: "gangwon",
  강원: "gangwon",
  강원도: "gangwon",
  강원특별자치도: "gangwon",
  gyeongbuk: "gyeongbuk",
  경북: "gyeongbuk",
  경상북도: "gyeongbuk",
  gyeongnam: "gyeongnam",
  경남: "gyeongnam",
  경상남도: "gyeongnam",
  jeonbuk: "jeonbuk",
  전북: "jeonbuk",
  전라북도: "jeonbuk",
  전북특별자치도: "jeonbuk",
  jeonnam: "jeonnam",
  전남: "jeonnam",
  전라남도: "jeonnam",
  chungbuk: "chungbuk",
  충북: "chungbuk",
  충청북도: "chungbuk",
  chungnam: "chungnam",
  충남: "chungnam",
  충청남도: "chungnam",
  // Not yet first-class in labels, but keep codes stable if they appear
  daegu: "daegu",
  대구: "daegu",
  대구광역시: "daegu",
  incheon: "incheon",
  인천: "incheon",
  인천광역시: "incheon",
  gwangju: "gwangju",
  광주: "gwangju",
  광주광역시: "gwangju",
  daejeon: "daejeon",
  대전: "daejeon",
  대전광역시: "daejeon",
  ulsan: "ulsan",
  울산: "ulsan",
  울산광역시: "ulsan",
  sejong: "sejong",
  세종: "sejong",
  세종특별자치시: "sejong",
};

/** Common Hangul city labels → codes (subset; reverse map also built from labels). */
const CITY_ALIASES = {
  거제시: "geoje",
  geoje: "geoje",
  제주시: "jeju-si",
  "jeju-si": "jeju-si",
  서귀포시: "seogwipo-si",
  "seogwipo-si": "seogwipo-si",
};

/** Well-known Korean landmark EN names for string→object migration. */
const KNOWN_EN_NAMES = {
  하남돼지집동대문점: "Hanam Pig House Dongdaemun",
  "거제 해금강": "Geoje Haegeumgang",
  "바람의 언덕": "Windy Hill",
  거제씨월드: "Geoje Sea World",
  "거제맹종죽 테마파크": "Geoje Maengjong Bamboo Theme Park",
  매미성: "Maemiseong Fortress",
  "거제도 포로수용소 유적공원": "Geoje POW Camp Historic Park",
  거제도생선구이간장게장: "Geoje Grilled Fish & Soy Crab",
  "거제 야호 숙소": "Geoje Yaho Stay",
  "거제 국밥": "Geoje Gukbap",
  "노자산 제2전망대": "Nojasan 2nd Observatory",
  모래성분식: "Moraeseong Bunsik",
  "옥포 대중탕": "Okpo Public Bathhouse",
  평화족발: "Pyeonghwa Jokbal",
  산봉쌈밥: "Sanbong Ssambap",
  외도보타니아: "Oedo Botania",
  학동흑진주몽돌해변: "Hakdong Black Pearl Pebble Beach",
};

const VALID_THEMES = new Set([
  "k-food",
  "hallyu",
  "k-beauty",
  "k-culture",
  "urban-nature",
]);

let _cityKoToCode = null;
let _districtKoToCode = null;
let _validProvinces = null;

function loadRegionMaps() {
  if (_cityKoToCode) return;
  _cityKoToCode = { ...CITY_ALIASES };
  _districtKoToCode = {};
  _validProvinces = new Set(Object.keys(PROVINCE_ALIASES).filter((k) => !/[가-힣]/.test(k)));

  try {
    const labelsPath = path.join(__dirname, "..", "src", "data", "region_labels.json");
    const labels = JSON.parse(fs.readFileSync(labelsPath, "utf8"));
    for (const code of Object.keys(labels.provinces || {})) {
      _validProvinces.add(code);
    }
    for (const [code, lab] of Object.entries(labels.cities || {})) {
      if (lab?.ko) _cityKoToCode[lab.ko] = code;
      _cityKoToCode[code] = code;
    }
    for (const [code, lab] of Object.entries(labels.districts || {})) {
      if (lab?.ko && !/[^\uac00-\ud7a3\s]/.test(lab.ko)) {
        _districtKoToCode[lab.ko] = code;
      }
      _districtKoToCode[code] = code;
    }
  } catch {
    // Labels optional at require-time in some scripts; aliases still work.
  }
}

/**
 * @param {unknown} name
 * @returns {string}
 */
function resolveNameText(name) {
  if (typeof name === "string") return name.trim();
  if (!name || typeof name !== "object") return "";
  const obj = /** @type {Record<string, string>} */ (name);
  return String(obj.ko || obj.en || Object.values(obj).find(Boolean) || "").trim();
}

/**
 * @param {unknown} name
 * @returns {boolean}
 */
function isGarbagePoiName(name) {
  const text = resolveNameText(name);
  if (!text) return true;
  if (text.includes("")) return true;
  if (GARBAGE_EXACT.has(text)) return true;
  if (FORBIDDEN_NAME_SUFFIX.test(text)) return true;
  // Category-style: "{region} {food/travel noun}" with very short second token already covered;
  // also drop bare administrative area names.
  if (/^(거제|제주|서울|부산|경주|강릉|양양)시?$/.test(text)) return true;
  return false;
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeProvinceCode(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  const key = raw.toLowerCase();
  if (PROVINCE_ALIASES[raw]) return PROVINCE_ALIASES[raw];
  if (PROVINCE_ALIASES[key]) return PROVINCE_ALIASES[key];
  loadRegionMaps();
  if (_validProvinces.has(key)) return key;
  // Strip trailing 도/시
  const stripped = raw.replace(/(특별자치도|특별자치시|광역시|특별시|도|시)$/u, "");
  if (PROVINCE_ALIASES[stripped]) return PROVINCE_ALIASES[stripped];
  return null;
}

/**
 * @param {unknown} value
 * @param {string|null} [provinceHint]
 * @returns {string|undefined}
 */
function normalizeCityCode(value, provinceHint) {
  if (value == null || value === "") return undefined;
  const raw = String(value).trim();
  loadRegionMaps();
  if (_cityKoToCode[raw]) return _cityKoToCode[raw];
  const lower = raw.toLowerCase();
  if (_cityKoToCode[lower]) return _cityKoToCode[lower];
  // Already a code-looking token
  if (/^[a-z][a-z0-9-]*$/i.test(raw)) return lower;
  // Seoul/Busan "중구" etc. — leave as-is only if no mapping; prefer drop Hangul
  if (/[가-힣]/.test(raw)) {
    if (raw === "중구" && provinceHint === "seoul") return "jung";
    if (raw === "중구" && provinceHint === "busan") return "jung-busan";
    return undefined;
  }
  return lower;
}

/**
 * @param {unknown} value
 * @returns {string|undefined}
 */
function normalizeDistrictCode(value) {
  if (value == null || value === "") return undefined;
  const raw = String(value).trim();
  loadRegionMaps();
  if (_districtKoToCode[raw]) return _districtKoToCode[raw];
  if (/^[a-z][a-z0-9-]*$/i.test(raw)) return raw.toLowerCase();
  // Keep Hangul district labels only if we cannot map — prefer leaving readable Hangul
  // for map search rather than inventing bad codes.
  if (/[가-힣]/.test(raw)) return raw;
  return raw.toLowerCase();
}

const CHOSEONG = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h",
];
const JUNGSEONG = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i",
];
const JONGSEONG = [
  "", "k", "kk", "ks", "n", "nj", "nh", "t", "l", "lg", "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "t",
];

/**
 * Minimal Revised Romanization for Hangul blocks (fallback EN names).
 * @param {string} text
 */
function romanizeHangul(text) {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00;
      const cho = Math.floor(s / 588);
      const jung = Math.floor((s % 588) / 28);
      const jong = s % 28;
      out += CHOSEONG[cho] + JUNGSEONG[jung] + JONGSEONG[jong];
    } else if (/\s/.test(ch)) {
      out += " ";
    } else if (/[0-9A-Za-z-]/.test(ch)) {
      out += ch;
    }
  }
  return out
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

/**
 * @param {unknown} name
 * @returns {{ ko: string, en: string, ja?: string, zh?: string, vi?: string, id?: string }}
 */
function normalizePlaceName(name) {
  if (typeof name === "string") {
    const ko = name.trim();
    const en = KNOWN_EN_NAMES[ko] || romanizeHangul(ko) || ko;
    return { ko, en, ja: en, zh: en, vi: en, id: en };
  }
  if (!name || typeof name !== "object") {
    return { ko: "Unknown", en: "Unknown" };
  }
  const obj = { .../** @type {Record<string, string>} */ (name) };
  const ko =
    obj.ko ||
    (obj.en && /[가-힣]/.test(obj.en) ? obj.en : undefined) ||
    Object.values(obj).find((v) => typeof v === "string" && /[가-힣]/.test(v)) ||
    "";
  let en = obj.en || "";
  if (!en && ko) en = KNOWN_EN_NAMES[ko] || romanizeHangul(ko) || ko;
  if (!ko && en) {
    // Prefer keeping EN; fill ko from en only when Hangul missing (Naver search suffers)
    return {
      ...obj,
      ko: /[가-힣]/.test(en) ? en : en,
      en,
    };
  }
  return {
    ...obj,
    ko: ko || en,
    en: en || ko,
  };
}

/**
 * @param {unknown} address
 * @returns {string|object}
 */
function cleanAddress(address) {
  if (typeof address === "string") {
    return address.replace(/\uE0C8/g, "").replace(/^대한민국\s*/u, "").trim();
  }
  if (address && typeof address === "object") {
    const next = {};
    for (const [k, v] of Object.entries(address)) {
      next[k] =
        typeof v === "string"
          ? v.replace(/\uE0C8/g, "").replace(/^대한민국\s*/u, "").trim()
          : v;
    }
    return next;
  }
  return address;
}

/**
 * Normalize region object in place; returns new region.
 * @param {object} [region]
 * @param {string} [addressText]
 */
function normalizeRegion(region = {}, addressText = "") {
  loadRegionMaps();
  let province =
    normalizeProvinceCode(region.province) ||
    normalizeProvinceCode(region.provinceCode) ||
    null;

  if (!province && addressText) {
    for (const [alias, code] of Object.entries(PROVINCE_ALIASES)) {
      if (/[가-힣]/.test(alias) && addressText.includes(alias)) {
        province = code;
        break;
      }
    }
  }

  const city = normalizeCityCode(region.city, province);
  const district = normalizeDistrictCode(region.district);

  /** @type {{ province: string, city?: string, district?: string }} */
  const next = { province: province || "seoul" };
  if (city) next.city = city;
  if (district) next.district = district;
  return next;
}

/**
 * Full curated-place normalize. Does not drop garbage — caller filters.
 * @param {object} place
 */
function normalizePlaceRecord(place) {
  if (!place || typeof place !== "object") return place;
  const address = cleanAddress(place.address);
  const addressText =
    typeof address === "string"
      ? address
      : resolveNameText(address);

  const name = normalizePlaceName(place.name);
  const region = normalizeRegion(place.region || {}, addressText);
  const theme = VALID_THEMES.has(place.theme) ? place.theme : "urban-nature";

  return {
    ...place,
    theme,
    name,
    address,
    region,
  };
}

/**
 * @param {object} place
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validatePlaceRecord(place) {
  const errors = [];
  if (!place || typeof place !== "object") {
    return { ok: false, errors: ["not an object"] };
  }
  if (typeof place.name === "string") {
    errors.push("name must be localized object");
  } else if (!place.name || typeof place.name !== "object") {
    errors.push("missing name");
  } else {
    if (!place.name.ko) errors.push("name.ko missing");
    if (!place.name.en) errors.push("name.en missing");
    if (isGarbagePoiName(place.name)) errors.push(`garbage name: ${resolveNameText(place.name)}`);
  }
  if (!place.region || typeof place.region !== "object") {
    errors.push("missing region");
  } else {
    const p = place.region.province;
    if (!p) errors.push("region.province missing");
    else if (/[가-힣]/.test(p)) errors.push(`non-code province: ${p}`);
    else {
      loadRegionMaps();
      const known = normalizeProvinceCode(p);
      if (!known) errors.push(`unknown province: ${p}`);
    }
    if (place.region.city && /[가-힣]/.test(place.region.city)) {
      errors.push(`non-code city: ${place.region.city}`);
    }
  }
  if (!VALID_THEMES.has(place.theme)) errors.push(`bad theme: ${place.theme}`);
  return { ok: errors.length === 0, errors };
}

module.exports = {
  FORBIDDEN_NAME_SUFFIX,
  GARBAGE_EXACT,
  PROVINCE_ALIASES,
  KNOWN_EN_NAMES,
  VALID_THEMES,
  resolveNameText,
  isGarbagePoiName,
  normalizeProvinceCode,
  normalizeCityCode,
  normalizeDistrictCode,
  romanizeHangul,
  normalizePlaceName,
  cleanAddress,
  normalizeRegion,
  normalizePlaceRecord,
  validatePlaceRecord,
};
