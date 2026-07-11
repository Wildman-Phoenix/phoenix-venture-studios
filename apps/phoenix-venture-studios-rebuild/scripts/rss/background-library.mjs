const FAMILY_DEFAULTS = {
  ai_risk: {
    accent: "#ff6a1f",
    secondary: "#00b8ff",
    position: "center",
  },
  ai_opportunity: {
    accent: "#00d4ff",
    secondary: "#ff8a1f",
    position: "center",
  },
  founder_pressure: {
    accent: "#ff7a1a",
    secondary: "#8ed9d2",
    position: "center",
  },
  capital_readiness: {
    accent: "#ff8a1f",
    secondary: "#00a6ff",
    position: "center",
  },
  market_shock: {
    accent: "#ff5a1f",
    secondary: "#00d4ff",
    position: "center",
  },
  operational_leverage: {
    accent: "#22d3ee",
    secondary: "#ff9b22",
    position: "center",
  },
  consulting_revenue: {
    accent: "#00d4ff",
    secondary: "#ff7a1a",
    position: "center",
  },
  event_workshop: {
    accent: "#ff7a1a",
    secondary: "#8ed9d2",
    position: "center",
  },
  wildcard_attention: {
    accent: "#22d3ee",
    secondary: "#ff8a1f",
    position: "center",
  },
};

function variant(family, publicPath, source, overrides = {}) {
  return {
    family,
    publicPath,
    source,
    ...FAMILY_DEFAULTS[family],
    saturation: 1.28,
    brightness: 1.04,
    contrast: 1.05,
    bias: -4,
    ...overrides,
  };
}

export const BACKGROUND_VARIANTS = [
  variant("ai_risk", "/images/signals/backgrounds/ai-risk-control-room.jpg", "src/assets/intel-trust-bg.jpg", {
    saturation: 1.26,
    brightness: 1.01,
    contrast: 1.08,
  }),
  variant("ai_risk", "/images/signals/backgrounds/ai-risk-signal-grid.jpg", "src/assets/snapshot-noise.jpg", {
    saturation: 1.18,
    brightness: 0.98,
    contrast: 1.12,
    creativeScene: "ai_risk_signal_grid",
  }),
  variant("ai_opportunity", "/images/signals/backgrounds/ai-opportunity.jpg", "src/assets/strategy-session.jpg", {
    saturation: 1.28,
    brightness: 1.06,
  }),
  variant("ai_opportunity", "/images/signals/backgrounds/ai-opportunity-operator-desk.jpg", "src/assets/phoenix-operator-workspace-gpt.jpg", {
    saturation: 1.22,
    brightness: 1.03,
    contrast: 1.08,
  }),
  variant("ai_opportunity", "/images/signals/backgrounds/ai-opportunity-signal-room.jpg", "src/assets/intel-signal-bg.jpg", {
    saturation: 1.3,
    brightness: 1.02,
    contrast: 1.1,
  }),
  variant("founder_pressure", "/images/signals/backgrounds/founder-pressure.jpg", "src/assets/hero-entrepreneur-v2.jpg", {
    saturation: 1.22,
    brightness: 1.05,
  }),
  variant("founder_pressure", "/images/signals/backgrounds/founder-pressure-briefing.jpg", "src/assets/snapshot-hero.jpg", {
    saturation: 1.16,
    brightness: 1.0,
    contrast: 1.1,
  }),
  variant("founder_pressure", "/images/signals/backgrounds/founder-pressure-decision-window.jpg", "src/assets/snapshot-readiness.jpg", {
    saturation: 1.2,
    brightness: 1.01,
    contrast: 1.08,
  }),
  variant("capital_readiness", "/images/signals/backgrounds/capital-readiness.jpg", "src/assets/funding-review.jpg", {
    saturation: 1.3,
    brightness: 1.05,
  }),
  variant("capital_readiness", "/images/signals/backgrounds/capital-readiness-ledger.jpg", "src/assets/phoenix-capital-readiness-gpt.jpg", {
    saturation: 1.2,
    brightness: 1.04,
    contrast: 1.08,
  }),
  variant("capital_readiness", "/images/signals/backgrounds/capital-readiness-scoreboard.jpg", "src/assets/snapshot-score.jpg", {
    saturation: 1.18,
    brightness: 1.02,
    contrast: 1.1,
  }),
  variant("market_shock", "/images/signals/backgrounds/market-shock.jpg", "src/assets/intel-hero.jpg", {
    saturation: 1.34,
    brightness: 1.02,
  }),
  variant("market_shock", "/images/signals/backgrounds/market-shock-volatility.jpg", "src/assets/intel-track.jpg", {
    saturation: 1.26,
    brightness: 1.0,
    contrast: 1.1,
    creativeScene: "market_volatility_canyon",
  }),
  variant("market_shock", "/images/signals/backgrounds/market-shock-spotlight.jpg", "src/assets/insights-featured.jpg", {
    saturation: 1.24,
    brightness: 1.01,
    contrast: 1.08,
  }),
  variant("operational_leverage", "/images/signals/backgrounds/operational-leverage.jpg", "src/assets/intel-action.jpg", {
    saturation: 1.25,
    brightness: 1.07,
  }),
  variant("operational_leverage", "/images/signals/backgrounds/operational-leverage-workflow.jpg", "src/assets/snapshot-guidance.jpg", {
    saturation: 1.18,
    brightness: 1.05,
    contrast: 1.08,
  }),
  variant("operational_leverage", "/images/signals/backgrounds/operational-leverage-ops-room.jpg", "src/assets/phoenix-strategy-room-gpt.jpg", {
    saturation: 1.22,
    brightness: 1.03,
    contrast: 1.1,
  }),
  variant("consulting_revenue", "/images/signals/backgrounds/consulting-revenue.jpg", "src/assets/hero-entrepreneur.jpg", {
    saturation: 1.28,
    brightness: 1.05,
  }),
  variant("consulting_revenue", "/images/signals/backgrounds/consulting-revenue-authority.jpg", "src/assets/traverse-city-authority-gpt.jpg", {
    saturation: 1.18,
    brightness: 1.03,
    contrast: 1.08,
  }),
  variant("consulting_revenue", "/images/signals/backgrounds/consulting-revenue-perspective.jpg", "src/assets/insights-perspective.jpg", {
    saturation: 1.2,
    brightness: 1.02,
    contrast: 1.08,
  }),
  variant("event_workshop", "/images/signals/backgrounds/event-workshop.jpg", "src/assets/founders-collaborating.jpg", {
    saturation: 1.24,
    brightness: 1.06,
  }),
  variant("event_workshop", "/images/signals/backgrounds/event-workshop-demo-floor.jpg", "src/assets/insights-categories.jpg", {
    saturation: 1.16,
    brightness: 1.03,
    contrast: 1.08,
  }),
  variant("event_workshop", "/images/signals/backgrounds/event-workshop-launchpad.jpg", "src/assets/traverse-city-aerial.jpg", {
    saturation: 1.14,
    brightness: 1.02,
    contrast: 1.1,
  }),
  variant("wildcard_attention", "/images/signals/backgrounds/wildcard-attention.jpg", "src/assets/late-night-strategy.jpg", {
    saturation: 1.3,
    brightness: 1.04,
  }),
  variant("wildcard_attention", "/images/signals/backgrounds/wildcard-attention-signal.jpg", "src/assets/intel-cta-bg.jpg", {
    saturation: 1.24,
    brightness: 1.02,
    contrast: 1.08,
  }),
  variant("wildcard_attention", "/images/signals/backgrounds/wildcard-attention-opportunity.jpg", "src/assets/snapshot-opportunity.jpg", {
    saturation: 1.18,
    brightness: 1.01,
    contrast: 1.1,
  }),
  variant("wildcard_attention", "/images/signals/backgrounds/wildcard-attention-filter.jpg", "src/assets/intel-filter.jpg", {
    saturation: 1.22,
    brightness: 1.0,
    contrast: 1.12,
    creativeScene: "attention_filter_prism",
  }),
  variant("ai_opportunity", "/images/signals/backgrounds/ai-opportunity-build-sprint.jpg", "src/assets/snapshot-path.jpg", {
    saturation: 1.16,
    brightness: 1.02,
    contrast: 1.09,
    creativeScene: "ai_build_sprint_flow",
  }),
];

export const IMAGE_FAMILIES = Object.entries(
  BACKGROUND_VARIANTS.reduce((families, entry) => {
    const family = families[entry.family] || {
      publicPath: entry.publicPath,
      fallbackSource: entry.source,
      position: entry.position,
      accent: entry.accent,
      secondary: entry.secondary,
      backgrounds: [],
    };
    family.backgrounds.push(entry.publicPath);
    families[entry.family] = family;
    return families;
  }, {}),
).reduce((result, [family, config]) => {
  result[family] = config;
  return result;
}, {});

export function getBackgroundVariantsForFamily(family) {
  return (IMAGE_FAMILIES[family] || IMAGE_FAMILIES.wildcard_attention).backgrounds;
}
