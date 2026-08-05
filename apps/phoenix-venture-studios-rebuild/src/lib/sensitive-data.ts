export const SENSITIVE_DATA_NOTICE =
  "Do not include SSNs, account or routing numbers, login details, tax files, credit files, or sensitive documents.";

const SENSITIVE_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Social Security number", pattern: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/i },
  { label: "Social Security number", pattern: /\b(?:social security|ssn)\b/i },
  { label: "bank or routing information", pattern: /\b(?:bank account|routing number|account number|wire instructions?)\b/i },
  { label: "login credentials", pattern: /\b(?:password|passcode|login credentials?|online banking login)\b/i },
  { label: "tax files", pattern: /\b(?:tax return|tax transcript|tax file|w-?2 form|1099 form)\b/i },
  { label: "credit files", pattern: /\b(?:credit report|credit file)\b/i },
];

export function detectSensitiveData(values: Array<string | null | undefined>): string | null {
  const text = values.filter(Boolean).join("\n");
  const match = SENSITIVE_PATTERNS.find(({ pattern }) => pattern.test(text));
  return match?.label ?? null;
}
