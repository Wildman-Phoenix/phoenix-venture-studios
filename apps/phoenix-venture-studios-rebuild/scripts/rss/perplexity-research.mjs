function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function nowIso(now = new Date()) {
  return (now instanceof Date ? now : new Date(now)).toISOString();
}

function toDomainFilter(source = {}) {
  const domains = Array.isArray(source.domains)
    ? source.domains
    : Array.isArray(source.domainFilters)
      ? source.domainFilters
      : [];
  return domains
    .map((domain) => String(domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim())
    .filter(Boolean);
}

function responseText(response = {}) {
  if (typeof response.answer === "string") return response.answer;
  if (typeof response.output_text === "string") return response.output_text;
  return normalizeText(response.choices?.[0]?.message?.content || response.choices?.[0]?.text || "");
}

function responseCitations(response = {}) {
  const citations = response.citations || response.search_results || response.results || [];
  return Array.isArray(citations)
    ? citations.map((citation) => ({
        title: normalizeText(citation.title || citation.name || citation.url || ""),
        url: citation.url || citation.link || "",
        date: citation.date || citation.published_date || citation.publishedAt || "",
        snippet: normalizeText(citation.snippet || citation.summary || citation.text || ""),
      })).filter((citation) => citation.url)
    : [];
}

function buildPrompt(source = {}, now = new Date()) {
  if (source.prompt) return source.prompt;
  const topics = Array.isArray(source.topics) ? source.topics.join(", ") : source.query || source.name;
  const domains = toDomainFilter(source);
  const domainInstruction = domains.length
    ? `Prefer these domains: ${domains.join(", ")}.`
    : "Prefer official vendor, changelog, release-note, engineering, or primary-source pages.";
  return [
    `Find recent business-relevant AI/product/tool updates for Phoenix Venture Studios as of ${nowIso(now)}.`,
    `Topic focus: ${topics}.`,
    domainInstruction,
    "Return concise cited findings only. Reject rumors, politics, culture-war framing, and uncited claims.",
  ].join(" ");
}

export function createPerplexityClient(options = {}) {
  const apiKey = options.apiKey || process.env.PERPLEXITY_API_KEY || "";
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const endpoint = options.endpoint || "https://api.perplexity.ai/chat/completions";
  const model = options.model || "sonar-pro";

  return {
    hasApiKey: Boolean(apiKey),
    async search(payload = {}) {
      if (!apiKey) throw new Error("PERPLEXITY_API_KEY missing; skipped Perplexity research source");
      if (typeof fetchImpl !== "function") throw new Error("fetch is not available for Perplexity research");
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a cited research collector for a business RSS pipeline. Return only source-backed findings." },
            { role: "user", content: payload.query },
          ],
          search_domain_filter: payload.domains,
          search_recency_filter: payload.recency || "week",
          return_citations: true,
        }),
      });
      if (!response.ok) throw new Error(`Perplexity HTTP ${response.status}`);
      return response.json();
    }
  };
}

export async function collectPerplexityResearchSource(source = {}, options = {}) {
  const now = options.now || new Date();
  const client = options.perplexityClient || createPerplexityClient(options);
  const warnings = [];
  if (!client?.hasApiKey && typeof client?.search !== "function") {
    return {
      items: [],
      warnings: [{
        source: source.name || source.id || "Perplexity research",
        url: source.url || "",
        error: "PERPLEXITY_API_KEY missing; skipped Perplexity research source",
      }],
    };
  }

  try {
    const response = await client.search({
      query: buildPrompt(source, now),
      domains: toDomainFilter(source),
      recency: source.recency || source.recencyFilter || "week",
    });
    const citations = responseCitations(response);
    if (!citations.length) {
      return {
        items: [],
        warnings: [{
          source: source.name || source.id || "Perplexity research",
          url: source.url || "",
          error: "Perplexity response had no citations and was rejected",
        }],
      };
    }

    const answer = responseText(response);
    const items = citations.slice(0, source.limit || 5).map((citation, index) => ({
      title: citation.title || normalizeText(answer).split(".")[0] || `${source.name || "Research"} cited finding`,
      url: citation.url,
      description: citation.snippet || answer,
      publishedAt: citation.date || nowIso(now),
      imageUrl: "",
      sourceImageUrl: "",
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url || "perplexity://research",
      sourceScore: Number(source.score ?? 70) - index,
      sourceSurface: "perplexity-research",
      sourceType: "perplexity-research",
      rawTitle: citation.title || "",
      topicLabel: source.topicLabel || "AI research sweep",
      whySelected: source.whySelected || "Discovered through cited Perplexity research and queued for Phoenix editorial scoring.",
      researchCitations: citations,
      candidateBuckets: Array.isArray(source.buckets) ? source.buckets : [],
    }));

    return { items, warnings };
  } catch (error) {
    warnings.push({
      source: source.name || source.id || "Perplexity research",
      url: source.url || "",
      error: error instanceof Error ? error.message : String(error),
    });
    return { items: [], warnings };
  }
}
