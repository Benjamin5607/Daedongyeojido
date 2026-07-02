import { resolveLocalizedField } from "@/lib/i18n";
import type { IndexedPlace } from "@/lib/places";
import type { Locale } from "@/types";

export interface Review {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  visitMonth: string;
  tripType: string;
  helpful: number;
}

const AUTHORS = [
  "Sarah M.",
  "Kenji T.",
  "Minh L.",
  "Elena R.",
  "David K.",
  "Yuki S.",
  "Anna P.",
  "James W.",
  "Hana C.",
  "Lucas B.",
  "Mei Z.",
  "Omar H.",
];

const TRIP_TYPES: Record<Locale, string[]> = {
  en: ["Solo", "Couples", "Family", "Friends", "Business"],
  ja: ["一人", "カップル", "家族", "友人", "出張"],
  zh: ["独自", "情侣", "家庭", "朋友", "商务"],
  vi: ["Một mình", "Cặp đôi", "Gia đình", "Bạn bè", "Công tác"],
  id: ["Solo", "Pasangan", "Keluarga", "Teman", "Bisnis"],
};

const MONTHS: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ja: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  zh: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  vi: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"],
  id: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
};

const TITLE_TEMPLATES: Record<Locale, string[]> = {
  en: [
    "Absolutely worth the visit",
    "A highlight of our Korea trip",
    "Great experience overall",
    "Would come back again",
    "Hidden gem in the neighborhood",
  ],
  ja: [
    "ぜひ訪れたいスポット",
    "韓国旅行のハイライト",
    "とても良い体験でした",
    "また行きたいです",
    "近所の隠れた名所",
  ],
  zh: [
    "绝对值得一去",
    "韩国之旅的亮点",
    "整体体验很好",
    "还会再来",
    "附近的隐藏宝藏",
  ],
  vi: [
    "Đáng ghé thăm",
    "Điểm nhấn chuyến đi Hàn",
    "Trải nghiệm tuyệt vời",
    "Sẽ quay lại",
    "Địa điểm ẩn trong khu vực",
  ],
  id: [
    "Sangat layak dikunjungi",
    "Sorotan perjalanan Korea kami",
    "Pengalaman yang bagus",
    "Akan kembali lagi",
    "Permata tersembunyi di sekitar",
  ],
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getReviewsForPlace(
  place: IndexedPlace,
  locale: Locale,
  count = 4
): Review[] {
  const description = resolveLocalizedField(place.description, locale);
  const seed = hashString(`${place.slug}-${locale}`);

  return Array.from({ length: count }, (_, index) => {
    const reviewSeed = seed + index * 997;
    const rating = Math.min(
      5,
      Math.max(3, Math.round(place.rating + ((reviewSeed % 5) - 2) * 0.3))
    );
    const author = AUTHORS[reviewSeed % AUTHORS.length];
    const month = MONTHS[locale][reviewSeed % MONTHS[locale].length];
    const year = 2024 + (reviewSeed % 2);
    const tripType = TRIP_TYPES[locale][reviewSeed % TRIP_TYPES[locale].length];
    const title = TITLE_TEMPLATES[locale][reviewSeed % TITLE_TEMPLATES[locale].length];

    const snippets = [
      description,
      locale === "en"
        ? "Easy to reach by subway and well signposted for international visitors."
        : description,
    ];

    return {
      id: `${place.slug}-review-${index}`,
      author,
      rating,
      title,
      body: snippets[index % snippets.length],
      visitMonth: `${month} ${year}`,
      tripType,
      helpful: 3 + (reviewSeed % 47),
    };
  });
}
