import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-image-1";
const SIZE = "1536x1024";

function buildPrompt(body: any) {
  const title = String(body?.title || "Founder Signal");
  const sourceName = String(body?.sourceName || "");
  const storySubject = String(body?.storySubject || "current founder signal");
  const storyAngle = String(body?.storyAngle || "founder signal");
  const visualMetaphor = String(body?.visualMetaphor || "a specific real-world business scene");
  const sourceContext = String(body?.sourceContext || "");
  const sceneLane = String(body?.sceneLane || "general");
  const sceneMotif = String(body?.sceneMotif || "distinct scene");
  const attempt = Number(body?.attempt || 1);
  const recentTitles = Array.isArray(body?.recentTitles) ? body.recentTitles.slice(0, 8).join(" | ") : "";

  const diversityDirective = attempt > 1
    ? `This is retry ${attempt}. Choose a clearly different camera angle, location, lighting setup, and physical scene than a typical tech-office image.`
    : "Choose a specific physical scene, not a vague corporate backdrop.";

  return [
    `Create one high-quality cinematic editorial image for this story: "${title}".`,
    `Source context: ${sourceName || "publisher"} article about ${storySubject}.`,
    `Story angle: ${storyAngle}.`,
    `Visual direction: ${visualMetaphor}.`,
    sourceContext ? `Story details to ground the scene: ${sourceContext}.` : "",
    `Scene lane: ${sceneLane}. Scene motif: ${sceneMotif}.`,
    diversityDirective,
    recentTitles ? `Avoid resembling these recently published stories: ${recentTitles}.` : "",
    "Make it feel like a real magazine-quality photograph or film still, not graphic design and not a social card.",
    "The image must be grounded in the actual article subject and pressure point.",
    "Use real environments, strong composition, cinematic lighting, and a clear focal subject.",
    "No text, no words, no letters, no logos, no watermarks, no UI text, no charts with readable labels, no branded overlays.",
    "No generic boardroom wallpaper, no abstract dashboard background, no fake app mockups floating in space.",
    "Important details should sit in the center safe area so the image can be cropped for feed use.",
  ].filter(Boolean).join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const prompt = buildPrompt(body);

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        size: SIZE,
        n: 1,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(JSON.stringify({ error: errorBody.slice(0, 500) }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageBase64 = data?.data?.[0]?.b64_json;
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image returned" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      imageBase64,
      mimeType: "image/png",
      promptUsed: prompt,
      model: MODEL,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
