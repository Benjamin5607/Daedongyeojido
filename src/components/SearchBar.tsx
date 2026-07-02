"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface SearchBarProps {
  defaultQuery?: string;
  size?: "hero" | "compact";
  autoFocus?: boolean;
}

export function SearchBar({
  defaultQuery = "",
  size = "hero",
  autoFocus = false,
}: SearchBarProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState(defaultQuery);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const isHero = size === "hero";

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full overflow-hidden rounded-full border bg-white shadow-lg ${
        isHero
          ? "border-[var(--color-border)] shadow-[var(--color-trip-green)]/10"
          : "border-[var(--color-border)] shadow-sm"
      }`}
    >
      <label className="sr-only" htmlFor="travel-search">
        {t.searchPlaceholder}
      </label>
      <input
        id="travel-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.searchPlaceholder}
        autoFocus={autoFocus}
        className={`min-w-0 flex-1 bg-transparent text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)] ${
          isHero ? "px-6 py-4 text-base sm:text-lg" : "px-4 py-2.5 text-sm"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 bg-[var(--color-trip-green)] font-semibold text-white transition hover:bg-[var(--color-trip-green-dark)] ${
          isHero ? "px-8 py-4 text-sm sm:text-base" : "px-5 py-2.5 text-sm"
        }`}
      >
        {t.searchPlaces}
      </button>
    </form>
  );
}
