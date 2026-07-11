# Phoenix Application Path General Intake Spec

Date: 2026-07-01
Mode: local spec only, approval-gated HighLevel build

## Purpose

Create one simple intake path that can route a person toward funding referrals, AI consulting, certification/product fit, partnership/referral review, or Nathan review without forcing them through a long form.

This is not a live HighLevel build approval. It does not approve CRM writes, workflow publishing, partner sharing, credit pulls, document uploads, bank access, tax-file review, or external messages.

## Front Door

Public name: `Phoenix Application Path`

Public promise:

> Find the right next path for funding, consulting, or business growth.

V1 front door:

- HighLevel survey/form first.
- Conversational wording.
- Short enough to complete in one sitting.
- Designed so the same decision path can later become guided chat.

## First Screen Fields

- First name
- Last name
- Email
- Phone
- Business name
- What are you trying to do?
  - Get funding or build business credit
  - Get help with AI systems or automation
  - Explore certification or training
  - Discuss partnership or referral
  - I am not sure yet
- Consent to be contacted

## Routing Questions

Ask only the fields needed for the selected path.

General:

- Business stage
- Main objective
- Urgency
- Preferred next step
- Anything sensitive we should avoid discussing by text/email

Funding / business credit:

- Time in business
- Monthly revenue range
- Funding amount range
- Entity status
- Business bank account status
- Documents readiness
- Personal guarantee comfort level

AI consulting / automation:

- Current system pain
- Tools currently used
- Desired outcome
- Timeline
- Team size

Certification / product:

- Role
- Experience level
- Why now
- Preferred learning format

Partnership / referral:

- Partner type
- Audience served
- Referral volume expectation
- Best intro path

## HighLevel Objects

Survey/Form:

- `Phoenix Application Path`

Pipeline:

- `Phoenix Applications`

Stages:

- `New`
- `Needs Review`
- `Funding Fit`
- `Consulting Fit`
- `Prep First`
- `Partner Match`
- `Referred`
- `Not Fit`

Tags:

- `intake-started`
- `intake-needs-review`
- `funding-fit`
- `consulting-fit`
- `prep-first`
- `partner-match-ready`
- `referral-approved`

Custom fields:

- `application_goal`
- `business_stage`
- `monthly_revenue_range`
- `time_in_business`
- `funding_amount_range`
- `urgency`
- `entity_status`
- `business_bank_account_status`
- `preferred_next_step`
- `consent_to_contact`
- `partner_referral_consent`
- `sensitive_topic_warning`

## Decision Labels

Ready:

- Consent is present.
- Goal is clear.
- Business or offer context exists.
- The next lane is obvious.

Needs you:

- High-value but unclear.
- Possible partner referral.
- Sensitive or finance-related.
- Applicant asks for something that should not be automated.

Prep First:

- Missing entity, banking, documents, offer clarity, or basic readiness.

Review:

- Ambiguous, incomplete, or risky.

Blocked:

- No contact consent.
- Requests bank login, SSN, tax documents, hard credit pull, account number handling, or another restricted action.

## Workflow Draft

Trigger:

- Form submitted or survey submitted for `Phoenix Application Path`.

Actions:

1. Add `intake-started`.
2. Create or update contact.
3. Create opportunity in `Phoenix Applications` at `New`.
4. Branch by selected goal.
5. Apply the matching route tag.
6. Move opportunity to the matching stage.
7. Create internal task when route is `Needs Review`, `Partner Match`, `Prep First`, or `Blocked`.
8. Send a simple confirmation to the applicant.
9. Do not send partner messages or external referral webhooks in V1.

Stop rules:

- Stop if consent is missing.
- Stop if applicant requests restricted finance/document/credit handling.
- Stop before partner sharing unless Nathan has approved the referral packet.

## Confirmation Copy

Subject: Your Phoenix application path was received

Body:

Thanks for sending this over. We will review the details and point you toward the next best path. If anything needs a human decision before moving forward, Nathan will review it first.

## Internal Notification

Title: Phoenix Application Path needs review

Body:

Review the intake route, consent status, suggested lane, and any blocked or sensitive fields before replying, sending a referral, changing CRM state, or taking external action.

## Referral Packet

Create a Nathan-only packet with:

- Applicant summary
- Selected goal
- Suggested lane
- Missing prerequisites
- Suggested partner type
- Consent status
- Sensitive-data warning
- Approval checkbox

Do not include raw SSN, tax documents, bank login, account numbers, credit files, or private message bodies.

## Approval Gates

Required before HighLevel build:

- Confirm HighLevel account/location.
- Approve browser/profile or API build path.
- Approve form/survey questions.
- Approve consent language.

Required before external referral:

- Approve partner list.
- Approve partner criteria.
- Approve applicant sharing consent.
- Approve exact referral packet.

## QA

Use masked test submissions for:

- Funding fit
- Consulting fit
- Certification/product fit
- Partnership/referral
- Not sure
- No consent
- Sensitive finance request

Pass criteria:

- Correct tag appears.
- Correct pipeline stage appears.
- Internal task appears where expected.
- Confirmation message fires only when consent exists.
- No partner send, webhook, or external message fires.
- Agent OS dashboard shows the application lane and approval gate.
