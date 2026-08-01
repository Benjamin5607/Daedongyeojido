/**
 * Meta Graph API client — Instagram container→publish + Facebook Page photo.
 * Requires env: META_PAGE_ACCESS_TOKEN, META_IG_USER_ID, META_PAGE_ID
 */
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function getCredentials() {
  return {
    pageToken: requireEnv("META_PAGE_ACCESS_TOKEN"),
    igUserId: requireEnv("META_IG_USER_ID"),
    pageId: requireEnv("META_PAGE_ID"),
  };
}

async function graphRequest(method, path, { query, body } = {}) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
  }

  const init = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(
      `Meta Graph ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Create IG image media container, wait briefly, then publish.
 * @param {{ imageUrl: string; caption: string; accessToken?: string; igUserId?: string }} opts
 */
async function publishInstagramFeed({ imageUrl, caption, accessToken, igUserId }) {
  const creds = accessToken && igUserId ? null : getCredentials();
  const token = accessToken || creds.pageToken;
  const userId = igUserId || creds.igUserId;

  const container = await graphRequest("POST", `/${userId}/media`, {
    query: {
      image_url: imageUrl,
      caption,
      access_token: token,
    },
  });

  const creationId = container.id;
  if (!creationId) throw new Error("IG media container missing id");

  // Container processing can take a few seconds
  await sleep(4000);

  let published;
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      published = await graphRequest("POST", `/${userId}/media_publish`, {
        query: {
          creation_id: creationId,
          access_token: token,
        },
      });
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
      await sleep(3000 * (attempt + 1));
    }
  }
  if (lastErr) throw lastErr;

  return { containerId: creationId, mediaId: published.id };
}

/**
 * Post photo to Facebook Page.
 * @param {{ imageUrl: string; caption: string; accessToken?: string; pageId?: string }} opts
 */
async function publishFacebookPagePhoto({ imageUrl, caption, accessToken, pageId }) {
  const creds = accessToken && pageId ? null : getCredentials();
  const token = accessToken || creds.pageToken;
  const id = pageId || creds.pageId;

  const result = await graphRequest("POST", `/${id}/photos`, {
    query: {
      url: imageUrl,
      caption,
      access_token: token,
    },
  });

  return { postId: result.post_id || result.id, photoId: result.id };
}

/**
 * Publish both IG feed + FB Page photo for one queue item.
 */
async function publishCrossPost({ imageUrl, caption }) {
  const ig = await publishInstagramFeed({ imageUrl, caption });
  let fb = null;
  try {
    fb = await publishFacebookPagePhoto({ imageUrl, caption });
  } catch (err) {
    console.warn(`FB Page publish failed (IG ok): ${err.message}`);
  }
  return { ig, fb };
}

/**
 * Stub-friendly insights fetch for IG media / account.
 */
async function fetchIgAccountInsights({ metrics } = {}) {
  const { pageToken, igUserId } = getCredentials();
  const metricList =
    metrics ||
    "impressions,reach,profile_views,follower_count";
  try {
    return await graphRequest("GET", `/${igUserId}/insights`, {
      query: {
        metric: metricList,
        period: "day",
        access_token: pageToken,
      },
    });
  } catch (err) {
    return { error: err.message, data: err.data };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  GRAPH_VERSION,
  GRAPH_BASE,
  getCredentials,
  graphRequest,
  publishInstagramFeed,
  publishFacebookPagePhoto,
  publishCrossPost,
  fetchIgAccountInsights,
};
