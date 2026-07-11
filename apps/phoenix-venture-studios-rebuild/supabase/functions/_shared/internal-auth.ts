const INTERNAL_SECRET_ENV = "PHOENIX_NEWSLETTER_CRON_SECRET";
const INTERNAL_SECRET_HEADER = "x-phoenix-newsletter-secret";

export function requireInternalRequest(req: Request) {
  const expectedSecret = Deno.env.get(INTERNAL_SECRET_ENV);
  if (!expectedSecret) {
    console.error(`${INTERNAL_SECRET_ENV} is not configured`);
    return {
      ok: false as const,
      response: new Response(
        JSON.stringify({ success: false, reason: "internal_secret_unconfigured" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  const headerSecret = req.headers.get(INTERNAL_SECRET_HEADER);
  const authorization = req.headers.get("authorization") || "";
  const bearerSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  const providedSecret = headerSecret || bearerSecret;

  if (providedSecret !== expectedSecret) {
    return {
      ok: false as const,
      response: new Response(
        JSON.stringify({ success: false, reason: "forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  return { ok: true as const };
}
