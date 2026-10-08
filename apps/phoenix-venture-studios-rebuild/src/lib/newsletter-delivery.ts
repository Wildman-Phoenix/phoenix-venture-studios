export type WelcomeState = "accepted" | "delayed" | "review";
export function welcomeState(result: { welcome_delivery?: { delivered?: boolean; reason?: string } } | null): WelcomeState {
  if (result?.welcome_delivery?.delivered === true) return "accepted";
  return result?.welcome_delivery?.reason === "receipt_requires_review" ? "review" : "delayed";
}
export const welcomeMessage: Record<WelcomeState, string> = {
  accepted: "The email provider accepted your welcome message. Inbox delivery is not yet confirmed.",
  delayed: "Your subscription is saved, but your welcome message has not been confirmed. You can retry the welcome message below.",
  review: "Your subscription is saved. The welcome message needs a delivery check before it can be retried safely.",
};
