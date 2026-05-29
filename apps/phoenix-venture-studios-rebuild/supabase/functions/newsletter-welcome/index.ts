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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, reason: "No email provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set — welcome email logged only:", email);
      return new Response(
        JSON.stringify({ success: true, method: "logged" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      You're in. Each week, you'll receive a short strategic briefing — the market shifts, capital signals, and operational insights that matter most for founders right now.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px 0;">
      No noise. No fluff. Just the signals worth your attention.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px 0;">
      Your first briefing will arrive soon. In the meantime, explore what's moving the market right now.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 28px 0;">
      <a href="${SITE_URL}/market-intelligence" style="display:block;width:100%;max-width:260px;margin:0 auto 10px auto;padding:12px 0;background:#F97316;color:#FFFFFF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:5px;">Explore Market Intelligence</a>
      <a href="${SITE_URL}/snapshot" style="display:block;width:100%;max-width:260px;margin:0 auto;padding:12px 0;background:transparent;border:1.5px solid #E5E7EB;color:#9CA3AF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:5px;">Get Your Venture Snapshot</a>
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

You're in. Each week, you'll receive a short strategic briefing -- the market shifts, capital signals, and operational insights that matter most for founders right now.

No noise. No fluff. Just the signals worth your attention.

Your first briefing will arrive soon. In the meantime, explore what's moving the market:

Explore Market Intelligence: ${SITE_URL}/market-intelligence
Get Your Venture Snapshot: ${SITE_URL}/snapshot

---

Phoenix Venture Studios
Clarity over complexity. Strategy over noise.

Unsubscribe: ${unsubUrl}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
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
      const errText = await res.text();
      console.error("Resend welcome email failed:", res.status, errText);
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
    console.error("newsletter-welcome error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
