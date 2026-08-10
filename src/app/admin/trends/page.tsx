"use client";

import React, { useEffect, useState, useTransition } from "react";
import { getTrendsList } from "../actions";

export default function AdminTrendsPage() {
  const [trends, setTrends] = useState<any[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshTrends = () => {
    startTransition(async () => {
      const data = await getTrendsList();
      setTrends(data.items || []);
      setUpdatedAt(data.updatedAt || "");
    });
  };

  useEffect(() => {
    refreshTrends();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">Trends & Scraping</h1>
          <p className="text-sm text-stone-500 mt-1">
            Analyze real-time Korean travel trends discovered from Naver News news crawler and LLM taggers.
          </p>
        </div>
        <div className="text-xs text-stone-400 font-semibold text-right shrink-0">
          Last updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "Never"}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center justify-between">
          <span>🔥 Discovered Active Trends ({trends.length})</span>
          <button
            type="button"
            onClick={refreshTrends}
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
          >
            🔄 Sync Trends
          </button>
        </h3>

        {isPending ? (
          <div className="py-12 text-center text-sm text-stone-400">Syncing trend directories...</div>
        ) : trends.length === 0 ? (
          <div className="py-12 text-center text-sm text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
            No travel trends discovered yet. Runs weekly via cron, or trigger manually from the server.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {trends.map((item, index) => (
              <div
                key={index}
                className="p-5 rounded-2xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
                    <span className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shadow-sm">
                      Trend Label: {item.label}
                    </span>
                    <span className="text-[10px] text-stone-400 font-bold">
                      Confidence Score: {Math.round((item.score || 0.8) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Discovered context:</p>
                  <p className="text-xs text-stone-600 leading-relaxed mt-1 whitespace-pre-wrap italic">
                    "{item.source || "Naver search and news mentions discovered recently."}"
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 text-[10px] font-bold text-stone-400">
                  Detected At: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "Recently"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
