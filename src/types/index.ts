export type Locale = "en" | "ja" | "zh" | "vi" | "id";

export type ThemeId =
  | "k-food"
  | "hallyu"
  | "k-beauty"
  | "k-culture"
  | "urban-nature"
  | "sanhaeng";

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

/** Trail / outing difficulty for sanhaeng and outdoor tips */
export type DifficultyLevel = "easy" | "moderate" | "hard";

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
  /** Hiking / outing difficulty (mainly sanhaeng) */
  difficulty?: DifficultyLevel;
  /** Best seasons and weather caveats */
  seasonTips?: LocalizedText;
  /** Transit, trailheads, parking, access notes */
  accessTips?: LocalizedText;
  /** Short curated “why go / how to go” blurb */
  editorial?: LocalizedText;
  /** Media / meme-driven travel trend tagging (e.g. 거제 야호!) */
  trend?: {
    label: string;
    source?: string;
    updatedAt: string;
  };
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
  "sanhaeng",
];

export const THEME_TAB_IDS: ThemeFilterId[] = ["all", ...THEMES];

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "id", label: "Bahasa Indonesia" },
];
