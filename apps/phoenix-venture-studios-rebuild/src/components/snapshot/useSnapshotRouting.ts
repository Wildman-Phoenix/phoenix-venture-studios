import { useMemo } from "react";
import { SnapshotFormData, RouteRecommendation } from "./types";

export function useSnapshotRouting(formData: SnapshotFormData) {
  const readinessScore = useMemo(() => {
    let score = 35;

    const stageScores: Record<string, number> = {
      idea: 0, validation: 6, building: 12, launched: 18, growth: 24,
    };
    score += stageScores[formData.ventureStage] || 0;

    const budgetScores: Record<string, number> = {
      "under-10k": 0, "10k-25k": 3, "25k-50k": 6, "50k-100k": 10, "100k-250k": 14, "over-250k": 18,
    };
    score += budgetScores[formData.budgetRange] || 0;

    const creditScores: Record<string, number> = {
      "under-650": 0, "650-700": 4, "700-740": 8, "740-plus": 12,
    };
    score += creditScores[formData.creditStrength] || 0;

    // Assets bonus
    score += Math.min(formData.assetsInPlace.length * 1.5, 10);

    // Revenue bonus
    if (formData.generatingRevenue === "yes-consistent") score += 6;
    else if (formData.generatingRevenue === "yes-early") score += 3;

    // Operating duration bonus
    if (formData.operatingDuration === "over-3-years") score += 4;
    else if (formData.operatingDuration === "1-3-years") score += 3;

    if (formData.industry) score += 1;
    if (formData.ventureSummary) score += 2;

    return Math.min(Math.round(score), 95);
  }, [formData]);

  const capitalPathwayFit = useMemo(() => {
    const pathways = { businessCredit: 0, structuredCapital: 0, founderStrategy: 0 };

    if (formData.creditStrength === "740-plus") pathways.businessCredit += 3;
    else if (formData.creditStrength === "700-740") pathways.businessCredit += 2;
    else if (formData.creditStrength === "650-700") pathways.businessCredit += 1;

    if (["100k-250k", "over-250k"].includes(formData.budgetRange)) {
      pathways.structuredCapital += 3;
      pathways.founderStrategy += 2;
    } else if (formData.budgetRange === "50k-100k") {
      pathways.structuredCapital += 2;
    } else {
      pathways.businessCredit += 2;
    }

    if (formData.generatingRevenue === "yes-consistent") {
      pathways.structuredCapital += 2;
    } else if (formData.generatingRevenue === "pre-revenue") {
      pathways.founderStrategy += 1;
    }

    if (["launched", "growth"].includes(formData.ventureStage)) {
      pathways.structuredCapital += 2;
    } else if (["idea", "validation"].includes(formData.ventureStage)) {
      pathways.founderStrategy += 1;
      pathways.businessCredit += 1;
    }

    if (formData.lookingFor === "strategic-guidance" || formData.lookingFor === "both-funding-strategy") {
      pathways.founderStrategy += 2;
    }
    if (formData.lookingFor === "funding-options" || formData.lookingFor === "both-funding-strategy") {
      pathways.businessCredit += 1;
      pathways.structuredCapital += 1;
    }

    return pathways;
  }, [formData]);

  const routeRecommendation: RouteRecommendation = useMemo(() => {
    // Strong funding signals: established, revenue, higher budget
    const hasFundingSignals =
      formData.generatingRevenue === "yes-consistent" &&
      ["100k-250k", "over-250k"].includes(formData.budgetRange) &&
      ["launched", "growth"].includes(formData.ventureStage);

    if (hasFundingSignals) return "funding";

    // Strategy intensive: more mature, detailed, urgent
    const hasStrategySignals =
      formData.assetsInPlace.length >= 4 ||
      formData.conversationType === "deep-strategy" ||
      formData.mostUrgent === "need-both" ||
      (formData.guidanceOrImplementation === "guidance-plus-help" || formData.guidanceOrImplementation === "full-support");

    const hasMaturity =
      ["building", "launched", "growth"].includes(formData.ventureStage) ||
      formData.generatingRevenue === "yes-early" ||
      formData.generatingRevenue === "yes-consistent";

    if (hasStrategySignals && hasMaturity) return "strategy-intensive";

    return "discovery";
  }, [formData]);

  const recommendedNextMove = useMemo(() => {
    switch (routeRecommendation) {
      case "funding":
        return {
          action: "Start your Capital Readiness Review",
          description: "Your profile suggests you may be a strong fit for structured funding pathways. A full readiness review is the best next step.",
        };
      case "strategy-intensive":
        return {
          action: "Book a Founder Strategy Session",
          description: "Based on what you've shared, a deeper strategic conversation could help you move faster and more confidently.",
        };
      default:
        return {
          action: "Start with a free discovery call",
          description: "A quick, no-pressure conversation to explore where you are and what kind of support might help most.",
        };
    }
  }, [routeRecommendation]);

  return { readinessScore, capitalPathwayFit, routeRecommendation, recommendedNextMove };
}
