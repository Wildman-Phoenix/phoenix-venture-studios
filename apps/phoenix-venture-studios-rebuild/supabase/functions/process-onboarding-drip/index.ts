import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();

    // Get active subscribers who haven't been fully onboarded
    const { data: subscribers, error: subErr } = await supabase
      .from("newsletter_subscribers")
      .select("id, email, signup_date")
      .or("unsubscribed.is.null,unsubscribed.eq.false")
      .limit(200);

    if (subErr) throw subErr;
    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, reason: "No subscribers to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let email2Sent = 0;
    let email3Sent = 0;

    for (const sub of subscribers) {
      const signupDate = new Date(sub.signup_date);
      const hoursSinceSignup = (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60);

      // Get or create subscriber profile to track onboarding state
      let { data: profile } = await supabase
        .from("subscriber_profiles")
        .select("id, onboarding_email_2_sent, onboarding_email_3_sent")
        .eq("email", sub.email)
        .maybeSingle();

      if (!profile) {
        // Create a profile entry for tracking
        const { data: newProfile, error: insertErr } = await supabase
          .from("subscriber_profiles")
          .insert({ email: sub.email, subscriber_id: sub.id })
          .select("id, onboarding_email_2_sent, onboarding_email_3_sent")
          .single();

        if (insertErr) {
          // Might be a race/duplicate — try fetching again
          const { data: retryProfile } = await supabase
            .from("subscriber_profiles")
            .select("id, onboarding_email_2_sent, onboarding_email_3_sent")
            .eq("email", sub.email)
            .maybeSingle();
          profile = retryProfile;
        } else {
          profile = newProfile;
        }
      }

      if (!profile) continue;

      // Email 2: Send 24 hours after signup
      if (!profile.onboarding_email_2_sent && hoursSinceSignup >= 24) {
        try {
          const invokeUrl = `${SUPABASE_URL}/functions/v1/onboarding-nathan-intro`;
          const res = await fetch(invokeUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: sub.email }),
          });

          if (res.ok) {
            await supabase
              .from("subscriber_profiles")
              .update({
                onboarding_email_2_sent: true,
                onboarding_email_2_sent_at: now.toISOString(),
                updated_at: now.toISOString(),
              })
              .eq("id", profile.id);
            email2Sent++;
          } else {
            const errText = await res.text();
            console.error(`Email 2 failed for ${sub.email}:`, errText);
          }
        } catch (e) {
          console.error(`Email 2 error for ${sub.email}:`, e);
        }
      }

      // Email 3: Send 72 hours after signup
      if (!profile.onboarding_email_3_sent && hoursSinceSignup >= 72) {
        try {
          const invokeUrl = `${SUPABASE_URL}/functions/v1/onboarding-preferences-ask`;
          const res = await fetch(invokeUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: sub.email }),
          });

          if (res.ok) {
            await supabase
              .from("subscriber_profiles")
              .update({
                onboarding_email_3_sent: true,
                onboarding_email_3_sent_at: now.toISOString(),
                updated_at: now.toISOString(),
              })
              .eq("id", profile.id);
            email3Sent++;
          } else {
            const errText = await res.text();
            console.error(`Email 3 failed for ${sub.email}:`, errText);
          }
        } catch (e) {
          console.error(`Email 3 error for ${sub.email}:`, e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: subscribers.length,
        email2_sent: email2Sent,
        email3_sent: email3Sent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-onboarding-drip error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
