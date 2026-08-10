import Link from "next/link";
import React from "react";

export const metadata = {
  title: "Daedongyeojido | Administration",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-stone-100 text-stone-900">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-900 text-stone-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-stone-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white shadow-sm">
              東
            </div>
            <div>
              <p className="font-serif text-lg font-semibold tracking-wide text-white">
                대동여지도
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-emerald-500">
                Admin Panel
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl hover:bg-stone-800 transition text-stone-300 hover:text-white"
          >
            📊 Dashboard Overview
          </Link>
          <Link
            href="/admin/places"
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl hover:bg-stone-800 transition text-stone-300 hover:text-white"
          >
            📍 Curated Places CMS
          </Link>
          <Link
            href="/admin/social"
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl hover:bg-stone-800 transition text-stone-300 hover:text-white"
          >
            📱 Social Queue Hub
          </Link>
          <Link
            href="/admin/trends"
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl hover:bg-stone-800 transition text-stone-300 hover:text-white"
          >
            🔥 Trend & Scraping
          </Link>
        </nav>

        <div className="p-4 border-t border-stone-800 bg-stone-950">
          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-stone-700 bg-stone-900 py-2.5 text-xs font-bold text-stone-300 hover:border-emerald-600 hover:text-emerald-400 transition"
          >
            ⬅️ Go to Main Website
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-sm font-bold text-stone-500 uppercase tracking-widest">
            Daedongyeojido Platform Control Panel
          </h2>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-stone-500">Live Server Connected</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
