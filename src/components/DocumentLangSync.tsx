"use client";

import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";

export function DocumentLangSync() {
  const { locale } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
