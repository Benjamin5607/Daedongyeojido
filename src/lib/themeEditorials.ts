import type { Locale, ThemeId } from "@/types";

export interface ThemeEditorial {
  eyebrow: Record<Locale, string>;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  tips: Record<Locale, string[]>;
}

/**
 * Curated theme editorials — “why now / how to go” without cloning UGC reviews.
 */
export const THEME_EDITORIALS: Partial<Record<ThemeId, ThemeEditorial>> = {
  sanhaeng: {
    eyebrow: {
      en: "Why hike Korea now",
      ja: "今、韓国の山に行く理由",
      zh: "现在为何徒步韩国",
      vi: "Vì sao leo núi Hàn Quốc lúc này",
      id: "Mengapa mendaki Korea sekarang",
    },
    title: {
      en: "Weekend peaks, ridge culture, and clear access tips",
      ja: "週末の峰・稜線文化・アクセスのコツ",
      zh: "周末山峰、山脊文化与通行提示",
      vi: "Đỉnh cuối tuần, văn hóa sống lưng núi và mẹo tiếp cận",
      id: "Puncak akhir pekan, budaya punggungan, dan tips akses",
    },
    body: {
      en: "Korea’s sanhaeng culture is a weekly ritual — early trains, ridge snacks, and sunset descents. We curate difficulty, season windows, and trailhead tips so you can plan a day hike without account walls or review wars.",
      ja: "韓国の山行は週末の習慣です。難易度・季節・登山口の要点だけを短くまとめ、予約や口コミ競争なしで一日コースを組めます。",
      zh: "韩国的山行是周末日常。我们只整理难度、季节与登山口要点，无需账号或点评大战就能规划一日行程。",
      vi: "Văn hóa leo núi Hàn Quốc là nghi thức cuối tuần. Chúng tôi chọn lọc độ khó, mùa và đầu đường mòn — không cần tài khoản hay cuộc chiến review.",
      id: "Budaya sanhaeng Korea adalah ritual akhir pekan. Kami merangkum tingkat kesulitan, musim, dan tip trailhead tanpa akun atau perang ulasan.",
    },
    tips: {
      en: [
        "Start before 8am on popular Seoul peaks (Bukhansan, Dobongsan).",
        "Autumn foliage and spring azaleas book out trail parking — use subway trailheads when possible.",
        "Carry cash for trail snacks; many ridge stalls skip cards.",
      ],
      ja: [
        "人気のソウル近郊峰は午前8時前スタートが安心です。",
        "紅葉・ツツジの季節は駐車場が埋まりやすいので地下鉄アクセスを優先。",
        "稜線の売店は現金のみが多いので少額を用意。",
      ],
      zh: [
        "首尔近郊热门山尽量早上8点前出发。",
        "红叶与杜鹃季停车场易满，优先地铁登山口。",
        "山脊小摊多只收现金，备好零钱。",
      ],
      vi: [
        "Đỉnh gần Seoul đông khách — nên xuất phát trước 8 giờ sáng.",
        "Mùa lá đỏ và đỗ quyên dễ hết chỗ đậu; ưu tiên đầu đường bằng tàu điện.",
        "Quầy ăn trên sống núi thường chỉ nhận tiền mặt.",
      ],
      id: [
        "Puncak populer dekat Seoul: berangkat sebelum jam 8 pagi.",
        "Musim daun musim gugur & azalea parkir cepat penuh — utamakan trailhead subway.",
        "Warung di punggungan sering hanya menerima tunai.",
      ],
    },
  },
  "k-food": {
    eyebrow: {
      en: "Why eat here now",
      ja: "今、ここで食べる理由",
      zh: "现在为何在这里吃",
      vi: "Vì sao ăn ở đây lúc này",
      id: "Mengapa makan di sini sekarang",
    },
    title: {
      en: "Neighborhood tables over review volume",
      ja: "口コミの量より、街の食卓",
      zh: "胜过海量点评的街巷餐桌",
      vi: "Bàn ăn phố hơn số lượng review",
      id: "Meja lingkungan, bukan volume ulasan",
    },
    body: {
      en: "We highlight markets, BBQ alleys, and local-only queues — with region filters so you plan lunch around where you’ll actually walk that day.",
      ja: "市場・焼肉横丁・地元行列を中心に。地域フィルターでその日の動線に合わせて昼食を選べます。",
      zh: "聚焦市场、烤肉巷与本地排队店，用地区筛选按当天动线安排午餐。",
      vi: "Ưu tiên chợ, hẻm BBQ và hàng chờ địa phương — lọc theo vùng để khớp lộ trình trong ngày.",
      id: "Fokus pasar, gang BBQ, dan antrean lokal — filter wilayah menyesuaikan rute harian Anda.",
    },
    tips: {
      en: [
        "Lunch lines peak 12–1pm; arrive at 11:30 or after 1:30.",
        "Many legendary spots close between lunch and dinner — check Naver hours.",
      ],
      ja: [
        "ランチ行列は12〜13時がピーク。11:30か13:30以降が狙い目。",
        "名店はランチとディナーの間に閉店することが多いのでNaverで確認。",
      ],
      zh: [
        "午餐排队高峰在12–13点；可11:30或13:30后再去。",
        "不少名店午晚餐之间休息，请用Naver核对营业时间。",
      ],
      vi: [
        "Hàng chờ trưa đông nhất 12–13h; đến 11:30 hoặc sau 13:30.",
        "Nhiều quán đóng giữa trưa và tối — kiểm tra giờ trên Naver.",
      ],
      id: [
        "Antrian makan siang puncak 12–13; datang 11:30 atau setelah 13:30.",
        "Banyak tempat legendaris tutup antara siang dan malam — cek jam Naver.",
      ],
    },
  },
  hallyu: {
    eyebrow: {
      en: "Why go for Hallyu now",
      ja: "今、韓流スポットへ",
      zh: "现在为何追韩流打卡",
      vi: "Vì sao đi Hallyu lúc này",
      id: "Mengapa Hallyu sekarang",
    },
    title: {
      en: "Scenes, streets, and fan routes — updated with trend speed",
      ja: "シーン・ストリート・ファン動線をトレンド速度で",
      zh: "以趋势速度更新的场景、街道与饭制路线",
      vi: "Cảnh quay, phố và lộ trình fan — cập nhật theo trend",
      id: "Adegan, jalan, dan rute fan — mengikuti kecepatan tren",
    },
    body: {
      en: "Hallyu here means walkable Seoul routes and regional drama sets — not a global POI dump. Pair with the planner for a half-day fan itinerary.",
      ja: "歩けるソウル動線と地方のロケ地を中心に。プランナーで半日ファン行程を組めます。",
      zh: "以可步行的首尔路线与地方取景地为主，用行程板拼半日饭制行程。",
      vi: "Tập trung lộ trình Seoul đi bộ được và bối cảnh địa phương — ghép planner cho nửa ngày.",
      id: "Fokus rute Seoul yang bisa dijalan kaki dan set drama daerah — gabungkan di planner untuk setengah hari.",
    },
    tips: {
      en: [
        "Weekday mornings are quieter at HYBE / K-Star Road photo spots.",
        "Bring a light jacket — rooftop and plaza shoots get windy.",
      ],
      ja: [
        "HYBEやK-Star Roadは平日朝が空いています。",
        "屋上・広場は風が強いので薄手の上着を。",
      ],
      zh: [
        "HYBE、K-Star Road平日上午人较少。",
        "屋顶与广场风大，备一件薄外套。",
      ],
      vi: [
        "Buổi sáng ngày thường ở HYBE / K-Star Road vắng hơn.",
        "Mang áo mỏng — sân thượng và quảng trường hay gió.",
      ],
      id: [
        "Pagi hari kerja lebih sepi di HYBE / K-Star Road.",
        "Bawa jaket tipis — rooftop dan plaza berangin.",
      ],
    },
  },
};

export function getThemeEditorial(
  theme: ThemeId,
  locale: Locale
): {
  eyebrow: string;
  title: string;
  body: string;
  tips: string[];
} | null {
  const editorial = THEME_EDITORIALS[theme];
  if (!editorial) return null;
  return {
    eyebrow: editorial.eyebrow[locale] ?? editorial.eyebrow.en,
    title: editorial.title[locale] ?? editorial.title.en,
    body: editorial.body[locale] ?? editorial.body.en,
    tips: editorial.tips[locale] ?? editorial.tips.en,
  };
}
