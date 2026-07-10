"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  loadGuideApiConfig,
  saveGuideApiConfig,
  clearGuideApiConfig,
} from "@/lib/guideBot/storage";
import type { GuideApiConfig } from "@/lib/guideBot/types";
import { ApiSetupPanel } from "./ApiSetupPanel";
import { ChatPanel } from "./ChatPanel";

export function GuideBot() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<GuideApiConfig | null>(null);
  const [showSetup, setShowSetup] = useState(true);

  useEffect(() => {
    const saved = loadGuideApiConfig();
    if (saved) {
      setConfig(saved);
      setShowSetup(false);
    }
  }, []);

  const handleSave = (next: GuideApiConfig) => {
    saveGuideApiConfig(next);
    setConfig(next);
    setShowSetup(false);
  };

  const handleChangeKey = () => {
    clearGuideApiConfig();
    setConfig(null);
    setShowSetup(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.guideBotOpen}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-2xl shadow-lg ring-4 ring-amber-200/60 transition hover:scale-105 hover:shadow-xl active:scale-95"
      >
        <span aria-hidden>📜</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-labelledby="guide-bot-title"
            className="relative flex h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:rounded-3xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] bg-gradient-to-r from-amber-50 to-[var(--color-accent-soft)] px-4 py-4">
              <div>
                <h2
                  id="guide-bot-title"
                  className="font-serif text-xl font-bold text-[var(--color-ink)]"
                >
                  {t.guideBotTitle}
                </h2>
                <p className="text-sm text-[var(--color-muted)]">{t.guideBotSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-[var(--color-muted)] transition hover:bg-white/80 hover:text-[var(--color-ink)]"
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col">
              {showSetup || !config ? (
                <ApiSetupPanel initial={config} onSave={handleSave} />
              ) : (
                <ChatPanel config={config} onChangeKey={handleChangeKey} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
