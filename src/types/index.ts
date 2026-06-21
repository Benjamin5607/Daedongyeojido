export type Locale = "en" | "ja" | "zh" | "vi" | "id";

export type ThemeId =
  | "k-food"
  | "hallyu"
  | "k-beauty"
  | "k-culture"
  | "urban-nature";

export type LocalizedText = Record<Locale, string>;

export interface Place {
  theme: ThemeId;
  name: string | LocalizedText;
  address: string | LocalizedText;
  rating: number;
  description: LocalizedText;
  imageUrl?: string;
}

export const THEMES: ThemeId[] = [
  "k-food",
  "hallyu",
  "k-beauty",
  "k-culture",
  "urban-nature",
];

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "id", label: "Bahasa Indonesia" },
];
