import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const emailBody = `
New Phoenix Venture Studios Lead

Contact Information:
- Name: ${body.name}
- Email: ${body.email}
- Phone: ${body.phone || "Not provided"}

Company Information:
- Company: ${body.companyName || "Not provided"}
- Website: ${body.website || "Not provided"}
- Industry: ${body.industry || "Not provided"}

Accounts Receivable Details:
- Invoices B2B: ${body.invoicesB2B || "N/A"}
- Monthly Invoices: ${body.monthlyInvoices || "N/A"}
- Payment Terms: ${body.paymentTerms || "N/A"}

Business Status:
- Years Operating: ${body.yearsOperating || "N/A"}

Funding Need:
- Timeline: ${body.capitalTimeline || body.timeline || "N/A"}
- Estimated Need: ${body.fundingNeed || body.fundingAmount || "N/A"}
- Venture Stage: ${body.stage || "N/A"}
- Preferred Next Step: ${body.preferredNextStep || "N/A"}

Notes: ${body.notes || "None"}
    `.trim();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (RESEND_API_KEY) {
      // Send email via Resend
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Phoenix Venture Studios <notifications@resend.dev>",
          to: ["nathan@phoenixventurestudios.com"],
          subject: "New Phoenix Venture Studios Lead",
          text: emailBody,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Resend error:", errText);
        // Fall through to log instead of failing
      } else {
        console.log("Email sent successfully via Resend");
        return new Response(JSON.stringify({ success: true, method: "email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: log the lead
    console.log("=== NEW LEAD ===");
    console.log(emailBody);
    console.log("=== END LEAD ===");

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
