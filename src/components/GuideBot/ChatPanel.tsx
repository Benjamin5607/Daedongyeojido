"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlannerMap } from "@/components/PlannerMap";
import { useLanguage } from "@/context/LanguageContext";
import { sendGuideChat } from "@/lib/guideBot/client";
import { extractMentionedPlaces } from "@/lib/guideBot/extractPlaces";
import { fetchGuideKnowledge } from "@/lib/guideBot/knowledge/client";
import {
  findNearbyHikingPlaces,
  findNearbyHistoricalPlaces,
  formatNearbyContext,
  listHikingCatalog,
} from "@/lib/guideBot/nearbyPlaces";
import {
  buildGreeting,
  buildGuideSystemPrompt,
} from "@/lib/guideBot/personality";
import type {
  ChatMessage,
  GuideApiConfig,
  GuideMode,
} from "@/lib/guideBot/types";
import type { IndexedPlace } from "@/lib/places";

const PLANNER_STORAGE_KEY = "daedongyeojido_planner";

interface ChatPanelProps {
  config: GuideApiConfig;
  onChangeKey: () => void;
  mode?: GuideMode;
  seedPrompt?: string | null;
  onSeedConsumed?: () => void;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addSlugsToPlanner(slugs: string[]): number {
  if (typeof window === "undefined" || slugs.length === 0) return 0;
  try {
    const raw = localStorage.getItem(PLANNER_STORAGE_KEY);
    let schedule: string[][] = [[]];
    if (raw) {
      const parsed = JSON.parse(raw) as string[][];
      if (Array.isArray(parsed) && parsed.length > 0) schedule = parsed;
    }
    if (!schedule[0]) schedule[0] = [];
    const day = new Set(schedule[0]);
    let added = 0;
    for (const slug of slugs) {
      if (!day.has(slug)) {
        day.add(slug);
        added += 1;
      }
    }
    schedule[0] = Array.from(day);
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(schedule));
    return added;
  } catch {
    return 0;
  }
}

export function ChatPanel({
  config,
  onChangeKey,
  mode = "history",
  seedPrompt = null,
  onSeedConsumed,
}: ChatPanelProps) {
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
  const [plannerNotice, setPlannerNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seedSentRef = useRef(false);

  useEffect(() => {
    setMessages([
      { id: newId(), role: "assistant", content: buildGreeting(locale, mode) },
    ]);
    seedSentRef.current = false;
  }, [locale, mode]);

  useEffect(() => {
    if (mode !== "hiking") return;
    const catalog = listHikingCatalog(locale);
    if (catalog.length === 0) return;
    setNearbyContext(formatNearbyContext(catalog, "hiking"));
    setNearbyNamesKo(catalog.map((p) => p.nameKo).filter(Boolean));
  }, [mode, locale]);

  useEffect(() => {
    if (activeTab === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, activeTab]);

  useEffect(() => {
    const places: IndexedPlace[] = [];
    for (const msg of messages) {
      for (const place of extractMentionedPlaces(msg.content)) {
        if (!places.some((existing) => existing.slug === place.slug)) {
          places.push(place);
        }
      }
    }
    setMentionedPlaces(places);
  }, [messages]);

  const speakMessage = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[📜🧭🎨🍗🎤✨🏮🌿❤️🤍🎯👀👍📢🔍🗺️🗓️🗑️🔗✓➕➖▲▼✕🥾⛰️]/g, "")
      .replace(/[*`#_]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang =
      locale === "ja"
        ? "ja-JP"
        : locale === "zh"
          ? "zh-CN"
          : locale === "vi"
            ? "vi-VN"
            : locale === "id"
              ? "id-ID"
              : "en-US";
    utterance.rate = 0.93;
    utterance.pitch = 0.88;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

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

        let knowledgeText: string | undefined;
        if (mode === "history" && lastUser) {
          const knowledge = await fetchGuideKnowledge(
            lastUser,
            namesKo ?? nearbyNamesKo
          );
          knowledgeText = knowledge?.formatted;
        } else if (mode === "hiking") {
          knowledgeText =
            "Use only listed platform trails. Emphasize safety, daylight, water, footwear, and transit. Prefer concrete day plans.";
        }

        const system = buildGuideSystemPrompt(
          locale,
          context ?? nearbyContext,
          knowledgeText,
          mode
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
          {
            id: newId(),
            role: "assistant",
            content: `${t.guideBotError}\n${msg}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [config, locale, mode, nearbyContext, nearbyNamesKo, t.guideBotError]
  );

  useEffect(() => {
    if (!seedPrompt || seedSentRef.current || loading) return;
    seedSentRef.current = true;
    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: seedPrompt,
    };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      void runChat(next);
      return next;
    });
    onSeedConsumed?.();
  }, [seedPrompt, loading, runChat, onSeedConsumed]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { id: newId(), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    await runChat(next);
  };

  const sendQuickPrompt = async (text: string) => {
    if (!text || loading) return;
    const userMsg: ChatMessage = { id: newId(), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
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
        const places =
          mode === "hiking"
            ? findNearbyHikingPlaces(
                pos.coords.latitude,
                pos.coords.longitude,
                locale
              )
            : findNearbyHistoricalPlaces(
                pos.coords.latitude,
                pos.coords.longitude,
                locale
              );
        const context = formatNearbyContext(places, mode);
        const namesKo = places.map((p) => p.nameKo).filter(Boolean);
        setNearbyContext(context);
        setNearbyNamesKo(namesKo);

        const userMsg: ChatMessage = {
          id: newId(),
          role: "user",
          content:
            mode === "hiking"
              ? t.guideBotHikingNearbyPrompt
              : t.guideBotNearbyPrompt,
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
          {
            id: newId(),
            role: "assistant",
            content: t.guideBotLocationDenied,
          },
        ]);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleAddToPlanner = () => {
    const hikingSlugs = mentionedPlaces
      .filter((p) => p.theme === "sanhaeng" || mode === "hiking")
      .map((p) => p.slug);
    const slugs =
      hikingSlugs.length > 0 ? hikingSlugs : mentionedPlaces.map((p) => p.slug);
    const added = addSlugsToPlanner(slugs);
    setPlannerNotice(
      added > 0
        ? t.guideBotAddedToPlanner.replace("{count}", String(added))
        : t.guideBotAlreadyInPlanner
    );
  };

  const quickPrompts =
    mode === "hiking"
      ? [
          t.guideBotHikingQuickPlan,
          t.guideBotHikingQuickPrep,
          t.guideBotHikingQuickCourse,
          t.guideBotHikingQuickBeginner,
        ]
      : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-stone-50/70 px-4 py-2.5">
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNearby}
            disabled={loading || locating}
            className="flex items-center gap-1 rounded-full bg-[var(--color-trip-green)]/10 px-2.5 py-1.5 text-[10px] font-bold text-[var(--color-trip-green-dark)] transition hover:bg-[var(--color-trip-green)]/20 disabled:opacity-50"
          >
            {mode === "hiking" ? "⛰️" : "🧭"}{" "}
            {locating
              ? t.guideBotLocationLoading
              : mode === "hiking"
                ? t.guideBotHikingNearby
                : t.guideBotNearby}
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

      {quickPrompts.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] bg-emerald-50/60 px-3 py-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={loading}
              onClick={() => void sendQuickPrompt(prompt)}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {activeTab === "map" && mentionedPlaces.length > 0 ? (
          <div className="absolute inset-0 flex h-full w-full flex-col gap-2 p-4">
            <div className="min-h-0 flex-1">
              <PlannerMap places={mentionedPlaces} />
            </div>
            {mode === "hiking" && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddToPlanner}
                  className="rounded-full bg-[var(--color-trip-green)] px-3 py-1.5 text-xs font-bold text-white"
                >
                  {t.guideBotAddToPlanner}
                </button>
                <Link
                  href="/planner"
                  className="text-xs font-semibold text-[var(--color-trip-green-dark)] underline"
                >
                  {t.navPlanner}
                </Link>
                {plannerNotice && (
                  <span className="text-[11px] text-stone-500">
                    {plannerNotice}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full space-y-3 overflow-y-auto bg-[var(--color-surface)] px-4 py-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[var(--color-trip-green)] text-white shadow-sm"
                      : "border border-[var(--color-border)] bg-white text-[var(--color-ink)] shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="mb-1 flex items-center justify-between gap-4">
                      <p className="font-serif text-xs font-semibold text-[var(--color-trip-green-dark)]">
                        {mode === "hiking"
                          ? t.guideBotHikingTitle
                          : t.guideBotTitle}
                      </p>
                      <button
                        type="button"
                        onClick={() => speakMessage(msg.id, msg.content)}
                        className={`rounded p-1 text-xs transition hover:bg-stone-100 ${
                          speakingId === msg.id
                            ? "scale-110 font-bold text-amber-600"
                            : "text-stone-400"
                        }`}
                        title="Storyteller TTS Voice"
                      >
                        {speakingId === msg.id ? "⏸️" : "🔊"}
                      </button>
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="animate-pulse rounded-2xl border border-[var(--color-border)] bg-stone-50 px-3.5 py-2.5 text-xs text-[var(--color-muted)] shadow-sm">
                  {mode === "hiking" ? "⛰️" : "🔮"} {t.guideBotThinking}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-[var(--color-border)] bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "hiking"
              ? t.guideBotHikingInputPlaceholder
              : t.guideBotInputPlaceholder
          }
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
