"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { testGuideApi } from "@/lib/guideBot/client";
import { getApiManual } from "@/lib/guideBot/manuals";
import { GUIDE_PROVIDERS } from "@/lib/guideBot/providers";
import type { GuideApiConfig, GuideProvider } from "@/lib/guideBot/types";

interface ApiSetupPanelProps {
  initial?: GuideApiConfig | null;
  onSave: (config: GuideApiConfig) => void;
}

export function ApiSetupPanel({ initial, onSave }: ApiSetupPanelProps) {
  const { locale, t } = useLanguage();
  const [provider, setProvider] = useState<GuideProvider>(
    initial?.provider ?? "gemini"
  );
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const manual = getApiManual(provider, locale);
  const providerInfo = GUIDE_PROVIDERS.find((p) => p.id === provider)!;

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError(t.guideBotNoKey);
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(false);

    const config: GuideApiConfig = { provider, apiKey: trimmed };
    try {
      await testGuideApi(config);
      setSuccess(true);
      onSave(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.guideBotTestFail);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4 overflow-y-auto px-4 py-4">
      <div>
        <h3 className="font-serif text-lg font-semibold text-[var(--color-ink)]">
          {t.guideBotSetupTitle}
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{t.guideBotSetupDesc}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {GUIDE_PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setProvider(p.id);
              setError(null);
              setSuccess(false);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              provider === p.id
                ? "bg-[var(--color-trip-green)] text-white"
                : "border border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-trip-green)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-accent-soft)]/50 p-4">
        <h4 className="font-semibold text-[var(--color-ink)]">{manual.title}</h4>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-[var(--color-ink)]">
          {manual.steps.map((step) => (
            <li key={step}>
              {step.startsWith("http") ? (
                <a
                  href={step.split(" ")[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-trip-green-dark)] underline"
                >
                  {step}
                </a>
              ) : (
                step
              )}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-[var(--color-muted)]">{manual.note}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <a
            href={providerInfo.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--color-trip-green-dark)] underline"
          >
            {t.guideBotSignupLink} ↗
          </a>
          <a
            href={providerInfo.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-muted)] underline"
          >
            {t.guideBotDocsLink}
          </a>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-ink)]">
          {t.guideBotApiKey}
          <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
            ({providerInfo.modelNote})
          </span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setError(null);
            setSuccess(false);
          }}
          placeholder={t.guideBotApiKeyPlaceholder}
          className="mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-trip-green)] focus:ring-2 focus:ring-[var(--color-trip-green)]/20"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
          {t.guideBotTestOk}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={testing || !apiKey.trim()}
        className="w-full rounded-xl bg-[var(--color-trip-green)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-trip-green-dark)] disabled:opacity-50"
      >
        {testing ? t.guideBotThinking : t.guideBotSave}
      </button>
    </div>
  );
}
