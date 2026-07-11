import routeValues from "./phoenix-routes.json";

export const PHOENIX_ROUTES = routeValues as Readonly<typeof routeValues>;

export const PHOENIX_CTAS = {
  founderSignalSubscribe: PHOENIX_ROUTES.founderSignal,
  founderSignalDetail: PHOENIX_ROUTES.founderSignalDetail,
  archive: PHOENIX_ROUTES.marketIntelligence,
  funding: PHOENIX_ROUTES.funding,
  studio: PHOENIX_ROUTES.studio,
  applicationPath: PHOENIX_ROUTES.applicationPath,
  nathanReview: `${PHOENIX_ROUTES.contact}?intent=review`,
  preferences: PHOENIX_ROUTES.preferences,
  unsubscribe: PHOENIX_ROUTES.unsubscribe,
} as const;

type UtmOptions = {
  campaign: string;
  source: string;
  medium: string;
  content?: string;
  signalId?: string;
};

export function buildPhoenixTrackedUrl(destination: string, options: UtmOptions): string {
  const url = new URL(destination, "https://phoenixventurestudios.com");
  url.searchParams.set("utm_source", options.source);
  url.searchParams.set("utm_medium", options.medium);
  url.searchParams.set("utm_campaign", options.campaign);
  if (options.content) url.searchParams.set("utm_content", options.content);
  if (options.signalId) url.searchParams.set("phoenix_signal", options.signalId);
  return url.toString();
}
