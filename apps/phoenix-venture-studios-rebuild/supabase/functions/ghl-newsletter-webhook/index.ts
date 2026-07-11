import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-ghl-signature",
};

const GHL_ED25519_PUBLIC_KEY = "MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=";

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

async function verifyGhlSignature(raw: string, signature: string | null): Promise<boolean> {
  if (!signature || signature === "N/A") return false;
  try {
    const publicKey = await crypto.subtle.importKey(
      "spki",
      decodeBase64(GHL_ED25519_PUBLIC_KEY),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      decodeBase64(signature),
      new TextEncoder().encode(raw).buffer,
    );
  } catch {
    return false;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getEmail(payload: Record<string, unknown>): string | null {
  const candidates = [
    payload.email,
    (payload.contact as Record<string, unknown> | undefined)?.email,
    (payload.data as Record<string, unknown> | undefined)?.email,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.text();
    if (!await verifyGhlSignature(raw, req.headers.get("x-ghl-signature"))) {
      return jsonResponse({ error: "Invalid HighLevel webhook signature" }, 401);
    }
    const payload = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    const email = getEmail(payload);
    const eventType = typeof payload.type === "string"
      ? payload.type
      : typeof payload.event === "string"
      ? payload.event
      : "unknown";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase
      .from("newsletter_sync_events")
      .insert({
        event_type: eventType,
        subscriber_email: email || "unknown",
        provider: "gohighlevel",
        status: typeof payload.status === "string" ? payload.status : "received",
        payload,
      });

    if (email && /unsubscribe|dnd|suppression|bounce/i.test(eventType)) {
      await supabase
        .from("newsletter_subscribers")
        .upsert({
          email,
          marketing_consent: false,
          provider: "gohighlevel",
          provider_last_synced_at: new Date().toISOString(),
          provider_status: /unsubscribe/i.test(eventType) ? "unsubscribed" : "suppressed",
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString(),
        }, { onConflict: "email" });
    }

    return jsonResponse({ success: true, event_type: eventType, email });
  } catch (error) {
    console.error("ghl-newsletter-webhook error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
