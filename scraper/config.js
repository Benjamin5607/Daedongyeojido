/** @typedef {'k-food'|'hallyu'|'k-beauty'|'k-culture'|'urban-nature'|'sanhaeng'} ThemeId */

/**
 * Search queries grouped by travel theme.
 * @type {Record<ThemeId, string[]>}
 */
const SEARCH_QUERIES = {
  "k-food": [
    "서울 돼지고기 맛집",
    "서울 한우 맛집",
    "부산 국밥 맛집",
  ],
  hallyu: [
    "서울 K-POP 성지",
    "이태원 HYBE",
    "홍대 K-POP 굿즈",
  ],
  "k-beauty": [
    "서울 스파 마사지",
    "강남 피부과 클리닉",
    "명동 K뷰티 쇼핑",
  ],
  "k-culture": [
    "서울 전통시장",
    "북촌 한옥마을 체험",
    "인사동 공방",
  ],
  "urban-nature": [
    "서울 숲공원",
    "청계천 산책",
    "한강 공원",
  ],
  sanhaeng: [
    "북한산 등산 코스",
    "설악산 울산바위",
    "지리산 종주 등산",
    "한라산 성판악",
    "도봉산 포대능선",
    "관악산 등산로",
    "금정산 고당봉",
    "속리산 문장대",
    "내장산 등산",
    "주왕산 기암",
  ],
};

module.exports = { SEARCH_QUERIES };
