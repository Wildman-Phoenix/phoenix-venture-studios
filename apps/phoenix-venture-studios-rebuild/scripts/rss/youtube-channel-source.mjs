// Public channel metadata only. No playback, private API, transcript, or cookies.
function initialData(html) {
  const marker = /(?:var\s+ytInitialData\s*=|window\["ytInitialData"\]\s*=)\s*/.exec(html);
  if (!marker) throw new Error("Official channel page has no public initial metadata");
  const start = marker.index + marker[0].length;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(html.slice(start, i + 1));
  }
  throw new Error("Incomplete public channel metadata");
}

function relativeDate(label, now) {
  const match = String(label).match(/^(\d+)\s*(minute|hour|day|week|month|year)s?\s+ago$/i);
  if (!match) return "";
  const unit = { minute: 60, hour: 3600, day: 86400, week: 604800, month: 2678400, year: 31622400 }[match[2].toLowerCase()];
  return new Date(now.getTime() - Number(match[1]) * unit * 1000).toISOString();
}

export function parsePublicYoutubeChannel(html, source, now = new Date()) {
  const expectedChannel = new URL(source.url).searchParams.get("channel_id");
  const data = initialData(html);
  if (!expectedChannel || data.metadata?.channelMetadataRenderer?.externalId !== expectedChannel) {
    throw new Error("Official fallback channel identity does not match the configured feed");
  }
  const found = new Map();
  const add = (id, title, publishedLabel) => {
    if (!/^[\w-]{11}$/.test(id || "") || !title || found.has(id)) return;
    found.set(id, {
      title, url: `https://www.youtube.com/watch?v=${id}`, description: "",
      publishedAt: relativeDate(publishedLabel, now),
      sourcePublishedLabel: publishedLabel || "",
      publishedAtPrecision: "approximate-channel-label",
      imageUrl: "", sourceImageUrl: "", sourceSurface: "youtube",
      ingestionSurface: "official-channel-page", requiresCorroboration: true,
    });
  };
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.videoRenderer) {
      const v = node.videoRenderer;
      add(v.videoId, v.title?.runs?.map((r) => r.text).join(""), v.publishedTimeText?.simpleText);
    }
    if (node.lockupViewModel?.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
      const v = node.lockupViewModel, m = v.metadata?.lockupMetadataViewModel;
      const parts = m?.metadata?.contentMetadataViewModel?.metadataRows?.flatMap((r) => r.metadataParts || []) || [];
      const label = parts.map((p) => p.accessibilityLabel || p.text?.content || "").find((s) => /ago$/i.test(s));
      add(v.contentId, m?.title?.content, label);
    }
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  };
  // Only the selected channel content, excluding recommendations and menus.
  walk(data.contents);
  const items = [...found.values()].slice(0, source.limit || 10);
  if (!items.length) throw new Error("Official channel metadata has no extractable videos");
  return items;
}
