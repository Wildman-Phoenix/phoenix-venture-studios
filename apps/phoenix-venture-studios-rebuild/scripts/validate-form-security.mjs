import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFile(path.join(APP_ROOT, relativePath), "utf8");
const [webhook, adapter, submit, onboarding, validate, newsletterMigration] = await Promise.all([
  read("supabase/functions/ghl-newsletter-webhook/index.ts"),
  read("supabase/functions/_shared/highlevel-newsletter.ts"),
  read("supabase/functions/submit-form/index.ts"),
  read("supabase/functions/process-onboarding-drip/index.ts"),
  read("supabase/functions/validate-form/index.ts"),
  read("supabase/migrations/20260616233000_highlevel_newsletter_migration.sql"),
]);

const checks = [
  [webhook.includes('req.headers.get("x-ghl-signature")') && webhook.includes("verifyGhlSignature"), "Katalyst webhook signature verification is missing"],
  [!webhook.toLowerCase().includes("x-wh-signature"), "Deprecated unsigned/legacy webhook path is still accepted"],
  [adapter.includes("contactIsSuppressed(config, contactId)"), "Transactional delivery does not enforce suppression"],
  [adapter.includes('throw new Error("HighLevel subscriber does not exist; preferences cannot create a marketing contact.")'), "Preferences can still create a marketing contact"],
  [adapter.includes('method: "PUT"') && adapter.includes("path: `/contacts/${contactId}`"), "Preferences are not constrained to an existing contact"],
  [adapter.includes("await removeTags(config, contactId, [...BASE_TAGS, ONBOARDING_TAG, PREFERENCES_COMPLETE_TAG])"), "Unsubscribe does not remove every Phoenix audience tag"],
  [adapter.includes("assertCustomFields") && !adapter.includes("ensureCustomFields"), "Normal subscriber sync can still provision CRM metadata"],
  [onboarding.includes('.eq("marketing_consent", true)'), "Onboarding does not require marketing consent"],
  [submit.includes('.select("marketing_consent, unsubscribed, unsubscribed_at")') && submit.includes("marketing_consent: existingSubscriber.marketing_consent"), "Preference mirror can overwrite consent"],
  [validate.includes("turnstile") && validate.includes("form_security_log"), "Protected form validation/Turnstile evidence is missing"],
  [!newsletterMigration.includes('CREATE POLICY "Anyone can read newsletter sync events"') && newsletterMigration.includes('TO service_role'), "Newsletter sync evidence is readable outside the service role"],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length) {
  console.error(failures.map((message) => `- ${message}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Phoenix form-security contract passed (${checks.length} invariants).`);
}
