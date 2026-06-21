import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repairRegionLabels } from "./repair-region-labels.mjs";

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

/**
 * @param {object[]} places
 */
export function syncRegionLabels(places) {
  repairRegionLabels(places);
  const labels = JSON.parse(fs.readFileSync(LABELS_PATH, "utf8"));

  for (const [code, value] of Object.entries(PROVINCE_OVERRIDES)) {
    labels.provinces[code] = value;
  }

  fs.writeFileSync(LABELS_PATH, `${JSON.stringify(labels, null, 2)}\n`);
  return labels;
}
