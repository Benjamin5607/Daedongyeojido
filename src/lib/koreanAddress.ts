import naverSearchKo from "@/data/naver_search_ko.json";
import regionLabels from "@/data/region_labels.json";
import type { PlaceRegion } from "@/types";

type LabelMap = Record<string, Record<string, string>>;

const labels = regionLabels as {
  provinces: LabelMap;
  cities: LabelMap;
  districts: LabelMap;
};

const SEOUL_GU_KO: Record<string, string> = {
  yongsan: "용산구",
  jongno: "종로구",
  gangnam: "강남구",
  "jung-seoul": "중구",
  mapo: "마포구",
  yeongdeungpo: "영등포구",
  seodaemun: "서대문구",
};

const BUSAN_GU_KO: Record<string, string> = {
  haeundae: "해운대구",
  "jung-busan": "중구",
  suyeong: "수영구",
  saha: "사하구",
  geumjeong: "금정구",
  gijang: "기장군",
  yeongdo: "영도구",
  "nam-busan": "남구",
};

/** Hangul district names for metro areas; falls back to region label ko field. */
function districtKo(province: string, code: string): string {
  if (province === "seoul") return SEOUL_GU_KO[code] ?? labels.districts[code]?.ko ?? code;
  if (province === "busan") return BUSAN_GU_KO[code] ?? labels.districts[code]?.ko ?? code;
  return labels.districts[code]?.ko ?? code;
}

/** Compose a Korean admin address from region codes (for Naver search). */
export function buildKoreanAddress(region: PlaceRegion): string {
  const parts: string[] = [];

  const provinceKo = labels.provinces[region.province]?.ko;
  if (provinceKo) parts.push(provinceKo);

  if (region.city) {
    const cityKo = labels.cities[region.city]?.ko;
    if (cityKo) parts.push(cityKo);
  }

  if (region.district) {
    parts.push(districtKo(region.province, region.district));
  }

  return parts.join(" ");
}

const koNameByEn = naverSearchKo as Record<string, string>;

/** Resolve Korean Hangul place name for Naver Map search. */
export function resolveKoreanPlaceName(nameEn: string, nameField: { ko?: string; en: string }): string {
  if (nameField.ko) return nameField.ko;
  return koNameByEn[nameEn] ?? koNameByEn[nameField.en] ?? nameField.en;
}
