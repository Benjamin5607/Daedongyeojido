/** @typedef {'k-food'|'hallyu'|'k-beauty'|'k-culture'|'urban-nature'|'sanhaeng'} ThemeId */

/**
 * Search queries grouped by travel theme.
 * Regional quota: each theme spans multiple province buckets so crawls
 * do not collapse into a Geoje/Seoul-only hub.
 * @type {Record<ThemeId, string[]>}
 */
const SEARCH_QUERIES = {
  "k-food": [
    "서울 광장시장 맛집",
    "부산 돼지국밥 맛집",
    "제주 고기국수",
    "전주 한옥마을 비빔밥",
    "대구 막창 맛집",
    "강릉 초당순두부",
    "여수 갓김치 맛집",
    "속초 닭강정",
  ],
  hallyu: [
    "서울 HYBE 인사이트",
    "강남 K스타로드",
    "부산 해운대 드라마 촬영지",
    "경기 용인 드라마세트장",
    "강원 속초 드라마 성지",
    "제주 올레 한류 스팟",
  ],
  "k-beauty": [
    "서울 강남 피부과 클리닉",
    "명동 K뷰티 쇼핑",
    "부산 센텀 스파",
    "제주 뷰티 스파",
    "대구 동성로 화장품거리",
  ],
  "k-culture": [
    "서울 북촌 한옥마을",
    "전주 한옥마을 공방",
    "경주 첨성대 야경",
    "안동 하회마을",
    "통영 동피랑 벽화마을",
    "광주 양림동 역사마을",
  ],
  "urban-nature": [
    "서울 한강 공원",
    "부산 이기대 해안산책",
    "대구 수성못 산책",
    "인천 센트럴파크",
    "대전 유성 온천공원",
    "울산 태화강 국가정원",
  ],
  sanhaeng: [
    "북한산 등산 코스",
    "도봉산 포대능선",
    "관악산 연주대",
    "설악산 울산바위",
    "오대산 등산",
    "지리산 천왕봉",
    "한라산 성판악",
    "금정산 고당봉",
    "속리산 문장대",
    "주왕산 기암",
    "내장산 등산",
    "마이산 탑사",
    "거제 가라산 등산",
    "무등산 서석대",
  ],
};

module.exports = { SEARCH_QUERIES };
