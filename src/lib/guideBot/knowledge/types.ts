export type KnowledgeSourceId =
  | "encykorea"
  | "heritage"
  | "sillok"
  | "jangseogak";

export interface KnowledgeSnippet {
  source: KnowledgeSourceId;
  sourceLabel: string;
  title: string;
  summary: string;
  url?: string;
}

export interface KnowledgeBundle {
  query: string;
  snippets: KnowledgeSnippet[];
  sourcesTried: KnowledgeSourceId[];
  sourcesOk: KnowledgeSourceId[];
  formatted: string;
}
