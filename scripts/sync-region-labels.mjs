import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LABELS_PATH = path.join(__dirname, "../src/data/region_labels.json");

/** @param {Record<string, string>} fields */
function ml(fields) {
  return { ko: fields.ko, en: fields.en, ja: fields.ja, zh: fields.zh, vi: fields.vi, id: fields.id };
}

const PROVINCE_OVERRIDES = {
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
  siheung: "시흥시", sunchang: "순창군", suncheon: "순천시", taean: "태안군", taebaek: "태백시",
  tongyeong: "통영시", uijeongbu: "의정부시", uiwang: "의왕시", uljin: "울진군", wando: "완도군",
  wonju: "원주시", yangju: "양주시", yangpyeong: "양평군", yangsan: "양산시", yeoju: "여주시",
  yeoncheon: "연천군", yeongju: "영주시", yeongwol: "영월군", yeosu: "여수시",
};

function titleCase(code) {
  return code
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function labelForCity(code) {
  const ko = CITY_KO[code] ?? code;
  const en = CITY_KO[code] ? CITY_KO[code].replace(/(시|군)$/, "") : titleCase(code);
  return ml({ ko, en, ja: en, zh: en, vi: en, id: en });
}

function labelForDistrict(code) {
  const en = titleCase(code);
  return ml({ ko: code, en, ja: en, zh: en, vi: en, id: en });
}

/**
 * @param {object[]} places
 */
export function syncRegionLabels(places) {
  const labels = JSON.parse(fs.readFileSync(LABELS_PATH, "utf8"));

  for (const [code, value] of Object.entries(PROVINCE_OVERRIDES)) {
    labels.provinces[code] ??= value;
  }

  for (const place of places) {
    const { province, city, district } = place.region;
    if (city && !labels.cities[city]) {
      labels.cities[city] = labelForCity(city);
    }
    if (district && !labels.districts[district]) {
      labels.districts[district] = labelForDistrict(district);
    }
    if (province && PROVINCE_OVERRIDES[province]) {
      labels.provinces[province] = PROVINCE_OVERRIDES[province];
    }
  }

  fs.writeFileSync(LABELS_PATH, `${JSON.stringify(labels, null, 2)}\n`);
  return labels;
}
