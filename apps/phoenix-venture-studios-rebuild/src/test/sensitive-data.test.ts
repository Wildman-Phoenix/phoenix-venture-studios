import { describe, expect, it } from "vitest";
import { detectSensitiveData } from "@/lib/sensitive-data";

describe("sensitive-data guard", () => {
  it.each([
    ["My SSN is 123-45-6789", "Social Security number"],
    ["Here is my routing number", "bank or routing information"],
    ["I can send my online banking login", "login credentials"],
    ["I attached my tax return", "tax files"],
    ["Please review my credit report", "credit files"],
  ])("blocks %s", (value, expected) => {
    expect(detectSensitiveData([value])).toBe(expected);
  });

  it("allows ordinary founder and funding context", () => {
    expect(detectSensitiveData(["We need working capital for inventory and a new website."])).toBeNull();
  });
});
