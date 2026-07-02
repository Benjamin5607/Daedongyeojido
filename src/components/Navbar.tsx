"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

const NAV_LINKS = [
  { href: "/", labelKey: "navHome" as const },
  { href: "/themes/k-food", labelKey: "navFood" as const },
  { href: "/themes/hallyu", labelKey: "navHallyu" as const },
  { href: "/themes/k-culture", labelKey: "navCulture" as const },
  { href: "/regions", labelKey: "navRegions" as const },
];

export function Navbar() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-trip-green)] text-lg font-bold text-white shadow-sm"
          >
            東
          </div>
          <div>
            <p className="font-serif text-lg font-semibold tracking-wide text-[var(--color-ink)]">
              {t.siteTitle}
            </p>
            <p className="hidden text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--color-trip-green)] sm:block">
              {t.heroEyebrow}
            </p>
          </div>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {NAV_LINKS.map(({ href, labelKey }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-[var(--color-trip-green)]/10 text-[var(--color-trip-green-dark)]"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-accent-soft)]"
                }`}
              >
                {t[labelKey]}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-trip-green)] lg:hidden"
          >
            {t.navSearch}
          </Link>

          <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <span className="sr-only">{t.selectLanguage}</span>
            <select
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value as typeof locale)
              }
              className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-white px-2 py-2 text-sm text-[var(--color-ink)] shadow-sm outline-none transition focus:border-[var(--color-trip-green)] focus:ring-2 focus:ring-[var(--color-trip-green)]/20"
            >
              {LOCALES.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="flex gap-1 overflow-x-auto border-t border-[var(--color-border)] px-4 py-2 lg:hidden"
      >
        {NAV_LINKS.map(({ href, labelKey }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-[var(--color-trip-green)] text-white"
                  : "bg-white text-[var(--color-ink)]"
              }`}
            >
              {t[labelKey]}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
