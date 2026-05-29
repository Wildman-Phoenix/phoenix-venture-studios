import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * EDGE FUNCTION: capital-lead-notify
 * Sends an internal notification email to Nathan when a new Capital Readiness lead submits.
 * Uses Resend for delivery; falls back to console logging if Resend key is unavailable.
 *
 * TODO (future hooks):
 * - Trigger welcome email to lead after this notification
 * - Enqueue 24-hour follow-up email
 * - Route lead notification by pathway for partner-specific alerts
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const emailBody = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
New Capital Readiness Lead — Phoenix Venture Studios
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 CONTACT
   Name:  ${body.name || "Not provided"}
   Email: ${body.email || "Not provided"}
   Phone: ${body.phone || "Not provided"}
   State: ${body.state || "Not provided"}

💰 CAPITAL REQUEST
   Capital Objective: ${body.capitalObjective || "N/A"}
   Funding Range:     ${body.fundingRange || "N/A"}
   Timeline:          ${body.timeline || "N/A"}

📊 QUALIFICATION
   Venture Stage:   ${body.ventureStage || "N/A"}
   Credit Strength: ${body.creditStrength || "N/A"}
   Monthly Revenue: ${body.revenueRange || "N/A"}

🎯 RECOMMENDATION
   Recommended Pathway: ${body.recommendedPathway || "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    console.log("[capital-lead-notify] Step 1: Lead data received for:", body.name, body.email);
    console.log("[capital-lead-notify] Step 2: RESEND_API_KEY present:", !!RESEND_API_KEY);

    if (RESEND_API_KEY) {
      const resendPayload = {
        from: "Phoenix Venture Studios <hello@phoenixventurestudios.com>",
        to: ["nathan@phoenixventurestudios.com"],
        subject: `New Capital Readiness Lead: ${body.name || "Unknown"}`,
        text: emailBody,
      };
      console.log("[capital-lead-notify] Step 3: Sending via Resend — from:", resendPayload.from, "to:", resendPayload.to);

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(resendPayload),
      });

      const resBody = await emailRes.text();
      console.log("[capital-lead-notify] Step 4: Resend status:", emailRes.status, "| Response:", resBody);

      if (!emailRes.ok) {
        console.error("[capital-lead-notify] ❌ Resend FAILED:", emailRes.status, resBody);
      } else {
        console.log("[capital-lead-notify] ✅ Email sent successfully");
        return new Response(JSON.stringify({ success: true, method: "email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: log the lead
    console.log("[capital-lead-notify] ⚠️ Fallback: No Resend key or Resend failed — logging lead only");
    console.log(emailBody);

    return new Response(JSON.stringify({ success: true, method: "logged" }), {
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
