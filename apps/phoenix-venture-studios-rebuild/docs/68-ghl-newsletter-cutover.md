# GoHighLevel Newsletter Cutover

This is the Phoenix newsletter migration pack for moving newsletter operations from Supabase/Resend-first delivery toward a GoHighLevel-first model.

## What the code now does

- `submit-form` still enforces Turnstile / validation gating.
- Newsletter signup, preferences, and unsubscribe are wired to sync through a shared GoHighLevel adapter.
- Legacy local tables remain in place for fallback and audit.
- `send-founder-signal` now supports `HIGHLEVEL_NEWSLETTER_MODE=primary|shadow|disabled`.
- `ghl-newsletter-webhook` accepts inbound GHL event callbacks for unsubscribe/suppression audit syncing.

## Current truth

- The architecture for GHL-first newsletter routing is in place.
- Signup, unsubscribe, and preference syncing already route through the shared GoHighLevel adapter.
- Welcome and onboarding emails use GoHighLevel transactional delivery only when `HIGHLEVEL_NEWSLETTER_MODE=primary` and the provider is configured; in `shadow` or fallback cases they still rely on Resend or log-only behavior.
- Later onboarding functions can return `success: true` in log-only fallback mode when Resend is absent, so function success alone is not inbox proof.
- This document does not, by itself, prove live GHL delivery is currently working end to end.
- Treat live welcome-email delivery, inbox arrival, workflow enrollment, and unsubscribe behavior as verification steps that still need explicit testing before calling `primary` mode proven.

## Modes

- `disabled`: legacy fallback behavior only
- `shadow`: legacy behavior stays live, but Phoenix also mirrors newsletter state to GHL
- `primary`: GHL becomes the primary newsletter system, while Supabase remains the audit/fallback layer

## Required env vars

- `HIGHLEVEL_LOCATION_ID`
- `HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN`
- `HIGHLEVEL_NEWSLETTER_MODE`

## Optional workflow wiring

- `HIGHLEVEL_NEWSLETTER_SIGNUP_WORKFLOW_ID`
- `HIGHLEVEL_NEWSLETTER_REACTIVATION_WORKFLOW_ID`
- `HIGHLEVEL_NEWSLETTER_PREFERENCES_WORKFLOW_ID`
- `HIGHLEVEL_NEWSLETTER_UNSUBSCRIBE_WORKFLOW_ID`

If workflow IDs are omitted, Phoenix still syncs contacts and tags into GHL but will not enroll contacts into workflows automatically.

## Weekly Founder Signal webhook contract

If `HIGHLEVEL_NEWSLETTER_WEEKLY_WEBHOOK_URL` is configured, `send-founder-signal` posts:

```json
{
  "provider": "gohighlevel",
  "locationId": "your-location-id",
  "audienceTag": "phoenix-founder-signal",
  "newsletter": {
    "audienceTag": "phoenix-founder-signal",
    "canonicalLinks": ["https://phoenixventurestudios.com/founder-signal/signals/example/"],
    "entryCount": 4,
    "heroAngle": "This week's signal shows where founders can turn AI movement into clearer revenue and positioning.",
    "htmlBody": "<html>...</html>",
    "previewText": "This week's signal shows where founders can turn AI movement into clearer revenue and positioning.",
    "segmentKey": "phoenix-founder-signal-weekly",
    "sourceSlugs": ["example-signal-slug"],
    "subjectLine": "Capital is following usable AI",
    "textBody": "..."
  }
}
```

Use that webhook to trigger the weekly GHL send workflow or campaign builder action.

## GHL contact field map

Custom fields created or expected by Phoenix:

- `contact.phoenix_signup_timestamp`
- `contact.phoenix_signup_source`
- `contact.phoenix_marketing_consent`
- `contact.phoenix_newsletter_status`
- `contact.phoenix_current_stage`
- `contact.phoenix_primary_interest`
- `contact.phoenix_biggest_challenge`
- `contact.phoenix_what_are_you_building`
- `contact.phoenix_interactive_newsletter_preference`
- `contact.phoenix_interests`
- `contact.phoenix_segment`
- `contact.phoenix_last_founder_signal_sent_at`

## Standard tags

- `phoenix-newsletter`
- `phoenix-founder-signal`
- `phoenix-onboarding`
- `phoenix-preferences-complete`
- `phoenix-unsubscribed`
- derived `interest-*` tags
- derived `stage-*` tags

## Workflow build order in GHL

1. Signup intake workflow
2. Welcome workflow
3. Onboarding workflow
4. Preferences follow-up workflow
5. Weekly Founder Signal send workflow
6. Unsubscribe / suppression workflow

## Email examples

### Welcome email

- Subject: `Welcome to Founder Signal`
- Preview: `You're in. Here's what you'll get and how to make it useful.`
- Body direction:
  - confirm subscription
  - explain the signal / implication / next move framing
  - set expectation for weekly cadence
  - CTA: `Explore Founder Signal`

### Weekly Founder Signal

- Subject: `Capital is following usable AI`
- Preview: `This week's signal shows where founders can turn AI movement into clearer revenue and positioning.`
- Body direction:
  - short editorial open
  - 4 to 6 signal blocks
  - one `What this means now` section
  - one primary CTA: `Read Founder Signal`
  - optional secondary CTA: `Read the archive`

## Recommended cutover sequence

1. Run `shadow` mode with real GHL credentials.
2. Build and test the four contact workflows in GHL.
3. Configure the weekly webhook endpoint and confirm internal test sends.
4. Compare local audit rows with GHL contacts/tags/workflow enrollment.
5. Switch to `primary` mode only after welcome, preferences, and unsubscribe are verified.
