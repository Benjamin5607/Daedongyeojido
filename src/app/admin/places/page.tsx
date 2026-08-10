"use client";

import React, { useEffect, useState, useTransition } from "react";
import { getPlacesList, savePlace, deletePlace } from "../actions";
import { THEMES } from "@/types";
import { formatPlaceRegion } from "@/lib/regions";

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [themeFilter, setThemeFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  // Editing/Form state
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Form Fields
  const [formTheme, setFormTheme] = useState("k-food");
  const [formNameKo, setFormNameKo] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formAddressKo, setFormAddressKo] = useState("");
  const [formAddressEn, setFormAddressEn] = useState("");
  const [formDescEn, setFormDescriptionEn] = useState("");
  const [formDescKo, setFormDescriptionKo] = useState("");
  const [formProvince, setFormProvince] = useState("gyeongnam");
  const [formCity, setFormCity] = useState("geoje");
  const [formDistrict, setFormDistrict] = useState("");
  const [formRating, setFormRating] = useState(4.5);
  const [formLocalGem, setFormLocalGem] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState("");

  const refreshList = () => {
    startTransition(async () => {
      const list = await getPlacesList();
      setPlaces(list);
    });
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleOpenEdit = (place: any) => {
    setIsNew(false);
    setSelectedPlace(place);
    setFormTheme(place.theme);
    setFormNameKo(place.name.ko || "");
    setFormNameEn(place.name.en || "");
    setFormAddressKo(place.address.ko || "");
    setFormAddressEn(place.address.en || "");
    setFormDescriptionEn(place.description.en || "");
    setFormDescriptionKo(place.description.ko || "");
    setFormProvince(place.region?.province || "");
    setFormCity(place.region?.city || "");
    setFormDistrict(place.region?.district || "");
    setFormRating(place.rating || 4.5);
    setFormLocalGem(Boolean(place.localGem));
    setFormImageUrl(place.imageUrl || "");
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setIsNew(true);
    setSelectedPlace(null);
    setFormTheme("k-food");
    setFormNameKo("");
    setFormNameEn("");
    setFormAddressKo("");
    setFormAddressEn("");
    setFormDescriptionEn("");
    setFormDescriptionKo("");
    setFormProvince("gyeongnam");
    setFormCity("geoje");
    setFormDistrict("");
    setFormRating(4.5);
    setFormLocalGem(false);
    setFormImageUrl("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      theme: formTheme,
      name: { ko: formNameKo, en: formNameEn },
      address: { ko: formAddressKo, en: formAddressEn },
      description: { en: formDescEn, ko: formDescKo },
      region: { province: formProvince, city: formCity, district: formDistrict },
      rating: Number(formRating),
      localGem: formLocalGem,
      imageUrl: formImageUrl || undefined,
    };

    try {
      await savePlace(isNew ? null : selectedPlace.slug, payload);
      setIsModalOpen(false);
      refreshList();
    } catch (err: any) {
      alert("Error saving: " + err.message);
    }
  };

  const handleDelete = async (slug: string) => {
    if (confirm("Are you sure you want to delete this place? This cannot be undone.")) {
      try {
        await deletePlace(slug);
        refreshList();
      } catch (err: any) {
        alert("Error deleting: " + err.message);
      }
    }
  };

  // Filter list
  const filteredPlaces = places.filter((place) => {
    const matchesSearch =
      search === "" ||
      (place.name.ko || "").toLowerCase().includes(search.toLowerCase()) ||
      (place.name.en || "").toLowerCase().includes(search.toLowerCase()) ||
      (place.slug || "").toLowerCase().includes(search.toLowerCase());

    const matchesTheme = themeFilter === "all" || place.theme === themeFilter;

    return matchesSearch && matchesTheme;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">Curated Places CMS</h1>
          <p className="text-sm text-stone-500 mt-1">
            Browse, search, edit, add, or delete curated Korean travel destinations.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenNew}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition shrink-0 self-start"
        >
          ➕ Add New Place
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm md:flex-row md:items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search places by name (Ko/En) or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
          />
        </div>
        <div className="shrink-0">
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="w-full md:w-48 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
          >
            <option value="all">All Curated Themes</option>
            {THEMES.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Places List Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {isPending ? (
          <div className="p-8 text-center text-sm text-stone-400">Syncing data directory...</div>
        ) : filteredPlaces.length === 0 ? (
          <div className="p-12 text-center text-sm text-stone-400 border-dashed border-stone-200 border rounded-2xl m-4 bg-stone-50/50">
            No curated destinations match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100 text-stone-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-4 px-6">Place Detail</th>
                  <th className="py-4 px-6">Theme</th>
                  <th className="py-4 px-6">Region</th>
                  <th className="py-4 px-6">Rating</th>
                  <th className="py-4 px-6">Badges</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPlaces.slice(0, 100).map((place) => (
                  <tr key={place.slug} className="hover:bg-stone-50/50 transition">
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-stone-100 bg-stone-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={place.imageUrl || "/theme-fallback.jpg"}
                          alt={place.slug}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-stone-900">{place.name.ko || place.name}</p>
                        <p className="text-xs text-stone-400">{place.name.en || place.slug}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600 font-semibold uppercase tracking-wider">
                        {place.theme}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-stone-600 font-medium">
                      {formatPlaceRegion(place.region, "en")}
                    </td>
                    <td className="py-4 px-6 font-bold text-stone-800">
                      ★ {place.rating}
                    </td>
                    <td className="py-4 px-6 space-y-1">
                      {place.localGem && (
                        <span className="block w-max rounded-full bg-[#03C75A]/10 border border-[#03C75A]/20 px-2 py-0.5 text-[9px] font-bold text-[#03C75A]">
                          Local Gem
                        </span>
                      )}
                      {place.trend && (
                        <span className="block w-max rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                          Trending: {place.trend.label}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(place)}
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(place.slug)}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPlaces.length > 100 && (
              <p className="p-4 text-center text-xs text-stone-400 bg-stone-50 border-t border-stone-100">
                Showing top 100 places only. Use filters to narrow down.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-stone-200 flex flex-col max-h-[85vh] overflow-hidden">
            <header className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                {isNew ? "Create Curated Destination" : `Edit Curated Place (${selectedPlace?.slug})`}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-lg"
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Theme</label>
                  <select
                    value={formTheme}
                    onChange={(e) => setFormTheme(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    required
                  >
                    {THEMES.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formRating}
                    onChange={(e) => setFormRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name (KO)</label>
                  <input
                    type="text"
                    value={formNameKo}
                    onChange={(e) => setFormNameKo(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name (EN)</label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Address (KO)</label>
                  <input
                    type="text"
                    value={formAddressKo}
                    onChange={(e) => setFormAddressKo(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Address (EN)</label>
                  <input
                    type="text"
                    value={formAddressEn}
                    onChange={(e) => setFormAddressEn(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Province</label>
                  <input
                    type="text"
                    value={formProvince}
                    onChange={(e) => setFormProvince(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">District</label>
                  <input
                    type="text"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description (EN)</label>
                <textarea
                  value={formDescEn}
                  onChange={(e) => setFormDescriptionEn(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600 h-20 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description (KO - optional)</label>
                <textarea
                  value={formDescKo}
                  onChange={(e) => setFormDescriptionKo(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600 h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Photo URL</label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  placeholder="https://ldb-phinf.pstatic.net/..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="formLocalGem"
                  checked={formLocalGem}
                  onChange={(e) => setFormLocalGem(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-600 border-stone-300 rounded"
                />
                <label htmlFor="formLocalGem" className="text-sm font-semibold text-stone-700">
                  Mark as Naver Local Gem (exclusively found on Naver Map)
                </label>
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition"
                >
                  Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
