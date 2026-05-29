
# Variety + Structure Upgrade for Founder Intelligence Feed

## What's actually wrong (from your DB, not theory)

Looked at the last 14 days of `intelligence_entries`:

**Topic skew** — three categories dominate:
- AI Infrastructure: 168
- Venture Funding: 168
- Founder Strategy: 126
- Capital Market: 94, Growth Capital: 77
- Business Credit: 27, Regulatory: 11, Market Risk: 44

Your underweight categories (Business Credit, Regulatory, Invoice/Working Capital, Market Risk) are exactly the ones your audience — operators and small business owners — care most about. The feed currently reads like a VC newsletter, not a Phoenix-audience newsletter.

**Image scene repetition** — `founder-meeting` (26), `ops-floor` combos (35+), `retail-product` (23+) dominate. The anti-repetition window is the last 10 entries, but each run produces 10 articles, so the filter resets every cycle and the same scenes come back.

**Headline pattern fatigue** — nearly every recent headline uses the same em-dash construction: `"X — why smart operators…"`, `"Y — your move"`, `"Most founders are missing…"`. The Perplexity prompt literally gives those as examples, so it copies them.

**Source clumping** — Crunchbase News, Pulse2, SiliconANGLE keep appearing. Perplexity isn't told to spread across publications.

## What I'd change (no new API needed)

You don't need Perplexity for images — Perplexity is a search/answer API, not an image model. Lovable AI's `gemini-3.1-flash-image-preview` is the right tool for images. The variety problem is a **prompting + selection problem**, not a model problem.

### 1. Topic balancing in `founder-intelligence`

Replace the "find 10 stories on these topics" prompt with **explicit per-bucket targets** so each run guarantees mix:

```text
Return exactly 10 articles distributed across these buckets:
  2 × Capital & Credit (working capital, invoice factoring, business credit, SBA, lending shifts)
  2 × Founder Strategy & Operations (pricing, hiring, GTM, ops decisions)
  2 × Market & Regulatory (tariffs, regs, macro shifts that hit small/mid businesses)
  2 × Funding & Venture (seed/Series A, valuations, deal trends)
  1 × AI/Tech Infrastructure (only if it changes a founder's day-to-day)
  1 × Wildcard (real estate capital, supply chain, energy costs, anything genuinely useful)
```

Also pass `search_domain_filter` to spread sources and exclude noise:
- Bias toward: `bloomberg.com`, `wsj.com`, `forbes.com`, `inc.com`, `entrepreneur.com`, `axios.com`, `reuters.com`, `ft.com`, `cnbc.com`, `pitchbook.com`, `sba.gov`, `nfib.com`
- Down-weight repeats: pass `max_articles_per_source: 2` instruction so Crunchbase/Pulse2 don't dominate.

Bump `temperature` from `0.1` → `0.4` for more headline variety; raise `search_recency_filter` granularity ("week" stays, but add `search_after_date_filter` set to 7 days ago for tighter freshness).

### 2. Headline structure variety

Today the prompt gives 3 example headlines, all em-dash format. Replace with a **rotation rubric**:

```text
Each of the 10 headlines must use a DIFFERENT structural shape. Pick from:
  - Question hook ("What changed when...?")
  - Number-led ("3 lenders just dropped rates under 8%")
  - Quiet-shift framing ("A small SBA rule change is pulling forward...")
  - Direct advice ("Stop waiting on a term sheet — here's why")
  - Contrarian observation ("Everyone's chasing AI deals. The real story is...")
  - Plain-news clarity ("Working capital costs fell 30% this quarter")
  - Story/character lead ("One Texas operator just unlocked $400K in 9 days")
Do NOT use em-dash hook structure more than 2 times in 10 headlines.
Do NOT use the words "smart operators", "your move", or "missing" more than once total.
```

### 3. Scene rotation that actually works

The repetition bug: anti-repetition checks the last 10 entries, but each run inserts 10 fresh entries, so the next run sees only its own batch.

Fix:
- Expand the lookback window from **10 → 40 entries** (covers ~4 runs of history).
- Within a single run, also track scenes already used in *this batch* so two articles in the same run never share a scene.
- Add **6 new scene archetypes** weighted toward underrepresented categories: `farmers-market-stand`, `auto-shop-owner`, `dental-office-owner`, `legal-office-conference`, `e-commerce-packing-bench`, `solo-bookkeeper-home-office`. These match the SMB / Phoenix audience better than tech-loft scenes.

### 4. Source name diversity tracking

Add a soft constraint in the prompt: "No publication appears more than 2 times across the 10 articles." After parsing, log a warning if violated so we can tune.

### 5. RSS feed structure refinements (`market-intelligence-rss`)

Small but high-impact:
- Add `<itunes:summary>` and `<dc:creator>Phoenix Venture Studios</dc:creator>` for feed readers that prefer them.
- Add `<category>` tags **per bucket** (Capital, Strategy, Funding, etc.) instead of the renamed branded label only — improves discoverability in aggregators.
- Currently `watchNext` is stored in `featured_quote`; rename mapping in RSS to surface it as a labeled `<p>` so it doesn't read like a pull quote.
- Add `<atom:link rel="self">` self-reference (RSS validator best practice).
- Truncate `description` HTML to ~600 chars in the RSS so social previews don't get cut mid-word.

### 6. Logging so we can see what's working

Add a one-line summary log per run:
```
[founder-intel] 10 articles | buckets: capital=2 strategy=2 market=2 funding=2 ai=1 wild=1 | sources: 9 unique | scenes: 10 unique | headline-shapes: 7 unique
```

That gives us a real feedback loop instead of guessing.

## What you do NOT need

- **A custom Perplexity image API** — Perplexity doesn't generate images, it returns search results + grounded text. Image generation stays on Lovable AI's gemini-3.1-flash-image-preview (the model we just upgraded to).
- **A new RSS framework** — your current XML structure is solid; just add the missing namespaces and per-bucket categories.
- **Database changes** — all of this is prompt + selection logic in two edge functions.

## Files touched

- `supabase/functions/founder-intelligence/index.ts` — prompt rewrite, bucket targets, source filter, temperature bump, scene rotation fix, in-batch scene tracking, 6 new scene archetypes, headline-shape rotation rubric, run-summary logging.
- `supabase/functions/market-intelligence-rss/index.ts` — add `dc:creator`, `atom:link rel=self`, per-bucket `<category>` tags, description truncation, surface `watchNext` as labeled paragraph.

Untouched: phoenix-editorial pipeline, og-share, share button, image validation/retry/credits logic, database schema.

## Open question for you

The bucket targets above are my best read of your audience. **Want to adjust the mix?** Three quick options:

- **A) Operator-heavy** (what I proposed): Capital 2 / Strategy 2 / Market 2 / Funding 2 / AI 1 / Wildcard 1
- **B) Capital-first**: Capital 3 / Strategy 2 / Market 2 / Funding 2 / AI 1
- **C) Keep current AI/funding tilt but add diversity**: Funding 2 / AI 2 / Strategy 2 / Capital 2 / Market 1 / Regulatory 1

Tell me which (or your own ratio) when you approve, and I'll bake it in.
