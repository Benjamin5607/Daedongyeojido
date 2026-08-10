import React from "react";
import { getAdminStats } from "./actions";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-stone-900">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-stone-500">
          Real-time summary of Daedongyeojido data directory and automated workflows.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Curated Places */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-2xl" aria-hidden>📍</span>
            <h3 className="mt-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Total Places</h3>
            <p className="text-3xl font-extrabold text-stone-950 mt-1">{stats.totalPlaces}</p>
          </div>
          <Link href="/admin/places" className="text-xs font-bold text-emerald-600 hover:underline mt-4 inline-block">
            Manage places →
          </Link>
        </div>

        {/* Local Gems */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-2xl" aria-hidden>💎</span>
            <h3 className="mt-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Naver Local Gems</h3>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.localGems}</p>
          </div>
          <Link href="/admin/places" className="text-xs font-bold text-emerald-600 hover:underline mt-4 inline-block">
            View local gems →
          </Link>
        </div>

        {/* Trending Tags */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-2xl" aria-hidden>🔥</span>
            <h3 className="mt-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Trending Places</h3>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">{stats.trending}</p>
          </div>
          <Link href="/admin/trends" className="text-xs font-bold text-emerald-600 hover:underline mt-4 inline-block">
            View active trends →
          </Link>
        </div>

        {/* Social Queue */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-2xl" aria-hidden>📱</span>
            <h3 className="mt-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Social Queue</h3>
            <p className="text-3xl font-extrabold text-indigo-600 mt-1">{stats.socialStats.total}</p>
          </div>
          <Link href="/admin/social" className="text-xs font-bold text-emerald-600 hover:underline mt-4 inline-block">
            Manage queue →
          </Link>
        </div>
      </div>

      {/* Social Queue status details */}
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
            Social Queue Distribution
          </h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Draft</span>
              <p className="text-xl font-bold text-stone-800 mt-1">{stats.socialStats.draft}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Exported</span>
              <p className="text-xl font-bold text-amber-800 mt-1">{stats.socialStats.exported}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Approved</span>
              <p className="text-xl font-bold text-emerald-800 mt-1">{stats.socialStats.approved}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Published</span>
              <p className="text-xl font-bold text-indigo-800 mt-1">{stats.socialStats.published}</p>
            </div>
          </div>
        </div>

        {/* Quick Commands */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
            System Operations
          </h3>
          <div className="flex flex-col gap-2">
            <Link
              href="/admin/places"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-3 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 text-center"
            >
              ➕ Add New Curated Place
            </Link>
            <Link
              href="/admin/social"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 py-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 text-center"
            >
              ⚙️ Manage Emily Post Queue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
