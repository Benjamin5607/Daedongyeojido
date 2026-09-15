import type { GuideProvider } from "./types";

export interface ProviderInfo {
  id: GuideProvider;
  label: string;
  model: string;
  modelNote: string;
  signupUrl: string;
  docsUrl: string;
}

/** Lightweight / fast models only — auto-selected per provider. */
export const GUIDE_PROVIDERS: ProviderInfo[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    model: "gemini-2.0-flash-lite",
    modelNote: "gemini-2.0-flash-lite (fast, free tier)",
    signupUrl: "https://aistudio.google.com/apikey",
    docsUrl: "https://ai.google.dev/gemini-api/docs",
  },
  {
    id: "groq",
    label: "Groq",
    model: "llama-3.1-8b-instant",
    modelNote: "llama-3.1-8b-instant (ultra-fast, free tier)",
    signupUrl: "https://console.groq.com/keys",
    docsUrl: "https://console.groq.com/docs/quickstart",
  },
  {
    id: "nvidia",
    label: "NVIDIA NIM",
    /** Hosted meta/llama-3.1-8b-instruct reached EOL (410) on 2026-08-26. */
    model: "google/gemma-4-31b-it",
    modelNote: "google/gemma-4-31b-it (NIM catalog)",
    signupUrl: "https://build.nvidia.com/google/gemma-4-31b-it",
    docsUrl: "https://docs.api.nvidia.com/nim/reference/llm-apis",
  },
];

export function getProviderInfo(id: GuideProvider): ProviderInfo {
  return GUIDE_PROVIDERS.find((p) => p.id === id) ?? GUIDE_PROVIDERS[0];
}
