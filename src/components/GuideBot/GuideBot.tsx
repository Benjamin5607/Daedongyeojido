"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  clearGuideApiConfig,
  loadGuideApiConfig,
  saveGuideApiConfig,
} from "@/lib/guideBot/storage";
import type { GuideApiConfig, GuideMode } from "@/lib/guideBot/types";
import { ApiSetupPanel } from "./ApiSetupPanel";
import { ChatPanel } from "./ChatPanel";

interface GuideBotProps {
  mode?: GuideMode;
  /** When true, render as an inline card instead of floating FAB */
  embedded?: boolean;
  seedPrompt?: string | null;
  onSeedConsumed?: () => void;
  /** Controlled open state for embedded trigger buttons */
  forceOpen?: boolean;
  onClose?: () => void;
}

export function GuideBot({
  mode = "history",
  embedded = false,
  seedPrompt = null,
  onSeedConsumed,
  forceOpen,
  onClose,
}: GuideBotProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(Boolean(forceOpen));
  const [config, setConfig] = useState<GuideApiConfig | null>(null);
  const [showSetup, setShowSetup] = useState(true);

  useEffect(() => {
    const saved = loadGuideApiConfig();
    if (saved) {
      setConfig(saved);
      setShowSetup(false);
    }
  }, []);

  useEffect(() => {
    if (typeof forceOpen === "boolean") setOpen(forceOpen);
  }, [forceOpen]);

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

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const title = mode === "hiking" ? t.guideBotHikingTitle : t.guideBotTitle;
  const subtitle =
    mode === "hiking" ? t.guideBotHikingSubtitle : t.guideBotSubtitle;
  const fabLabel = mode === "hiking" ? t.guideBotHikingOpen : t.guideBotOpen;
  const fabEmoji = mode === "hiking" ? "🥾" : "📜";
  const headerFrom =
    mode === "hiking"
      ? "from-emerald-50 to-[var(--color-accent-soft)]"
      : "from-amber-50 to-[var(--color-accent-soft)]";
  const fabClass =
    mode === "hiking"
      ? "from-emerald-600 to-teal-800 ring-emerald-200/60"
      : "from-amber-600 to-amber-800 ring-amber-200/60";

  const panel = (
    <div
      role="dialog"
      aria-labelledby="guide-bot-title"
      className={
        embedded
          ? "flex h-[min(70vh,560px)] w-full flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
          : "relative flex h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:rounded-3xl"
      }
    >
      <header
        className={`flex items-start justify-between gap-3 border-b border-[var(--color-border)] bg-gradient-to-r ${headerFrom} px-4 py-4`}
      >
        <div>
          <h2
            id="guide-bot-title"
            className="font-serif text-xl font-bold text-[var(--color-ink)]"
          >
            {title}
          </h2>
          <p className="text-sm text-[var(--color-muted)]">{subtitle}</p>
        </div>
        {!embedded && (
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-[var(--color-muted)] transition hover:bg-white/80 hover:text-[var(--color-ink)]"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {showSetup || !config ? (
          <ApiSetupPanel initial={config} onSave={handleSave} />
        ) : (
          <ChatPanel
            config={config}
            onChangeKey={handleChangeKey}
            mode={mode}
            seedPrompt={seedPrompt}
            onSeedConsumed={onSeedConsumed}
          />
        )}
      </div>
    </div>
  );

  if (embedded) {
    return panel;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={fabLabel}
        className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${fabClass} text-2xl text-white shadow-lg ring-4 transition hover:scale-105 hover:shadow-xl active:scale-95`}
      >
        <span aria-hidden>{fabEmoji}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          {panel}
        </div>
      )}
    </>
  );
}
