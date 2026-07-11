import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternalRequest } from "../_shared/internal-auth.ts";
import {
  deliverTransactionalEmailViaHighLevel,
  getNewsletterMode,
  queueFounderSignalForHighLevel,
} from "../_shared/highlevel-newsletter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = requireInternalRequest(req);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const newsletterMode = getNewsletterMode();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Allow passing a specific brief_id, otherwise use the latest drafted one
    let briefId: string | null = null;
    let approveOnly = false;
    try {
      const body = await req.json();
      briefId = body?.brief_id || null;
      approveOnly = body?.approve_only === true;
    } catch {
      // No body is fine
    }

    if (approveOnly) {
      let approveQuery = supabase
        .from("weekly_brief_runs")
        .select("id, status, created_at, subject_line")
        .order("created_at", { ascending: false })
        .limit(1);

      if (briefId) {
        approveQuery = approveQuery.eq("id", briefId);
      } else {
        approveQuery = approveQuery.eq("status", "drafted");
      }

      const { data: draftBriefs, error: draftBriefError } = await approveQuery;
      if (draftBriefError) throw draftBriefError;

      const draftBrief = draftBriefs?.[0];
      if (!draftBrief) {
        return new Response(
          JSON.stringify({ success: false, reason: "No drafted brief found to approve." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: approveError } = await supabase
        .from("weekly_brief_runs")
        .update({ status: "approved", error_message: null })
        .eq("id", draftBrief.id);

      if (approveError) throw approveError;

      return new Response(
        JSON.stringify({
          success: true,
          brief_id: draftBrief.id,
          status: "approved",
          subject_line: draftBrief.subject_line,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get the brief to send
    let briefQuery = supabase
      .from("weekly_brief_runs")
      .select("*");

    if (briefId) {
      briefQuery = briefQuery.eq("id", briefId);
    } else {
      // Safety: only send approved briefs.
      briefQuery = briefQuery.eq("status", "approved").order("created_at", { ascending: false }).limit(1);
    }

    const { data: briefs, error: briefError } = await briefQuery;
    if (briefError) throw briefError;

    const brief = briefs?.[0];
    if (!brief) {
      return new Response(
        JSON.stringify({ success: false, reason: "No approved brief found." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (brief.status !== "approved") {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "Brief must be approved before sending.",
          brief_id: brief.id,
          status: brief.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!brief.html_body || !brief.subject_line) {
      throw new Error("Brief is missing required content (subject_line or html_body).");
    }

    // 2. Mark as sending
    await supabase
      .from("weekly_brief_runs")
      .update({ status: "sending" })
      .eq("id", brief.id);

    const payload = {
      audienceTag: "phoenix-founder-signal",
      canonicalLinks: brief.canonical_links || [],
      entryCount: brief.entry_count || 0,
      heroAngle: brief.hero_angle || brief.preview_text || "Founder Signal founder read",
      htmlBody: brief.html_body,
      previewText: brief.preview_text,
      segmentKey: brief.delivery_segment_key || "phoenix-founder-signal-weekly",
      sourceSlugs: brief.source_slugs || [],
      subjectLine: brief.subject_line,
      textBody: brief.text_body || "",
    };

    let providerResult: Awaited<ReturnType<typeof queueFounderSignalForHighLevel>> | null = null;
    let sentCount = 0;
    let lastError: string | null = null;

    if (newsletterMode === "primary" || newsletterMode === "shadow") {
      try {
        providerResult = await queueFounderSignalForHighLevel(payload);
      } catch (error) {
        lastError = error instanceof Error ? error.message : "HighLevel queue failed";
        if (newsletterMode === "primary") {
          throw error;
        }
      }
    }

    if (newsletterMode !== "primary") {
      if (!RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured");
      }

      const { data: subscribers, error: subError } = await supabase
        .from("newsletter_subscribers")
        .select("id, email")
        .or("unsubscribed.is.null,unsubscribed.eq.false")
        .limit(1000);

      if (subError) throw subError;

      if (!subscribers || subscribers.length === 0) {
        await supabase
          .from("weekly_brief_runs")
          .update({
            provider: "gohighlevel",
            provider_last_synced_at: new Date().toISOString(),
            provider_payload: payload,
            provider_status: providerResult?.status || "queued",
            status: "sent",
            sent_at: new Date().toISOString(),
            recipient_count: 0,
          })
          .eq("id", brief.id);

        return new Response(
          JSON.stringify({ success: true, sent: 0, reason: "No active subscribers." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const SITE_URL = Deno.env.get("SITE_URL") || "https://phoenixventurestudios.com";
      const unsubBaseUrl = `${SITE_URL}/unsubscribe`;

      for (const sub of subscribers) {
        try {
          const unsubUrl = `${unsubBaseUrl}?email=${encodeURIComponent(sub.email)}`;
          const personalizedHtml = brief.html_body.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubUrl);
          const personalizedText = brief.text_body
            ? brief.text_body.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubUrl)
            : undefined;

          const emailPayload: Record<string, unknown> = {
            from: "The Founder Signal <signal@phoenixventurestudios.com>",
            to: [sub.email],
            subject: brief.subject_line,
            html: personalizedHtml,
          };

          if (personalizedText) {
            emailPayload.text = personalizedText;
          }

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(emailPayload),
          });

          if (res.ok) {
            sentCount++;
          } else {
            const errBody = await res.text();
            console.error(`Failed to send to ${sub.email}: ${res.status} ${errBody}`);
            lastError = `${res.status}: ${errBody}`;
          }
        } catch (sendErr) {
          console.error(`Error sending to ${sub.email}:`, sendErr);
          lastError = sendErr instanceof Error ? sendErr.message : "Unknown send error";
        }
      }
    } else if (providerResult?.status !== "queued") {
      const { data: subscribers, error: subError } = await supabase
        .from("newsletter_subscribers")
        .select("id, email")
        .or("unsubscribed.is.null,unsubscribed.eq.false")
        .limit(1000);

      if (subError) throw subError;

      const SITE_URL = Deno.env.get("SITE_URL") || "https://phoenixventurestudios.com";
      const unsubBaseUrl = `${SITE_URL}/unsubscribe`;

      for (const sub of subscribers || []) {
        const unsubUrl = `${unsubBaseUrl}?email=${encodeURIComponent(sub.email)}`;
        const personalizedHtml = brief.html_body.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubUrl);

        const delivery = await deliverTransactionalEmailViaHighLevel(
          sub.email,
          brief.subject_line,
          personalizedHtml,
        );

        if (delivery.delivered) {
          sentCount++;
        } else if (!lastError) {
          lastError = delivery.error || delivery.reason;
        }
      }

      if (sentCount > 0) {
        providerResult = {
          delivered: {
            delivered: true,
            provider: "gohighlevel",
            reason: "direct_email_sent",
          },
          mode: newsletterMode,
          provider: "gohighlevel",
          status: "queued",
        };
      }
    }

    const finalStatus = newsletterMode === "primary"
      ? (providerResult?.status === "queued" ? "sent" : "failed")
      : sentCount > 0 ? "sent" : "failed";

    await supabase
      .from("weekly_brief_runs")
      .update({
        provider: "gohighlevel",
        provider_last_synced_at: new Date().toISOString(),
        provider_payload: payload,
        provider_status: providerResult?.status || (newsletterMode === "primary" ? "failed" : "shadow"),
        sent_at: new Date().toISOString(),
        recipient_count: sentCount,
        status: finalStatus,
        error_message: lastError,
      })
      .eq("id", brief.id);

    return new Response(
      JSON.stringify({
        success: true,
        brief_id: brief.id,
        mode: newsletterMode,
        provider_result: providerResult,
        sent: sentCount,
        status: finalStatus,
        error: lastError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-founder-signal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
