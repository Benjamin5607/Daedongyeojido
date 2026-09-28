import { getPlaceMapLinks } from "@/lib/mapLinks";
import {
  getAllPlaces,
  type IndexedPlace,
} from "@/lib/places";
import { getPlaceCoordinates, haversineKm } from "@/lib/placeCoords";
import { resolveKoreanField, resolveLocalizedField } from "@/lib/i18n";
import { formatPlaceRegion } from "@/lib/regions";
import type { Locale, ThemeId } from "@/types";
import type {
  TripGuide,
  TripGuideAlternative,
  TripGuideCategory,
  TripGuideChecklistItem,
  TripGuideContact,
  TripGuideStop,
  TripGuideTransitTip,
} from "./types";

const THEME_CATEGORY: Record<ThemeId, TripGuideCategory> = {
  "k-food": "food",
  hallyu: "sightseeing",
  "k-beauty": "shopping",
  "k-culture": "culture",
  "urban-nature": "nature",
  sanhaeng: "hiking",
};

const THEME_DURATION_MIN: Record<ThemeId, number> = {
  "k-food": 75,
  hallyu: 90,
  "k-beauty": 90,
  "k-culture": 100,
  "urban-nature": 90,
  sanhaeng: 180,
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatSlot(startMin: number, durationMin: number): string {
  const end = startMin + durationMin;
  const sh = Math.floor(startMin / 60);
  const sm = startMin % 60;
  const eh = Math.floor(end / 60);
  const em = end % 60;
  return `${pad2(sh)}:${pad2(sm)} - ${pad2(eh)}:${pad2(em)}`;
}

function themeTip(place: IndexedPlace, locale: Locale): string {
  const access = place.accessTips
    ? resolveLocalizedField(place.accessTips, locale)
    : "";
  const season = place.seasonTips
    ? resolveLocalizedField(place.seasonTips, locale)
    : "";
  const editorial = place.editorial
    ? resolveLocalizedField(place.editorial, locale)
    : "";
  if (access) return access;
  if (season) return season;
  if (editorial) return editorial;

  const tips: Record<ThemeId, Record<Locale, string>> = {
    sanhaeng: {
      en: "Start early, pack water + grip shoes, and keep a buffer for ridge crowds on weekends.",
      ja: "早朝スタート、水とグリップ靴を。週末の稜線混雑に余裕を。",
      zh: "尽早出发，带水和防滑鞋；周末山脊人多请留缓冲。",
      vi: "Xuất phát sớm, mang nước + giày bám, chừa thời gian cho đông cuối tuần.",
      id: "Berangkat pagi, bawa air + sepatu grip, sisakan buffer untuk antrean akhir pekan.",
    },
    "k-food": {
      en: "Arrive before noon or after 1:30 to dodge peak queues; check Naver hours.",
      ja: "12時前か13:30以降が狙い目。営業時間はNaverで確認。",
      zh: "午饭前或13:30后再去，避开高峰；用Naver核对营业时间。",
      vi: "Đến trước 12h hoặc sau 13:30; kiểm tra giờ trên Naver.",
      id: "Datang sebelum 12 atau setelah 13:30; cek jam Naver.",
    },
    hallyu: {
      en: "Weekday mornings are quieter for photos; bring a light layer for plaza wind.",
      ja: "平日朝が空いています。広場は風が強いので薄手を。",
      zh: "平日上午人较少；广场风大，备薄外套。",
      vi: "Sáng ngày thường vắng hơn; mang áo mỏng vì gió.",
      id: "Pagi weekday lebih sepi; bawa jaket tipis karena angin.",
    },
    "k-beauty": {
      en: "Book popular clinics ahead when possible; keep passport for duty-free shopping.",
      ja: "人気クリニックは事前予約を。免税はパスポートを忘れずに。",
      zh: "热门诊所尽量预约；免税购物带护照。",
      vi: "Nên đặt trước phòng khám đông; mang hộ chiếu nếu mua duty-free.",
      id: "Booking klinik populer jika bisa; bawa paspor untuk duty-free.",
    },
    "k-culture": {
      en: "Wear comfortable shoes for market alleys; many workshops prefer cash.",
      ja: "市場路地は歩きやすい靴で。工房は現金が安心。",
      zh: "市场小巷穿舒适鞋；不少工坊偏爱现金。",
      vi: "Giày thoải mái cho hẻm chợ; nhiều xưởng thích tiền mặt.",
      id: "Sepatu nyaman untuk gang pasar; banyak workshop prefer tunai.",
    },
    "urban-nature": {
      en: "Sunset and golden hour get busy — bring a light snack and a layer.",
      ja: "夕暮れは混雑しやすいので軽食と羽織りを。",
      zh: "黄昏时段较挤，备点心和外套。",
      vi: "Hoàng hôn đông — mang đồ ăn nhẹ và áo mỏng.",
      id: "Golden hour ramai — bawa camilan dan lapisan tipis.",
    },
  };
  return tips[place.theme][locale] ?? tips[place.theme].en;
}

function transitBetween(
  from: IndexedPlace | null,
  to: IndexedPlace,
  locale: Locale
): string {
  const toName = resolveKoreanField(to.name);
  const toRegion = to.region
    ? formatPlaceRegion(to.region, locale)
    : "";

  if (!from) {
    const openers: Record<Locale, string> = {
      en: `Start the day toward ${toName} (${toRegion}). Prefer subway/bus over taxis in peak hours; open Naver Map for live exits.`,
      ja: `${toName}（${toRegion}）へ向けて一日スタート。混雑時はタクシーより地下鉄/バス。出口はNaverマップで。`,
      zh: `本日从前往 ${toName}（${toRegion}）开始。高峰优先地铁/公交；出口用Naver地图。`,
      vi: `Bắt đầu ngày tới ${toName} (${toRegion}). Giờ cao điểm ưu tiên tàu/bus; xem lối ra trên Naver Map.`,
      id: `Mulai hari menuju ${toName} (${toRegion}). Jam sibuk utamakan subway/bus; cek exit di Naver Map.`,
    };
    return openers[locale] ?? openers.en;
  }

  const fromCoords = getPlaceCoordinates(from.slug);
  const toCoords = getPlaceCoordinates(to.slug);
  let distanceNote = "";
  if (fromCoords && toCoords) {
    const km = haversineKm(fromCoords, toCoords);
    distanceNote =
      locale === "ja"
        ? `直線距離 約${km.toFixed(1)}km。`
        : locale === "zh"
          ? `直线约 ${km.toFixed(1)} km。`
          : locale === "vi"
            ? `Cách ~${km.toFixed(1)} km (đường chim bay). `
            : locale === "id"
              ? `Jarak garis lurus ~${km.toFixed(1)} km. `
              : `~${km.toFixed(1)} km as the crow flies. `;
  }

  const sameProvince = from.region?.province === to.region?.province;
  const sameCity =
    sameProvince &&
    (from.region?.city || from.region?.district) ===
      (to.region?.city || to.region?.district);

  if (sameCity || (sameProvince && fromCoords && toCoords && haversineKm(fromCoords, toCoords) < 3)) {
    const walk: Record<Locale, string> = {
      en: `${distanceNote}Short hop within the same area — walk or 1–2 subway stops. Follow Naver pedestrian route to ${toName}.`,
      ja: `${distanceNote}同エリアの近距離。徒歩または地下鉄1〜2駅。Naverの徒歩ルートで${toName}へ。`,
      zh: `${distanceNote}同区域短途——步行或地铁1–2站。用Naver步行导航至${toName}。`,
      vi: `${distanceNote}Gần trong cùng khu — đi bộ hoặc 1–2 ga. Dùng Naver đi bộ tới ${toName}.`,
      id: `${distanceNote}Dekat di area sama — jalan kaki atau 1–2 stasiun. Ikuti rute pejalan Naver ke ${toName}.`,
    };
    return walk[locale] ?? walk.en;
  }

  if (sameProvince) {
    const city: Record<Locale, string> = {
      en: `${distanceNote}Same province move — subway/bus with one transfer is usually enough. Budget 40–70 min door-to-door to ${toName}.`,
      ja: `${distanceNote}同一広域への移動。地下鉄/バス＋1回乗り換えが目安。ドアツードア40〜70分で${toName}へ。`,
      zh: `${distanceNote}同省内移动——地铁/公交通常一次换乘即可。门到门约40–70分钟至${toName}。`,
      vi: `${distanceNote}Cùng tỉnh — tàu/bus thường 1 lần chuyển. Dự 40–70 phút tới ${toName}.`,
      id: `${distanceNote}Dalam provinsi yang sama — subway/bus biasanya 1 transfer. Siapkan 40–70 menit ke ${toName}.`,
    };
    return city[locale] ?? city.en;
  }

  const long: Record<Locale, string> = {
    en: `${distanceNote}Cross-region leg — consider KTX/ITX or express bus, then local subway. Leave a 2–3h buffer before ${toName}.`,
    ja: `${distanceNote}広域移動。KTX/ITXまたは高速バス＋市内地下鉄を検討。${toName}前に2〜3時間の余裕を。`,
    zh: `${distanceNote}跨区域——考虑KTX/ITX或高速大巴再转地铁。抵达${toName}前留2–3小时缓冲。`,
    vi: `${distanceNote}Liên vùng — cân nhắc KTX/ITX hoặc xe buýt cao tốc rồi tàu nội đô. Chừa 2–3 giờ trước ${toName}.`,
    id: `${distanceNote}Lintas wilayah — pertimbangkan KTX/ITX atau bus ekspres lalu subway lokal. Sisakan buffer 2–3 jam sebelum ${toName}.`,
  };
  return long[locale] ?? long.en;
}

function findFoodBuddy(place: IndexedPlace, locale: Locale): {
  name: string;
  menu: string;
  feature: string;
} {
  if (place.theme === "k-food") {
    return {
      name: resolveKoreanField(place.name),
      menu:
        locale === "ja"
          ? "店の看板メニュー / セット"
          : locale === "zh"
            ? "店内招牌 / 套餐"
            : "House specialty / set menu",
      feature: resolveLocalizedField(place.description, locale).slice(0, 160),
    };
  }

  const buddy = getAllPlaces()
    .filter(
      (p) =>
        p.theme === "k-food" &&
        p.region?.province === place.region?.province &&
        p.slug !== place.slug
    )
    .sort((a, b) => b.rating - a.rating)[0];

  if (!buddy) {
    const empty: Record<Locale, { name: string; menu: string; feature: string }> = {
      en: {
        name: "Neighborhood eatery (Naver search)",
        menu: "Local set / market bites",
        feature: "Search “맛집” near the place on Naver Map for live hours.",
      },
      ja: {
        name: "近所の食堂（Naver検索）",
        menu: "地元セット / 市場スナック",
        feature: "Naverマップで周辺「맛집」を検索し営業時間を確認。",
      },
      zh: {
        name: "附近食堂（Naver搜索）",
        menu: "本地套餐 / 市场小吃",
        feature: "在Naver地图搜附近“맛집”并核对营业时间。",
      },
      vi: {
        name: "Quán gần đó (tìm Naver)",
        menu: "Set địa phương / đồ chợ",
        feature: "Tìm “맛집” gần điểm trên Naver Map để xem giờ mở.",
      },
      id: {
        name: "Warung sekitar (cari Naver)",
        menu: "Set lokal / camilan pasar",
        feature: "Cari “맛집” di dekat tempat di Naver Map untuk jam buka.",
      },
    };
    return empty[locale] ?? empty.en;
  }

  return {
    name: resolveKoreanField(buddy.name),
    menu:
      locale === "ja"
        ? "高評価の定番メニュー"
        : locale === "zh"
          ? "高分招牌菜"
          : "Top-rated local dishes",
    feature: resolveLocalizedField(buddy.description, locale).slice(0, 160),
  };
}

function buildChecklists(
  places: IndexedPlace[],
  locale: Locale
): TripGuideChecklistItem[] {
  const themes = new Set(places.map((p) => p.theme));
  const items: { id: string; title: Record<Locale, string>; category: string }[] =
    [
      {
        id: "pass-tmoney",
        category: "transit",
        title: {
          en: "T-money / cash card topped up",
          ja: "Tマネー/交通カードをチャージ",
          zh: "已充值 T-money / 交通卡",
          vi: "Nạp T-money / thẻ giao thông",
          id: "T-money / kartu transit terisi",
        },
      },
      {
        id: "offline-maps",
        category: "gear",
        title: {
          en: "Naver Map + Google Maps offline/data ready",
          ja: "Naver/Googleマップのデータ準備",
          zh: "Naver / Google 地图流量或离线就绪",
          vi: "Naver Map + Google Maps sẵn sàng",
          id: "Naver Map + Google Maps siap data",
        },
      },
      {
        id: "power",
        category: "gear",
        title: {
          en: "Power bank + Korea plug",
          ja: "モバイルバッテリー＋韓国プラグ",
          zh: "充电宝 + 韩国插头",
          vi: "Sạc dự phòng + phích Hàn",
          id: "Power bank + steker Korea",
        },
      },
      {
        id: "cash",
        category: "money",
        title: {
          en: "Small cash for markets / trail stalls",
          ja: "市場・稜線売店用の少額現金",
          zh: "市场/山脊小摊用零钱",
          vi: "Tiền mặt nhỏ cho chợ / quầy đường mòn",
          id: "Uang tunai kecil untuk pasar / warung jalur",
        },
      },
    ];

  if (themes.has("sanhaeng")) {
    items.push(
      {
        id: "hike-shoes",
        category: "hiking",
        title: {
          en: "Grip hiking shoes + light gloves",
          ja: "グリップ登山靴＋薄手手袋",
          zh: "防滑登山鞋 + 薄手套",
          vi: "Giày leo bám + găng mỏng",
          id: "Sepatu hiking grip + sarung tangan tipis",
        },
      },
      {
        id: "hike-water",
        category: "hiking",
        title: {
          en: "1L+ water and salty snack",
          ja: "水1L以上＋塩気のある軽食",
          zh: "1L以上饮用水 + 咸味零食",
          vi: "Nước ≥1L và đồ mặn nhẹ",
          id: "Air ≥1L dan camilan asin",
        },
      },
      {
        id: "hike-rain",
        category: "hiking",
        title: {
          en: "Rain jacket / pack cover",
          ja: "レインジャケット/パックカバー",
          zh: "雨衣 / 背包防雨罩",
          vi: "Áo mưa / áo balo",
          id: "Jaket hujan / cover tas",
        },
      }
    );
  }
  if (themes.has("k-food") || themes.has("k-culture")) {
    items.push({
      id: "hours-check",
      category: "food",
      title: {
        en: "Confirm Naver business hours the morning of",
        ja: "当日朝にNaver営業時間を確認",
        zh: "当天早上核对 Naver 营业时间",
        vi: "Sáng hôm đó kiểm tra giờ Naver",
        id: "Cek jam buka Naver di pagi hari",
      },
    });
  }

  return items.map((item) => ({
    id: item.id,
    category: item.category,
    title: item.title[locale] ?? item.title.en,
    checked: false,
  }));
}

function buildContacts(locale: Locale): TripGuideContact[] {
  const rows: { id: string; name: Record<Locale, string>; category: string; phone: string; note: Record<Locale, string> }[] = [
    {
      id: "police",
      category: "emergency",
      phone: "112",
      name: {
        en: "Police",
        ja: "警察",
        zh: "警察",
        vi: "Cảnh sát",
        id: "Polisi",
      },
      note: {
        en: "Dial 112 anywhere in Korea (English support available).",
        ja: "韓国どこでも112（英語対応あり）。",
        zh: "韩国全国拨打 112（可英语）。",
        vi: "Gọi 112 toàn quốc (có hỗ trợ tiếng Anh).",
        id: "Telepon 112 di mana saja di Korea (ada dukungan Inggris).",
      },
    },
    {
      id: "fire-medical",
      category: "emergency",
      phone: "119",
      name: {
        en: "Fire / Ambulance",
        ja: "消防・救急",
        zh: "消防 / 急救",
        vi: "Cứu hỏa / Cấp cứu",
        id: "Pemadam / Ambulans",
      },
      note: {
        en: "Medical emergency & fire — 119.",
        ja: "救急・火災は119。",
        zh: "急救与火灾拨打 119。",
        vi: "Cấp cứu & cháy — 119.",
        id: "Darurat medis & kebakaran — 119.",
      },
    },
    {
      id: "tourist",
      category: "help",
      phone: "1330",
      name: {
        en: "Korea Travel Hotline",
        ja: "韓国観光案内",
        zh: "韩国旅游热线",
        vi: "Đường dây du lịch Hàn",
        id: "Hotline wisata Korea",
      },
      note: {
        en: "1330 tourist information in multiple languages.",
        ja: "多言語観光案内1330。",
        zh: "多语种旅游咨询 1330。",
        vi: "Thông tin du lịch đa ngôn ngữ 1330.",
        id: "Info wisata multibahasa 1330.",
      },
    },
  ];
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    phone: r.phone,
    name: r.name[locale] ?? r.name.en,
    note: r.note[locale] ?? r.note.en,
  }));
}

function buildTransitTips(
  places: IndexedPlace[],
  locale: Locale
): TripGuideTransitTip[] {
  const provinces = [...new Set(places.map((p) => p.region?.province).filter(Boolean))];
  const tips: TripGuideTransitTip[] = [
    {
      id: "tmoney",
      title:
        locale === "ja"
          ? "交通カード"
          : locale === "zh"
            ? "交通卡"
            : "Transit card",
      body:
        locale === "ja"
          ? "地下鉄・バスはTマネー/Cashbeeが便利。コンビニや駅でチャージ。"
          : locale === "zh"
            ? "地铁公交用 T-money/Cashbee 最方便，便利店或车站充值。"
            : "T-money / Cashbee works on subway & buses. Top up at convenience stores or stations.",
    },
    {
      id: "naver-first",
      title:
        locale === "ja"
          ? "経路はNaver優先"
          : locale === "zh"
            ? "路线优先 Naver"
            : "Naver Map first",
      body:
        locale === "ja"
          ? "リアルタイム出口・バスはNaverマップが強い。Googleは補助。"
          : locale === "zh"
            ? "实时出口与公交以 Naver 地图更准，Google 作补充。"
            : "Live exits and buses are strongest on Naver Map; use Google as backup.",
    },
  ];
  if (provinces.length > 1) {
    tips.push({
      id: "ktx",
      title:
        locale === "ja"
          ? "都市間移動"
          : locale === "zh"
            ? "城际移动"
            : "Intercity legs",
      body:
        locale === "ja"
          ? `このプランは${provinces.length}広域にまたがります。KTX/ITXまたは高速バスで幹線を結び、市内は地下鉄へ。`
          : locale === "zh"
            ? `行程跨 ${provinces.length} 个广域——用 KTX/ITX 或高速大巴连主干，市内转地铁。`
            : `This plan spans ${provinces.length} provinces — link with KTX/ITX or express bus, then local subway.`,
    });
  }
  if (places.some((p) => p.theme === "sanhaeng")) {
    tips.push({
      id: "trailhead",
      title:
        locale === "ja"
          ? "登山口アクセス"
          : locale === "zh"
            ? "登山口交通"
            : "Trailhead access",
      body:
        locale === "ja"
          ? "人気峰は週末早朝が安心。地下鉄登山口を優先し駐車場混雑を避ける。"
          : locale === "zh"
            ? "热门山周末宜早出发；优先地铁登山口，避开停车场拥堵。"
            : "Popular peaks: start early on weekends. Prefer subway trailheads over parking lots.",
    });
  }
  return tips;
}

function buildAlternatives(
  stops: TripGuideStop[],
  locale: Locale
): TripGuideAlternative[] {
  return stops
    .filter((s) => s.category === "hiking" || s.category === "nature")
    .slice(0, 4)
    .map((s, i) => ({
      id: `alt-${i}-${s.id}`,
      dayNumber: s.dayNumber,
      originalTitle: s.title,
      situation:
        locale === "ja"
          ? "雨・強風・視界不良"
          : locale === "zh"
            ? "下雨 / 强风 / 能见度差"
            : "Rain, high wind, or poor visibility",
      alternativeTitle:
        locale === "ja"
          ? "室内文化スポットまたは市場ウォークに切替"
          : locale === "zh"
            ? "改室内文化点或市场步行"
            : "Switch to indoor culture stop or covered market walk",
      description:
        locale === "ja"
          ? `${s.title}を中止し、同広域の博物館・市場アーケードへ。翌日に山行を振り替え。`
          : locale === "zh"
            ? `取消 ${s.title}，改同区域博物馆或市场拱廊；山行改日。`
            : `Skip ${s.title}; pivot to a museum or arcade market in the same region and retry the trail another day.`,
    }));
}

export function buildLocalTripGuide(
  schedule: string[][],
  locale: Locale
): TripGuide {
  const all = getAllPlaces();
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  const stops: TripGuideStop[] = [];
  const dayMeta: TripGuide["meta"]["days"] = [];
  const usedPlaces: IndexedPlace[] = [];

  schedule.forEach((daySlugs, dayIndex) => {
    const dayNumber = dayIndex + 1;
    const places = daySlugs
      .map((slug) => bySlug.get(slug))
      .filter((p): p is IndexedPlace => Boolean(p));
    usedPlaces.push(...places);

    const cityBits = [
      ...new Set(
        places.map((p) => {
          if (!p.region) return "";
          return p.region.city || p.region.district || p.region.province || "";
        })
      ),
    ].filter(Boolean);
    const provinceBits = [
      ...new Set(places.map((p) => p.region?.province).filter(Boolean)),
    ] as string[];
    const cityLabel =
      cityBits.length > 0
        ? cityBits.slice(0, 3).join(" · ")
        : provinceBits.join(" · ") || "Korea";

    dayMeta.push({
      day: dayNumber,
      label: `Day ${dayNumber}`,
      city: cityLabel,
      themes: [...new Set(places.map((p) => p.theme))],
    });

    let cursor = 9 * 60; // 09:00
    places.forEach((place, idx) => {
      const prev = idx > 0 ? places[idx - 1] : null;
      const duration = THEME_DURATION_MIN[place.theme] ?? 90;
      const food = findFoodBuddy(place, locale);
      const links = getPlaceMapLinks(place.slug, place);
      const nameKo = resolveKoreanField(place.name);
      const desc = resolveLocalizedField(place.description, locale);

      stops.push({
        id: `${dayNumber}-${idx}-${place.slug}`,
        dayNumber,
        timeSlot: formatSlot(cursor, duration),
        title: nameKo,
        category: THEME_CATEGORY[place.theme],
        locationName: resolveLocalizedField(place.address, locale) || nameKo,
        slug: place.slug,
        regionLabel: place.region
          ? formatPlaceRegion(place.region, locale)
          : "",
        transitGuide: transitBetween(prev, place, locale),
        description: desc,
        tip: themeTip(place, locale),
        foodName: food.name,
        foodMenu: food.menu,
        foodFeature: food.feature,
        naverUrl: links.naverUrl,
        googleUrl: links.googleUrl,
        difficulty: place.difficulty,
        completed: false,
      });

      cursor += duration + 30; // 30 min buffer / transit
      if (cursor > 21 * 60) cursor = 21 * 60;
    });
  });

  const dayCount = Math.max(schedule.length, 1);
  const title =
    locale === "ja"
      ? "大東輿地図パーソナルガイド"
      : locale === "zh"
        ? "大东舆地图个人指南"
        : "Daedongyeojido trip guide";
  const subtitle =
    locale === "ja"
      ? `${dayCount}日間 · ${usedPlaces.length}スポット · アカウント不要`
      : locale === "zh"
        ? `${dayCount} 天 · ${usedPlaces.length} 个地点 · 无需账号`
        : `${dayCount}-day plan · ${usedPlaces.length} stops · no account needed`;

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    source: "local",
    meta: { title, subtitle, days: dayMeta },
    schedule,
    stops,
    checklists: buildChecklists(usedPlaces, locale),
    contacts: buildContacts(locale),
    transitTips: buildTransitTips(usedPlaces, locale),
    alternatives: buildAlternatives(stops, locale),
  };
}
