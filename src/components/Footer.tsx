"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { THEMES } from "@/types";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-ink)] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-serif text-xl font-semibold">{t.siteTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            {t.footerTagline}
          </p>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
            {t.footerExplore}
          </p>
          <ul className="space-y-2 text-sm text-white/80">
            {THEMES.map((theme) => (
              <li key={theme}>
                <Link
                  href={`/themes/${theme}`}
                  className="transition hover:text-[var(--color-trip-green-light)]"
                >
                  {t.themes[theme]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
            {t.footerAbout}
          </p>
          <ul className="space-y-2 text-sm text-white/80">
            <li>
              <Link href="/regions" className="transition hover:text-[var(--color-trip-green-light)]">
                {t.navRegions}
              </Link>
            </li>
            <li>
              <Link href="/search" className="transition hover:text-[var(--color-trip-green-light)]">
                {t.navSearch}
              </Link>
            </li>
          </ul>
          <p className="mt-6 text-xs text-white/40">{t.footer}</p>
        </div>
      </div>
    </footer>
  );
}
