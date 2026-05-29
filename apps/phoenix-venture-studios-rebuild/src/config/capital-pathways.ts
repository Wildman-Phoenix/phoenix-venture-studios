/**
 * Capital Pathways Configuration
 * 
 * Central config for all funding pathways offered through Phoenix Venture Studios.
 * Used by the Capital Readiness Review form to match founders to the right pathway.
 */

export interface CapitalPathway {
  id: string;
  name: string;
  description: string;
  fundingRange: string;
  estimatedTimeline: string;
  creditRequirement: string;
  revenueRequirement: string;
  applyUrl: string;
  bookStrategyUrl: string;
}

export const CAPITAL_PATHWAYS: CapitalPathway[] = [
  {
    id: "invoice-factoring",
    name: "Invoice Factoring",
    description: "Best for businesses with receivables needing faster access to cash. Unlock working capital tied up in unpaid invoices.",
    fundingRange: "$25k – $2M+",
    estimatedTimeline: "As fast as 24–48 hours",
    creditRequirement: "Flexible — based on invoice quality",
    revenueRequirement: "$10k+ monthly revenue",
    applyUrl: "/sigma-funding",
    bookStrategyUrl: "https://calendly.com/rpbswildman/new-meeting",
  },
  {
    id: "business-credit-line",
    name: "Business Credit Line",
    description: "Unsecured or lightly secured credit lines for businesses with strong credit and consistent revenue.",
    fundingRange: "$25k – $500k+",
    estimatedTimeline: "2–4 weeks typical",
    creditRequirement: "680+ recommended",
    revenueRequirement: "$10k+ monthly revenue",
    applyUrl: "/preferred-funding",
    bookStrategyUrl: "https://calendly.com/rpbswildman/new-meeting",
  },
  {
    id: "growth-capital",
    name: "Growth Capital",
    description: "Structured funding for scaling operations, hiring, marketing, or expanding into new markets.",
    fundingRange: "$100k – $2M+",
    estimatedTimeline: "30–90 days typical",
    creditRequirement: "680+ recommended",
    revenueRequirement: "$50k+ monthly revenue",
    applyUrl: "/preferred-funding",
    bookStrategyUrl: "https://calendly.com/rpbswildman/new-meeting",
  },
  {
    id: "capital-strategy-session",
    name: "Capital Strategy Session",
    description: "A guided session to help you identify the best capital pathway based on where you are today and where you're headed.",
    fundingRange: "Depends on pathway",
    estimatedTimeline: "Start within 1 week",
    creditRequirement: "Any",
    revenueRequirement: "Any",
    applyUrl: "https://calendly.com/rpbswildman/new-meeting",
    bookStrategyUrl: "https://calendly.com/rpbswildman/new-meeting",
  },
];

export interface MatchInput {
  capitalObjective: string;
  revenueRange: string;
  creditStrength: string;
  fundingRange: string;
  ventureStage: string;
}

export interface MatchResult {
  pathway: CapitalPathway;
  confidence: "strong" | "moderate" | "exploratory";
  note?: string;
}

/**
 * Determines the best capital pathway based on founder inputs.
 */
export function matchCapitalPathway(input: MatchInput): MatchResult {
  const { capitalObjective, revenueRange, creditStrength, fundingRange, ventureStage } = input;

  const hasRevenue = ["10k-50k", "50k-250k", "250k-plus"].includes(revenueRange);
  const hasStrongCredit = ["720-plus", "680-720"].includes(creditStrength);
  const isEarlyStage = ventureStage === "early-traction";
  const isCashFlow = capitalObjective === "improve-cash-flow";
  const isGrowth = capitalObjective === "growth-capital";

  // Invoice Factoring match
  if (isCashFlow && hasRevenue) {
    return {
      pathway: CAPITAL_PATHWAYS.find(p => p.id === "invoice-factoring")!,
      confidence: "strong",
    };
  }

  // Business Credit Line match
  if (hasStrongCredit && hasRevenue && !isCashFlow) {
    return {
      pathway: CAPITAL_PATHWAYS.find(p => p.id === "business-credit-line")!,
      confidence: "strong",
    };
  }

  // Growth Capital match
  if (isGrowth && hasRevenue && hasStrongCredit) {
    return {
      pathway: CAPITAL_PATHWAYS.find(p => p.id === "growth-capital")!,
      confidence: "strong",
    };
  }

  // Early stage or low revenue → Strategy Session
  if (isEarlyStage || !hasRevenue) {
    return {
      pathway: CAPITAL_PATHWAYS.find(p => p.id === "capital-strategy-session")!,
      confidence: isEarlyStage ? "moderate" : "exploratory",
      note: !hasRevenue && !isEarlyStage
        ? "Based on your current revenue, a strategy session can help identify the right timing and pathway for funding."
        : undefined,
    };
  }

  // Default fallback
  return {
    pathway: CAPITAL_PATHWAYS.find(p => p.id === "capital-strategy-session")!,
    confidence: "exploratory",
  };
}
