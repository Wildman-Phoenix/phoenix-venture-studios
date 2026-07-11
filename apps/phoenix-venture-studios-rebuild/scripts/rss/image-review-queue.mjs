function normalizeMetricValue(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function metricVector(entry = {}) {
  const metrics = entry.metrics || entry.imageAudit || {};
  const bestComposition = metrics.bestComposition || {};
  return {
    colorfulness: normalizeMetricValue(metrics.colorfulness),
    sharpness: normalizeMetricValue(metrics.sharpness),
    luminanceStdDev: normalizeMetricValue(metrics.luminanceStdDev),
    readability: normalizeMetricValue(bestComposition.readability ?? metrics.readability),
  };
}

function metricDistance(left = {}, right = {}) {
  return Math.sqrt(
    ((normalizeMetricValue(left.colorfulness) - normalizeMetricValue(right.colorfulness)) / 24) ** 2 +
    ((normalizeMetricValue(left.sharpness) - normalizeMetricValue(right.sharpness)) / 16) ** 2 +
    ((normalizeMetricValue(left.luminanceStdDev) - normalizeMetricValue(right.luminanceStdDev)) / 24) ** 2 +
    ((normalizeMetricValue(left.readability) - normalizeMetricValue(right.readability)) / 0.24) ** 2
  );
}

function buildFallbackDiagnosis(item = {}) {
  const holdReason = String(item.holdReason || "");
  if (holdReason.includes("validation-failed")) {
    return {
      notes: ["The source image failed the visual cover audit."],
      fixes: ["Use a more relevant or cleaner image with stronger focal clarity and better headline space."],
    };
  }
  if (holdReason.includes("reused-recently")) {
    return {
      notes: ["The current image is too similar to a recently published cover."],
      fixes: ["Change the scene, framing, or source image so the new cover reads as distinct."],
    };
  }
  return {
    notes: ["This story still needs a Phoenix-ready replacement image."],
    fixes: ["Create a story-specific image that matches the article and leaves clean negative space for the title."],
  };
}

function reviewModeForHeldItem(item = {}) {
  if (String(item.holdReason || "").includes("allowlisted-source")) return "source-image";
  return "phoenix-owned";
}

function shortlistExamples(heldItem = {}, reviewMemory = [], outcome = "approved", limit = 3) {
  const lane = heldItem.sceneLane || "general";
  const mode = reviewModeForHeldItem(heldItem);
  const targetVector = metricVector(heldItem);
  const filtered = (Array.isArray(reviewMemory) ? reviewMemory : [])
    .filter((entry) =>
      entry &&
      entry.sceneLane === lane &&
      entry.reviewMode === mode &&
      entry.outcome === outcome
    )
    .map((entry) => ({
      title: entry.title,
      originalUrl: entry.originalUrl,
      sourceName: entry.sourceName,
      imageFingerprint: entry.imageFingerprint,
      holdReason: entry.holdReason || "",
      distance: Number(metricDistance(targetVector, metricVector(entry)).toFixed(3)),
      metrics: entry.metrics || {},
    }))
    .sort((left, right) => left.distance - right.distance);

  return filtered.slice(0, limit);
}

function buildNextPromptGuide(item = {}, diagnosis = {}, nearestApproved = []) {
  const imageBrief = item.imageBrief || {};
  const base = [
    `Story: ${item.title || "Founder Signal"}`,
    imageBrief.storySubject ? `Subject: ${imageBrief.storySubject}` : "",
    imageBrief.visualMetaphor ? `Visual direction: ${imageBrief.visualMetaphor}` : "",
    imageBrief.sceneLane ? `Lane: ${imageBrief.sceneLane}` : "",
    diagnosis.fixes?.length ? `Fixes: ${diagnosis.fixes.join(" ")}` : "",
    nearestApproved.length
      ? `What works in this lane: ${nearestApproved.map((example) => example.title).join(" | ")}`
      : "",
    "Keep Phoenix Venture Studios attribution visible on the final cover.",
  ].filter(Boolean);

  return base.join(" ");
}

export function buildImageReviewQueue(reports = [], reviewMemory = [], options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const queueItems = [];

  for (const report of Array.isArray(reports) ? reports : []) {
    for (const item of report.heldItems || []) {
      const diagnosis = item.imageAudit
        ? {
            notes: item.imageAudit.editorialNotes || [],
            fixes: item.imageAudit.recommendedFixes || [],
          }
        : buildFallbackDiagnosis(item);
      const nearestApproved = shortlistExamples(item, reviewMemory, "approved");
      const nearestRejected = shortlistExamples(item, reviewMemory, "rejected");
      queueItems.push({
        feedId: report.feedId,
        slug: item.slug,
        title: item.title,
        rawTitle: item.rawTitle || item.title,
        reviewTitle: item.reviewTitle || item.title,
        topicLabel: item.topicLabel || item.bucketLabel || "",
        whySelected: item.whySelected || "",
        sourceName: item.sourceName,
        sourceSurface: item.sourceSurface || "",
        sourceUrl: item.sourceUrl,
        sourceImageUrl: item.sourceImageUrl || "",
        sourceImagePolicy: item.sourceImagePolicy,
        originalUrl: item.originalUrl || item.sourceUrl || "",
        researchCitations: item.researchCitations || [],
        imageDecision: item.imageDecision || "",
        imageDiagnosticReason: item.imageDiagnosticReason || "",
        imageDiagnostic: item.imageDiagnostic || {},
        holdReason: item.holdReason,
        expectedArticleImagePath: item.expectedArticleImagePath,
        sceneLane: item.sceneLane,
        sceneMotif: item.sceneMotif,
        imageStrategy: item.imageStrategy,
        imageSourceType: item.imageSourceType,
        imageFingerprint: item.imageFingerprint,
        score: item.score,
        bucket: item.bucket,
        bucketLabel: item.bucketLabel,
        publishedAt: item.publishedAt,
        simpleSummary: item.simpleSummary || "",
        trendContext: item.trendContext || "",
        engagementPrompt: item.engagementPrompt || "",
        imageBrief: item.imageBrief || null,
        imageAudit: item.imageAudit || null,
        imageCorrectionTrail: item.imageCorrectionTrail || [],
        diagnosis,
        nearestApprovedExamples: nearestApproved,
        nearestRejectedExamples: nearestRejected,
        nextPromptGuide: buildNextPromptGuide(item, diagnosis, nearestApproved),
      });
    }
  }

  return {
    generatedAt,
    totalHeld: queueItems.length,
    items: queueItems.sort((left, right) => Number(right.score || 0) - Number(left.score || 0)),
  };
}
