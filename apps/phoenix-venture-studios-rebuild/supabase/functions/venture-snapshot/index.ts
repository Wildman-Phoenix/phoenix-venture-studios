import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type VentureSnapshot = {
  opportunityOverview: string;
  capitalPathways: string;
  marketDynamics: string;
  goToMarketDirection: string;
};

function normalizeValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function buildFallbackSnapshot(input: {
  industry?: string;
  stage?: string;
  ventureSummary?: string;
  budgetRange?: string;
  timeline?: string;
  supportInterests?: string[];
}): VentureSnapshot {
  const industry = normalizeValue(input.industry, "your market");
  const stage = normalizeValue(input.stage, "the current stage");
  const summary = normalizeValue(input.ventureSummary, "a venture still being framed");
  const budgetRange = normalizeValue(input.budgetRange, "the capital range you noted");
  const timeline = normalizeValue(input.timeline, "your stated timeline");
  const interests = input.supportInterests && input.supportInterests.length > 0
    ? input.supportInterests.join(", ")
    : "general venture planning";

  return {
    opportunityOverview:
      `The signal here looks strongest if ${summary} can turn into a clear offer inside ${industry}. At ${stage}, the real opportunity is less about breadth and more about proving a focused wedge that makes the venture easy to understand. That kind of clarity usually shapes the next capital and execution decisions.`,
    capitalPathways:
      `The capital path should match what needs to be proven next, not just the size of ${budgetRange}. With a ${timeline} window, the strongest options usually come from aligning funding with one specific milestone, whether that is validation, revenue traction, or delivery capacity. ${interests} may also point to where structured outside support would matter most.`,
    marketDynamics:
      `The market question is whether timing in ${industry} is creating urgency or just noise. Founders at ${stage} often benefit from testing how buyers describe the problem before expanding the story too far. That usually reveals whether the venture is entering a crowded lane or a category with room for sharper positioning.`,
    goToMarketDirection:
      `The next move is to translate the concept into one simple offer, one target buyer, and one near-term proof point. That makes outreach, product sequencing, and capital conversations more coherent. If the venture can show real movement against that single direction, the broader path gets easier to evaluate.`,
  };
}

async function generateOpenAISnapshot(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<VentureSnapshot | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI venture snapshot error:", response.status, errorText.slice(0, 400));
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    return null;
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (typeof rawContent !== "string" || rawContent.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawContent);
    return {
      opportunityOverview: normalizeValue(parsed.opportunityOverview, ""),
      capitalPathways: normalizeValue(parsed.capitalPathways, ""),
      marketDynamics: normalizeValue(parsed.marketDynamics, ""),
      goToMarketDirection: normalizeValue(parsed.goToMarketDirection, ""),
    };
  } catch (error) {
    console.error("Failed to parse OpenAI venture snapshot JSON:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { industry, stage, ventureSummary, budgetRange, timeline, supportInterests } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    const systemPrompt = `You are a senior venture advisor at a premium venture studio, providing strategic directional insights for entrepreneurs. 

IMPORTANT RULES:
- This is a HIGH-LEVEL STRATEGIC PREVIEW, not a complete consulting deliverable
- Create strategic curiosity - leave room for deeper engagement
- Use confident but measured language ("may indicate", "suggests potential", "worth exploring")
- Focus on positioning, capital alignment, and early execution direction
- Sound like a seasoned advisor, not generic AI - be specific and insightful
- Do NOT use the word "assessment" - use "snapshot", "overview", or "strategic preview"
- Do NOT provide legal, financial, or investment advice
- Do NOT promise or guarantee any outcomes
- Create "curiosity gaps" - hint at deeper strategic considerations without fully resolving them
- Emphasize that execution, capital structure, and market timing are critical next steps
- Return valid JSON only with exactly these keys: opportunityOverview, capitalPathways, marketDynamics, goToMarketDirection

TONE: Strategic, confident, premium, founder-respectful, venture-studio level. Avoid generic phrases.

Each field should contain 2-3 sentences:
- opportunityOverview: frame the venture opportunity and its potential positioning
- capitalPathways: describe potential capital alignment and funding directions worth exploring
- marketDynamics: explain market factors, timing considerations, and competitive positioning to evaluate
- goToMarketDirection: cover early go-to-market considerations and execution priorities`;

    const userMessage = `Provide strategic directional insights based on the following venture profile:
- Industry: ${industry || "Not specified"}
- Venture Stage: ${stage || "Not specified"}
- Venture Summary: ${ventureSummary || "Not provided (concept confidential)"}
- Budget/Capital Range: ${budgetRange || "Not specified"}
- Timeline: ${timeline || "Not specified"}
- Areas of Interest: ${supportInterests?.join(", ") || "General guidance"}

Note: This founder has not disclosed their full concept. Provide strategic direction based on available context.`;

    let snapshot: VentureSnapshot | null = null;
    if (OPENAI_API_KEY) {
      try {
        snapshot = await generateOpenAISnapshot(OPENAI_API_KEY, systemPrompt, userMessage);
      } catch (error) {
        if (error instanceof Error && error.message === "RATE_LIMIT") {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("venture-snapshot OpenAI failure, using fallback:", error);
      }
    }

    if (!snapshot) {
      snapshot = buildFallbackSnapshot({ industry, stage, ventureSummary, budgetRange, timeline, supportInterests });
    }

    return new Response(JSON.stringify(snapshot), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("venture-snapshot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
