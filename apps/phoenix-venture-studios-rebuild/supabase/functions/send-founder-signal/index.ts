import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Allow passing a specific brief_id, otherwise use the latest drafted one
    let briefId: string | null = null;
    try {
      const body = await req.json();
      briefId = body?.brief_id || null;
    } catch {
      // No body is fine
    }

    // 1. Get the brief to send
    let briefQuery = supabase
      .from("weekly_brief_runs")
      .select("*");

    if (briefId) {
      briefQuery = briefQuery.eq("id", briefId);
    } else {
      // Safety: only auto-send approved briefs. Use brief_id param to send a drafted one explicitly.
      briefQuery = briefQuery.eq("status", "approved").order("created_at", { ascending: false }).limit(1);
    }

    const { data: briefs, error: briefError } = await briefQuery;
    if (briefError) throw briefError;

    const brief = briefs?.[0];
    if (!brief) {
      return new Response(
        JSON.stringify({ success: false, reason: "No drafted or approved brief found." }),
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

    // 3. Query active subscribers
    const { data: subscribers, error: subError } = await supabase
      .from("newsletter_subscribers")
      .select("id, email")
      .or("unsubscribed.is.null,unsubscribed.eq.false")
      .limit(1000);

    if (subError) throw subError;

    if (!subscribers || subscribers.length === 0) {
      await supabase
        .from("weekly_brief_runs")
        .update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: 0 })
        .eq("id", brief.id);

      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "No active subscribers." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Send in batches via Resend
    let sentCount = 0;
    let lastError: string | null = null;
    const SITE_URL = Deno.env.get("SITE_URL") || "https://phoenixventurestudios.com";
    const unsubBaseUrl = `${SITE_URL}/unsubscribe`;

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);

      for (const sub of batch) {
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

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // 5. Update brief with results
    const finalStatus = sentCount > 0 ? "sent" : "failed";
    await supabase
      .from("weekly_brief_runs")
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        recipient_count: sentCount,
        error_message: lastError,
      })
      .eq("id", brief.id);

    return new Response(
      JSON.stringify({
        success: true,
        brief_id: brief.id,
        sent: sentCount,
        total_subscribers: subscribers.length,
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
