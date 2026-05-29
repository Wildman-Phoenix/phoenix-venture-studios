import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * submit-form — secure server-side handler for all public form submissions.
 *
 * Replaces direct client-side inserts into: leads, newsletter_subscribers,
 * post_booking_interactions, subscriber_profiles.
 *
 * All writes use the service_role key so anon RLS INSERT policies are not needed.
 */

const MAX_TEXT = 500;
const MAX_SHORT = 100;
const MAX_EMAIL = 255;
const VALIDATION_WINDOW_MS = 15 * 60 * 1000;
const VALIDATION_PASSED_REASON = "validation_passed";
const SUBMISSION_ACCEPTED_REASON = "submission_accepted";

const VALIDATION_FORM_NAMES = [
  "newsletter",
  "founder_signal",
  "founder_signal_preferences",
  "unsubscribe",
  "post_booking",
] as const;
const PROTECTED_LEAD_FORMS = [
  "contact",
  "capital_readiness",
  "venture_snapshot",
  "sigma_factoring",
  "preferred_funding",
] as const;
const VALIDATION_FORM_NAME_SET = new Set<string>([
  ...VALIDATION_FORM_NAMES,
  ...PROTECTED_LEAD_FORMS,
]);

function sanitize(val: unknown, maxLen = MAX_TEXT): string | null {
  if (val === null || val === undefined || val === "") return null;
  return String(val).trim().slice(0, maxLen) || null;
}

function sanitizeShort(val: unknown): string | null {
  return sanitize(val, MAX_SHORT);
}

function sanitizeBool(val: unknown): boolean {
  return val === true || val === "true";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= MAX_EMAIL;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || "unknown";
}

function getLeadValidationForms(data: Record<string, unknown>): string[] {
  const explicitFormName = sanitizeShort(data.security_form_name);
  if (explicitFormName && VALIDATION_FORM_NAME_SET.has(explicitFormName)) {
    return [explicitFormName];
  }

  const submissionType = sanitizeShort(data.submission_type);

  if (submissionType?.startsWith("contact")) {
    return ["contact"];
  }

  if (submissionType && PROTECTED_LEAD_FORMS.includes(submissionType as typeof PROTECTED_LEAD_FORMS[number])) {
    return [submissionType];
  }

  return ["contact"];
}

function getExplicitValidationFormName(data: Record<string, unknown>, fallback: string): string[] {
  const explicitFormName = sanitizeShort(data.security_form_name);
  if (explicitFormName && VALIDATION_FORM_NAME_SET.has(explicitFormName)) {
    return [explicitFormName];
  }

  return [fallback];
}

function getProtectedFormNames(formType: string, data: Record<string, unknown>): string[] {
  switch (formType) {
    case "lead":
      return getLeadValidationForms(data);
    case "newsletter_subscribe":
      return getExplicitValidationFormName(data, "newsletter");
    case "newsletter_unsubscribe":
      return getExplicitValidationFormName(data, "unsubscribe");
    case "subscriber_profile":
      return getExplicitValidationFormName(data, "founder_signal_preferences");
    case "post_booking":
      return getExplicitValidationFormName(data, "post_booking");
    default:
      return [];
  }
}

async function requireRecentValidationPass({
  supabase,
  formNames,
  email,
  ip,
  userAgent,
}: {
  supabase: any;
  formNames: string[];
  email: string | null;
  ip: string;
  userAgent: string;
}) {
  if (formNames.length === 0) {
    return { ok: true as const };
  }

  const since = new Date(Date.now() - VALIDATION_WINDOW_MS).toISOString();
  const emailFilter = sanitize(email, MAX_EMAIL);

  const passQuery = supabase
    .from("form_security_log")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .in("form_name", formNames)
    .eq("blocked_reason", VALIDATION_PASSED_REASON)
    .gte("created_at", since);

  const acceptedQuery = supabase
    .from("form_security_log")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .in("form_name", formNames)
    .eq("blocked_reason", SUBMISSION_ACCEPTED_REASON)
    .gte("created_at", since);

  if (emailFilter) {
    passQuery.eq("email", emailFilter);
    acceptedQuery.eq("email", emailFilter);
  }

  const [{ count: passCount, error: passError }, { count: acceptedCount, error: acceptedError }] = await Promise.all([
    passQuery,
    acceptedQuery,
  ]);

  if (passError || acceptedError) {
    console.error("Validation pass lookup error:", passError || acceptedError);
    return { ok: false as const, reason: "validation_lookup_failed" };
  }

  if ((passCount || 0) <= (acceptedCount || 0)) {
    await supabase.from("form_security_log").insert({
      form_name: formNames[0] || "unknown",
      email: emailFilter,
      ip_address: ip,
      user_agent: userAgent,
      blocked_reason: "validation_pass_missing",
    });

    return { ok: false as const, reason: "validation_required" };
  }

  return {
    ok: true as const,
    matchedFormName: formNames[0],
    email: emailFilter,
  };
}

async function logAcceptedSubmission({
  supabase,
  formName,
  email,
  ip,
  userAgent,
}: {
  supabase: any;
  formName: string;
  email: string | null;
  ip: string;
  userAgent: string;
}) {
  await supabase.from("form_security_log").insert({
    form_name: formName,
    email,
    ip_address: ip,
    user_agent: userAgent,
    blocked_reason: SUBMISSION_ACCEPTED_REASON,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { formType, data } = body;

    if (!formType || !data) {
      return new Response(
        JSON.stringify({ error: "Missing formType or data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "unknown";
    const protectedFormNames = getProtectedFormNames(formType, data);
    const emailForValidation = typeof data.email === "string" ? data.email : null;

    const validationGate = await requireRecentValidationPass({
      supabase,
      formNames: protectedFormNames,
      email: emailForValidation,
      ip,
      userAgent,
    });

    if (!validationGate.ok) {
      return jsonResponse(
        { error: validationGate.reason === "validation_required" ? "Submission verification required" : "Submission verification unavailable" },
        validationGate.reason === "validation_lookup_failed" ? 503 : 403
      );
    }

    let result: Record<string, unknown>;

    switch (formType) {
      case "lead":
        result = await handleLead(supabase, data);
        break;
      case "newsletter_subscribe":
        result = await handleNewsletterSubscribe(supabase, data);
        break;
      case "newsletter_unsubscribe":
        result = await handleNewsletterUnsubscribe(supabase, data);
        break;
      case "post_booking":
        result = await handlePostBooking(supabase, data);
        break;
      case "subscriber_profile":
        result = await handleSubscriberProfile(supabase, data);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unknown formType" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (!result.error && validationGate.matchedFormName) {
      await logAcceptedSubmission({
        supabase,
        formName: validationGate.matchedFormName,
        email: validationGate.email || emailForValidation,
        ip,
        userAgent,
      });
    }

    return jsonResponse(result, result.error ? 400 : 200);
  } catch (err) {
    console.error("submit-form error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

// ── LEAD SUBMISSION ──
async function handleLead(supabase: any, data: any) {
  const name = sanitize(data.name, MAX_SHORT);
  const email = sanitize(data.email, MAX_EMAIL);

  if (!name || !email || !isValidEmail(email)) {
    return { error: "Valid name and email are required" };
  }

  const VALID_SUBMISSION_TYPES = [
    "contact", "capital_readiness", "venture_snapshot",
    "sigma_factoring", "preferred_funding"
  ];
  const submissionType = VALID_SUBMISSION_TYPES.includes(data.submission_type)
    ? data.submission_type
    : "contact";

  const row: Record<string, unknown> = {
    name,
    email,
    submission_type: submissionType,
    phone: sanitizeShort(data.phone),
    state: sanitizeShort(data.state),
    industry: sanitizeShort(data.industry),
    funding_amount: sanitizeShort(data.funding_amount),
    business_stage: sanitizeShort(data.business_stage),
    use_of_funds: sanitize(data.use_of_funds),
    venture_summary: sanitize(data.venture_summary, 2000),
    budget_range: sanitizeShort(data.budget_range),
    timeline_to_launch: sanitizeShort(data.timeline_to_launch),
    support_interest: sanitize(data.support_interest, 1000),
    preferred_follow_up: sanitizeShort(data.preferred_follow_up),
    has_entity: data.has_entity === true || data.has_entity === false ? data.has_entity : null,
    founder_role: sanitizeShort(data.founder_role),
    credit_strength: sanitizeShort(data.credit_strength),
    prior_funding: sanitizeShort(data.prior_funding),
    lead_source: sanitizeShort(data.lead_source),
    marketing_consent: sanitizeBool(data.marketing_consent),
    // Internal fields — set server-side only, ignore client values
    lead_status: data.disposable_email ? "disposable_email" : "new",
    nurture_stage: "initial_submission",
  };

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("Lead insert error:", error);
    return { error: "Failed to save lead" };
  }

  return { success: true, leadId: inserted?.id };
}

// ── NEWSLETTER SUBSCRIBE ──
async function handleNewsletterSubscribe(supabase: any, data: any) {
  const email = sanitize(data.email, MAX_EMAIL);
  if (!email || !isValidEmail(email)) {
    return { error: "Valid email is required" };
  }

  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email, marketing_consent: true });

  if (error) {
    if (error.code === "23505") {
      return { success: true, already_subscribed: true };
    }
    console.error("Newsletter subscribe error:", error);
    return { error: "Failed to subscribe" };
  }

  return { success: true };
}

// ── NEWSLETTER UNSUBSCRIBE ──
async function handleNewsletterUnsubscribe(supabase: any, data: any) {
  const email = sanitize(data.email, MAX_EMAIL);
  if (!email || !isValidEmail(email)) {
    return { error: "Valid email is required" };
  }

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() })
    .eq("email", email);

  if (error) {
    console.error("Unsubscribe error:", error);
    return { error: "Failed to unsubscribe" };
  }

  return { success: true };
}

// ── POST BOOKING INTERACTION ──
async function handlePostBooking(supabase: any, data: any) {
  const row = {
    priority: sanitizeShort(data.priority),
    business_stage: sanitizeShort(data.business_stage),
    conversation_type: sanitizeShort(data.conversation_type),
    lead_email: sanitize(data.lead_email, MAX_EMAIL),
    lead_id: data.lead_id || null,
  };

  const { error } = await supabase
    .from("post_booking_interactions")
    .insert(row);

  if (error) {
    console.error("Post booking insert error:", error);
    return { error: "Failed to save" };
  }

  return { success: true };
}

// ── SUBSCRIBER PROFILE UPSERT ──
async function handleSubscriberProfile(supabase: any, data: any) {
  const email = sanitize(data.email, MAX_EMAIL);
  if (!email || !isValidEmail(email)) {
    return { error: "Valid email is required" };
  }

  const row: Record<string, unknown> = {
    email,
    first_name: sanitizeShort(data.first_name),
    current_stage: sanitizeShort(data.current_stage),
    primary_interest: sanitizeShort(data.primary_interest),
    biggest_challenge: sanitize(data.biggest_challenge),
    what_are_you_building: sanitize(data.what_are_you_building),
    feedback: sanitize(data.feedback),
    interactive_newsletter_preference: sanitizeBool(data.interactive_newsletter_preference),
    interests: Array.isArray(data.interests) ? data.interests.slice(0, 20).map((i: unknown) => String(i).slice(0, 50)) : [],
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("subscriber_profiles")
    .upsert(row, { onConflict: "email" });

  if (error) {
    console.error("Subscriber profile upsert error:", error);
    return { error: "Failed to save profile" };
  }

  return { success: true };
}
