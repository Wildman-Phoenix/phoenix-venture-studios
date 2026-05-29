import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * EDGE FUNCTION: validate-form
 * Central form security gate for all public-facing forms.
 *
 * Checks performed (in order):
 * 1. Honeypot field validation — reject if filled
 * 2. Cloudflare Turnstile token verification — reject if invalid
 * 3. Rate limiting — max 3 submissions per form per IP per hour
 * 4. Disposable email detection — flag but allow storage
 *
 * Returns: { valid: boolean, reason?: string, disposableEmail?: boolean }
 */

// Common disposable email domains (lightweight list)
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamailblock.com", "grr.la",
  "tempmail.com", "throwaway.email", "temp-mail.org", "fakeinbox.com",
  "sharklasers.com", "guerrillamail.info", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.de", "yopmail.com", "yopmail.fr", "trashmail.com",
  "trashmail.me", "trashmail.net", "dispostable.com", "maildrop.cc",
  "mailnesia.com", "tempail.com", "tempr.email", "discard.email",
  "discardmail.com", "discardmail.de", "mailcatch.com", "meltmail.com",
  "mintemail.com", "mt2015.com", "mytemp.email", "nada.email",
  "owlpic.com", "spamgourmet.com", "tempinbox.com", "tmpmail.net",
  "tmpmail.org", "trash-mail.com", "trashymail.com", "wegwerfmail.de",
  "wegwerfmail.net", "einrot.com", "getnada.com", "harakirimail.com",
  "jetable.org", "mailexpire.com", "mailforspam.com", "mohmal.com",
  "10minutemail.com", "20minutemail.com", "burnermail.io", "mailsac.com",
  "guerrillamail.biz", "crazymailing.com", "disposableemailaddresses.emailmiser.com",
]);

const VALIDATION_PASSED_REASON = "validation_passed";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { formName, email, honeypot, turnstileToken } = body;

    // Extract client IP and user agent for logging and rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // ── 1. HONEYPOT CHECK ──
    // If the hidden honeypot field has any value, it's a bot
    if (honeypot && honeypot.trim().length > 0) {
      // Log the event silently
      await supabase.from("form_security_log").insert({
        form_name: formName || "unknown",
        email: email || null,
        ip_address: ip,
        user_agent: userAgent,
        blocked_reason: "honeypot_triggered",
      });

      // Return generic success to avoid helping bots learn
      return jsonResponse({ valid: false, reason: "verification_failed" });
    }

    // ── 2. TURNSTILE VERIFICATION ──
    // Verify the Cloudflare Turnstile token server-side
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");

    if (turnstileSecret) {
      if (!turnstileToken) {
        await supabase.from("form_security_log").insert({
          form_name: formName || "unknown",
          email: email || null,
          ip_address: ip,
          user_agent: userAgent,
          blocked_reason: "captcha_missing",
        });

        return jsonResponse({ valid: false, reason: "captcha_required" });
      }

      const verifyRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: turnstileSecret,
            response: turnstileToken,
            remoteip: ip,
          }),
        }
      );

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        await supabase.from("form_security_log").insert({
          form_name: formName || "unknown",
          email: email || null,
          ip_address: ip,
          user_agent: userAgent,
          blocked_reason: "captcha_failed",
        });

        return jsonResponse({ valid: false, reason: "captcha_failed" });
      }
    } else {
      await supabase.from("form_security_log").insert({
        form_name: formName || "unknown",
        email: email || null,
        ip_address: ip,
        user_agent: userAgent,
        blocked_reason: "captcha_not_configured",
      });

      console.error("TURNSTILE_SECRET_KEY not configured — blocking validation");
      return jsonResponse({ valid: false, reason: "captcha_unavailable" }, 503);
    }

    // ── 3. RATE LIMITING ──
    // Max 5 validation attempts per form per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count: recentAttempts } = await supabase
      .from("form_security_log")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .eq("form_name", formName || "unknown")
      .gte("created_at", oneHourAgo);

    if ((recentAttempts || 0) >= 5) {
      await supabase.from("form_security_log").insert({
        form_name: formName || "unknown",
        email: email || null,
        ip_address: ip,
        user_agent: userAgent,
        blocked_reason: "rate_limit_exceeded",
      });

      return jsonResponse({ valid: false, reason: "rate_limited" });
    }

    // ── 4. DISPOSABLE EMAIL CHECK ──
    // Detect common disposable email domains
    let isDisposable = false;
    if (email) {
      const domain = email.split("@")[1]?.toLowerCase();
      if (domain && DISPOSABLE_DOMAINS.has(domain)) {
        isDisposable = true;

        await supabase.from("form_security_log").insert({
          form_name: formName || "unknown",
          email,
          ip_address: ip,
          user_agent: userAgent,
          blocked_reason: "disposable_email_detected",
        });
      }
    }

    // ── ALL CHECKS PASSED ──
    // Log the successful validation for rate-limiting tracking
    await supabase.from("form_security_log").insert({
      form_name: formName || "unknown",
      email: email || null,
      ip_address: ip,
      user_agent: userAgent,
      blocked_reason: VALIDATION_PASSED_REASON,
    });

    return jsonResponse({ valid: true, disposableEmail: isDisposable });
  } catch (error) {
    console.error("Validation error:", error);
    return jsonResponse({ valid: false, reason: "server_error" }, 500);
  }
});
