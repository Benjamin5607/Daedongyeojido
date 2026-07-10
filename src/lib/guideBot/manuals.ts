import type { GuideProvider } from "./types";
import type { Locale } from "@/types";

export interface ManualStep {
  title: string;
  steps: string[];
  note: string;
}

type ManualSet = Record<GuideProvider, ManualStep>;
type ManualLocale = Locale | "ko";

const MANUALS_KO: ManualSet = {
  gemini: {
    title: "Google Gemini 무료 API 키 발급",
    steps: [
      "https://aistudio.google.com/apikey 에 접속합니다.",
      "Google 계정으로 로그인합니다.",
      "「API 키 만들기」를 클릭해 키를 생성합니다.",
      "생성된 키를 복사해 아래 입력란에 붙여넣습니다.",
    ],
    note: "무료 티어에서 gemini-2.0-flash-lite 모델을 사용합니다. 키는 브라우저에만 저장되며 서버로 전송되지 않습니다.",
  },
  groq: {
    title: "Groq 무료 API 키 발급",
    steps: [
      "https://console.groq.com 에 가입·로그인합니다.",
      "왼쪽 메뉴에서 API Keys → Create API Key를 선택합니다.",
      "키 이름을 입력하고 생성합니다.",
      "키를 복사해 아래 입력란에 붙여넣습니다.",
    ],
    note: "무료 티어에서 llama-3.1-8b-instant 초고속 모델을 사용합니다.",
  },
  nvidia: {
    title: "NVIDIA NIM 무료 API 키 발급",
    steps: [
      "https://build.nvidia.com 에 가입·로그인합니다.",
      "meta/llama-3.1-8b-instruct 모델 페이지로 이동합니다.",
      "「Get API Key」 또는 우측 상단 프로필 → API Keys에서 키를 생성합니다.",
      "키를 복사해 아래 입력란에 붙여넣습니다.",
    ],
    note: "NVIDIA NIM 무료 크레딧으로 가벼운 Llama 3.1 8B 모델을 사용합니다.",
  },
};

const MANUALS_EN: ManualSet = {
  gemini: {
    title: "Get a free Google Gemini API key",
    steps: [
      "Open https://aistudio.google.com/apikey",
      "Sign in with your Google account.",
      "Click “Create API key” and generate a key.",
      "Copy the key and paste it below.",
    ],
    note: "Uses gemini-2.0-flash-lite on the free tier. Your key stays in the browser only.",
  },
  groq: {
    title: "Get a free Groq API key",
    steps: [
      "Sign up at https://console.groq.com",
      "Go to API Keys → Create API Key.",
      "Name your key and create it.",
      "Copy the key and paste it below.",
    ],
    note: "Uses the ultra-fast llama-3.1-8b-instant model on the free tier.",
  },
  nvidia: {
    title: "Get a free NVIDIA NIM API key",
    steps: [
      "Sign up at https://build.nvidia.com",
      "Open the meta/llama-3.1-8b-instruct model page.",
      "Click “Get API Key” or Profile → API Keys.",
      "Copy the key and paste it below.",
    ],
    note: "Uses lightweight Llama 3.1 8B via NVIDIA NIM free credits.",
  },
};

const MANUALS: Record<ManualLocale, ManualSet> = {
  en: MANUALS_EN,
  ja: MANUALS_EN,
  zh: MANUALS_EN,
  vi: MANUALS_EN,
  id: MANUALS_EN,
  ko: MANUALS_KO,
};

export function resolveManualLocale(uiLocale: Locale): ManualLocale {
  if (typeof navigator !== "undefined" && navigator.language.startsWith("ko")) {
    return "ko";
  }
  return uiLocale;
}

export function getApiManual(provider: GuideProvider, locale: Locale): ManualStep {
  const manualLocale = resolveManualLocale(locale);
  const set = MANUALS[manualLocale] ?? MANUALS_EN;
  return set[provider];
}
