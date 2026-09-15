"use client";

import { useState } from "react";
import { GuideBot } from "@/components/GuideBot/GuideBot";
import { useLanguage } from "@/context/LanguageContext";

const ACTION_KEYS = [
  "guideBotHikingQuickPlan",
  "guideBotHikingQuickPrep",
  "guideBotHikingQuickCourse",
  "guideBotHikingQuickBeginner",
] as const;

export function HikingGuideSection() {
  const { t } = useLanguage();
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null);
  const [seedToken, setSeedToken] = useState(0);

  const launch = (prompt: string) => {
    setSeedPrompt(prompt);
    setSeedToken((n) => n + 1);
  };

  return (
    <section className="mb-10 overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_1fr] lg:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            {t.guideBotHikingEyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
            {t.guideBotHikingSectionTitle}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-muted)] sm:text-base">
            {t.guideBotHikingSectionDesc}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {ACTION_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => launch(t[key])}
                className="rounded-full border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 transition hover:border-emerald-500 hover:bg-emerald-50"
              >
                {t[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[420px]">
          <GuideBot
            key={`hiking-guide-${seedToken}`}
            mode="hiking"
            embedded
            seedPrompt={seedPrompt}
            onSeedConsumed={() => setSeedPrompt(null)}
          />
        </div>
      </div>
    </section>
  );
}
