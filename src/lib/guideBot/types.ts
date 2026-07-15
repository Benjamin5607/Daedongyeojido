export type GuideProvider = "gemini" | "groq" | "nvidia";

export interface GuideApiConfig {
  provider: GuideProvider;
  apiKey: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface NearbyPlaceContext {
  slug: string;
  name: string;
  /** Korean name for encyclopedia / heritage lookups */
  nameKo: string;
  distanceKm: number;
  description: string;
  theme: string;
  regionLabel: string;
}
