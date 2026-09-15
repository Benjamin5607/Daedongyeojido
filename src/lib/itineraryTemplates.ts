import type { Locale, ThemeId } from "@/types";

export interface ItineraryTemplate {
  id: string;
  theme: ThemeId;
  /** Days of place slugs (must match IndexedPlace.slug) */
  schedule: string[][];
  title: Record<Locale, string>;
  blurb: Record<Locale, string>;
}

/**
 * Theme-based route templates — no account or booking required.
 * Slugs must stay in sync with getAllPlaces() indexing rules.
 */
export const ITINERARY_TEMPLATES: ItineraryTemplate[] = [
  {
    id: "seoul-near-peaks-1d",
    theme: "sanhaeng",
    schedule: [
      [
        "bukhansan-national-park-seodaemun",
        "dobongsan-podae-ridge-dobong",
        "namsan-dulregil-jung",
      ],
    ],
    title: {
      en: "Seoul near-peaks · 1 day",
      ja: "ソウル近郊の山 · 1日",
      zh: "首尔近郊山峰 · 1日",
      vi: "Núi gần Seoul · 1 ngày",
      id: "Puncak dekat Seoul · 1 hari",
    },
    blurb: {
      en: "Bukhansan + Dobong ridge energy, then an easy Namsan loop to cool down.",
      ja: "북한산・도봉능선 후 남산 둘레길로 쿨다운.",
      zh: "北汉山与道峰山脊后，以南山环路收尾。",
      vi: "Bukhansan + sống Dobong, rồi vòng Namsan nhẹ.",
      id: "Bukhansan + punggungan Dobong, lalu loop Namsan yang ringan.",
    },
  },
  {
    id: "jeju-hallasan-olle",
    theme: "sanhaeng",
    schedule: [
      ["hallasan-national-park-jeju-si"],
      ["seogwipo-olle-trail-section-seogwipo-si"],
    ],
    title: {
      en: "Jeju high & coast · 2 days",
      ja: "済州の高峰と海岸 · 2日",
      zh: "济州高峰与海岸 · 2日",
      vi: "Jeju cao nguyên & biển · 2 ngày",
      id: "Jeju puncak & pantai · 2 hari",
    },
    blurb: {
      en: "Hallasan summit day, then a softer Olle coastal walk in Seogwipo.",
      ja: "한라산 정상 데이 후 서귀포 올레로 회복 산책.",
      zh: "汉拿山登顶日，次日西归浦偶来海岸缓步。",
      vi: "Ngày đỉnh Hallasan, rồi Olle ven biển Seogwipo.",
      id: "Hari puncak Hallasan, lalu Olle pantai Seogwipo.",
    },
  },
  {
    id: "seoul-food-halfday",
    theme: "k-food",
    schedule: [
      [
        "gwangjang-market-jongno",
        "tongin-market-mapo",
        "myeongdong-kyoja-jung-seoul",
      ],
    ],
    title: {
      en: "Seoul market crawl · half day",
      ja: "ソウル市場めぐり · 半日",
      zh: "首尔市场巡游 · 半天",
      vi: "Chợ Seoul · nửa ngày",
      id: "Jelajah pasar Seoul · setengah hari",
    },
    blurb: {
      en: "Classic market bites and a noodle stop — no reservations needed.",
      ja: "시장 한입 + 칼국수 — 예약 불필요.",
      zh: "经典市场小吃与面条站 — 无需预约。",
      vi: "Ăn chợ kinh điển + mì — không cần đặt chỗ.",
      id: "Camilan pasar klasik + mi — tanpa reservasi.",
    },
  },
  {
    id: "hallyu-gangnam-hongdae",
    theme: "hallyu",
    schedule: [
      ["hybe-insight-yongsan", "k-star-road-gangnam", "smtown-coex-artium-gangnam"],
      ["hongdae-playground-mapo", "keipap-seukweeo-hongdae-seoul"],
    ],
    title: {
      en: "Hallyu Seoul · 2 days",
      ja: "韓流ソウル · 2日",
      zh: "韩流首尔 · 2日",
      vi: "Hallyu Seoul · 2 ngày",
      id: "Hallyu Seoul · 2 hari",
    },
    blurb: {
      en: "Agency & K-Star day, then Hongdae fan streets — share the link, no login.",
      ja: "엔터/케이스타 데이 후 홍대 — 링크 공유만으로 OK.",
      zh: "经纪公司与明星路一日，次日弘大饭街 — 分享链接即可。",
      vi: "Ngày agency & K-Star, rồi phố Hongdae — chỉ cần chia sẻ link.",
      id: "Hari agensi & K-Star, lalu jalan Hongdae — cukup bagikan tautan.",
    },
  },
];

export function getTemplateLabel(
  template: ItineraryTemplate,
  locale: Locale
): { title: string; blurb: string } {
  return {
    title: template.title[locale] ?? template.title.en,
    blurb: template.blurb[locale] ?? template.blurb.en,
  };
}
