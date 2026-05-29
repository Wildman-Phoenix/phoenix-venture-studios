import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Read-only diagnostic endpoint for the founder-intelligence image pipeline.
 * Returns the most recent image_health_runs rows plus aggregate rates so we
 * can verify OpenAI / legacy-gateway / fallback share after each test run.
 * The database schema still uses `lovable_count` as a historical column name.
 *
 * Query params:
 *   limit  — number of recent runs to include (default 10, max 100)
 *   since  — ISO timestamp; only runs at/after this time are included
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 100);
    const since = url.searchParams.get("since");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let q = sb.from("image_health_runs").select("*").order("run_at", { ascending: false }).limit(limit);
    if (since) q = q.gte("run_at", since);
    const { data: runs, error } = await q;
    if (error) throw error;

    const totals = (runs ?? []).reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.source += r.source_count;
        acc.generated += r.generated_count;
        acc.openai += r.openai_count;
        acc.legacyGateway += r.lovable_count;
        acc.fallback += r.fallback_count;
        acc.defaultFallback += r.default_fallback_count;
        acc.openaiErrors += r.openai_errors;
        acc.gateway402 += r.gateway_402;
        return acc;
      },
      { total: 0, source: 0, generated: 0, openai: 0, legacyGateway: 0, fallback: 0, defaultFallback: 0, openaiErrors: 0, gateway402: 0 },
    );

    const pct = (n: number) => (totals.total > 0 ? +(n / totals.total * 100).toFixed(1) : 0);
    const rates = {
      sourcePct: pct(totals.source),
      openaiPct: pct(totals.openai),
      legacyGatewayPct: pct(totals.legacyGateway),
      lovablePct: pct(totals.legacyGateway),
      fallbackPct: pct(totals.fallback),
      defaultFallbackPct: pct(totals.defaultFallback),
    };

    const latest = runs?.[0] ?? null;
    const healthy =
      !!latest &&
      latest.total > 0 &&
      latest.openai_count + latest.source_count >= Math.ceil(latest.total * 0.6) &&
      latest.default_fallback_count === 0 &&
      latest.gateway_402 === 0;

    return new Response(
      JSON.stringify({
        healthy,
        runsIncluded: runs?.length ?? 0,
        totals,
        rates,
        latest,
        runs,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
