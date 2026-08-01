#!/usr/bin/env node
/**
 * Meta token helpers — short-lived → long-lived exchange + Page/IG id lookup tips.
 * Does not print secrets to git; only stdout for the operator.
 *
 * Usage:
 *   npm run social:token -- --short-token=EAAB...
 *   npm run social:token -- --help
 */
const GRAPH = process.env.META_GRAPH_VERSION || "v21.0";
const BASE = `https://graph.facebook.com/${GRAPH}`;

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) out[arg.slice(2)] = true;
    else out[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  return out;
}

async function exchangeToken(shortToken) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Set META_APP_ID and META_APP_SECRET in the environment.");
  }
  const url = new URL(`${BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(body)}`);
  }
  return body;
}

function printHelp() {
  console.log(`
Meta token helper (see docs/meta-setup.md)

1) Get a short-lived user token via Graph API Explorer or Login.
2) Exchange:
     set META_APP_ID / META_APP_SECRET
     npm run social:token -- --short-token=EAAB...

3) With the long-lived USER token, fetch Page token:
     GET ${BASE}/{page-id}?fields=access_token&access_token=USER_TOKEN

4) Linked Instagram Business Account:
     GET ${BASE}/{page-id}?fields=instagram_business_account

5) Store in GitHub Secrets (never commit):
     META_PAGE_ACCESS_TOKEN, META_IG_USER_ID, META_PAGE_ID
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }
  const shortToken = args["short-token"] || args.shortToken;
  if (!shortToken) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const result = await exchangeToken(shortToken);
  console.log("Long-lived user token exchange OK.");
  console.log(`expires_in (seconds): ${result.expires_in ?? "n/a"}`);
  console.log("");
  console.log("access_token (copy securely — do not commit):");
  console.log(result.access_token);
  console.log("");
  console.log("Next: exchange for Page token and IG user id (docs/meta-setup.md §1.4).");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
