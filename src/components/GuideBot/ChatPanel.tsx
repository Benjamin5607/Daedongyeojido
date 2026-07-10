"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { sendGuideChat } from "@/lib/guideBot/client";
import { buildGreeting, buildGuideSystemPrompt } from "@/lib/guideBot/personality";
import {
  findNearbyHistoricalPlaces,
  formatNearbyContext,
} from "@/lib/guideBot/nearbyPlaces";
import type { GuideApiConfig, ChatMessage } from "@/lib/guideBot/types";

interface ChatPanelProps {
  config: GuideApiConfig;
  onChangeKey: () => void;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatPanel({ config, onChangeKey }: ChatPanelProps) {
  const { locale, t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [nearbyContext, setNearbyContext] = useState<string | undefined>();
  const [locating, setLocating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ id: newId(), role: "assistant", content: buildGreeting(locale) }]);
  }, [locale]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const runChat = useCallback(
    async (nextMessages: ChatMessage[], context?: string) => {
      setLoading(true);
      try {
        const system = buildGuideSystemPrompt(locale, context ?? nearbyContext);
        const reply = await sendGuideChat(config, system, nextMessages);
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "assistant", content: reply },
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : t.guideBotError;
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "assistant", content: `${t.guideBotError}\n${msg}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [config, locale, nearbyContext, t.guideBotError]
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { id: newId(), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    await runChat(next);
  };

  const handleNearby = () => {
    if (!navigator.geolocation) {
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: t.guideBotLocationDenied },
      ]);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const places = findNearbyHistoricalPlaces(
          pos.coords.latitude,
          pos.coords.longitude,
          locale
        );
        const context = formatNearbyContext(places);
        setNearbyContext(context);

        const userMsg: ChatMessage = {
          id: newId(),
          role: "user",
          content: t.guideBotNearbyPrompt,
        };
        const next = [...messages, userMsg];
        setMessages(next);
        setLocating(false);
        await runChat(next, context);
      },
      () => {
        setLocating(false);
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "assistant", content: t.guideBotLocationDenied },
        ]);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2">
        <button
          type="button"
          onClick={handleNearby}
          disabled={loading || locating}
          className="flex items-center gap-1.5 rounded-full bg-[var(--color-trip-green)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-trip-green-dark)] transition hover:bg-[var(--color-trip-green)]/20 disabled:opacity-50"
        >
          <span aria-hidden>🧭</span>
          {locating ? t.guideBotLocationLoading : t.guideBotNearby}
        </button>
        <button
          type="button"
          onClick={onChangeKey}
          className="text-xs font-medium text-[var(--color-muted)] underline-offset-2 hover:underline"
        >
          {t.guideBotChangeKey}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[var(--color-trip-green)] text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-ink)]"
              }`}
            >
              {msg.role === "assistant" && (
                <p className="mb-1 font-serif text-xs font-semibold text-[var(--color-trip-green-dark)]">
                  {t.guideBotTitle}
                </p>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <p className="text-center text-xs text-[var(--color-muted)]">{t.guideBotThinking}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2 border-t border-[var(--color-border)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.guideBotInputPlaceholder}
          disabled={loading}
          className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-trip-green)] focus:ring-2 focus:ring-[var(--color-trip-green)]/20"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-xl bg-[var(--color-trip-green)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-trip-green-dark)] disabled:opacity-50"
        >
          {t.guideBotSend}
        </button>
      </form>
    </div>
  );
}
