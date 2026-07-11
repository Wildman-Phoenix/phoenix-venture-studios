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

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:28px 24px;">
    <!-- Header -->
    <p style="font-size:11px;letter-spacing:0.8px;text-transform:uppercase;color:#9CA3AF;margin:0 0 6px 0;">Help Shape The Signal</p>
    <h1 style="font-size:26px;font-weight:700;color:#1F2937;margin:0;line-height:1.2;">The Founder Signal</h1>
    <p style="font-size:13px;color:#9CA3AF;margin:6px 0 0 0;font-weight:400;">Strategic intelligence for founders, operators, and business owners</p>
    <div style="width:36px;height:2px;background:#F97316;margin:14px 0 24px 0;"></div>

    <!-- Body -->
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px 0;">
      Quick question — now that you've had a chance to read The Founder Signal, what's landing and what's not?
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px 0;">
      We built Founder Signal to help founders cut through noise faster. But the only way it gets sharper is if you tell us what signals matter most to you.
    </p>

    <!-- What we'd love to know -->
    <div style="border:1px solid #E5E7EB;border-left:3px solid #F97316;border-radius:6px;padding:20px;background:#FAFAFA;margin:0 0 20px 0;">
      <p style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#F97316;margin:0 0 10px 0;opacity:0.85;">WHAT WE'D LOVE TO KNOW</p>
      <ul style="font-size:14px;color:#374151;line-height:1.8;margin:0;padding:0 0 0 18px;">
        <li>What topics do you want more of?</li>
        <li>What kind of signals are most useful for your business?</li>
        <li>Would you prefer a more interactive format?</li>
        <li>Any ideas for how we could make this better?</li>
      </ul>
    </div>

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px 0;">
      It takes about 90 seconds. And every answer helps us build something more useful for you.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 16px 0;">
      <a href="${preferencesUrl}" style="display:block;width:100%;max-width:260px;margin:0 auto 10px auto;padding:12px 0;background:#F97316;color:#FFFFFF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:5px;">Share Your Preferences</a>
      <a href="${SITE_URL}/founder-signal" style="display:block;width:100%;max-width:260px;margin:0 auto;padding:12px 0;background:transparent;border:1.5px solid #E5E7EB;color:#9CA3AF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:5px;">Explore Founder Signal</a>
    </div>

    <p style="font-size:13px;color:#9CA3AF;line-height:1.6;margin:16px 0 0 0;text-align:center;">
      Thanks for being here. It means more than you know.
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
Help Shape The Signal

Quick question -- now that you've had a chance to read The Founder Signal, what's landing and what's not?

We built Founder Signal to help founders cut through noise faster. But the only way it gets sharper is if you tell us what signals matter most to you.

WHAT WE'D LOVE TO KNOW

- What topics do you want more of?
- What kind of signals are most useful for your business?
- Would you prefer a more interactive format?
- Any ideas for how we could make this better?

It takes about 90 seconds. And every answer helps us build something more useful for you.

Share Your Preferences: ${preferencesUrl}

Explore Founder Signal: ${SITE_URL}/founder-signal

Thanks for being here. It means more than you know.

---

Phoenix Venture Studios
Clarity over complexity. Strategy over noise.

Unsubscribe: ${unsubUrl}`;

    if (getNewsletterMode() === "primary" && isNewsletterProviderConfigured()) {
      const ghlDelivery = await deliverTransactionalEmailViaHighLevel(
        email,
        "Help us build a better Founder Signal",
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
      console.log("RESEND_API_KEY not set — email 3 logged only:", email);
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
        from: "The Founder Signal <signal@phoenixventurestudios.com>",
        to: [email],
        subject: "Help us build a better Founder Signal",
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend preferences ask email failed:", res.status, errText);
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
    console.error("onboarding-preferences-ask error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
