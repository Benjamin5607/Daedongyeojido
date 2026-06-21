import dictionary from "@/locales/dictionary.json";
import type { Locale, LocalizedText } from "@/types";

export type Dictionary = (typeof dictionary)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return dictionary[locale];
}

export function resolveLocalizedField(
  field: string | LocalizedText,
  locale: Locale
): string {
  if (typeof field === "string") return field;
  return field[locale] ?? field.en ?? Object.values(field)[0] ?? "";
}
