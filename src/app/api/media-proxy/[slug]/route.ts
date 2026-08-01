/**
 * Re-serve place images as public URLs Meta Graph can fetch.
 * Naver ldb-phinf and similar CDNs often block Meta's crawler.
 *
 * GET /api/media-proxy/[slug]
 */
import placesData from "@/data/crawled_places.json";
import type { Place } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const THEME_FALLBACK: Record<string, string> = {
  "k-food":
    "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&q=80",
  hallyu:
    "https://images.unsplash.com/photo-1538485399082-712990db4820?w=1200&q=80",
  "k-beauty":
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5bd15?w=1200&q=80",
  "k-culture":
    "https://images.unsplash.com/photo-1583417319070-4a3b5fffe6f6?w=1200&q=80",
  "urban-nature":
    "https://images.unsplash.com/photo-1587735247366-c6662a32a3a0?w=1200&q=80",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function englishName(place: Place): string {
  if (typeof place.name === "string") return place.name;
  return place.name.en;
}

function buildSlugIndex(): Map<string, Place> {
  const used = new Set<string>();
  const map = new Map<string, Place>();
  const places = placesData as Place[];

  places.forEach((place, index) => {
    const name = englishName(place);
    const province = place.region?.province ?? "korea";
    const district = place.region?.district ?? place.region?.city ?? "";
    const base = slugify(`${name}-${district || province}`) || `place-${index}`;
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    map.set(slug, place);
  });

  return map;
}

const slugIndex = buildSlugIndex();

function isAllowedRemote(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return false;
  // Allow common place image hosts used by this project
  return (
    host.endsWith("pstatic.net") ||
    host.endsWith("naver.net") ||
    host.endsWith("unsplash.com") ||
    host.endsWith("images.unsplash.com") ||
    host.endsWith("googleusercontent.com") ||
    host.endsWith("ggpht.com") ||
    host.endsWith("kakaocdn.net") ||
    host.endsWith("daumcdn.net") ||
    host.endsWith("cloudinary.com") ||
    host.endsWith("githubusercontent.com")
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await context.params;
  const slug = decodeURIComponent(rawSlug || "").trim();
  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  const place = slugIndex.get(slug);
  if (!place) {
    return new Response("Place not found", { status: 404 });
  }

  const source =
    place.imageUrl ||
    THEME_FALLBACK[place.theme] ||
    THEME_FALLBACK["k-culture"];

  let remote: URL;
  try {
    remote = new URL(source);
  } catch {
    return new Response("Invalid image URL", { status: 502 });
  }

  if (!/^https?:$/i.test(remote.protocol) || !isAllowedRemote(remote)) {
    return new Response("Image host not allowed", { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(remote.toString(), {
      headers: {
        "User-Agent":
          "DaedongyeojidoMediaProxy/1.0 (+https://github.com; social image mirror)",
        Accept: "image/*,*/*",
      },
      redirect: "follow",
      cache: "force-cache",
    });
  } catch {
    return new Response("Upstream fetch failed", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(`Upstream ${upstream.status}`, { status: 502 });
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  const upstreamType = upstream.headers.get("content-type") || "";
  // Meta prefers JPEG; pass through when already jpeg/png/webp, else label jpeg-friendly
  let contentType = "image/jpeg";
  if (/image\/(jpeg|jpg|png|webp|gif)/i.test(upstreamType)) {
    contentType = upstreamType.split(";")[0].trim();
  } else if (/\.png(\?|$)/i.test(remote.pathname)) {
    contentType = "image/png";
  } else if (/\.webp(\?|$)/i.test(remote.pathname)) {
    contentType = "image/webp";
  } else if (/\.(jpe?g)(\?|$)/i.test(remote.pathname)) {
    contentType = "image/jpeg";
  }

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
      "X-Image-Source-Host": remote.hostname,
    },
  });
}
