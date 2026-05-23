console.info("[SceneForge] Match Lab loaded");

const QUICK_PROMPTS = [
  "fire extinguisher",
  "safety helmet",
  "lamp",
  "duck",
  "random unknown object",
];
const CATEGORY_FILTERS = ["All", "Safety", "Technology", "General", "Demo", "Fallback"];

const mount = document.getElementById("app");
if (!mount) throw new Error("Missing #app mount element");

document.documentElement.style.overflow = "auto";
document.body.style.overflow = "auto";

mount.innerHTML = `
  <style>
    #nxTestConsole {
      min-height: 100vh;
      box-sizing: border-box;
      padding: 28px;
      background:
        radial-gradient(900px 500px at 20% 15%, rgba(59,130,246,0.14), transparent 60%),
        #0b0f1a;
      color: rgba(255,255,255,0.94);
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    }
    #nxTestConsole * { box-sizing: border-box; }
    .nxTestShell {
      width: min(980px, 100%);
      margin: 0 auto;
    }
    .nxTestTop {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
    }
    .nxTestTop h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.1;
      letter-spacing: 0;
    }
    .nxTestTop p {
      margin: 8px 0 0;
      color: rgba(255,255,255,0.68);
      line-height: 1.45;
      font-size: 14px;
    }
    .nxTestNav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .nxTestNav a,
    .nxTestQuick button,
    .nxTestFilters button,
    .nxAssetTestBtn,
    #nxTestRun {
      min-height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.09);
      color: rgba(255,255,255,0.94);
      text-decoration: none;
      font-weight: 850;
      padding: 0 13px;
      cursor: pointer;
    }
    .nxTestFilters button.active {
      background: rgba(59,130,246,0.86);
      border-color: rgba(59,130,246,0.74);
    }
    .nxAssetTestBtn {
      min-height: 36px;
      margin-top: 10px;
      font-size: 12px;
      background: rgba(59,130,246,0.92);
      border-color: rgba(59,130,246,0.64);
    }
    #nxTestRun {
      background: rgba(59,130,246,0.95);
      border-color: rgba(59,130,246,0.68);
    }
    #nxTestRun:disabled { opacity: 0.65; cursor: not-allowed; }
    .nxTestPanel {
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(12,16,28,0.84);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 22px 60px rgba(0,0,0,0.52);
    }
    .nxTestForm {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    #nxTestPrompt {
      flex: 1;
      min-height: 44px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.16);
      background: rgba(255,255,255,0.07);
      color: #fff;
      outline: none;
      padding: 0 12px;
      font-size: 14px;
    }
    #nxTestPrompt:focus {
      border-color: rgba(59,130,246,0.72);
      box-shadow: 0 0 0 4px rgba(59,130,246,0.18);
    }
    .nxTestQuick {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    #nxTestStatus {
      min-height: 22px;
      margin-top: 12px;
      color: rgba(255,255,255,0.70);
      font-size: 13px;
    }
    #nxTestStatus.err { color: rgba(254,202,202,0.95); }
    .nxTestResult {
      margin-top: 16px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .nxTestField {
      min-height: 76px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.055);
      border-radius: 12px;
      padding: 11px 12px;
      overflow: hidden;
    }
    .nxTestField.wide { grid-column: 1 / -1; }
    .nxTestLabel {
      color: rgba(255,255,255,0.54);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .10em;
      text-transform: uppercase;
      margin-bottom: 7px;
    }
    .nxTestValue {
      color: rgba(255,255,255,0.92);
      font-size: 13px;
      line-height: 1.4;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    #nxTestRaw {
      margin-top: 14px;
      max-height: 280px;
      overflow: auto;
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 12px;
      background: rgba(0,0,0,0.24);
      color: rgba(255,255,255,0.82);
      padding: 12px;
      font: 12px/1.45 ui-monospace, Menlo, Consolas, monospace;
      white-space: pre-wrap;
    }
    .nxAssetLibrary {
      margin-top: 18px;
    }
    .nxAssetLibraryHead {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .nxAssetLibraryHead h2 {
      margin: 0;
      font-size: 18px;
      letter-spacing: 0;
    }
    .nxAssetLibraryHead p {
      margin: 5px 0 0;
      color: rgba(255,255,255,0.62);
      font-size: 13px;
      line-height: 1.4;
    }
    .nxTestFilters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    #nxAssetGallery {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .nxAssetCard {
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.055);
      border-radius: 12px;
      padding: 12px;
      overflow: hidden;
    }
    .nxAssetCardTitle {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }
    .nxAssetName {
      font-weight: 900;
      font-size: 14px;
      line-height: 1.25;
    }
    .nxAssetCategory {
      flex: 0 0 auto;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 999px;
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.76);
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 850;
      white-space: nowrap;
    }
    .nxAssetMeta {
      margin-top: 7px;
      color: rgba(255,255,255,0.70);
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .nxAssetMeta strong {
      color: rgba(255,255,255,0.90);
      font-weight: 850;
    }
    .nxAssetEmpty {
      grid-column: 1 / -1;
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 12px;
      padding: 14px;
      color: rgba(255,255,255,0.70);
      background: rgba(255,255,255,0.05);
    }
    @media (max-width: 720px) {
      #nxTestConsole { padding: 18px; }
      .nxTestTop,
      .nxTestForm,
      .nxAssetLibraryHead { align-items: stretch; flex-direction: column; }
      .nxTestNav,
      .nxTestFilters { justify-content: flex-start; }
      .nxTestResult { grid-template-columns: 1fr; }
      #nxAssetGallery { grid-template-columns: 1fr; }
    }
    @media (min-width: 721px) and (max-width: 980px) {
      #nxAssetGallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>

  <main id="nxTestConsole">
    <div class="nxTestShell">
      <div class="nxTestTop">
        <div>
          <h1>Match Lab</h1>
          <p>QA view for deterministic prompt-to-prop matching.</p>
        </div>
        <nav class="nxTestNav" aria-label="Prototype links">
          <a href="/">Landing</a>
          <a href="/?mode=asset">Prop Studio</a>
          <a href="/?mode=avatar">Avatar Director</a>
        </nav>
      </div>

      <section class="nxTestPanel" aria-label="Asset match tester">
        <div class="nxTestForm">
          <input id="nxTestPrompt" autocomplete="off" spellcheck="false" placeholder='Try: "show me a fire extinguisher"' />
          <button id="nxTestRun" type="button">Test Prompt</button>
        </div>

        <div class="nxTestQuick" aria-label="Quick prompt tests"></div>
        <div id="nxTestStatus" aria-live="polite">Ready.</div>
        <div id="nxTestResult" class="nxTestResult" aria-live="polite"></div>
        <pre id="nxTestRaw">{}</pre>
      </section>

      <section class="nxTestPanel nxAssetLibrary" aria-label="Curated asset library">
        <div class="nxAssetLibraryHead">
          <div>
            <h2>Asset Library</h2>
            <p>Browse metadata from <code>public/assets/library/index.json</code> and test each asset label directly.</p>
          </div>
          <div class="nxTestFilters" aria-label="Category filters"></div>
        </div>
        <div id="nxAssetGallery" aria-live="polite"></div>
      </section>
    </div>
  </main>
`;

const promptEl = document.getElementById("nxTestPrompt");
const runBtn = document.getElementById("nxTestRun");
const quickEl = document.querySelector(".nxTestQuick");
const statusEl = document.getElementById("nxTestStatus");
const resultEl = document.getElementById("nxTestResult");
const rawEl = document.getElementById("nxTestRaw");
const filtersEl = document.querySelector(".nxTestFilters");
const galleryEl = document.getElementById("nxAssetGallery");

let libraryByFile = new Map();
let libraryAssets = [];
let activeCategory = "All";

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("err", isError);
}

function field(label, value, wide = false) {
  const node = document.createElement("div");
  node.className = `nxTestField${wide ? " wide" : ""}`;

  const labelEl = document.createElement("div");
  labelEl.className = "nxTestLabel";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = "nxTestValue";
  valueEl.textContent = value == null || value === "" ? "-" : String(value);

  node.append(labelEl, valueEl);
  return node;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") return "Response was not a JSON object.";
  if (payload.ok !== true) return "Response did not include ok: true.";
  if (!payload.model || typeof payload.model !== "object") return "Response did not include model metadata.";
  if (typeof payload.model.url !== "string" || !payload.model.url) return "Response did not include model.url.";
  if (!payload.match || typeof payload.match !== "object") return "Response did not include match metadata.";
  if (typeof payload.match.confidence !== "number") return "Response match.confidence was not a number.";
  if (!Array.isArray(payload.match.matchedKeywords)) return "Response match.matchedKeywords was not an array.";
  return "";
}

function renderResult(payload) {
  const asset = libraryByFile.get(payload.model.file) || {};
  const fallback = payload.model.source === "fallback";
  const match = payload.match || {};

  resultEl.innerHTML = "";
  resultEl.append(
    field("Prompt", payload.prompt, true),
    field("Selected Asset", `${asset.label || "Unknown asset"} / ${payload.model.file || "-"}`),
    field("Model URL", payload.model.url),
    field("Confidence", match.confidence),
    field("Matched Keywords", (match.matchedKeywords || []).join(", ") || "-"),
    field("Category", match.category || asset.category || "-"),
    field("Fallback", fallback ? "Yes" : "No"),
    field("Reason", match.reason || "-", true),
    field("Description", payload.description || "-", true)
  );
  rawEl.textContent = JSON.stringify(payload, null, 2);
}

function sourceSummary(asset) {
  if (!asset?.source) return "Not listed";
  const parts = [asset.source.name, asset.source.license].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Not listed";
}

function renderCategoryFilters() {
  filtersEl.innerHTML = "";

  for (const category of CATEGORY_FILTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.classList.toggle("active", activeCategory === category);
    button.addEventListener("click", () => {
      activeCategory = category;
      renderCategoryFilters();
      renderGallery();
    });
    filtersEl.appendChild(button);
  }
}

function renderGallery() {
  const filtered =
    activeCategory === "All"
      ? libraryAssets
      : libraryAssets.filter((asset) => asset.category === activeCategory);

  galleryEl.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "nxAssetEmpty";
    empty.textContent = `No assets found for ${activeCategory}.`;
    galleryEl.appendChild(empty);
    return;
  }

  for (const asset of filtered) {
    const card = document.createElement("article");
    card.className = "nxAssetCard";

    const title = document.createElement("div");
    title.className = "nxAssetCardTitle";

    const name = document.createElement("div");
    name.className = "nxAssetName";
    name.textContent = asset.label || asset.id || asset.file || "Untitled asset";

    const category = document.createElement("div");
    category.className = "nxAssetCategory";
    category.textContent = asset.category || "General";

    title.append(name, category);

    const file = document.createElement("div");
    file.className = "nxAssetMeta";
    file.innerHTML = `<strong>File:</strong> ${asset.file || "-"}`;

    const keywords = document.createElement("div");
    keywords.className = "nxAssetMeta";
    keywords.innerHTML = `<strong>Keywords:</strong> ${(asset.keywords || []).join(", ") || "-"}`;

    const source = document.createElement("div");
    source.className = "nxAssetMeta";
    source.innerHTML = `<strong>Source/licence:</strong> ${sourceSummary(asset)}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "nxAssetTestBtn";
    button.textContent = "Test this asset";
    button.addEventListener("click", () => {
      const prompt = asset.label || asset.id || "";
      promptEl.value = prompt;
      testPrompt(prompt);
      promptEl.focus();
    });

    card.append(title, file, keywords, source, button);
    galleryEl.appendChild(card);
  }
}

async function loadLibraryIndex() {
  try {
    const response = await fetch("/assets/library/index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const library = await response.json();
    if (!Array.isArray(library)) throw new Error("Library index is not an array.");
    libraryAssets = library;
    libraryByFile = new Map(libraryAssets.map((asset) => [asset.file, asset]));
    renderCategoryFilters();
    renderGallery();
  } catch (error) {
    setStatus(`Could not load library index: ${error?.message || String(error)}`, true);
    renderCategoryFilters();
    galleryEl.innerHTML = `<div class="nxAssetEmpty">Could not load the asset library.</div>`;
  }
}

async function testPrompt(prompt) {
  const value = String(prompt || "").trim();
  if (!value) {
    setStatus("Enter a prompt before testing.", true);
    promptEl.focus();
    return;
  }

  runBtn.disabled = true;
  setStatus("Testing prompt...");

  try {
    const response = await fetch("/api/model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: value }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || `/api/model failed with HTTP ${response.status}`);
    }

    const invalidReason = validatePayload(payload);
    if (invalidReason) throw new Error(invalidReason);

    renderResult(payload);
    setStatus(payload.model.source === "fallback" ? "Fallback selected." : "Match selected.");
  } catch (error) {
    resultEl.innerHTML = "";
    rawEl.textContent = "{}";
    setStatus(error?.message || String(error), true);
  } finally {
    runBtn.disabled = false;
  }
}

for (const prompt of QUICK_PROMPTS) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = prompt;
  button.addEventListener("click", () => {
    promptEl.value = prompt;
    testPrompt(prompt);
  });
  quickEl.appendChild(button);
}

runBtn.addEventListener("click", () => testPrompt(promptEl.value));
promptEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    testPrompt(promptEl.value);
  }
});

loadLibraryIndex();
promptEl.focus();
