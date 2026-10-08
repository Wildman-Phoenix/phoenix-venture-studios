import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { deliverTransactionalEmailViaHighLevel, getNewsletterMode, isNewsletterProviderConfigured } from "../_shared/highlevel-newsletter.ts";
import { requireInternalRequest } from "../_shared/internal-auth.ts";

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

  let ambiguousHighLevel = false;
  try {
    const {email:rawEmail} = await req.json();
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, reason: "No email provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const database = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:subscriber,error:lookupError} = await database.from("newsletter_subscribers")
      .select("id,marketing_consent,unsubscribed,welcome_email_attempted_at,welcome_email_attempt_provider,welcome_email_accepted_at")
      .eq("email",email).maybeSingle();
    if (lookupError) throw new Error("Welcome receipt lookup unavailable");
    if (!subscriber?.marketing_consent || subscriber.unsubscribed) return new Response(JSON.stringify({success:false,reason:"active_subscriber_required"}),{status:403,headers:{...corsHeaders,"Content-Type":"application/json"}});
    if (subscriber.welcome_email_accepted_at) return new Response(JSON.stringify({success:true,accepted:true,already_accepted:true,delivery:"provider_accepted"}),{headers:{...corsHeaders,"Content-Type":"application/json"}});
    const useHighLevel = getNewsletterMode() === "primary" && isNewsletterProviderConfigured();
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!useHighLevel && !resendKey) return new Response(JSON.stringify({success:false,delivery:"unconfigured"}),{status:503,headers:{...corsHeaders,"Content-Type":"application/json"}});
    // HighLevel has no verified send-idempotency contract. Hold ambiguous attempts.
    // Resend retries stay inside its documented 24-hour retention, with a one-hour margin.
    if (subscriber.welcome_email_attempted_at && (useHighLevel || subscriber.welcome_email_attempt_provider !== "resend" || Date.now()-Date.parse(subscriber.welcome_email_attempted_at)>=23*60*60*1000)) return new Response(JSON.stringify({success:false,delivery:"receipt_requires_review",retry_requires_review:true}),{status:503,headers:{...corsHeaders,"Content-Type":"application/json"}});
    if (!subscriber.welcome_email_attempted_at) {
      const {data:claimed,error:claimError} = await database.from("newsletter_subscribers")
        .update({welcome_email_attempted_at:new Date().toISOString(),welcome_email_attempt_provider:useHighLevel?"gohighlevel":"resend"}).eq("id",subscriber.id)
        .is("welcome_email_attempted_at",null).select("id").maybeSingle();
      if (claimError) throw new Error("Welcome attempt unavailable");
      if (!claimed) return new Response(JSON.stringify({success:false,delivery:"receipt_requires_review",retry_requires_review:true}),{status:503,headers:{...corsHeaders,"Content-Type":"application/json"}});
    }
    const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(email));
    const idempotencyKey = "phoenix-welcome-"+[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
    async function acceptedReceipt(messageId: string) {
      const {error} = await database.from("newsletter_subscribers").update({welcome_email_accepted_at:new Date().toISOString(),welcome_email_id:messageId}).eq("id",subscriber.id);
      if (error) throw new Error("Welcome acceptance receipt unavailable");
      return new Response(JSON.stringify({success:true,accepted:true,delivery:"provider_accepted"}),{headers:{...corsHeaders,"Content-Type":"application/json"}});
    }

    const SITE_URL = Deno.env.get("SITE_URL") || "https://phoenixventurestudios.com";
    const unsubUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:28px 24px;">
    <!-- Header -->
    <p style="font-size:11px;letter-spacing:0.8px;text-transform:uppercase;color:#9CA3AF;margin:0 0 6px 0;">Welcome</p>
    <h1 style="font-size:26px;font-weight:700;color:#1F2937;margin:0;line-height:1.2;">The Founder Signal</h1>
    <p style="font-size:13px;color:#9CA3AF;margin:6px 0 0 0;font-weight:400;">Strategic intelligence for founders, operators, and business owners</p>
    <div style="width:36px;height:2px;background:#F97316;margin:14px 0 24px 0;"></div>

    <!-- Body -->
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px 0;">
      You're in. Founder Signal is a concise founder read on the market shifts, capital signals, and operational pressure points that matter most right now.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px 0;">
      No noise. No fluff. Just the signals worth your attention.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px 0;">
      Your first founder read will arrive soon. In the meantime, start with the current signal desk and use the archive when you want the broader record.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 28px 0;">
      <a href="${SITE_URL}/founder-signal" style="display:block;width:100%;max-width:260px;margin:0 auto 10px auto;padding:12px 0;background:#F97316;color:#FFFFFF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:5px;">Explore Founder Signal</a>
      <a href="${SITE_URL}/market-intelligence" style="display:block;width:100%;max-width:260px;margin:0 auto;padding:12px 0;background:transparent;border:1.5px solid #E5E7EB;color:#9CA3AF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:5px;">Read the archive</a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #F3F4F6;padding-top:20px;text-align:center;">
      <p style="font-size:12px;font-weight:600;color:#9CA3AF;margin:0;letter-spacing:0.3px;">Phoenix Venture Studios</p>
      <p style="font-size:11px;color:#D1D5DB;margin:4px 0 0 0;font-style:italic;">Clarity over complexity. Strategy over noise.</p>
      <p style="font-size:11px;color:#D1D5DB;margin:12px 0 0 0;">
        <a href="${unsubUrl}" style="color:#D1D5DB;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    const textBody = `THE FOUNDER SIGNAL
Strategic intelligence for founders, operators, and business owners

You're in. Founder Signal is a concise founder read on the market shifts, capital signals, and operational pressure points that matter most right now.

No noise. No fluff. Just the signals worth your attention.

Your first founder read will arrive soon. In the meantime, start with the current signal desk and use the archive when you want the broader record:

Explore Founder Signal: ${SITE_URL}/founder-signal
Read the archive: ${SITE_URL}/market-intelligence

---

Phoenix Venture Studios
Clarity over complexity. Strategy over noise.

Unsubscribe: ${unsubUrl}`;

    if (useHighLevel) {
      ambiguousHighLevel = true;
      const ghlDelivery = await deliverTransactionalEmailViaHighLevel(
        email,
        "Welcome to The Founder Signal",
        htmlBody,
      );

      if (ghlDelivery.delivered && typeof ghlDelivery.messageId === "string" && ghlDelivery.messageId) return await acceptedReceipt(ghlDelivery.messageId);
      return new Response(JSON.stringify({success:false,delivery:"receipt_requires_review",retry_requires_review:true}),{status:502,headers:{...corsHeaders,"Content-Type":"application/json"}});
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("Welcome provider unconfigured");
      return new Response(
        JSON.stringify({
          success: false,
          delivery: "unconfigured",
          error: "RESEND_API_KEY is not configured for newsletter-welcome",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: "The Founder Signal <signal@phoenixventurestudios.com>",
        to: [email],
        subject: "Welcome to The Founder Signal",
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!res.ok) {
      await res.text();
      console.error("Resend welcome email failed:", res.status);
      return new Response(
        JSON.stringify({
          success: false,
          delivery: "failed",
          error: `Resend ${res.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const receipt = await res.json();
    if (typeof receipt?.id !== "string" || !receipt.id) throw new Error("Provider acceptance receipt missing");
    return await acceptedReceipt(receipt.id);
  } catch (error) {
    console.error("newsletter-welcome error:", error);
    return new Response(
      JSON.stringify({ success:false, ...(ambiguousHighLevel ? {delivery:"receipt_requires_review",retry_requires_review:true} : {}), error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
