import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * EDGE FUNCTION: capital-followup-email
 * Sends a 24-hour follow-up email to capital_readiness leads whose nurture_stage is "welcome_sent".
 *
 * Designed to be called by a scheduled cron job (pg_cron) every hour.
 * It queries for leads submitted ~24 hours ago that haven't received a follow-up yet.
 *
 * SECURITY: Only sends to leads with lead_status != 'disposable_email'.
 * Disposable emails are flagged during submission via the validate-form edge function.
 *
 * TODO (future improvements):
 * - Use a proper job queue (pgmq) for more reliable scheduling
 * - Support pathway-specific follow-up templates
 * - Add unsubscribe link
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.log("No RESEND_API_KEY configured, skipping follow-up emails");
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find leads submitted ~24 hours ago (between 23-25 hours ago) with welcome_sent stage
    const now = new Date();
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();

    const { data: leads, error: queryErr } = await supabase
      .from("leads")
      .select("id, name, email")
      .eq("submission_type", "capital_readiness")
      .eq("nurture_stage", "welcome_sent")
      .neq("lead_status", "disposable_email")  // ── SECURITY: skip disposable emails ──
      .gte("created_at", twentyFiveHoursAgo)
      .lte("created_at", twentyThreeHoursAgo)
      .limit(50);

    if (queryErr) {
      console.error("Query error:", queryErr);
      throw queryErr;
    }

    if (!leads || leads.length === 0) {
      console.log("No leads ready for follow-up");
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const lead of leads) {
      const firstName = (lead.name || "").split(" ")[0] || "there";

      const emailText = `Hi ${firstName},

Just wanted to follow up.

Most founders and business owners who come through Phoenix Venture Studios are usually in one of three places:

1. Ready to move on funding now
2. Getting positioned for the next few months
3. Still sorting through the right path

If you'd like to talk it through, you can grab a short strategy call here:

https://calendly.com/rpbswildman/new-meeting

Or just reply and let us know which of those feels closest to where you are right now.

Nathan
Phoenix Venture Studios`;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Phoenix Venture Studios <hello@phoenixventurestudios.com>",
            to: [lead.email],
            subject: "Quick follow-up",
            text: emailText,
          }),
        });

        if (emailRes.ok) {
          await supabase.from("leads").update({
            nurture_stage: "followup_sent",
          }).eq("id", lead.id);
          sent++;
          console.log("Follow-up sent to:", lead.email);
        } else {
          const errText = await emailRes.text();
          console.error(`Resend error for ${lead.email}:`, errText);
        }
      } catch (sendErr) {
        console.error(`Send error for ${lead.email}:`, sendErr);
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
