import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FALLBACK_FILE = "sphere.glb";
const FALLBACK_DESCRIPTION =
  "No exact model was found, so a generic object was loaded as a placeholder.";
const FALLBACK_MATCH = {
  confidence: 0,
  matchedKeywords: [],
  category: "Fallback",
  reason: "No matching asset was found."
};
const MATCH_THRESHOLD = 45;
const CONFIDENCE_MAX_SCORE = 260;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "asset",
  "for",
  "give",
  "i",
  "in",
  "item",
  "me",
  "model",
  "need",
  "object",
  "of",
  "please",
  "random",
  "show",
  "some",
  "the",
  "thing",
  "to",
  "unknown",
  "with"
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const libraryDir = path.resolve(__dirname, "..", "public", "assets", "library");
const indexPath = path.join(libraryDir, "index.json");

let cachedLibrary = null;

export function assetFilePath(file) {
  return path.join(libraryDir, file);
}

export function assetFileIsUsable(file) {
  try {
    const stat = fs.statSync(assetFilePath(file));
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

export function getAssetLibrary() {
  if (cachedLibrary) return cachedLibrary;

  const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("public/assets/library/index.json must be an array.");
  }

  cachedLibrary = parsed
    .filter((asset) => {
      return (
        asset &&
        typeof asset.id === "string" &&
        typeof asset.label === "string" &&
        typeof asset.file === "string" &&
        Array.isArray(asset.keywords) &&
        typeof asset.description === "string"
      );
    })
    .map((asset) => ({
      ...asset,
      category: typeof asset.category === "string" && asset.category.trim() ? asset.category.trim() : "General"
    }));

  return cachedLibrary;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(token) {
  const value = normalizeText(token);
  if (value.length > 4 && value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.length > 3 && value.endsWith("s")) return value.slice(0, -1);
  return value;
}

function tokens(value, { keepStopWords = false } = {}) {
  return normalizeText(value)
    .split(" ")
    .map(normalizeToken)
    .filter((token) => token && (keepStopWords || !STOP_WORDS.has(token)));
}

function tokenSet(value, options) {
  return new Set(tokens(value, options));
}

function addMatch(matches, value) {
  const clean = String(value || "").trim();
  if (!clean) return;
  if (!matches.some((match) => match.toLowerCase() === clean.toLowerCase())) {
    matches.push(clean);
  }
}

function hasPhrase(haystack, needle) {
  if (!haystack || !needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function formatReason(reasons) {
  const items = [...reasons];
  if (!items.length) return "No useful prompt terms matched this asset.";
  if (items.length === 1) return `Prompt matched asset ${items[0]}.`;
  return `Prompt matched asset ${items.slice(0, -1).join(", ")}, and ${items.at(-1)}.`;
}

function scoreAsset(asset, prompt) {
  const normalizedPrompt = normalizeText(prompt);
  const compactPrompt = tokens(prompt).join(" ");
  if (!normalizedPrompt || !compactPrompt) {
    return {
      score: 0,
      matchedKeywords: [],
      category: asset.category || "General",
      reason: "Prompt did not contain enough searchable text."
    };
  }

  const promptTokens = tokenSet(prompt);
  const matchedKeywords = [];
  const reasons = new Set();
  let score = 0;

  function scorePhrase(term, weights, label, displayTerm = term) {
    const reasonLabel = label === "keyword" ? "keywords" : label === "id" ? "id" : label;
    const normalizedTerm = normalizeText(term);
    const compactTerm = tokens(term).join(" ");
    if (!normalizedTerm) return;
    if (!compactTerm) return;

    if (compactPrompt === compactTerm || normalizedPrompt === normalizedTerm) {
      score += weights.exact;
      addMatch(matchedKeywords, displayTerm);
      reasons.add(reasonLabel);
      return;
    }

    if (hasPhrase(compactPrompt, compactTerm) || hasPhrase(normalizedPrompt, normalizedTerm)) {
      score += weights.contains;
      addMatch(matchedKeywords, displayTerm);
      reasons.add(reasonLabel);
      return;
    }

    const termTokens = tokenSet(term);
    let overlap = 0;
    for (const termToken of termTokens) {
      if (promptTokens.has(termToken)) overlap += 1;
    }

    if (overlap > 0) {
      score += Math.min(weights.tokenCap, overlap * weights.token);
      if (overlap === termTokens.size || termTokens.size === 1) addMatch(matchedKeywords, displayTerm);
      reasons.add(reasonLabel);
    }
  }

  scorePhrase(asset.label, { exact: 120, contains: 85, token: 22, tokenCap: 55 }, "label");
  scorePhrase(asset.id, { exact: 105, contains: 75, token: 18, tokenCap: 45 }, "id", asset.label);

  for (const keyword of asset.keywords || []) {
    scorePhrase(keyword, { exact: 95, contains: 72, token: 18, tokenCap: 42 }, "keyword");
  }

  const category = asset.category || "General";
  const normalizedCategory = normalizeText(category);
  if (normalizedCategory && normalizedCategory !== "fallback") {
    const compactCategory = tokens(category).join(" ");
    if (compactPrompt === compactCategory || hasPhrase(normalizedPrompt, normalizedCategory)) {
      score += 24;
      addMatch(matchedKeywords, category);
      reasons.add("category");
    } else {
      const categoryTokens = tokenSet(category);
      const categoryOverlap = [...categoryTokens].filter((token) => promptTokens.has(token)).length;
      if (categoryOverlap > 0) {
        score += Math.min(18, categoryOverlap * 12);
        addMatch(matchedKeywords, category);
        reasons.add("category token");
      }
    }
  }

  const descriptionTokens = tokenSet(asset.description);
  const descriptionOverlap = [...promptTokens].filter((token) => descriptionTokens.has(token)).length;
  if (descriptionOverlap > 0) {
    score += Math.min(14, descriptionOverlap * 3);
    reasons.add("description terms");
  }

  return {
    score,
    matchedKeywords,
    category,
    reason: formatReason(reasons)
  };
}

function buildMatchMetadata(scored, source, fallbackCategory = "Fallback") {
  if (source === "fallback" || !scored) {
    return { ...FALLBACK_MATCH, category: fallbackCategory || "Fallback" };
  }

  return {
    confidence: Number(Math.min(1, scored.score / CONFIDENCE_MAX_SCORE).toFixed(2)),
    matchedKeywords: scored.matchedKeywords,
    category: scored.category,
    reason: scored.reason
  };
}

export function getAvailableAssets() {
  return getAssetLibrary().filter((asset) => assetFileIsUsable(asset.file));
}

export function resolvePromptToAsset(prompt) {
  const cleanPrompt = String(prompt || "").trim() || "unknown prompt";
  const availableAssets = getAvailableAssets();
  const fallback =
    availableAssets.find((asset) => asset.file === FALLBACK_FILE) ||
    availableAssets[0] || {
      id: "sphere",
      label: "Sphere",
      file: FALLBACK_FILE,
      category: "Fallback",
      keywords: ["sphere", "fallback"],
      description: FALLBACK_DESCRIPTION
    };

  let best = null;
  let bestScored = null;

  for (const asset of availableAssets) {
    const scored = scoreAsset(asset, cleanPrompt);
    if (!bestScored || scored.score > bestScored.score) {
      best = asset;
      bestScored = scored;
    }
  }

  const matched = best && bestScored && bestScored.score >= MATCH_THRESHOLD ? best : null;
  return {
    prompt: cleanPrompt,
    asset: matched || fallback,
    source: matched ? "static-library" : "fallback",
    match: buildMatchMetadata(matched ? bestScored : null, matched ? "static-library" : "fallback", fallback.category)
  };
}

export function buildModelResponse(prompt) {
  const result = resolvePromptToAsset(prompt);
  const file = result.asset?.file || FALLBACK_FILE;

  return {
    ok: true,
    prompt: result.prompt,
    model: {
      url: `/assets/library/${file}`,
      file,
      source: result.source
    },
    description: result.source === "fallback" ? FALLBACK_DESCRIPTION : result.asset.description,
    match: result.match,
    stages: []
  };
}

function promptFromRequest(req) {
  if (req?.body && typeof req.body === "object") return req.body.prompt;
  if (typeof req?.body === "string") {
    try {
      return JSON.parse(req.body).prompt;
    } catch {
      return "";
    }
  }
  return req?.query?.prompt || "";
}

export default async function handler(req, res) {
  res.setHeader("x-sceneforge-handler", "vercel-static-library-model");

  const method = req.method || "GET";
  if (!["GET", "POST"].includes(method)) {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  return res.status(200).json(buildModelResponse(promptFromRequest(req)));
}
