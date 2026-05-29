import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * EDGE FUNCTION: capital-welcome-email
 * Sends an immediate personalized welcome email to the lead after Capital Readiness submission.
 * Uses Resend for delivery.
 *
 * SECURITY CHECKS (performed by validate-form before this is called):
 * - Turnstile captcha verified
 * - Honeypot field empty
 * - Rate limit not exceeded
 * - Disposable emails are filtered at the calling layer (FundingPath.tsx)
 *
 * TODO (future hooks):
 * - Calendly link insertion dynamically based on pathway
 * - Lead routing by pathway for partner-specific welcome messaging
 * - Rich HTML email template
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { leadId, name, email, capitalObjective, ventureStage, recommendedPathway } = body;

    const firstName = (name || "").split(" ")[0] || "there";

    // Light NLP-style context mirroring based on inputs
    let mirroredContext = "funding readiness";
    if (capitalObjective === "improve-cash-flow") {
      mirroredContext = "improving cash flow and working capital";
    } else if (capitalObjective === "growth-capital") {
      mirroredContext = "structured growth capital";
    } else if (capitalObjective === "launch-expansion") {
      mirroredContext = "launching and positioning your venture for the right capital";
    }

    if (ventureStage === "early-traction") {
      mirroredContext += " at an early stage";
    } else if (ventureStage === "scaling") {
      mirroredContext += " as you scale";
    }

    const emailText = `Hi ${firstName},

Glad you reached out.

Based on what you shared, it looks like you're exploring a meaningful next step around ${mirroredContext}.

Our team is reviewing your submission now.

If you'd rather move things forward sooner, you can book a short 15-minute strategy call here:

https://calendly.com/rpbswildman/new-meeting

If email is easier, just reply and let us know a little more about what you're building or where you are in the process.

Nathan
Phoenix Venture Studios

P.S. If you're still narrowing down timing or fit, that's completely fine — clarity is part of the process.`;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    console.log("[capital-welcome-email] Step 1: Preparing welcome for:", name, email);
    console.log("[capital-welcome-email] Step 2: RESEND_API_KEY present:", !!RESEND_API_KEY);

    if (RESEND_API_KEY) {
      const resendPayload = {
        from: "Phoenix Venture Studios <hello@phoenixventurestudios.com>",
        to: [email],
        subject: "Glad you reached out",
        text: emailText,
      };
      console.log("[capital-welcome-email] Step 3: Sending via Resend — to:", email);

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(resendPayload),
      });

      const resBody = await emailRes.text();
      console.log("[capital-welcome-email] Step 4: Resend status:", emailRes.status, "| Response:", resBody);

      if (!emailRes.ok) {
        console.error("[capital-welcome-email] ❌ Resend FAILED:", emailRes.status, resBody);
        return new Response(JSON.stringify({ success: false, error: resBody }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[capital-welcome-email] ✅ Welcome email sent to:", email);

      // Update lead status
      if (leadId) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, supabaseKey);

          await supabase.from("leads").update({
            lead_status: "contacted",
            nurture_stage: "welcome_sent",
          }).eq("id", leadId);
        } catch (updateErr) {
          console.error("Lead status update error (non-blocking):", updateErr);
        }
      }

      return new Response(JSON.stringify({ success: true, method: "email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback
    console.log("=== WELCOME EMAIL (no Resend key) ===");
    console.log(emailText);

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
