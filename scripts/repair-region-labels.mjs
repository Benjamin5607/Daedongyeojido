import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LABELS_PATH = path.join(__dirname, "../src/data/region_labels.json");
const PLACES_PATH = path.join(__dirname, "../src/data/crawled_places.json");

/** @param {Record<string, string>} fields */
function ml(fields) {
  return { ko: fields.ko, en: fields.en, ja: fields.ja, zh: fields.zh, vi: fields.vi, id: fields.id };
}

const PROVINCE_OVERRIDES = {
  seoul: ml({ ko: "서울특별시", en: "Seoul", ja: "ソウル特別市", zh: "首尔特别市", vi: "Seoul", id: "Seoul" }),
  busan: ml({ ko: "부산광역시", en: "Busan", ja: "釜山広域市", zh: "釜山广域市", vi: "Busan", id: "Busan" }),
  jeju: ml({ ko: "제주특별자치도", en: "Jeju", ja: "済州特別自治道", zh: "济州特别自治道", vi: "Jeju", id: "Jeju" }),
  gyeonggi: ml({ ko: "경기도", en: "Gyeonggi", ja: "京畿道", zh: "京畿道", vi: "Gyeonggi", id: "Gyeonggi" }),
  gangwon: ml({ ko: "강원특별자치도", en: "Gangwon", ja: "江原特別自治道", zh: "江原特别自治道", vi: "Gangwon", id: "Gangwon" }),
  gyeongbuk: ml({ ko: "경상북도", en: "North Gyeongsang", ja: "慶尚北道", zh: "庆尚北道", vi: "Bắc Gyeongsang", id: "Gyeongsang Utara" }),
  jeonbuk: ml({ ko: "전북특별자치도", en: "North Jeolla", ja: "全北特別自治道", zh: "全北特别自治道", vi: "Bắc Jeolla", id: "Jeolla Utara" }),
  chungbuk: ml({ ko: "충청북도", en: "North Chungcheong", ja: "忠清北道", zh: "忠清北道", vi: "Bắc Chungcheong", id: "Chungcheong Utara" }),
  chungnam: ml({ ko: "충청남도", en: "South Chungcheong", ja: "忠清南道", zh: "忠清南道", vi: "Nam Chungcheong", id: "Chungcheong Selatan" }),
  jeonnam: ml({ ko: "전라남도", en: "South Jeolla", ja: "全羅南道", zh: "全罗南道", vi: "Nam Jeolla", id: "Jeolla Selatan" }),
  gyeongnam: ml({ ko: "경상남도", en: "South Gyeongsang", ja: "慶尚南道", zh: "庆尚南道", vi: "Nam Gyeongsang", id: "Gyeongsang Selatan" }),
};

const CITY_KO = {
  ansan: "안산시", asan: "아산시", boeun: "보은군", buan: "부안군", bucheon: "부천시",
  buyeo: "부여군", changwon: "창원시", cheonan: "천안시", cheongju: "청주시", chungju: "충주시",
  damyang: "담양군", dangjin: "당진시", danyang: "단양군", dongducheon: "동두천시", eumseong: "음성군",
  geoje: "거제시", geumsan: "금산군", gimhae: "김해시", gimje: "김제시", gimpo: "김포시",
  goesan: "괴산군", goheung: "고흥군", gongju: "공주시", goryeong: "고령군", "goseong-gangwon": "고성군",
  goyang: "고양시", gumi: "구미시", gunpo: "군포시", gunsan: "군산시", guri: "구리시",
  gwangmyeong: "광명시", gwangyang: "광양시", gyeongsan: "경산시", hadong: "하동군", haenam: "해남군",
  haman: "함안군", hongcheon: "홍천군", hwaseong: "화성시", iksan: "익산시", imsil: "임실군",
  inje: "인제군", jecheon: "제천시", jeongeup: "정읍시", jeongseon: "정선군", jeungpyeong: "증평군",
  jindo: "진도군", jinju: "진주시", miryang: "밀양시", mokpo: "목포시", mungyeong: "문경시",
  naju: "나주시", namwon: "남원시", namyangju: "남양주시", nonsan: "논산시", okcheon: "옥천군",
  pocheon: "포천시", sacheon: "사천시", sangju: "상주시", seocheon: "서천군", seosan: "서산시",
  siheung: "시흥시", sunchang: "순창군", suncheon: "순천시", suwon: "수원시", taean: "태안군",
  taebaek: "태백시", tongyeong: "통영시", uijeongbu: "의정부시", uiwang: "의왕시", uljin: "울진군",
  wando: "완도군", wonju: "원주시", yangju: "양주시", yangpyeong: "양평군", yangsan: "양산시",
  yeoju: "여주시", yeoncheon: "연천군", yeongju: "영주시", yeongwol: "영월군", yeosu: "여수시",
  andong: "안동시", jeonju: "전주시", gangneung: "강릉시", gyeongju: "경주시", "jeju-si": "제주시",
  "seogwipo-si": "서귀포시", paju: "파주시", gapyeong: "가평군", yongin: "용인시", icheon: "이천시",
  chuncheon: "춘천시", sokcho: "속초시", pyeongchang: "평창군", yangyang: "양양군", pohang: "포항시",
  cheongsong: "청송군", jinan: "진안군", muju: "무주군",
};

function isGoodLabel(label) {
  if (!label) return false;
  return label.ja !== label.en && label.ja !== label.ko && label.en !== label.ko;
}

function splitEnParts(addressEn) {
  return addressEn.split(",").map((part) => part.trim()).filter(Boolean);
}

function splitJaParts(addressJa) {
  return addressJa.split(/\s+/).map((part) => part.trim()).filter(Boolean);
}

function splitZhParts(addressZh) {
  if (addressZh.includes(" ")) return addressZh.split(/\s+/).filter(Boolean);
  const match = addressZh.match(/^(.+?[市区郡])(.+)$/);
  if (match) return [match[1], match[2]];
  return [addressZh];
}

function zhCityLabel(zh) {
  const match = zh.match(/^([\u4e00-\u9fff]+(?:市|道|郡|县))/);
  if (match) return match[1];
  return splitZhParts(zh)[0] ?? zh;
}

function zhDistrictLabel(zh, jaFallback) {
  const guMatch = zh.match(/([\u4e00-\u9fff]{1,8}区)/);
  if (guMatch) return guMatch[1];
  const parts = splitZhParts(zh);
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (!/[路街\d]/.test(last)) return last;
  }
  const match = zh.match(/([\u4e00-\u9fff]+(?:洞|邑|面|里))$/);
  if (match) return match[1];
  return jaFallback || zh;
}

function pickJaDistrict(parts) {
  return (
    parts.find((part) => /[区郡邑面洞]$/.test(part)) ??
    parts[parts.length - 1] ??
    ""
  );
}

function pickEnDistrict(parts, metro) {
  if (metro) {
    return (
      parts.find((part) => /-gu$|-dong$|-eup$|-myeon$/i.test(part)) ??
      parts[parts.length - 2] ??
      parts[0] ??
      ""
    );
  }
  return parts[0] ?? "";
}

/**
 * @param {object[]} places
 * @param {string} code
 */
function inferCityLabel(places, code) {
  const sample = places.find((place) => place.region?.city === code);
  if (!sample) return null;

  const jaParts = splitJaParts(sample.address.ja);
  const enTail = splitEnParts(sample.address.en).pop() ?? code;

  return ml({
    ko: CITY_KO[code] ?? jaParts[0] ?? code,
    en: enTail,
    ja: jaParts[0] ?? enTail,
    zh: zhCityLabel(sample.address.zh),
    vi: enTail,
    id: enTail,
  });
}

/**
 * @param {object[]} places
 * @param {string} code
 */
function inferDistrictLabel(places, code) {
  const sample = places.find((place) => place.region?.district === code);
  if (!sample) return null;

  const enParts = splitEnParts(sample.address.en);
  const jaParts = splitJaParts(sample.address.ja);
  const metro =
    sample.region.province === "seoul" || sample.region.province === "busan";

  const en = pickEnDistrict(enParts, metro) || code;
  const ja = pickJaDistrict(jaParts) || en;

  return ml({
    ko: ja,
    en,
    ja,
    zh: zhDistrictLabel(sample.address.zh, ja),
    vi: en,
    id: en,
  });
}

/**
 * @param {object[]} places
 */
export function repairRegionLabels(places) {
  const labels = JSON.parse(fs.readFileSync(LABELS_PATH, "utf8"));

  labels.provinces = { ...labels.provinces, ...PROVINCE_OVERRIDES };

  const cityCodes = new Set();
  const districtCodes = new Set();

  for (const place of places) {
    if (place.region?.city) cityCodes.add(place.region.city);
    if (place.region?.district) districtCodes.add(place.region.district);
  }

  for (const code of cityCodes) {
    const inferred = inferCityLabel(places, code);
    if (inferred) labels.cities[code] = inferred;
  }

  for (const code of districtCodes) {
    const inferred = inferDistrictLabel(places, code);
    if (inferred) labels.districts[code] = inferred;
  }

  fs.writeFileSync(LABELS_PATH, `${JSON.stringify(labels, null, 2)}\n`);
  return labels;
}

