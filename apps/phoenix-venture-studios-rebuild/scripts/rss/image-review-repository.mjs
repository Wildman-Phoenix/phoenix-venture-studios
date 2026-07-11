function safeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function average(entries = [], key) {
  if (!entries.length) return 0;
  return entries.reduce((sum, entry) => sum + safeNumber(entry.metrics?.[key]), 0) / entries.length;
}

function topReasons(entries = [], limit = 5) {
  const counts = new Map();
  for (const entry of entries) {
    const reason = String(entry.holdReason || "").trim();
    if (!reason) continue;
    counts.set(reason, (counts.get(reason) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([reason, count]) => ({ reason, count }));
}

function topStrings(entries = [], selector, limit = 5) {
  const counts = new Map();
  for (const entry of entries) {
    for (const value of selector(entry) || []) {
      const key = String(value || "").trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function summarizeGroup(entries = []) {
  const approved = entries.filter((entry) => entry.outcome === "approved");
  const rejected = entries.filter((entry) => entry.outcome === "rejected");
  return {
    total: entries.length,
    approved: approved.length,
    rejected: rejected.length,
    averageApprovedMetrics: approved.length ? {
      colorfulness: Number(average(approved, "colorfulness").toFixed(2)),
      sharpness: Number(average(approved, "sharpness").toFixed(2)),
      luminanceStdDev: Number(average(approved, "luminanceStdDev").toFixed(2)),
      readability: Number(average(approved, "readability").toFixed(3)),
    } : null,
    averageRejectedMetrics: rejected.length ? {
      colorfulness: Number(average(rejected, "colorfulness").toFixed(2)),
      sharpness: Number(average(rejected, "sharpness").toFixed(2)),
      luminanceStdDev: Number(average(rejected, "luminanceStdDev").toFixed(2)),
      readability: Number(average(rejected, "readability").toFixed(3)),
    } : null,
    commonRejectionReasons: topReasons(rejected),
    commonEditorialNotes: topStrings(entries, (entry) => entry.editorialNotes, 6),
    commonRecommendedFixes: topStrings(entries, (entry) => entry.recommendedFixes, 6),
    strongestApprovedExamples: approved.slice(-3).map((entry) => ({
      title: entry.title,
      sourceName: entry.sourceName,
      originalUrl: entry.originalUrl,
      imageFingerprint: entry.imageFingerprint,
      editorialModelReview: entry.editorialModelReview || null,
    })),
  };
}

export function buildImageReviewRepository(reviewMemory = [], options = {}) {
  const entries = Array.isArray(reviewMemory?.entries) ? reviewMemory.entries : Array.isArray(reviewMemory) ? reviewMemory : [];
  const byLane = new Map();

  for (const entry of entries) {
    const lane = entry.sceneLane || "general";
    const mode = entry.reviewMode || "source-image";
    const key = `${lane}::${mode}`;
    if (!byLane.has(key)) {
      byLane.set(key, { sceneLane: lane, reviewMode: mode, entries: [] });
    }
    byLane.get(key).entries.push(entry);
  }

  return {
    generatedAt: options.generatedAt || new Date().toISOString(),
    totalEntries: entries.length,
    groups: Array.from(byLane.values())
      .map((group) => ({
        sceneLane: group.sceneLane,
        reviewMode: group.reviewMode,
        ...summarizeGroup(group.entries),
      }))
      .sort((left, right) => right.total - left.total),
  };
}
