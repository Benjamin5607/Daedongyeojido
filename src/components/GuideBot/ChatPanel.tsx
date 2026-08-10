"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { sendGuideChat } from "@/lib/guideBot/client";
import { fetchGuideKnowledge } from "@/lib/guideBot/knowledge/client";
import { buildGreeting, buildGuideSystemPrompt } from "@/lib/guideBot/personality";
import {
  findNearbyHistoricalPlaces,
  formatNearbyContext,
} from "@/lib/guideBot/nearbyPlaces";
import { extractMentionedPlaces } from "@/lib/guideBot/extractPlaces";
import { PlannerMap } from "@/components/PlannerMap";
import type { IndexedPlace } from "@/lib/places";
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
  const [nearbyNamesKo, setNearbyNamesKo] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [mentionedPlaces, setMentionedPlaces] = useState<IndexedPlace[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "map">("chat");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ id: newId(), role: "assistant", content: buildGreeting(locale) }]);
  }, [locale]);

  useEffect(() => {
    if (activeTab === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, activeTab]);

  // Extract mentioned places from chat history
  useEffect(() => {
    const places: IndexedPlace[] = [];
    messages.forEach((msg) => {
      const extracted = extractMentionedPlaces(msg.content);
      extracted.forEach((p) => {
        if (!places.some((existing) => p.slug === existing.slug)) {
          places.push(p);
        }
      });
    });
    setMentionedPlaces(places);
  }, [messages]);

  // TTS Voice Player / Storyteller settings
  const speakMessage = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown styling, emojis and brackets for natural speech
    const cleanText = text
      .replace(/[📜🧭🎨🍗🎤✨🏮🌿❤️🤍🎯👀👍📢🔍🧭🗺️🗓️🗑️🔗✓➕➖▲▼✕]/g, "")
      .replace(/[\*`#_]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Apply native voice locale
    if (locale === "ja") {
      utterance.lang = "ja-JP";
    } else if (locale === "zh") {
      utterance.lang = "zh-CN";
    } else if (locale === "vi") {
      utterance.lang = "vi-VN";
    } else if (locale === "id") {
      utterance.lang = "id-ID";
    } else if (locale === "en") {
      utterance.lang = "en-US";
    } else {
      utterance.lang = "ko-KR";
    }

    // Storyteller cadence parameters
    utterance.rate = 0.93; // 7% slower for storyteller atmosphere
    utterance.pitch = 0.88; // Deeper, warm timbre

    utterance.onend = () => {
      setSpeakingId(null);
    };

    utterance.onerror = () => {
      setSpeakingId(null);
    };

    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Stop TTS if user closes or unmounts panel
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const runChat = useCallback(
    async (
      nextMessages: ChatMessage[],
      context?: string,
      namesKo?: string[]
    ) => {
      setLoading(true);
      try {
        const lastUser = [...nextMessages]
          .reverse()
          .find((m) => m.role === "user")?.content;
        const knowledge = lastUser
          ? await fetchGuideKnowledge(lastUser, namesKo ?? nearbyNamesKo)
          : null;
        const system = buildGuideSystemPrompt(
          locale,
          context ?? nearbyContext,
          knowledge?.formatted
        );
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
    [config, locale, nearbyContext, nearbyNamesKo, t.guideBotError]
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
        const namesKo = places.map((p) => p.nameKo).filter(Boolean);
        setNearbyContext(context);
        setNearbyNamesKo(namesKo);

        const userMsg: ChatMessage = {
          id: newId(),
          role: "user",
          content: t.guideBotNearbyPrompt,
        };
        const next = [...messages, userMsg];
        setMessages(next);
        setLocating(false);
        await runChat(next, context, namesKo);
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
      {/* Top Tabs Bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5 bg-stone-50/70">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "chat"
                ? "bg-[var(--color-trip-green)] text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            💬 Chat
          </button>
          {mentionedPlaces.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "map"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              🗺️ Map ({mentionedPlaces.length})
            </button>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={handleNearby}
            disabled={loading || locating}
            className="flex items-center gap-1 rounded-full bg-[var(--color-trip-green)]/10 px-2.5 py-1.5 text-[10px] font-bold text-[var(--color-trip-green-dark)] transition hover:bg-[var(--color-trip-green)]/20 disabled:opacity-50"
          >
            🧭 {locating ? t.guideBotLocationLoading : t.guideBotNearby}
          </button>
          <button
            type="button"
            onClick={onChangeKey}
            className="text-[10px] font-medium text-[var(--color-muted)] underline hover:text-[var(--color-ink)]"
          >
            {t.guideBotChangeKey}
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 min-h-0 relative">
        {activeTab === "map" && mentionedPlaces.length > 0 ? (
          <div className="absolute inset-0 h-full w-full p-4">
            <PlannerMap places={mentionedPlaces} />
          </div>
        ) : (
          <div className="h-full space-y-3 overflow-y-auto px-4 py-3 bg-[var(--color-surface)]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap relative group ${
                    msg.role === "user"
                      ? "bg-[var(--color-trip-green)] text-white shadow-sm"
                      : "border border-[var(--color-border)] bg-white text-[var(--color-ink)] shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="mb-1 flex items-center justify-between gap-4">
                      <p className="font-serif text-xs font-semibold text-[var(--color-trip-green-dark)]">
                        {t.guideBotTitle}
                      </p>
                      <button
                        type="button"
                        onClick={() => speakMessage(msg.id, msg.content)}
                        className={`text-xs p-1 rounded hover:bg-stone-100 transition ${
                          speakingId === msg.id ? "text-amber-600 font-bold scale-110" : "text-stone-400"
                        }`}
                        title="Storyteller TTS Voice"
                      >
                        {speakingId === msg.id ? "⏸️ Playing" : "🔊 Speak"}
                      </button>
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-[var(--color-border)] bg-stone-50 px-3.5 py-2.5 text-xs text-[var(--color-muted)] shadow-sm animate-pulse">
                  🔮 {t.guideBotThinking}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-[var(--color-border)] p-3 bg-white"
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
