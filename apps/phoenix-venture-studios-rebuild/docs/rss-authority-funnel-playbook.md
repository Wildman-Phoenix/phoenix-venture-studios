# RSS Authority Funnel Playbook

Use this playbook when changing Phoenix RSS feeds, social-post output, signal cards, or future RSS-powered content systems.

## Operating Contract

- Keep public RSS links on Phoenix-owned signal URLs under `/founder-signal/signals/:slug/`.
- Preserve publisher URLs only as source/original links.
- Keep public images Phoenix-owned/generated unless the source image policy is explicitly `allowed`.
- Preserve previous valid RSS output if generation, validation, image rendering, or deployment fails.
- Do not publish feed output that exposes internal labels, image policy details, scoring metadata, or production/debug language.
- Use `/rss/social.xml` or `/rss/tools-social.xml` for GoHighLevel auto-posting; these queues expose one item at a time.

## Social Copy Shape

Every RSS item description should read like a post a person would publish:

1. Hook: one opening line that frames the story.
2. Story: what happened, in plain language.
3. Context: what the shift means for founders, builders, operators, or beginners.
4. Watch point: one forward-looking signal.
5. Link: `Read the full Phoenix Founder Signal:` plus the Phoenix-owned URL.
6. Hashtags: 3-6 context-specific tags based on companies, tools, market, and topic.

Never expose labels like `Phoenix brief`, `Why it matters`, `Founder takeaway`, `Trend to watch`, `Engagement`, `Phoenix bucket`, or `Source` in public post copy.

## Image Rules

- The card is the branded wrapper; the image underneath must be relevant to the specific story.
- Do not rotate ten generic office/boardroom scenes just to create variety.
- If a publisher image is explicitly allowlisted and visually relevant, it can be wrapped into a Phoenix-generated card.
- If a publisher image is not allowlisted, use it only as private reference context.
- Preferred fallback is article-specific Phoenix-owned art at `public/images/signals/source-art/:slug.jpg`.
- Generic Phoenix backgrounds are emergency fallbacks and must produce warnings.
- Autonomous publishing should run with `PHOENIX_RSS_REQUIRE_ARTICLE_IMAGES=1` or `PHOENIX_RSS_IMAGE_MODE=article-or-hold` so weak generic imagery holds the run instead of updating the feed.

## Validation Gate

Before publishing or deploying:

- Run RSS tests.
- Generate RSS with the intended site URL.
- Validate XML/JSON artifacts, Phoenix-owned links, generated images, image policy warnings, and article-image mode.
- Inspect at least one GoHighLevel-style post body for natural flow and relevant hashtags.
- Confirm social queue feeds contain exactly one item before connecting them to social channels.
- Publish/deploy only after validation passes. If validation fails, preserve the last valid output.

## Reuse For New Feeds

For another brand or subject matter, duplicate the pattern rather than the exact copy:

- Define feed promise, audience, source list, and scoring themes.
- Define social-copy tone and forbidden public labels.
- Define image rights policy and article-specific image generation rules.
- Add tests for one representative post per major topic.
- Start with manual review, then move to scheduled publishing after the output is consistently clean.
