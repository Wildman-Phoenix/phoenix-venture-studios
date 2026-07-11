/**
 * Maps internal editorial labels to public-facing branded labels.
 * Internal source "Phoenix Editorial" → public "Founder Signal Original"
 * Internal editorial_category → public signal classification
 */

const CATEGORY_MAP: Record<string, string> = {
  "Founder Strategy Signal": "Strategic Signal",
  "Founder Strategy & Operations": "Strategic Signal",
  "Capital Market Signal": "Capital Signal",
  "AI Infrastructure Signal": "Market Signal",
  "AI Operator Impact": "Market Signal",
  "Venture Funding Signal": "Funding Signal",
  "Funding & Venture": "Funding Signal",
  "Business Credit Signal": "Capital Signal",
  "Market Risk Signal": "Market Signal",
  "Growth Capital Signal": "Funding Signal",
  "Regulatory Signal": "Market Signal",
};

const FEED_LABEL_MAP: Record<string, string> = {
  "founder-market": "Founder Signal",
  "founder-market-social": "Founder Signal social pick",
  "founder-tools": "Founder tools signal",
  "founder-tools-social": "Founder tools social pick",
  "ai-attention": "AI implementation signal",
  "ai-attention-social": "AI implementation social pick",
};

/** Returns branded public label for an editorial_category */
export function getPublicSignalLabel(editorialCategory: string): string {
  return CATEGORY_MAP[editorialCategory] || "Founder Signal";
}

/** Returns branded public source name (replaces "Phoenix Editorial") */
export function getPublicSourceName(source: string): string {
  return source === "Phoenix Editorial" ? "Founder Signal Original" : source;
}

/** Returns a founder-facing label for feed or lane ids */
export function getPublicFeedLabel(value: string): string {
  return FEED_LABEL_MAP[value] || value;
}
