"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

const NAV_LINKS = [
  { href: "/", labelKey: "navHome" as const, icon: "⌂" },
  { href: "/themes/k-food", labelKey: "navFood" as const, icon: "食" },
  { href: "/themes/hallyu", labelKey: "navHallyu" as const, icon: "韓" },
  { href: "/themes/k-culture", labelKey: "navCulture" as const, icon: "文" },
  { href: "/themes/sanhaeng", labelKey: "navSanhaeng" as const, icon: "山" },
  { href: "/regions", labelKey: "navRegions" as const, icon: "地" },
  { href: "/planner", labelKey: "navPlanner" as const, icon: "日" },
];

/** Compact bottom bar — primary destinations only */
const BOTTOM_LINKS = [
  { href: "/", labelKey: "navHome" as const, icon: "⌂" },
  { href: "/themes/k-food", labelKey: "navFood" as const, icon: "食" },
  { href: "/themes/sanhaeng", labelKey: "navSanhaeng" as const, icon: "山" },
  { href: "/regions", labelKey: "navRegions" as const, icon: "地" },
  { href: "/planner", labelKey: "navPlanner" as const, icon: "日" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Navbar() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md pt-[var(--safe-top)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
          <Link href="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-2.5">
            <div
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-trip-green)] text-base font-bold text-white shadow-sm sm:h-10 sm:w-10 sm:text-lg"
            >
              東
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-sm font-semibold tracking-wide text-[var(--color-ink)] sm:text-lg">
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
              const isActive = isActivePath(pathname, href);
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

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/search"
              className="btn-touch inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-2.5 text-xs font-medium text-[var(--color-ink)] transition hover:border-[var(--color-trip-green)] sm:px-3 sm:text-sm"
            >
              {t.navSearch}
            </Link>

            <label className="flex items-center text-sm text-[var(--color-muted)]">
              <span className="sr-only">{t.selectLanguage}</span>
              <select
                value={locale}
                onChange={(event) =>
                  setLocale(event.target.value as typeof locale)
                }
                className="btn-touch max-w-[6.5rem] cursor-pointer rounded-lg border border-[var(--color-border)] bg-white px-1.5 text-xs text-[var(--color-ink)] shadow-sm outline-none transition focus:border-[var(--color-trip-green)] focus:ring-2 focus:ring-[var(--color-trip-green)]/20 sm:max-w-none sm:px-2 sm:text-sm"
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

        {/* Tablet mid-nav: single-row horizontal scroll under brand (no wrap jump) */}
        <nav
          aria-label="Tablet navigation"
          className="chip-scroll hidden border-t border-[var(--color-border)] px-4 py-2 md:flex lg:hidden"
        >
          {NAV_LINKS.map(({ href, labelKey }) => {
            const isActive = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "bg-[var(--color-trip-green)] text-white"
                    : "bg-white text-[var(--color-ink)] ring-1 ring-[var(--color-border)]"
                }`}
              >
                {t[labelKey]}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Phone bottom nav — fixed height, safe-area, thumb targets */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/97 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 px-1">
          {BOTTOM_LINKS.map(({ href, labelKey, icon }) => {
            const isActive = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold transition ${
                  isActive
                    ? "text-[var(--color-trip-green-dark)]"
                    : "text-[var(--color-muted)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    isActive
                      ? "bg-[var(--color-trip-green)] text-white shadow-sm"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {icon}
                </span>
                <span className="max-w-full truncate leading-tight">
                  {t[labelKey]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
