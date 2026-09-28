import type { ThemeId } from "@/types";

/** Categories aligned with the personal trip-guide depth of osaka_kokura_trip */
export type TripGuideCategory =
  | "transit"
  | "sightseeing"
  | "food"
  | "shopping"
  | "nature"
  | "hiking"
  | "culture"
  | "rest";

export interface TripGuideStop {
  id: string;
  dayNumber: number;
  timeSlot: string;
  title: string;
  category: TripGuideCategory;
  locationName: string;
  slug?: string;
  regionLabel: string;
  transitGuide: string;
  description: string;
  tip: string;
  foodName: string;
  foodMenu: string;
  foodFeature: string;
  naverUrl?: string;
  googleUrl?: string;
  difficulty?: string;
  completed?: boolean;
}

export interface TripGuideChecklistItem {
  id: string;
  title: string;
  category: string;
  checked?: boolean;
}

export interface TripGuideContact {
  id: string;
  name: string;
  category: string;
  phone: string;
  note: string;
}

export interface TripGuideTransitTip {
  id: string;
  title: string;
  body: string;
}

export interface TripGuideAlternative {
  id: string;
  dayNumber: number;
  originalTitle: string;
  situation: string;
  alternativeTitle: string;
  description: string;
}

export interface TripGuideDayMeta {
  day: number;
  label: string;
  city: string;
  themes: ThemeId[];
}

export interface TripGuide {
  version: 1;
  createdAt: string;
  source: "local" | "nvidia";
  meta: {
    title: string;
    subtitle: string;
    days: TripGuideDayMeta[];
  };
  schedule: string[][];
  stops: TripGuideStop[];
  checklists: TripGuideChecklistItem[];
  contacts: TripGuideContact[];
  transitTips: TripGuideTransitTip[];
  alternatives: TripGuideAlternative[];
}
