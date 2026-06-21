"use client";

import { THEMES, type ThemeId } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

const THEME_ICONS: Record<ThemeId, string> = {
  "k-food": "🍖",
  hallyu: "🎤",
  "k-beauty": "✨",
  "k-culture": "🏮",
  "urban-nature": "🌿",
};

interface ThemeTabsProps {
  activeTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

export function ThemeTabs({ activeTheme, onThemeChange }: ThemeTabsProps) {
  const { t } = useLanguage();

  return (
    <section className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 right-0 h-32 w-32 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, var(--color-accent) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      />

      <div className="mb-6">
        <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
          {t.exploreHeading}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)] sm:text-base">
          {t.themeDescriptions[activeTheme]}
        </p>
      </div>

      <div
        role="tablist"
        aria-label={t.themeTablistAria}
        className="flex flex-wrap gap-2"
      >
        {THEMES.map((theme) => {
          const isActive = theme === activeTheme;
          return (
            <button
              key={theme}
              role="tab"
              aria-selected={isActive}
              onClick={() => onThemeChange(theme)}
              className={`group flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/25"
                  : "border-[var(--color-border)] bg-white/80 text-[var(--color-ink)] hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-accent-soft)]"
              }`}
            >
              <span aria-hidden>{THEME_ICONS[theme]}</span>
              <span>{t.themes[theme]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
