# Social upload packs (manual Instagram / Facebook)

대동여지도는 **Meta Graph API 자동 발행 대신**, 수동 업로드용 팩을 만듭니다.
이미지·캡션·해시태그·alt text가 `social-exports/`에 준비되면 Instagram/Facebook 앱에서 붙여 넣으면 됩니다.

`META_*` 시크릿은 기본 경로에 **필요 없습니다**.

---

## 로컬에서 돌리기

```bash
# 장소 선정 + KO/EN 캡션 + 팩 생성 (기본 2건)
npm run social:draft

# 이미 queue에 있는 draft만 팩으로 내보내기
npm run social:export

# 최신 팩 폴더 열기 + UPLOAD_NOTES 출력
npm run social:open
```

선택 옵션:

```bash
npm run social:draft -- --count=1 --slot=morning
npm run social:draft -- --no-export          # queue만 추가
npm run social:export -- --id=sq_... --force
```

캡션: `NVIDIA_API_KEY`가 있으면 NVIDIA NIM, 없으면 로컬 템플릿.  
이미지(기본): **네이버/POI 실사**를 `source.jpg`와 `image.jpg`로 씁니다(장소 정확도 우선).  
선택 AI: 같은 키로 **POI 사진 기반 img2img**(NVIDIA FLUX.1-Kontext-dev) — 사진의 장소 레이아웃·몽돌/해안 등을 유지한 채 밝은 Pixar/3D 여행 일러스트로 리스타일하고 Emily(금발 곱슬·둥근 안경)를 미드그라운드(~20–35% 높이)에 넣습니다.  
순수 text-to-image(가짜 해변/고스트 얼굴)는 **기본 비활성**입니다.  
`SOCIAL_IMAGE_FALLBACK=none`(기본) → AI 실패·무키면 POI만 사용 + `image-prompt.txt`(수동 img2img용).  
옵트인: `SOCIAL_IMAGE_FALLBACK=kontext` 로 Pollinations Kontext img2img(공개 이미지 URL 필요).  
캡션 또는 일러스트가 AI이면 `meta.json`의 `is_ai_generated: true` (+ `UPLOAD_NOTES.txt` 안내).

캐릭터 레퍼런스: `scripts/social/assets/emily-reference.png`.

로컬 `.env` 예시 (모두 선택):

```env
NVIDIA_API_KEY=
# Optional image knobs:
# SOCIAL_IMAGE_GEN=1
# SOCIAL_IMAGE_FALLBACK=none          # default — POI photo; no pure T2I
# SOCIAL_IMAGE_FALLBACK=kontext       # optional Pollinations Kontext img2img
# SOCIAL_IMAGE_RETRIES=2
# NVIDIA_KONTEXT_API_URL=https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev
# NVIDIA_KONTEXT_STEPS=30
# NVIDIA_KONTEXT_CFG=3.5
# NVIDIA_IMAGE_TIMEOUT_MS=120000
# NVIDIA_IMAGE_WIDTH=896
# NVIDIA_IMAGE_HEIGHT=1152
# Caption CTA links default to https://daedongyeojido-nine.vercel.app
# SITE_URL=https://daedongyeojido-nine.vercel.app
# Local debug only (also set ALLOW_LOCALHOST_SITE_URL=1):
# SITE_URL=http://localhost:3000
# ALLOW_LOCALHOST_SITE_URL=1
```

PowerShell에서 키만 세션에 넣을 때:

```powershell
$env:NVIDIA_API_KEY = "nvapi-..."
npm run social:draft -- --count=1
```

---

## 팩 위치와 구성

경로: `social-exports/<YYYYMMDD>-<slug>/`

| 파일 | 내용 |
| --- | --- |
| `image.jpg` (또는 `.png` / `.webp`) | 기본=네이버/POI 실사; NVIDIA Kontext img2img 성공 시 Emily 일러스트 |
| `source.jpg` | 원본 네이버/POI 사진 (다운로드 성공 시 항상) |
| `image-prompt.txt` | source.jpg 기반 img2img 프롬프트 (수동 도구용, 항상 기록) |
| `caption.txt` | KO + EN + 해시태그 (복붙용) |
| `meta.json` | slug, theme, trend, 추천 게시 시각(KST), alt_text, `is_ai_generated`, `image_ai_generated` |
| `UPLOAD_NOTES.txt` | 수동 업로드 체크리스트 |

추천 슬롯 (KST): **11:00** (트렌드 우선) · **19:00** (테마 로테이션).

Queue: `src/data/social_queue.json`  
상태 흐름: `draft` → `exported` → (선택 `approved`) → `published` | `failed`

```bash
# 선택: 업로드 예정으로 표시
npm run social:approve -- --id=<queue-item-id>
```

---

## GitHub Actions

`.github/workflows/social-post.yml` — KST 11:00 / 19:00 (= UTC `0 2 * * *` / `0 10 * * *`)

1. `npm run social:draft` (Meta 토큰 **불필요**)
2. `social-exports/` + `social_queue.json` 커밋·푸시

선택 secret: `NVIDIA_API_KEY` (캡션 + Emily **img2img** via FLUX Kontext), `SITE_URL` (캡션 CTA / media-proxy; 미설정 시 `https://daedongyeojido-nine.vercel.app`).

---

## 콘텐츠 믹스 (참고)

주 ~14포스트 목표:

| 비율 | 포맷 | 비고 |
| --- | --- | --- |
| 40% | 장소 카드 | 사진 + 스토리형 캡션 |
| 30% | 트렌드/성지 | `place.trend` 가중치↑ |
| 20% | 릴스 | 이후 영상 파이프라인 |
| 10% | 시리즈 | 지역/테마 TOP |

`pickPlaces.js`가 trend·localGem·평점·최근 14일 미사용 규칙을 반영합니다.

---

## Appendix — Meta Graph API (선택 / advanced)

자동 발행이 꼭 필요할 때만 사용하세요. App Review·PPA·장기 토큰 유지가 필요합니다.

### 필요 secret

| Secret | 설명 |
| --- | --- |
| `META_PAGE_ACCESS_TOKEN` | Page access token (장기) |
| `META_IG_USER_ID` | Instagram Business Account id |
| `META_PAGE_ID` | Facebook Page id |
| `SITE_URL` | 공개 HTTPS origin — Meta가 fetch할 이미지 프록시용 |

헬퍼:

```bash
npm run social:token -- --short-token=EAAB...
npm run social:approve -- --id=...
npm run social:publish -- --force-meta
npm run social:publish -- --force-meta --dry-run
npm run social:insights
```

`social:publish`는 기본으로 수동 업로드 안내만 출력합니다. API 경로는 `--force-meta`가 있어야 동작합니다.

Instagram은 **공개 HTTPS `image_url`** 이 필요합니다. 네이버 CDN 등은 Meta fetch가 실패하는 경우가 많아 API 경로에서는 `{SITE_URL}/api/media-proxy/{slug}` 를 사용합니다. **수동 팩은 이미지를 로컬에 저장하므로 이 제약이 없습니다.**

토큰·앱 생성·권한(`instagram_content_publish`, `pages_manage_posts` 등)·PPA 절차는 [Meta for Developers](https://developers.facebook.com) 문서를 따르세요.
