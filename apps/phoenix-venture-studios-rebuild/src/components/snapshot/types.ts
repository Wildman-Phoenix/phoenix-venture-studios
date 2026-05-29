export interface SnapshotFormData {
  // Contact
  name: string;
  email: string;
  marketingConsent: boolean;

  // Section 1: Where You Are Now
  buildingOrGrowing: string;
  ventureStage: string;
  currentlyOperating: string;
  generatingRevenue: string;
  industry: string;

  // Section 2: What You Have in Place
  assetsInPlace: string[];
  investedMoney: string;
  operatingDuration: string;

  // Section 3: What's Getting in the Way
  biggestChallenge: string;
  alreadyTried: string;
  hardestPart: string;
  mostUrgent: string;

  // Section 4: What Kind of Help
  lookingFor: string;
  conversationType: string;
  worthIt: string;
  guidanceOrImplementation: string;

  // Legacy fields kept for scoring/routing
  budgetRange: string;
  timeline: string;
  founderRole: string;
  capitalObjective: string;
  creditStrength: string;
  preferredNextStep: string;
  supportInterests: string[];
  ventureSummary: string;
}

export const DEFAULT_FORM_DATA: SnapshotFormData = {
  name: "",
  email: "",
  marketingConsent: false,
  buildingOrGrowing: "",
  ventureStage: "",
  currentlyOperating: "",
  generatingRevenue: "",
  industry: "",
  assetsInPlace: [],
  investedMoney: "",
  operatingDuration: "",
  biggestChallenge: "",
  alreadyTried: "",
  hardestPart: "",
  mostUrgent: "",
  lookingFor: "",
  conversationType: "",
  worthIt: "",
  guidanceOrImplementation: "",
  budgetRange: "",
  timeline: "",
  founderRole: "",
  capitalObjective: "",
  creditStrength: "",
  preferredNextStep: "",
  supportInterests: [],
  ventureSummary: "",
};

export interface SnapshotResult {
  opportunityOverview: string;
  capitalPathways: string;
  marketDynamics: string;
  goToMarketDirection: string;
}

export type RouteRecommendation = "discovery" | "strategy-intensive" | "funding";

export interface SectionProps {
  formData: SnapshotFormData;
  update: (field: keyof SnapshotFormData, value: any) => void;
}
