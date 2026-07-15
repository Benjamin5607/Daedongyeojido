import {
  extractKnowledgeQueries,
  gatherKnowledgeForQueries,
} from "@/lib/guideBot/knowledge/aggregate";

export const dynamic = "force-dynamic";

interface KnowledgeRequestBody {
  query?: string;
  nearbyNames?: string[];
}

export async function POST(request: Request) {
  let body: KnowledgeRequestBody = {};
  try {
    body = (await request.json()) as KnowledgeRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query : "";
  const nearbyNames = Array.isArray(body.nearbyNames)
    ? body.nearbyNames.filter((n): n is string => typeof n === "string").slice(0, 6)
    : [];

  const queries = extractKnowledgeQueries(query, nearbyNames);
  if (queries.length === 0) {
    return Response.json(
      {
        query: "",
        snippets: [],
        sourcesTried: [],
        sourcesOk: [],
        formatted: "",
      },
      { status: 200 }
    );
  }

  const bundle = await gatherKnowledgeForQueries(queries);
  return Response.json(bundle);
}
