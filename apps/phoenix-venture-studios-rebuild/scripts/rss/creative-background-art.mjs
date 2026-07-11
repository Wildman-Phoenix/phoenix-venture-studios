const WIDTH = 1200;
const HEIGHT = 630;

function escapeSvg(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sceneSeed(scene = "") {
  return [...scene].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 2166136261);
}

function sharedDefs({ accent = "#ff7a1a", secondary = "#22d3ee" } = {}) {
  return `
    <defs>
      <radialGradient id="coreGlow" cx="62%" cy="45%" r="58%">
        <stop offset="0" stop-color="${escapeSvg(accent)}" stop-opacity="0.44"/>
        <stop offset="0.42" stop-color="${escapeSvg(accent)}" stop-opacity="0.12"/>
        <stop offset="1" stop-color="${escapeSvg(accent)}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="coolGlow" cx="84%" cy="12%" r="68%">
        <stop offset="0" stop-color="${escapeSvg(secondary)}" stop-opacity="0.24"/>
        <stop offset="0.5" stop-color="${escapeSvg(secondary)}" stop-opacity="0.08"/>
        <stop offset="1" stop-color="${escapeSvg(secondary)}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="field" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#03070d"/>
        <stop offset="0.46" stop-color="#081827"/>
        <stop offset="1" stop-color="#0d1014"/>
      </linearGradient>
      <linearGradient id="emberLine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${escapeSvg(accent)}" stop-opacity="0"/>
        <stop offset="0.48" stop-color="${escapeSvg(accent)}" stop-opacity="0.95"/>
        <stop offset="1" stop-color="${escapeSvg(secondary)}" stop-opacity="0.42"/>
      </linearGradient>
      <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="9" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.16"/>
        </feComponentTransfer>
      </filter>
      <clipPath id="frame">
        <rect width="${WIDTH}" height="${HEIGHT}" rx="0"/>
      </clipPath>
    </defs>
  `;
}

function dots(scene, count, options = {}) {
  const rand = mulberry32(sceneSeed(scene));
  const accent = options.accent || "#ff7a1a";
  const secondary = options.secondary || "#22d3ee";
  const minY = options.minY ?? 70;
  const maxY = options.maxY ?? 560;
  const minR = options.minR ?? 1.6;
  const maxR = options.maxR ?? 5.8;
  const opacity = options.opacity ?? 0.52;

  return Array.from({ length: count }, () => {
    const x = Math.round(rand() * WIDTH);
    const y = Math.round(minY + rand() * (maxY - minY));
    const r = (minR + rand() * (maxR - minR)).toFixed(1);
    const fill = rand() > 0.68 ? secondary : accent;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${escapeSvg(fill)}" opacity="${(opacity * (0.45 + rand() * 0.75)).toFixed(2)}" filter="url(#softGlow)"/>`;
  }).join("\n");
}

function aiRiskSignalGrid(config) {
  const accent = config.accent || "#ff6a1f";
  const secondary = config.secondary || "#00b8ff";
  const rand = mulberry32(sceneSeed("ai-risk-signal-grid"));
  const grid = Array.from({ length: 11 }, (_, index) => {
    const x = 104 + index * 96;
    const opacity = 0.08 + (index % 3) * 0.035;
    return `
      <path d="M${x} 58 L${x + 42} 572" stroke="${escapeSvg(index % 2 ? secondary : accent)}" stroke-width="1.4" opacity="${opacity.toFixed(2)}"/>
      <path d="M38 ${86 + index * 42} L1138 ${42 + index * 24}" stroke="${escapeSvg(index % 2 ? accent : secondary)}" stroke-width="1" opacity="${(opacity * 0.72).toFixed(2)}"/>
    `;
  }).join("\n");
  const shards = Array.from({ length: 16 }, (_, index) => {
    const x = 154 + rand() * 820;
    const y = 92 + rand() * 406;
    const w = 38 + rand() * 116;
    const h = 18 + rand() * 72;
    const rotate = -18 + rand() * 36;
    const color = index % 2 ? secondary : accent;
    return `
      <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate.toFixed(1)})" opacity="${(0.16 + rand() * 0.22).toFixed(2)}">
        <rect width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="10" fill="#0c2230" stroke="${escapeSvg(color)}" stroke-opacity="0.46"/>
        <path d="M10 ${h * 0.55} C ${w * 0.36} ${h * 0.18}, ${w * 0.52} ${h * 0.86}, ${w - 12} ${h * 0.34}" fill="none" stroke="${escapeSvg(color)}" stroke-width="2" opacity="0.62"/>
      </g>
    `;
  }).join("\n");

  return `
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#field)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#coolGlow)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#coreGlow)" opacity="0.86"/>
    <g>${grid}</g>
    <path d="M-80 474 C 124 386 248 530 390 360 S 594 168 742 286 S 916 520 1280 202" fill="none" stroke="url(#emberLine)" stroke-width="7" opacity="0.72" filter="url(#softGlow)"/>
    <path d="M66 552 C 240 474 382 548 536 424 S 812 314 1130 380" fill="none" stroke="${escapeSvg(secondary)}" stroke-width="2.4" opacity="0.36"/>
    <g filter="url(#softGlow)">${shards}</g>
    <circle cx="626" cy="306" r="44" fill="${escapeSvg(accent)}" opacity="0.64" filter="url(#softGlow)"/>
    <circle cx="626" cy="306" r="9" fill="#fff8ef" opacity="0.78"/>
    ${dots("ai-risk-signal-grid-dots", 96, { accent, secondary, minY: 56, maxY: 568, opacity: 0.42 })}
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#01050a" opacity="0.24"/>
    <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#grain)" opacity="0.42"/>
  `;
}

function marketVolatilityCanyon(config) {
  const accent = config.accent || "#ff5a1f";
  const secondary = config.secondary || "#00d4ff";
  const rand = mulberry32(sceneSeed("market-volatility-canyon"));
  const ribbons = Array.from({ length: 7 }, (_, index) => {
    const baseY = 382 + index * 16;
    const points = Array.from({ length: 11 }, (_point, pointIndex) => {
      const x = -60 + pointIndex * 134;
      const y = baseY - Math.sin(pointIndex * 0.92 + index) * (44 + index * 4) - rand() * 48;
      return `${x.toFixed(0)},${y.toFixed(0)}`;
    }).join(" ");
    const color = index % 3 === 0 ? secondary : accent;
    return `<polyline points="${points}" fill="none" stroke="${escapeSvg(color)}" stroke-width="${index === 2 ? 4.2 : 1.8}" opacity="${(0.18 + index * 0.08).toFixed(2)}" filter="url(#softGlow)"/>`;
  }).join("\n");

  const bars = Array.from({ length: 22 }, (_, index) => {
    const x = 70 + index * 50;
    const h = 60 + rand() * 230;
    const y = 504 - h;
    return `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="18" height="${h.toFixed(0)}" rx="9" fill="${index % 2 ? secondary : accent}" opacity="${(0.08 + rand() * 0.16).toFixed(2)}"/>`;
  }).join("\n");

  return `
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#field)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#coolGlow)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#coreGlow)"/>
    <g opacity="0.72" transform="perspective(700)">
      ${bars}
      ${ribbons}
    </g>
    <path d="M-40 456 C 144 402 235 520 374 386 S 617 252 740 338 S 958 512 1260 248" fill="none" stroke="url(#emberLine)" stroke-width="7" opacity="0.82" filter="url(#softGlow)"/>
    <path d="M54 546 C 248 478 360 556 510 442 S 774 312 904 396 S 1054 436 1234 314" fill="none" stroke="${escapeSvg(secondary)}" stroke-width="2" opacity="0.42"/>
    ${dots("market-volatility-canyon-dots", 70, { accent, secondary, minY: 188, maxY: 540, opacity: 0.52 })}
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#02060b" opacity="0.2"/>
    <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#grain)" opacity="0.42"/>
  `;
}

function attentionFilterPrism(config) {
  const accent = config.accent || "#22d3ee";
  const secondary = config.secondary || "#ff8a1f";
  const rings = Array.from({ length: 8 }, (_, index) => {
    const r = 70 + index * 34;
    return `<circle cx="338" cy="314" r="${r}" fill="none" stroke="${index % 2 ? secondary : accent}" stroke-width="${index === 2 ? 3 : 1.4}" opacity="${(0.46 - index * 0.038).toFixed(2)}"/>`;
  }).join("\n");
  const scanBars = Array.from({ length: 18 }, (_, index) => {
    const x = 520 + index * 38;
    const y = 92 + (index % 5) * 68;
    return `<rect x="${x}" y="${y}" width="${18 + (index % 4) * 18}" height="5" rx="2.5" fill="${index % 2 ? secondary : accent}" opacity="${0.18 + (index % 4) * 0.08}"/>`;
  }).join("\n");

  return `
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#field)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#coolGlow)"/>
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#coreGlow)" opacity="0.72"/>
    <g transform="translate(0 0)" filter="url(#softGlow)">
      ${rings}
      <path d="M338 314 L980 118 L1120 322 L986 522 Z" fill="${escapeSvg(accent)}" opacity="0.12"/>
      <path d="M338 314 L972 170" stroke="${escapeSvg(accent)}" stroke-width="4" opacity="0.74"/>
      <path d="M338 314 L1080 326" stroke="${escapeSvg(secondary)}" stroke-width="4" opacity="0.64"/>
      <path d="M338 314 L956 504" stroke="#fff8ef" stroke-width="2" opacity="0.44"/>
    </g>
    ${scanBars}
    <path d="M-40 326 C 118 300 224 362 358 318 S 602 236 774 304 S 1024 410 1250 266" fill="none" stroke="url(#emberLine)" stroke-width="5" opacity="0.62" filter="url(#softGlow)"/>
    ${dots("attention-filter-prism-dots", 84, { accent, secondary, minY: 72, maxY: 560, opacity: 0.42 })}
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#01050a" opacity="0.22"/>
    <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#grain)" opacity="0.4"/>
  `;
}

function aiBuildSprintFlow(config) {
  const accent = config.accent || "#00d4ff";
  const secondary = config.secondary || "#ff8a1f";
  const lanes = Array.from({ length: 5 }, (_, index) => {
    const y = 148 + index * 70;
    const offset = index * 34;
    return `
      <path d="M${80 + offset} ${y} L${680 + offset} ${y - 70} L${1090 + offset} ${y + 18}" fill="none" stroke="${index % 2 ? secondary : accent}" stroke-width="${index === 2 ? 5 : 2.2}" opacity="${0.25 + index * 0.08}" filter="url(#softGlow)"/>
      <rect x="${230 + offset}" y="${y - 42}" width="116" height="44" rx="14" fill="#0d2634" stroke="${index % 2 ? secondary : accent}" stroke-opacity="0.38" opacity="0.78"/>
      <rect x="${502 + offset}" y="${y - 72}" width="142" height="50" rx="16" fill="#0b1d2d" stroke="${index % 2 ? accent : secondary}" stroke-opacity="0.42" opacity="0.78"/>
      <circle cx="${690 + offset}" cy="${y - 68}" r="10" fill="${index % 2 ? secondary : accent}" filter="url(#softGlow)" opacity="0.82"/>
    `;
  }).join("\n");
  const blocks = Array.from({ length: 18 }, (_, index) => {
    const x = 86 + (index % 6) * 162;
    const y = 92 + Math.floor(index / 6) * 142;
    return `<rect x="${x}" y="${y}" width="${76 + (index % 3) * 22}" height="8" rx="4" fill="${index % 2 ? secondary : accent}" opacity="${0.12 + (index % 4) * 0.08}"/>`;
  }).join("\n");

  return `
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#field)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#coolGlow)"/>
    <path d="M60 560 L488 188 L1140 92" fill="none" stroke="${escapeSvg(accent)}" stroke-width="1.2" opacity="0.18"/>
    <path d="M122 596 L598 214 L1220 142" fill="none" stroke="${escapeSvg(secondary)}" stroke-width="1.2" opacity="0.18"/>
    ${blocks}
    ${lanes}
    <path d="M-20 516 C 198 438 320 530 520 408 S 838 218 1210 292" fill="none" stroke="url(#emberLine)" stroke-width="6" opacity="0.72" filter="url(#softGlow)"/>
    <path d="M106 468 C 260 392 400 476 556 362 S 818 304 1034 202" fill="none" stroke="${escapeSvg(accent)}" stroke-width="2" opacity="0.38"/>
    ${dots("ai-build-sprint-flow-dots", 68, { accent, secondary, minY: 76, maxY: 552, opacity: 0.4 })}
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#01050a" opacity="0.18"/>
    <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#grain)" opacity="0.34"/>
  `;
}

const SCENES = {
  ai_risk_signal_grid: aiRiskSignalGrid,
  market_volatility_canyon: marketVolatilityCanyon,
  attention_filter_prism: attentionFilterPrism,
  ai_build_sprint_flow: aiBuildSprintFlow,
};

export function renderCreativeBackground(scene, config = {}) {
  const renderer = SCENES[scene];
  if (!renderer) return null;
  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${sharedDefs(config)}
      <g clip-path="url(#frame)">
        ${renderer(config)}
      </g>
    </svg>
  `);
}
