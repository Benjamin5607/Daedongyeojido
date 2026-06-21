"use client";

import { LOCALES } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

export function Navbar() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <header className="relative z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] text-lg text-[var(--color-accent)]"
          >
            東
          </div>
          <div>
            <p className="font-serif text-lg font-semibold tracking-wide text-[var(--color-ink)]">
              {t.siteTitle}
            </p>
            <p className="hidden text-xs text-[var(--color-muted)] sm:block">
              {t.siteSubtitle}
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <span className="sr-only">{t.selectLanguage}</span>
          <span aria-hidden className="hidden sm:inline">
            {t.selectLanguage}
          </span>
          <select
            value={locale}
            onChange={(event) =>
              setLocale(event.target.value as typeof locale)
            }
            className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] shadow-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
          >
            {LOCALES.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
