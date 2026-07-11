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

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, reason: "No email provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SITE_URL = Deno.env.get("SITE_URL") || "https://phoenixventurestudios.com";
    const unsubUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
    const preferencesUrl = `${SITE_URL}/founder-signal/preferences?email=${encodeURIComponent(email)}`;
    const nathanPhotoUrl = `${SITE_URL}/images/signal-founder-strategy.jpg`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:28px 24px;">
    <!-- Header -->
    <p style="font-size:11px;letter-spacing:0.8px;text-transform:uppercase;color:#9CA3AF;margin:0 0 6px 0;">A Note from the Founder</p>
    <h1 style="font-size:26px;font-weight:700;color:#1F2937;margin:0;line-height:1.2;">The Founder Signal</h1>
    <p style="font-size:13px;color:#9CA3AF;margin:6px 0 0 0;font-weight:400;">Strategic intelligence for founders, operators, and business owners</p>
    <div style="width:36px;height:2px;background:#F97316;margin:14px 0 24px 0;"></div>

    <!-- Nathan photo -->
    <div style="text-align:center;margin:0 0 20px 0;">
      <img src="${nathanPhotoUrl}" alt="Nathan Wildman" style="width:100px;height:130px;object-fit:cover;object-position:top;border-radius:10px;border:2px solid #F3F4F6;" />
    </div>

    <!-- Body -->
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px 0;">
      I'm Nathan — the person behind Phoenix Venture Studios and The Founder Signal.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px 0;">
      I started this because I've watched too many sharp founders struggle with the same things: unclear funding options, noisy advice, and no one connecting strategy to execution. I've built and run multiple businesses, worked alongside thousands of entrepreneurs, and I know how disorienting the early and growth stages can feel.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px 0;">
      Phoenix Venture Studios exists to cut through the noise. We help founders align capital decisions, venture strategy, and market direction — without the jargon, without the pressure.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px 0;">
      The Founder Signal is one way we do that: a concise founder read built to help you think more clearly about what's shifting and what it means for your business.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px 0;">
      I'd genuinely love to know what you're working on. Hit reply, or use the link below — it takes 90 seconds and helps me make this more useful for you.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 28px 0;">
      <a href="${preferencesUrl}" style="display:block;width:100%;max-width:260px;margin:0 auto;padding:12px 0;background:#F97316;color:#FFFFFF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:5px;">Tell Me What You're Building</a>
    </div>

    <p style="font-size:14px;color:#9CA3AF;line-height:1.6;margin:0 0 0 0;text-align:center;">
      Talk soon,<br />
      <span style="color:#374151;font-weight:600;">Nathan Wildman</span><br />
      <span style="font-size:12px;">Founder, Phoenix Venture Studios</span>
    </p>

    <!-- Footer -->
    <div style="border-top:1px solid #F3F4F6;padding-top:20px;margin-top:28px;text-align:center;">
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
A Note from the Founder

I'm Nathan -- the person behind Phoenix Venture Studios and The Founder Signal.

I started this because I've watched too many sharp founders struggle with the same things: unclear funding options, noisy advice, and no one connecting strategy to execution. I've built and run multiple businesses, worked alongside thousands of entrepreneurs, and I know how disorienting the early and growth stages can feel.

Phoenix Venture Studios exists to cut through the noise. We help founders align capital decisions, venture strategy, and market direction -- without the jargon, without the pressure.

The Founder Signal is one way we do that: a concise founder read built to help you think more clearly about what's shifting and what it means for your business.

I'd genuinely love to know what you're working on. Use the link below -- it takes 90 seconds and helps me make this more useful for you.

Tell Me What You're Building: ${preferencesUrl}

Talk soon,
Nathan Wildman
Founder, Phoenix Venture Studios

---

Phoenix Venture Studios
Clarity over complexity. Strategy over noise.

Unsubscribe: ${unsubUrl}`;

    if (getNewsletterMode() === "primary" && isNewsletterProviderConfigured()) {
      const ghlDelivery = await deliverTransactionalEmailViaHighLevel(
        email,
        "A quick note from the founder",
        htmlBody,
      );

      return new Response(
        JSON.stringify({
          success: ghlDelivery.delivered,
          method: ghlDelivery.reason,
          error: ghlDelivery.error,
        }),
        {
          status: ghlDelivery.delivered ? 200 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set — email 2 logged only:", email);
      return new Response(
        JSON.stringify({ success: true, method: "logged" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nathan at Phoenix Venture Studios <signal@phoenixventurestudios.com>",
        to: [email],
        subject: "A quick note from the founder",
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend Nathan intro email failed:", res.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `Resend ${res.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, method: "email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("onboarding-nathan-intro error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
