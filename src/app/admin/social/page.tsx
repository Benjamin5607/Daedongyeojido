"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  getSocialQueue,
  updateSocialQueueItem,
  deleteSocialQueueItem,
  generateSocialDraftsAction,
  exportSocialPacksAction,
} from "../actions";

export default function AdminSocialPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [draftCount, setFormDraftCount] = useState(2);
  const [draftSlot, setFormDraftSlot] = useState("auto");

  // Editing state
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editStatus, setEditStatus] = useState("draft");

  const refreshQueue = () => {
    startTransition(async () => {
      const q = await getSocialQueue();
      setQueue(q.items || []);
      setUpdatedAt(q.updatedAt || "");
    });
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditCaption(item.caption || "");
    setEditStatus(item.status || "draft");
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await updateSocialQueueItem(editingItem.id, {
        caption: editCaption,
        status: editStatus,
      });
      setEditingItem(null);
      refreshQueue();
    } catch (err: any) {
      alert("Error saving social item: " + err.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm("Are you sure you want to delete this social queue post?")) {
      try {
        await deleteSocialQueueItem(id);
        refreshQueue();
      } catch (err: any) {
        alert("Error deleting social item: " + err.message);
      }
    }
  };

  const handleGenerateDrafts = async () => {
    startTransition(async () => {
      const res = await generateSocialDraftsAction(draftCount, draftSlot);
      if (res.success) {
        alert("Drafts successfully generated in social_queue.json!");
        refreshQueue();
      } else {
        alert("Error generating drafts: " + res.error);
      }
    });
  };

  const handleExportPacks = async () => {
    startTransition(async () => {
      const res = await exportSocialPacksAction();
      if (res.success) {
        alert("Upload-ready social packs exported under social-exports/!");
        refreshQueue();
      } else {
        alert("Error exporting packs: " + res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">Social Queue Hub</h1>
          <p className="text-sm text-stone-500 mt-1">
            Visual assistant for automated travel content generation and social publishing.
          </p>
        </div>
        <div className="text-xs text-stone-400 font-semibold text-right shrink-0">
          Last synced: {updatedAt ? new Date(updatedAt).toLocaleString() : "Never"}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1.8fr]">
        {/* Controls Column */}
        <div className="space-y-6">
          {/* Section: Generate Drafts */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
              🔮 Generate Emily Drafts
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Post Count</label>
                <select
                  value={draftCount}
                  onChange={(e) => setFormDraftCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none"
                >
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? "Post" : "Posts"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Post Slot</label>
                <select
                  value={draftSlot}
                  onChange={(e) => setFormDraftSlot(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none"
                >
                  <option value="auto">Auto (Morning/Evening)</option>
                  <option value="morning">Morning (11:00 KST)</option>
                  <option value="evening">Evening (19:00 KST)</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={handleGenerateDrafts}
              className="w-full rounded-xl bg-stone-900 py-3 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 transition"
            >
              {isPending ? "Generating Drafts..." : "✨ Spin AI Captions & Draft"}
            </button>
          </div>

          {/* Section: Export Packs */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
              📦 Export Manual Upload Packs
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Downloads real Naver POI photos and runs NVIDIA FLUX Kontext img2img illustrations of Emily. Exports caption files, image-prompts, alt-texts, and upload instructions under <code className="bg-stone-100 px-1 rounded">social-exports/</code>.
            </p>
            <button
              type="button"
              disabled={isPending}
              onClick={handleExportPacks}
              className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {isPending ? "Rendering Illustrations & Packing..." : "🎨 Render Emily Illustrations & Export"}
            </button>
          </div>
        </div>

        {/* Queue Items Column */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-[75vh]">
          <header className="p-6 border-b border-stone-100 shrink-0">
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Emily Travel Post Queue ({queue.length})
            </h3>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isPending ? (
              <div className="py-12 text-center text-sm text-stone-400">Loading social queue...</div>
            ) : queue.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-400 border border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                The social queue is currently empty. Click 'Spin AI Captions' above to generate.
              </div>
            ) : (
              queue.map((item) => {
                const isDraft = item.status === "draft";
                const isExported = item.status === "exported";
                const isApproved = item.status === "approved";
                const isPublished = item.status === "published";

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-stone-100 bg-stone-50/50 flex flex-col gap-4 hover:border-stone-200 hover:bg-stone-50 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl || "/theme-fallback.jpg"}
                            alt={item.slug}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <p className="font-serif font-bold text-stone-800 text-sm">{item.slug}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[9px] font-bold text-stone-600 uppercase">
                              {item.slot}
                            </span>
                            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[9px] font-bold text-indigo-700 uppercase">
                              {item.format}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Badges and Actions */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm ${
                            isDraft
                              ? "bg-stone-100 text-stone-600"
                              : isExported
                              ? "bg-amber-100 text-amber-700"
                              : isApproved
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {item.status}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-xs font-bold text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Caption Preview */}
                    <div className="bg-white p-4 rounded-xl border border-stone-100 text-xs text-stone-600 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto shadow-inner">
                      {item.caption || "No caption generated."}
                    </div>

                    {/* Metadata */}
                    <div className="text-[10px] text-stone-400 font-semibold flex justify-between">
                      <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.meta?.packDir && (
                        <span className="text-emerald-600">Exported: {item.meta.packDir}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={() => setEditingItem(null)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-stone-200 flex flex-col">
            <header className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Edit Social Post ({editingItem.slug})
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-stone-400 hover:text-stone-600 text-lg"
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="exported">Exported</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Instagram/Facebook Caption</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-600 h-48 resize-none font-mono"
                  required
                />
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition"
                >
                  Save Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
