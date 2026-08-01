# Meta Travel Page Setup (Daedongyeojido)

반자동 포스팅 파이프라인용 Instagram Professional + Facebook Page 연동 가이드입니다.  
시크릿은 저장소에 커밋하지 말고 GitHub Secrets / 로컬 `.env`에만 둡니다.

---

## Phase 0 — 계정·비즈니스 체크리스트

완료할 때마다 `[ ]` → `[x]` 로 표시하세요.

### 1. Meta Business Manager

- [ ] Facebook 개인 계정으로 [Meta Business Suite](https://business.facebook.com/) / Business Manager 접속
- [ ] Business 자산 생성 (또는 기존 Business 사용)
- [ ] 2단계 인증(2FA) 활성화

### 2. Facebook Page

- [ ] Page 생성 (예: `Daedongyeojido` / `대동여지도`)
- [ ] 영문 사용자 이름(핸들) 확보
- [ ] Page 소개·카테고리(Travel / Tourism) 설정
- [ ] 웹사이트 URL에 대동여지도 사이트 주소 입력

### 3. Instagram Professional

- [ ] Instagram을 **Professional** (Business 또는 Creator)로 전환
- [ ] Business Manager / Page에 IG 계정 연결
- [ ] 바이오: `Korea travel, curated · 대동여지도`
- [ ] 하이라이트 구성 예: Seoul / Busan / Jeju / Geoje / Food / Hallyu

### 4. Page Publishing Authorization (PPA)

- [ ] Meta의 Page Publishing Authorization 완료  
  (미완료 시 Graph `media_publish` / Page photo API가 거부됨)
- [ ] Page·IG 모두 발행 권한이 본인(또는 앱) Admin에 있는지 확인

### 5. 공개 프로필 마무리

- [ ] 프로필 링크 → 사이트 홈 또는 `/places` 목록
- [ ] 고정 하이라이트·커버 이미지 정리

---

## Phase 1 — Meta Developer App + API

### 1.1 앱 생성

1. [developers.facebook.com](https://developers.facebook.com) → **Create App** (타입: **Business**)
2. 제품 추가:
   - **Instagram** (Graph API / content publish)
   - **Facebook Login for Business** (자사 단일 계정이면 Page 토큰 관리에 유리)
3. Valid OAuth Redirect URIs 등록 (로컬 콜백 + 운영 콜백)

### 1.2 필요 권한


| 용도 | Permission |
| --- | --- |
| IG 읽기/기본 | `instagram_basic` |
| IG 게시 | `instagram_content_publish` |
| Page 목록 | `pages_show_list` |
| Page 참여 읽기 | `pages_read_engagement` |
| Page 게시 | `pages_manage_posts` |
| 인사이트 | `instagram_manage_insights`, `pages_read_engagement` |


- **개발 중:** 앱 역할(Admin / Developer)로 본인 계정만 테스트
- **운영(Live):** App Review + Advanced Access 필요

### 1.3 App Review 노트

스크림캐스트에 다음 흐름을 녹화하세요:

1. `crawled_places.json`에서 장소 선정 (`npm run social:draft`)
2. 초안 검토 후 승인 (`npm run social:approve -- --id=...`)
3. IG / FB 발행 (`npm run social:publish` 또는 GitHub Actions cron)
4. Meta 앱이 **자사 페이지만** 게시함을 설명 (멀티테넌트 SaaS 아님)

### 1.4 토큰 발급 흐름

1. User OAuth → **short-lived user token**
2. 교환 → **long-lived user token** (~60일)  
   `GET graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=...&client_secret=...&fb_exchange_token=SHORT_LIVED`
3. Page token:  
   `GET /{page-id}?fields=access_token&access_token=LONG_LIVED_USER_TOKEN`
4. Linked IG:  
   `GET /{page-id}?fields=instagram_business_account`
5. GitHub Secrets / CI에는 아래만 저장:
   - `META_PAGE_ACCESS_TOKEN`
   - `META_IG_USER_ID`
   - `META_PAGE_ID`
6. ~50일마다 토큰 갱신 (또는 Business 시스템 유저 영구 토큰 사용)

헬퍼:

```bash
# short-lived → long-lived 교환 안내/호출
npm run social:token -- --short-token=EAAB...
```

`META_APP_ID` / `META_APP_SECRET` 은 로컬 또는 Actions secret으로만 사용하고 커밋하지 마세요.

### 1.5 GitHub Secrets 설정

Repository → **Settings → Secrets and variables → Actions**:

| Secret | 설명 |
| --- | --- |
| `META_PAGE_ACCESS_TOKEN` | Page access token (장기) |
| `META_IG_USER_ID` | Instagram Business Account id |
| `META_PAGE_ID` | Facebook Page id |
| `SITE_URL` | 배포 사이트 origin (예: `https://your-app.vercel.app`) — 이미지 프록시·CTA 링크용 |
| `NVIDIA_API_KEY` | (선택) 캡션 LLM. 없으면 로컬 템플릿 캡션 |

로컬 테스트용 `.env` 예시 (gitignore됨):

```env
META_PAGE_ACCESS_TOKEN=
META_IG_USER_ID=
META_PAGE_ID=
SITE_URL=http://localhost:3000
NVIDIA_API_KEY=
META_APP_ID=
META_APP_SECRET=
```

### 1.6 게시 API 요약

Instagram (공개 HTTPS 이미지 URL 필수):

```http
POST /v21.0/{ig-user-id}/media
  image_url=https://{SITE}/api/media-proxy/{slug}
  caption=...
  access_token=...

POST /v21.0/{ig-user-id}/media_publish
  creation_id={container-id}
  access_token=...
```

Facebook Page:

```http
POST /v21.0/{page-id}/photos
  url=...
  caption=...
  access_token={page-token}
```

이미지 미러: 네이버 CDN 등은 Meta fetch가 실패하는 경우가 많아, 발행 시  
`{SITE_URL}/api/media-proxy/{slug}` 를 사용합니다.

---

## 반자동 운영 (Phase 2)

하루 슬롯 (KST):

- **11:00** — 트렌드/성지 우선
- **19:00** — 테마 로테이션 (음식 → 한류 → 문화 → 자연 → 뷰티)

```bash
# 초안 2건 생성 (queue에 draft로 추가)
npm run social:draft

# 특정 초안 승인
npm run social:approve -- --id=<queue-item-id>

# 모든 draft 승인 (주의)
npm run social:approve -- --all

# approved만 Meta에 발행
npm run social:publish

# 주간 인사이트 스텁 (토큰 있으면 Graph 조회, 없으면 안내)
npm run social:insights
```

GitHub Actions (`.github/workflows/social-post.yml`)는 **KST 11:00 / 19:00**  
(= UTC `0 2 * * *` / `0 10 * * *`)에 **approved 항목만** publish합니다.  
초안·승인은 사람이 로컬 또는 별도 워크플로에서 수행합니다.

Queue 파일: `src/data/social_queue.json` (커밋 가능 — 토큰 없음).

---

## Phase 3 — 성장 운영 메모

콘텐츠 믹스 목표 (주 ~14포스트):

| 비율 | 포맷 | 비고 |
| --- | --- | --- |
| 40% | 장소 카드 | 사진 + 스토리형 캡션 |
| 30% | 트렌드/성지 | `place.trend` / `travel_trends.json` 가중치↑ |
| 20% | 릴스 | 이후 영상 파이프라인 |
| 10% | 시리즈 | 지역/테마 TOP |

`pickPlaces.js`가 trend·localGem·평점·최근 14일 미게시 규칙을 반영합니다.  
주 1회 `npm run social:insights`로 도달·저장 경향을 보고 가중치를 수동 조정하세요.
