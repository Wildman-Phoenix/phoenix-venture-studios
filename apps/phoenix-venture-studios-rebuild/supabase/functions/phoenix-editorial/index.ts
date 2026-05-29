import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as decodeImage } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://phoenixventurestudios.com";

const CTA_OPTIONS = [
  { intent: "readiness", text: "See where you stand", url: `${SITE_URL}/funding` },
  { intent: "capital-options", text: "Explore your funding options", url: `${SITE_URL}/funding` },
  { intent: "complexity", text: "Talk through your options", url: "https://calendly.com/rpbswildman/new-meeting" },
  { intent: "top-of-funnel", text: "Learn how we help founders", url: `${SITE_URL}/about` },
  { intent: "timing", text: "Check your capital readiness", url: `${SITE_URL}/funding` },
];

const EVERGREEN_ANGLES = [
  "Most founders apply for capital too early — and it costs them leverage they didn't know they had.",
  "Growth capital and cash-flow capital solve completely different problems. Choosing wrong can stall a business that's actually ready.",
  "The wrong funding doesn't just cost interest — it costs momentum, flexibility, and sometimes the venture itself.",
  "Strategy-first funding beats random applications every time. The founders who plan their capital path outperform the ones who chase approvals.",
  "Unsecured funding may fit more founders than they realize — especially those with strong credit and consistent revenue.",
  "Many founders don't need more capital. They need the right capital, matched to where they actually are.",
  "Applying to five lenders hoping one says yes is not a strategy. It's a credit score liability.",
  "The difference between a $50k credit line and a $250k growth round isn't just the number — it's timing, fit, and readiness.",
  "Founders with clean credit and real revenue often have more options than they think. The problem isn't access — it's clarity.",
  "A strategy session before an application can save a founder six months of wasted effort and unnecessary debt.",
];

// ─── SCENE ARCHETYPES ────────────────────────────────────────────────
const SCENE_ARCHETYPES = [
  { id: "strategy-desk", prompt: "a clean executive desk with a leather notebook, fountain pen, and a single strategic document, warm directional light, shallow depth of field" },
  { id: "city-skyline-office", prompt: "floor-to-ceiling windows overlooking a city skyline at golden hour, a single chair and side table with coffee, contemplative mood" },
  { id: "boardroom-empty", prompt: "an empty polished boardroom table with a single bound strategy document, overhead diffused light, solitary focus" },
  { id: "warehouse-operations", prompt: "a clean modern warehouse with organized pallets and ambient industrial light, purposeful and grounded" },
  { id: "cafe-strategy", prompt: "a quiet upscale cafe table with an open notebook and espresso, window light creating soft shadows, urban street visible outside" },
  { id: "data-review", prompt: "printed reports with charts spread on a dark wood table, overhead warm ambient light, analytical mood" },
  { id: "architecture-blueprint", prompt: "architectural blueprints unrolled on a drafting table, precise lighting, creative strategy energy" },
  { id: "night-grind", prompt: "a minimalist desk with a single monitor glow, city lights through window, quiet determination, moody atmosphere" },
  { id: "venture-pathway", prompt: "a long modern corridor with warm lighting converging to a bright doorway at the end, metaphor for clarity and direction" },
  { id: "financial-documents", prompt: "close-up of professional financial documents and a calculator on a clean desk, warm task lighting, precision" },
  { id: "rooftop-city", prompt: "a city rooftop terrace at golden hour, skyline in soft focus, a single coffee cup on the ledge, contemplative" },
  { id: "coworking-focus", prompt: "a solo workspace at a coworking space, natural light from large windows, laptop and handwritten notes" },
  { id: "market-screens", prompt: "large screens showing market data in a modern office, blue-white monitor glow mixing with warm room light, no readable text" },
  { id: "compass-direction", prompt: "a brass compass on a dark leather surface with soft directional light, metaphor for navigation and strategy" },
  { id: "open-road", prompt: "a clean two-lane road stretching into rolling hills at sunrise, metaphor for the path ahead, cinematic wide shot" },
  // Brighter/warmer scenes to prevent dark-muddy defaults
  { id: "morning-strategy", prompt: "a clean oak desk near a large window with bright morning light streaming in, coffee steam catching sunlight, a notebook open with a pen resting on it, warm natural tones" },
  { id: "founder-walk", prompt: "a person walking through a bright modern building lobby with natural light flooding through glass walls, purposeful stride, warm wood and concrete textures" },
  { id: "whiteboard-plan", prompt: "a clean whiteboard with minimal strategic notes in a bright room, warm wood accent wall, natural daylight filling the space, focused and optimistic energy" },
  { id: "terrace-meeting", prompt: "a rooftop terrace with city views in soft golden afternoon light, two modern chairs and a small table with notebooks, open sky above, warm and inviting" },
  { id: "workshop-build", prompt: "a clean maker workshop with prototypes on a bright workbench, warm overhead pendant lighting, organized tools, creative energy and tangible progress" },
];

const LIGHTING_STYLES = [
  "warm directional golden hour light with soft shadows",
  "cool morning blue light with warm accent highlights",
  "dramatic chiaroscuro lighting with warm amber tones",
  "soft diffused overcast light creating even cinematic tones",
  "mixed warm and cool lighting creating depth and atmosphere",
  "intimate desk lamp glow with deep background shadows",
  "clean neutral tones with subtle warmth",
  "high-contrast documentary grading with natural color",
];

const COLOR_TREATMENTS = [
  "muted editorial color grading with warm highlights and cool shadows",
  "cinematic orange and teal color palette",
  "desaturated with selective warm accent colors",
  "rich warm tones with deep shadow detail",
  "film-stock color rendering with natural tones",
  "moody editorial with amber and charcoal tones",
  "clean neutral tones with subtle warmth",
  "high-contrast documentary grading",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

// ─── PERPLEXITY VISUAL RESEARCH ─────────────────────────────────────
async function getVisualContext(
  article: { headline: string; summary: string; why_it_matters: string; founder_takeaway: string; post_angle: string; image_direction: string },
  perplexityKey: string,
): Promise<string> {
  try {
    const query = `What are the most visually evocative real-world scenes, environments, objects, or settings associated with this topic? Keep it to 2-3 concrete visual concepts. Topic: "${article.headline}". Context: ${article.post_angle || article.summary}`;

    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "You are a visual research assistant for a premium editorial publication. Return only 2-3 concise, concrete visual scene descriptions relevant to the topic. No explanation, just visual concepts. Prefer real-world business/strategy/workspace settings over abstract concepts." },
          { role: "user", content: query },
        ],
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      console.warn(`Perplexity visual research failed [${res.status}]`);
      await res.text();
      return "";
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.warn("Perplexity visual research error:", err);
    return "";
  }
}

// ─── IMAGE PROMPT BUILDER ────────────────────────────────────────────
function buildEditorialImagePrompt(
  article: { headline: string; summary: string; why_it_matters: string; founder_takeaway: string; image_direction: string },
  scene: typeof SCENE_ARCHETYPES[0],
  lighting: string,
  colorTreatment: string,
  visualContext: string,
): string {
  const directionHint = article.image_direction || article.founder_takeaway || article.why_it_matters || "";
  const contextHint = visualContext ? `\nVISUAL RESEARCH CONTEXT: ${visualContext}` : "";

  return `Create an ultra-realistic editorial photograph (1200x630) for a premium founder-facing publication.

ARTICLE THEME: "${article.headline}"
EDITORIAL DIRECTION: ${directionHint}${contextHint}

SCENE: ${scene.prompt}
Adapt the scene to reflect the article theme. The environment, props, and composition should feel directly relevant to the editorial topic.

9-PART VISUAL GRAMMAR:
1. STYLE: Premium editorial realism, photographic, no illustration
2. SUBJECT: Derive from scene and article theme — specific objects, environments, materials
3. ENVIRONMENT: ${scene.prompt}
4. LIGHTING: ${lighting}. Visible highlights AND shadow detail. Warm directional light preferred. Balanced contrast — NOT dark or muddy.
5. CAMERA: Shot on full-frame with 85mm f/1.4 lens. Shallow depth of field with cinematic bokeh. Eye-level or slightly above.
6. MOOD: Strategic, grounded, purposeful — never generic or sterile
7. TEXTURE: Realistic materials — leather, wood, linen, metal, paper grain. Tangible and tactile.
8. COLOR: ${colorTreatment}. Warm amber highlights, cool slate shadows, clean readable midtones. NO heavy black wash. NO muddy dark output.
9. FINISH: Film-grain texture, documentary-editorial grade, 8K detail

BRIGHTNESS & CONTRAST RULES:
- The image MUST have visible tonal range. Shadows should be rich, not crushed. Highlights should be warm, not blown.
- Midtones must be clearly readable.
- Background should be dark modern tones (slate, charcoal, deep navy) but NEVER pure black.
- Always include at least one warm accent element (amber light spill, warm wood, copper detail).
- If the overall image would score below 40% average brightness, lighten the composition.
- The image must feel alive and readable at thumbnail size on mobile.

SUBJECT RULES:
- Prefer scenes, environments, objects, architecture, workspaces, documents, desks, and relevant visual metaphors over people
- Use people sparingly — only if the article clearly benefits from human presence
- If people are used, keep to 1 person maximum, realistic and grounded
- Avoid generic finance stock-photo energy — no corporate handshake, no generic laptop on white desk, no vague glass office
- Make the image highly relevant to the article's actual topic

ABSOLUTE RULES — DO NOT VIOLATE:
- ZERO TEXT of any kind. No fake words on documents, no labels on monitors, no signage, no headlines, no captions, no watermarks, no typography. Documents must appear blank or have only abstract horizontal line patterns suggesting text without forming letters.
- Do NOT include charts, graphs, UI elements, or readable screen content
- Do NOT include neon lights, holographic effects, sci-fi elements, or cartoon styles
- Do NOT create gradient title cards or abstract graphic designs
- The image must look like a real photograph taken by a professional editorial photographer
- Premium documentary/editorial style — grounded, strategic, believable`;
}

// ─── IMAGE GENERATION + UPLOAD ───────────────────────────────────────
// ─── IMAGE QUALITY VALIDATION ────────────────────────────────────────
// Decodes the generated image and rejects it if it is too dark, too low-contrast,
// or shows the high-frequency horizontal striping pattern typical of fake "text".
type ValidationResult = { ok: boolean; reason?: string; brightness?: number; textScore?: number };

async function validateImageBytes(bytes: Uint8Array): Promise<ValidationResult> {
  try {
    const img: any = await decodeImage(bytes);
    if (!img || !img.width || !img.height) {
      return { ok: false, reason: "decode-failed" };
    }
    const w: number = img.width;
    const h: number = img.height;

    // Sample a uniform grid (~64x36 = 2304 samples) for brightness + variance
    const sx = 64;
    const sy = 36;
    const lums: number[] = [];
    let sum = 0;
    for (let j = 0; j < sy; j++) {
      for (let i = 0; i < sx; i++) {
        const x = Math.floor((i + 0.5) * (w / sx));
        const y = Math.floor((j + 0.5) * (h / sy));
        const px = img.getPixelAt(x + 1, y + 1); // imagescript is 1-indexed
        const r = (px >>> 24) & 0xff;
        const g = (px >>> 16) & 0xff;
        const b = (px >>> 8) & 0xff;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lums.push(lum);
        sum += lum;
      }
    }
    const avg = sum / lums.length;
    const brightnessPct = (avg / 255) * 100;

    // Brightness floor: prompt asks for >40%; reject below 32% to allow some moodiness.
    if (brightnessPct < 32) {
      return { ok: false, reason: "too-dark", brightness: brightnessPct };
    }

    // Text detection: look for many short horizontal runs of dark-on-light or light-on-dark
    // transitions in the middle band of the image (where fake document text usually lives).
    let textScore = 0;
    const bandStart = Math.floor(sy * 0.25);
    const bandEnd = Math.floor(sy * 0.85);
    for (let j = bandStart; j < bandEnd; j++) {
      let transitions = 0;
      let prevDark = false;
      for (let i = 0; i < sx; i++) {
        const idx = j * sx + i;
        const dark = lums[idx] < avg - 20;
        if (i > 0 && dark !== prevDark) transitions++;
        prevDark = dark;
      }
      // A row with many alternating dark/light segments looks like a text line.
      if (transitions >= 12) textScore++;
    }
    // If many rows look text-like, reject.
    if (textScore >= 6) {
      return { ok: false, reason: "text-like-pattern", brightness: brightnessPct, textScore };
    }

    return { ok: true, brightness: brightnessPct, textScore };
  } catch (err) {
    console.warn("[image-validate] decode error, accepting image:", err);
    return { ok: true, reason: "validator-error" };
  }
}

const STRICTER_REINFORCEMENT = `

CRITICAL REINFORCEMENT (previous attempt was rejected):
- Brightness MUST exceed 50%. Lift exposure noticeably. Use bright window light or warm overhead lighting.
- ABSOLUTELY ZERO TEXT, fake letters, fake numbers, fake document writing, or labels of any kind. Documents must be COMPLETELY blank, or use only smooth abstract gradients — no horizontal line patterns that suggest text.
- No screens with UI, no signage, no captions, no watermarks.`;

type ImageCallResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; status: number; reason: string; errorBody?: string };

type ImageAttemptLog = {
  label: string;
  model: string;
  outcome: "passed" | "rejected" | "no_image" | "http_error";
  httpStatus?: number;
  errorBody?: string;
  validation?: { ok: boolean; reason?: string; brightness?: number; textScore?: number };
  durationMs: number;
};

const OPENAI_IMAGE_PRIMARY_MODEL = "gpt-image-1-mini";
const OPENAI_IMAGE_FALLBACK_MODEL = "gpt-image-1";
const OPENAI_IMAGE_SIZE = "1536x1024";
const OPENAI_IMAGE_QUALITY = "low";

const OPENAI_CROP_SAFETY_SUFFIX = `

COMPOSITION SAFETY (critical for social/feed crops):
- Place the main subject and primary action near the center.
- Keep important visual details well inside the central 60 percent of the frame.
- Leave clean negative space around the main concept.
- ABSOLUTELY NO text, letters, numbers, captions, labels, logos, brand marks, UI text, or watermarks anywhere in the image.
- No important detail near edges or corners.`;

function isOpenAIModelUnavailable(status: number, errorBody: string | undefined): boolean {
  if (status === 404) return true;
  if (!errorBody) return false;
  const lower = errorBody.toLowerCase();
  if (lower.includes("model_not_found")) return true;
  if (status === 400 && lower.includes("model") && (lower.includes("not found") || lower.includes("does not exist") || lower.includes("unavailable") || lower.includes("invalid"))) {
    return true;
  }
  return false;
}

async function callOpenAIImageOnce(
  prompt: string,
  model: string,
  apiKey: string,
): Promise<ImageCallResult> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size: OPENAI_IMAGE_SIZE,
      quality: OPENAI_IMAGE_QUALITY,
      n: 1,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[openai-image:${model}] failed ${response.status}: ${errorBody.slice(0, 300)}`);
    let reason = `http_${response.status}`;
    if (response.status === 401 || response.status === 403) reason = "auth_failed";
    else if (response.status === 429) reason = "rate_limited";
    else if (isOpenAIModelUnavailable(response.status, errorBody)) reason = "model_unavailable";
    return { ok: false, status: response.status, reason, errorBody };
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { ok: false, status: 200, reason: "malformed_response" };
  }
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64 || typeof b64 !== "string") {
    return { ok: false, status: 200, reason: "no_image" };
  }
  try {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return { ok: true, bytes: out };
  } catch {
    return { ok: false, status: 200, reason: "b64_decode_failed" };
  }
}

async function callOpenAIImage(
  prompt: string,
  apiKey: string,
): Promise<{ result: ImageCallResult; modelUsed: string }> {
  const safePrompt = prompt + OPENAI_CROP_SAFETY_SUFFIX;
  const first = await callOpenAIImageOnce(safePrompt, OPENAI_IMAGE_PRIMARY_MODEL, apiKey);
  if (first.ok || first.reason !== "model_unavailable") {
    return { result: first, modelUsed: OPENAI_IMAGE_PRIMARY_MODEL };
  }
  console.warn(`[editorial-image] primary model ${OPENAI_IMAGE_PRIMARY_MODEL} unavailable, retrying with ${OPENAI_IMAGE_FALLBACK_MODEL}`);
  const second = await callOpenAIImageOnce(safePrompt, OPENAI_IMAGE_FALLBACK_MODEL, apiKey);
  return { result: second, modelUsed: OPENAI_IMAGE_FALLBACK_MODEL };
}

async function generateEditorialImage(
  slug: string,
  article: { headline: string; summary: string; why_it_matters: string; founder_takeaway: string; image_direction: string },
  supabase: any,
  openaiApiKey: string | null,
  perplexityKey: string | null,
): Promise<{ url: string | null; sceneId: string | null; promptUsed: string | null; attempts: ImageAttemptLog[]; finalStatus: string; modelUsed: string | null }> {
  const attemptsLog: ImageAttemptLog[] = [];
  try {
    if (!openaiApiKey) {
      return { url: null, sceneId: null, promptUsed: null, attempts: attemptsLog, finalStatus: "no_api_key", modelUsed: null };
    }

    const { data: recentEntries } = await supabase
      .from("intelligence_entries")
      .select("image_scene_id")
      .eq("source", "Phoenix Editorial")
      .order("created_at", { ascending: false })
      .limit(8);

    const usedSceneIds = (recentEntries || []).map((e: any) => e.image_scene_id).filter(Boolean);

    const available = SCENE_ARCHETYPES.filter(s => !usedSceneIds.includes(s.id));
    const pool = available.length > 0 ? available : SCENE_ARCHETYPES;
    const scene = pool[Math.floor(Math.random() * pool.length)];

    const lightingIdx = Math.floor(Math.random() * LIGHTING_STYLES.length);
    const colorIdx = Math.floor(Math.random() * COLOR_TREATMENTS.length);

    let visualContext = "";
    if (perplexityKey) {
      visualContext = await getVisualContext(
        { ...article, post_angle: "", image_direction: article.image_direction || "" },
        perplexityKey,
      );
    }

    const prompt = buildEditorialImagePrompt(
      article,
      scene,
      LIGHTING_STYLES[lightingIdx],
      COLOR_TREATMENTS[colorIdx],
      visualContext,
    );

    console.log(`[editorial-image] generating for "${slug}" with scene "${scene.id}"`);

    let bytes: Uint8Array | null = null;
    let usedPrompt = prompt;
    let modelUsed: string | null = null;
    const prompts = [
      { label: "openai-base", prompt },
      { label: "openai-reinforced", prompt: prompt + STRICTER_REINFORCEMENT },
    ];

    for (const attempt of prompts) {
      const t0 = Date.now();
      const { result, modelUsed: attemptModel } = await callOpenAIImage(attempt.prompt, openaiApiKey);
      if (!result.ok) {
        attemptsLog.push({
          label: attempt.label,
          model: attemptModel,
          outcome: result.status === 200 ? "no_image" : "http_error",
          httpStatus: result.status,
          errorBody: result.errorBody?.slice(0, 300),
          validation: { ok: false, reason: result.reason },
          durationMs: Date.now() - t0,
        });
        console.warn(`[editorial-image:${slug}] ${attempt.label} failed → ${result.reason}${result.status ? ` (http ${result.status})` : ""}`);
        continue;
      }
      const verdict = await validateImageBytes(result.bytes);
      attemptsLog.push({
        label: attempt.label,
        model: attemptModel,
        outcome: verdict.ok ? "passed" : "rejected",
        httpStatus: 200,
        validation: verdict,
        durationMs: Date.now() - t0,
      });
      console.log(`[editorial-image:${slug}] ${attempt.label} → ${verdict.ok ? "PASSED" : `REJECTED (${verdict.reason})`}`);
      if (verdict.ok) {
        bytes = result.bytes;
        usedPrompt = attempt.prompt;
        modelUsed = attemptModel;
        break;
      }
    }

    if (!bytes) {
      const finalStatus = attemptsLog.some((a) => a.validation?.reason === "rate_limited") ? "rate_limited" : "all_attempts_rejected";
      console.error(`[editorial-image:${slug}] ${finalStatus} — attempts:`, JSON.stringify(attemptsLog.map(a => ({ label: a.label, outcome: a.outcome, reason: a.validation?.reason }))));
      return { url: null, sceneId: scene.id, promptUsed: prompt, attempts: attemptsLog, finalStatus, modelUsed: null };
    }

    const ext = "png";
    const mimeType = "image/png";
    const filePath = `editorial/${slug}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("intelligence-images")
      .upload(filePath, bytes, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { url: null, sceneId: scene.id, promptUsed: prompt, attempts: attemptsLog, finalStatus: "upload_failed", modelUsed };
    }

    const { data: urlData } = supabase.storage
      .from("intelligence-images")
      .getPublicUrl(filePath);

    const winningLabel = attemptsLog[attemptsLog.length - 1]?.label ?? "unknown";
    console.log(`[editorial-image:${slug}] ✓ generated via ${winningLabel} (${modelUsed}) after ${attemptsLog.length} attempt(s) — uploaded: ${urlData?.publicUrl}`);
    return { url: urlData?.publicUrl || null, sceneId: scene.id, promptUsed: usedPrompt, attempts: attemptsLog, finalStatus: `passed_${winningLabel}`, modelUsed };
  } catch (err) {
    console.error("Editorial image generation error:", err);
    return { url: null, sceneId: null, promptUsed: null, attempts: attemptsLog, finalStatus: "exception", modelUsed: null };
  }
}

// ─── OUTPUT INSTRUCTIONS ─────────────────────────────────────────────
function buildOutputInstructions(recentHooks: string[]): string {
  const recentHookExamples = recentHooks.length > 0
    ? `\nRECENT OPENING HOOKS (do NOT repeat these patterns or start the same way):\n${recentHooks.map((h, i) => `${i + 1}. "${h}"`).join("\n")}\n`
    : "";

  return `Return a JSON object with exactly these keys:

- post_type: one of "news-hooked", "evergreen", or "preferred-fit"
- angle: one sentence describing the strategic angle
- headline: the title of the post
- hook: the opening lead paragraph (stored in hook field)
- summary: the signal explanation paragraph
- why_it_matters: the founder implication paragraph
- founder_takeaway: the calm next-move closing
- short_social_post: under 280 chars, punchy, curiosity-driven, no hashtags in the body
- long_social_post: 4–6 short paragraphs for LinkedIn/X threads. Hook, insight, pivot to action. End with a single clean CTA line and URL. No hashtags in the body.
- cta_text: the call-to-action text (see CTA RULES below)
- cta_url: the matching URL for the CTA
- hashtags: array of 3–5 relevant hashtags (strings without the # symbol)
- image_direction: a structured visual brief following the 9-part grammar (see IMAGE RULES below)

───────────────────────────────
HEADLINE RULES:
- Under 70 characters
- Plain, sharp, human
- No colons
- No clickbait
- No "Here's What That Means for You" or similar patterns
- No exaggerated curiosity bait
- Should feel like a plain observation from a smart person, not a marketing headline

───────────────────────────────
HOOK RULES (stored in "hook" field — this is the opening lead):
- 2–3 sentences maximum
- Do NOT restate the headline
- First sentence MUST contain a concrete shift, contrast, or specific fact
- First sentence should make the second sentence necessary
- No filler openers: no "In today's landscape," no "Hey founders," no "It's no secret that"
- Vary opening patterns — do not start consecutive posts the same way
${recentHookExamples}
───────────────────────────────
SUMMARY RULES (stored in "summary" — the signal explanation):
- 2–3 sentences explaining the signal plainly
- Should read as a natural continuation of the hook, not a separate block
- Plain English. One idea per sentence. No jargon.

───────────────────────────────
WHY IT MATTERS RULES (stored in "why_it_matters" — the founder implication):
- 2–3 sentences focused on what changes for a founder's decisions, timing, readiness, positioning, options, or leverage
- No generic importance language ("this is significant," "founders should pay attention," "this is a big deal")
- Must be specific to the signal. What actually shifts for someone making business decisions?

───────────────────────────────
FOUNDER TAKEAWAY RULES (stored in "founder_takeaway" — the calm next move):
- 1–2 sentences maximum
- No guru tone. No "you need to." No pressure language.
- Should feel like a calm strategic nudge from someone who's been there
- Must NOT sound like generic consultant advice ("diversify your portfolio," "stay agile")
- Should naturally bridge into the CTA — the CTA should feel like the logical next sentence

───────────────────────────────
CTA RULES:
- The CTA should feel like the natural final sentence of the post — not a bolted-on button
- Choose the softer CTA when uncertain
- Match the CTA to the post's actual meaning:
  * Post about fit or readiness clarity → "See where you stand" → ${SITE_URL}/funding
  * Post about capital options → "Explore your funding options" → ${SITE_URL}/funding
  * Post about complexity or nuance → "Talk through your options" → https://calendly.com/rpbswildman/new-meeting
  * Post is broad or top-of-funnel → "Learn how we help founders" → ${SITE_URL}/about
  * Post about timing or readiness → "Check your capital readiness" → ${SITE_URL}/funding
- Never use the exact same CTA text as the most recent editorial post
- Avoid generic button language unless nothing else fits naturally

───────────────────────────────
IMAGE DIRECTION RULES (stored in "image_direction"):
Write a structured visual brief using this 9-part grammar:
1. STYLE: Premium editorial realism, photographic
2. SUBJECT: [specific object/scene relevant to the post topic — NOT generic]
3. ENVIRONMENT: [concrete setting with real materials and context]
4. LIGHTING: Warm directional light, balanced contrast. NOT dark or muddy.
5. CAMERA: 85mm f/1.4, shallow depth of field, eye-level or slightly above
6. MOOD: [1–2 words — e.g. "quiet confidence," "focused momentum"]
7. TEXTURE: [specific materials — leather, wood, linen, brushed metal, paper grain]
8. COLOR: Warm amber highlights, cool slate shadows, clean midtones. No heavy black wash.
9. FINISH: Film-grain texture, documentary-editorial grade
- Avoid generic office-stock-photo energy
- Preserve mood but increase brightness and midtone clarity
- Image must feel alive and readable at thumbnail size on mobile

───────────────────────────────
COPY RULES:
- 5th to 8th grade reading level
- Short sentences. Plain words. One idea per sentence.
- Mix short (5–8 words) with medium (12–18 words). Never exceed 25 words per sentence.
- BANNED: "In today's landscape," "It's worth noting," "paradigm," "ecosystem," "leverage" (as verb), "synergy," "innovative," "cutting-edge," "deep dive," "game-changer," "founders should pay attention," "this is significant"
- No filler transitions: cut "However," "Moreover," "Additionally," "It's important to note"
- Narrative movement: old assumption → new shift → what changed → what to consider
- Avoid repetitive opening patterns across consecutive posts`;
}

type EditorialPost = {
  post_type: "news-hooked" | "evergreen" | "preferred-fit";
  angle: string;
  headline: string;
  hook: string;
  summary: string;
  why_it_matters: string;
  founder_takeaway: string;
  short_social_post: string;
  long_social_post: string;
  cta_text: string;
  cta_url: string;
  hashtags: string[];
  image_direction: string;
};

function sanitizeHashtags(values: unknown): string[] {
  if (!Array.isArray(values)) return ["founders", "capitalstrategy", "businessgrowth"];
  const cleaned = values
    .map((value) => typeof value === "string" ? value.replace(/^#/, "").trim() : "")
    .filter(Boolean)
    .slice(0, 5);
  return cleaned.length > 0 ? cleaned : ["founders", "capitalstrategy", "businessgrowth"];
}

function selectCta(intent: string): { text: string; url: string } {
  const lower = intent.toLowerCase();
  if (lower.includes("timing") || lower.includes("readiness")) return CTA_OPTIONS[4];
  if (lower.includes("capital") || lower.includes("funding")) return CTA_OPTIONS[1];
  if (lower.includes("complex") || lower.includes("nuance")) return CTA_OPTIONS[2];
  return CTA_OPTIONS[3];
}

function buildFallbackEditorialPost(input: {
  hasTopicalHooks: boolean;
  recentEntries: Array<{ headline?: string; summary?: string; founder_takeaway?: string; editorial_category?: string }>;
  evergreenAngle: string;
}): EditorialPost {
  const lead = input.recentEntries?.[0];
  const postType = input.hasTopicalHooks ? "news-hooked" : "evergreen";
  const sourceHeadline = lead?.headline?.trim() || input.evergreenAngle;
  const cta = selectCta(sourceHeadline);
  const angle = input.hasTopicalHooks
    ? `Use the latest market shift around ${sourceHeadline} to frame a practical founder decision.`
    : input.evergreenAngle;
  const headline = input.hasTopicalHooks
    ? sourceHeadline.slice(0, 68)
    : input.evergreenAngle.replace(/\.$/, "").slice(0, 68);
  const hook = input.hasTopicalHooks
    ? `${sourceHeadline} points to a sharper change than the headline alone suggests. The signal is not just news. It changes how a founder should think about timing and focus.`
    : `${headline} still catches founders off guard. Most of the risk shows up before an application or expansion plan ever starts.`;
  const summary = input.hasTopicalHooks
    ? `${lead?.summary?.trim() || "The underlying shift appears to be about how fast the market is changing and where attention is clustering."} That tends to reward founders who can explain one clear use case and one near-term proof point.`
    : `The core issue is usually fit, not effort. When the capital path and operating plan do not match, even a good business can lose momentum.`;
  const whyItMatters = input.hasTopicalHooks
    ? `${lead?.founder_takeaway?.trim() || "Founders may need to tighten their positioning before they broaden the story."} That makes capital conversations cleaner and reduces wasted motion.`
    : `The better move is to match the next source of capital to the next thing that actually needs proof. That usually improves timing, leverage, and decision quality.`;
  const founderTakeaway = input.hasTopicalHooks
    ? `A tighter narrative often creates better options than a louder one. Clarity tends to do more work than urgency here.`
    : `A calmer plan usually beats a rushed application cycle. The next step should make the path simpler, not busier.`;
  const longSocialPost = `${hook}\n\n${summary}\n\n${whyItMatters}\n\n${founderTakeaway}\n\n${cta.text}: ${cta.url}`;

  return {
    post_type: postType,
    angle,
    headline,
    hook,
    summary,
    why_it_matters: whyItMatters,
    founder_takeaway: founderTakeaway,
    short_social_post: `${headline}. ${whyItMatters} ${cta.url}`.slice(0, 279),
    long_social_post: longSocialPost,
    cta_text: cta.text,
    cta_url: cta.url,
    hashtags: ["founders", "capitalstrategy", "businessgrowth"],
    image_direction: `1. STYLE: Premium editorial realism, photographic
2. SUBJECT: Founder planning materials tied to ${headline.toLowerCase()}
3. ENVIRONMENT: A warm, credible strategy workspace with real materials
4. LIGHTING: Warm directional light, balanced contrast. NOT dark or muddy.
5. CAMERA: 85mm f/1.4, shallow depth of field, eye-level or slightly above
6. MOOD: Quiet confidence
7. TEXTURE: Leather, paper grain, brushed metal, oak
8. COLOR: Warm amber highlights, cool slate shadows, clean midtones. No heavy black wash.
9. FINISH: Film-grain texture, documentary-editorial grade`,
  };
}

async function generateOpenAIEditorialPost(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<EditorialPost | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.75,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI editorial generation failed:", response.status, errorText.slice(0, 400));
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    return null;
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (typeof rawContent !== "string" || rawContent.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawContent);
    return {
      post_type: parsed.post_type === "preferred-fit" ? "preferred-fit" : parsed.post_type === "news-hooked" ? "news-hooked" : "evergreen",
      angle: typeof parsed.angle === "string" ? parsed.angle.trim() : "",
      headline: typeof parsed.headline === "string" ? parsed.headline.trim() : "",
      hook: typeof parsed.hook === "string" ? parsed.hook.trim() : "",
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      why_it_matters: typeof parsed.why_it_matters === "string" ? parsed.why_it_matters.trim() : "",
      founder_takeaway: typeof parsed.founder_takeaway === "string" ? parsed.founder_takeaway.trim() : "",
      short_social_post: typeof parsed.short_social_post === "string" ? parsed.short_social_post.trim() : "",
      long_social_post: typeof parsed.long_social_post === "string" ? parsed.long_social_post.trim() : "",
      cta_text: typeof parsed.cta_text === "string" ? parsed.cta_text.trim() : "",
      cta_url: typeof parsed.cta_url === "string" ? parsed.cta_url.trim() : "",
      hashtags: sanitizeHashtags(parsed.hashtags),
      image_direction: typeof parsed.image_direction === "string" ? parsed.image_direction.trim() : "",
    };
  } catch (error) {
    console.error("Failed to parse OpenAI editorial JSON:", error);
    return null;
  }
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || null;
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") || null;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Check for recent topical hooks
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: recentEntries } = await supabase
      .from("intelligence_entries")
      .select("headline, summary, why_it_matters, founder_takeaway, editorial_category, source, slug")
      .neq("source", "Phoenix Editorial")
      .gte("created_at", threeDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(15);

    // 2. Check recent editorial to avoid duplication + get hooks for anti-repetition
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentEditorial } = await supabase
      .from("intelligence_entries")
      .select("headline, content_type, post_angle, hook, cta_text")
      .eq("source", "Phoenix Editorial")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    const recentAngles = (recentEditorial || []).map(e => e.post_angle || e.headline).join("\n");
    const recentHooks = (recentEditorial || []).map(e => e.hook).filter(Boolean).slice(0, 5);
    const lastCtaText = recentEditorial?.[0]?.cta_text || "";

    // 3. Decide: topical or evergreen
    const hasTopicalHooks = recentEntries && recentEntries.length >= 3;

    const topicalContext = hasTopicalHooks
      ? recentEntries!.slice(0, 8).map((e, i) =>
          `${i + 1}. [${e.editorial_category}] "${e.headline}" (${e.source})\n   Summary: ${e.summary || "N/A"}\n   Founder takeaway: ${e.founder_takeaway || "N/A"}`
        ).join("\n\n")
      : "";

    const evergreenAngle = EVERGREEN_ANGLES[Math.floor(Math.random() * EVERGREEN_ANGLES.length)];

    // 4. Build AI prompt
    const systemPrompt = `You are the editorial voice of Phoenix Venture Studios.

Every post should sound like a smart advisor texting a founder friend — not writing a LinkedIn article, not drafting a press release, not producing a corporate memo.

Write at a 5th to 8th grade reading level. Short sentences. Plain words. One idea per sentence.

Your tone is warm, confident, calm, intelligent, and human. You never sound robotic, corporate, hypey, or like a loan officer.

Your job is to create a single high-quality founder-facing post that helps founders think more clearly about funding, capital readiness, and strategic next steps — while naturally guiding them toward action.

Phoenix Venture Studios helps founders clarify which capital path fits their business. It offers a Capital Readiness Review, Funding Path exploration, and Strategy Sessions. One of the pathways is through Preferred Funding Group, which offers unsecured funding options — but this should only be mentioned subtly when the angle naturally supports it.

NEVER:
- Use "guaranteed approval" or similar language
- Sound like a lender ad or broker pitch
- Use fake urgency or pressure tactics
- Overpromise outcomes
- Use buzzwords like "ecosystem," "paradigm shift," "game-changer," "innovative," "cutting-edge"
- Repeat the same sentence structure across sections
- Start with greetings or "Hey founders"
- Use colons in headlines
- Restate the headline in the hook
- Start consecutive posts with the same opening pattern${lastCtaText ? `\n- Use "${lastCtaText}" as the CTA (it was just used in the last post)` : ""}`;

    const userPrompt = hasTopicalHooks
      ? `Create a NEWS-HOOKED FOUNDER POST.

Here are recent intelligence signals to use as potential hooks:

${topicalContext}

Pick the single most compelling signal for a founder-facing post. Use it as the opening hook, then plainly explain what shifted and what it changes for founders making capital decisions.

${recentAngles ? `AVOID these angles (already published recently):\n${recentAngles}\n` : ""}
${buildOutputInstructions(recentHooks)}`
      : `Create an EVERGREEN FOUNDER POST.

Use this angle as your starting point (but make it your own — don't just repeat it):
"${evergreenAngle}"

${recentAngles ? `AVOID these angles (already published recently):\n${recentAngles}\n` : ""}
${buildOutputInstructions(recentHooks)}`;

    // 5. Call AI for content
    let post: EditorialPost | null = null;
    if (OPENAI_API_KEY) {
      try {
        post = await generateOpenAIEditorialPost(OPENAI_API_KEY, systemPrompt, userPrompt);
      } catch (error) {
        if (error instanceof Error && error.message === "RATE_LIMIT") {
          return new Response(JSON.stringify({ error: "Rate limited — try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("OpenAI editorial generation error, using fallback:", error);
      }
    }

    if (!post) {
      post = buildFallbackEditorialPost({
        hasTopicalHooks: !!hasTopicalHooks,
        recentEntries: recentEntries || [],
        evergreenAngle,
      });
    }

    if (!post.headline || !post.hook || !post.summary || !post.why_it_matters || !post.founder_takeaway) {
      throw new Error("Editorial post generation returned incomplete content");
    }

    if (!post.cta_text || !post.cta_url) {
      const fallbackCta = selectCta(post.angle || post.headline);
      post.cta_text = fallbackCta.text;
      post.cta_url = fallbackCta.url;
    }

    const fallbackTemplatePost = buildFallbackEditorialPost({
      hasTopicalHooks: !!hasTopicalHooks,
      recentEntries: recentEntries || [],
      evergreenAngle,
    });

    if (!post.image_direction) {
      post.image_direction = fallbackTemplatePost.image_direction;
    }

    if (!post.hashtags || post.hashtags.length === 0) {
      post.hashtags = ["founders", "capitalstrategy", "businessgrowth"];
    }

    // 7. Generate image
    const slug = slugify(post.headline || "phoenix-editorial") + "-" + Date.now().toString(36);

    const imageResult = await generateEditorialImage(
      slug,
      {
        headline: post.headline || "",
        summary: post.summary || "",
        why_it_matters: post.why_it_matters || "",
        founder_takeaway: post.founder_takeaway || "",
        image_direction: post.image_direction || "",
      },
      supabase,
      OPENAI_API_KEY,
      PERPLEXITY_API_KEY,
    );

    // 8. Store in intelligence_entries
    const { data: inserted, error: insertError } = await supabase
      .from("intelligence_entries")
      .insert({
        headline: post.headline,
        slug,
        source: "Phoenix Editorial",
        editorial_category: post.post_type === "preferred-fit" ? "Capital Strategy" : "Founder Strategy",
        summary: post.summary,
        why_it_matters: post.why_it_matters,
        founder_takeaway: post.founder_takeaway,
        content_type: post.post_type,
        hook: post.hook,
        post_angle: post.angle,
        short_social_post: post.short_social_post,
        long_social_post: post.long_social_post,
        cta_text: post.cta_text,
        cta_url: post.cta_url,
        hashtags: post.hashtags || [],
        image_direction: post.image_direction,
        image_url: imageResult.url,
        image_source_type: imageResult.url ? "generated" : "pending",
        image_scene_id: imageResult.sceneId,
        image_prompt_used: imageResult.promptUsed ? imageResult.promptUsed.slice(0, 2000) : null,
        image_relevance_score: imageResult.url ? 0.9 : null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        post_type: post.post_type,
        headline: post.headline,
        slug,
        id: inserted.id,
        decision: hasTopicalHooks ? "topical" : "evergreen",
        image_generated: !!imageResult.url,
        image_url: imageResult.url,
        image_scene: imageResult.sceneId,
        image_generation: {
          finalStatus: imageResult.finalStatus,
          modelUsed: imageResult.modelUsed,
          attempts: imageResult.attempts.map(a => ({
            label: a.label,
            model: a.model,
            outcome: a.outcome,
            httpStatus: a.httpStatus,
            reason: a.validation?.reason,
            durationMs: a.durationMs,
          })),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("phoenix-editorial error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
