import { describe, expect, it } from "vitest";
import {
  getPublishedPhoenixPartnerProfiles,
  PHOENIX_PARTNER_PROFILES,
  type PhoenixPartnerProfile,
} from "@/config/phoenix-partners";

const profile = (id: string, status: PhoenixPartnerProfile["status"]): PhoenixPartnerProfile => ({
  id,
  status,
  name: `Partner ${id}`,
  story: "Approved profile copy.",
  deliverables: ["Approved deliverable"],
});
describe("Phoenix partner publication gate", () => {
  it("starts with no partner profiles", () => {
    expect(PHOENIX_PARTNER_PROFILES).toEqual([]);
  });

  it("exposes published profiles only", () => {
    const profiles = [profile("draft", "draft"), profile("review", "review"), profile("live", "published")];

    expect(getPublishedPhoenixPartnerProfiles(profiles)).toEqual([profiles[2]]);
  });
});
