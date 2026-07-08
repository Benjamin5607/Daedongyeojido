export type Locale = "en" | "ja" | "zh" | "vi" | "id";

export type ThemeId =
  | "k-food"
  | "hallyu"
  | "k-beauty"
  | "k-culture"
  | "urban-nature";

/** UI theme filter — includes "all" to browse every category at once */
export type ThemeFilterId = ThemeId | "all";

export type LocalizedText = Record<Locale, string> & {
  /** Korean name for Naver Map search */
  ko?: string;
};

/** Administrative region codes mapped in src/data/region_labels.json */
export interface PlaceRegion {
  province: string;
  city?: string;
  district?: string;
}

export interface Place {
  theme: ThemeId;
  name: string | LocalizedText;
  address: string | LocalizedText;
  rating: number;
  description: LocalizedText;
  region: PlaceRegion;
  /** Naver Map/blog discovery spot — rarely listed on Google Maps */
  localGem?: boolean;
  imageUrl?: string;
}

export type ReviewSource = "google" | "naver";

export interface ScrapedReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  source: ReviewSource;
}

export interface PlaceReviewEntry {
  source: ReviewSource;
  totalCount: number;
  reviews: ScrapedReview[];
  fetchedAt: string;
  googleMapsUrl?: string;
  searchQuery?: string;
  error?: string;
}

export const THEMES: ThemeId[] = [
  "k-food",
  "hallyu",
  "k-beauty",
  "k-culture",
  "urban-nature",
];

export const THEME_TAB_IDS: ThemeFilterId[] = ["all", ...THEMES];

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "id", label: "Bahasa Indonesia" },
];
