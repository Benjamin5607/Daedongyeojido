/** Seed keywords for Korean travel / media-driven destination trends (nationwide). */
const TREND_SEED_KEYWORDS = [
  // Gyeongnam / Geoje
  "거제 야호",
  "리센느 거제",
  "통영 동피랑",
  // Gangwon
  "양양 서피비치 핫플",
  "강릉 안목해변 카페거리",
  "속초 중앙시장 맛집",
  // Jeju
  "제주 감성숙소 핫플",
  "제주 월정리 카페",
  // Gyeongbuk / culture
  "경주 황리단길 맛집",
  "안동 하회마을",
  // Busan / southeast
  "부산 영도 핫플",
  "부산 흰여울문화마을",
  // Seoul / Gyeonggi
  "서울 성수 핫플",
  "연남동 카페 성지",
  "파주 헤이리",
  // Jeolla / Chungcheong
  "전주 한옥마을 맛집",
  "여수 밤바다",
  "공주 제민천",
  // Media-wide
  "성지순례 맛집",
  "아이돌 맛집 성지",
  "숏폼 성지 여행",
  "예능 맛집 성지",
];

/** Extra news probes that catch destination memes beyond the seeds. */
const TREND_NEWS_PROBES = [
  "여행 성지순례",
  "관광 핫플 급상승",
  "지역 핫플레이스 급상승",
  "MZ세대 국내 여행 트렌드",
];

/**
 * Curated known trend → place/query hints (used when news scrape is thin).
 * Example: LESENE "거제 야호!" wave.
 */
const CURATED_TRENDS = [
  {
    label: "거제 야호!",
    source: "리센느 / 원이·미나미 거제 콘텐츠",
    regionHints: ["거제", "옥포", "덕포", "고현", "장승포"],
    placeHints: [
      "모래성포차",
      "모래성분식",
      "덕포해수욕장",
      "덕원해수욕장",
      "매미성",
      "평화족발",
      "산봉쌈밥",
      "거제케이블카",
      "해금강",
      "외도보타니아",
      "바람의언덕",
      "학동몽돌",
      "학동흑진주",
      "포로수용소",
      "옥포대첩",
    ],
    theme: "hallyu",
    queries: [
      { theme: "k-food", query: "거제 모래성포차" },
      { theme: "k-food", query: "거제 평화족발" },
      { theme: "k-food", query: "거제 산봉쌈밥 옥포" },
      { theme: "urban-nature", query: "거제 덕포해수욕장" },
      { theme: "urban-nature", query: "거제 매미성" },
      { theme: "urban-nature", query: "거제 해금강" },
      { theme: "hallyu", query: "거제 매미성 야호" },
      { theme: "k-culture", query: "거제 옥포대첩기념공원" },
    ],
    score: 100,
  },
];

const MAX_TREND_QUERIES = Number(process.env.TREND_MAX_QUERIES) || 16;
const TREND_NEWS_LIMIT = Number(process.env.TREND_NEWS_LIMIT) || 12;

module.exports = {
  TREND_SEED_KEYWORDS,
  TREND_NEWS_PROBES,
  CURATED_TRENDS,
  MAX_TREND_QUERIES,
  TREND_NEWS_LIMIT,
};
