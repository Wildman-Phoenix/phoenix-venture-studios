/**
 * Maps internal editorial labels to public-facing branded labels.
 * Internal source "Phoenix Editorial" → public "Phoenix Perspective"
 * Internal editorial_category → public signal classification
 */

const CATEGORY_MAP: Record<string, string> = {
  "Founder Strategy Signal": "Strategic Signal",
  "Capital Market Signal": "Capital Signal",
  "AI Infrastructure Signal": "Market Signal",
  "Venture Funding Signal": "Funding Signal",
  "Business Credit Signal": "Capital Signal",
  "Market Risk Signal": "Market Signal",
  "Growth Capital Signal": "Funding Signal",
  "Regulatory Signal": "Market Signal",
};

/** Returns branded public label for an editorial_category */
export function getPublicSignalLabel(editorialCategory: string): string {
  return CATEGORY_MAP[editorialCategory] || "Founder Signal";
}

/** Returns branded public source name (replaces "Phoenix Editorial") */
export function getPublicSourceName(source: string): string {
  return source === "Phoenix Editorial" ? "Phoenix Perspective" : source;
}
