import { initAvatarMode } from "./avatarMode.js";

/* ============================================================
   SceneForge Avatar Director UI
   - Make input row match Prop Studio (input + primary button)
   - Fix Run button style + disable behavior
   - No top-level await
   ============================================================ */

(function () {
  // ---- Crash Overlay (deploy debugging) ----
  function showCrash(title, msg, extra = "") {
    document.body.innerHTML =
      `<pre style="white-space:pre-wrap;padding:16px;color:#fff;background:#0b0f1a">` +
      `${title}:\n${msg}\n\n${extra}\n</pre>`;
  }
  window.addEventListener("error", (e) => {
    const msg = e?.error?.message || e.message || "Unknown error";
    showCrash("JS Error", msg, `${e.filename || ""}:${e.lineno || ""}:${e.colno || ""}`.trim());
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e?.reason?.message || String(e.reason || "Unhandled rejection");
    showCrash("Promise Error", msg);
  });

  function el(tag, props = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "style") n.style.cssText = v;
      else if (k === "class") n.className = v;
      else if (k.startsWith("on") && typeof v === "function") {
        n.addEventListener(k.slice(2).toLowerCase(), v);
      } else n.setAttribute(k, v);
    }
    for (const c of children) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return n;
  }

  function waitForMount() {
    return new Promise((resolve, reject) => {
      const get = () => document.querySelector("#app");
      const m = get();
      if (m) return resolve(m);

      const onReady = () => {
        const mm = get();
        if (!mm) {
          document.body.innerHTML =
            "<pre style='color:#fff;padding:16px;background:#0b0f1a'>Missing #app mount element</pre>";
          reject(new Error("Missing #app"));
          return;
        }
        resolve(mm);
      };

      if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", onReady, { once: true });
      } else {
        onReady();
      }
    });
  }

  /* ============================================================
     Panel (match Prop Studio look/structure)
     ============================================================ */
  function ensurePanel() {
    let panel = document.querySelector("#nxAvatarPanel");
    if (panel) return panel;

    const style = el("style", {}, [
      `
      :root{
        --bg:#0b0f1a;
        --panel:rgba(12,16,28,0.82);
        --panel2:rgba(255,255,255,0.06);
        --border:rgba(255,255,255,0.12);
        --border2:rgba(255,255,255,0.18);
        --text:rgba(255,255,255,0.96);
        --muted:rgba(255,255,255,0.74);
        --muted2:rgba(255,255,255,0.60);
        --shadow:0 22px 60px rgba(0,0,0,0.60);
        --radius:16px;

        --accent:#3b82f6;
        --accent2:rgba(59,130,246,0.18);
        --accentBorder:rgba(59,130,246,0.62);
      }

      #nxAvatarPanel{
        position:fixed;
        top:18px; left:18px;
        width:min(500px, calc(100vw - 36px));
        background:rgba(10,12,18,0.78);
        border:1px solid rgba(255,255,255,0.10);
        border-radius:18px;
        box-shadow:var(--shadow);
        padding:14px;
        z-index: 50;
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color:var(--text);
        pointer-events:auto;
        user-select:none;
      }
      #nxAvatarPanel.is-collapsed{
        width:auto;
        max-width:280px;
        padding:10px 12px;
      }
      #nxAvatarPanel.is-collapsed #nxHint,
      #nxAvatarPanel.is-collapsed #nxRow,
      #nxAvatarPanel.is-collapsed #nxScenarioRow,
      #nxAvatarPanel.is-collapsed #nxScenarioProgress,
      #nxAvatarPanel.is-collapsed #nxChips,
      #nxAvatarPanel.is-collapsed #nxCameraRow,
      #nxAvatarPanel.is-collapsed #nxStatusRow,
      #nxAvatarPanel.is-collapsed #nxGrid,
      #nxAvatarPanel.is-collapsed #nxBrief{
        display:none;
      }

      #nxHeaderRow{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      }

      #nxTitle{
        display:flex;
        align-items:center;
        gap:8px;
        font-weight:900;
        font-size:14px;
        letter-spacing:0.2px;
      }
      .nxTitleSub{ font-weight:750; opacity:0.92; }

      #nxBadge{
        font-size:11px;
        padding:4px 9px;
        border-radius:999px;
        background:var(--accent2);
        border:1px solid rgba(59,130,246,0.38);
        color:rgba(245,236,255,0.98);
        user-select:none;
        white-space:nowrap;
      }

      #nxHeaderActions{ display:flex; gap:7px; align-items:center; }

      /* Buttons (same feel as Prop Studio) */
      #nxAvatarPanel button{
        padding:9px 10px;
        border-radius:10px;
        border:1px solid rgba(255,255,255,0.16);
        background:rgba(255,255,255,0.10);
        color:rgba(255,255,255,0.95);
        font-weight:850;
        cursor:pointer;
        transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, opacity 120ms ease;
        user-select:none;
        white-space:nowrap;
      }
      #nxMinimize{ min-width:42px; }
      #nxAvatarPanel button:hover{
        transform: translateY(-1px);
        background: rgba(255,255,255,0.14);
        border-color: rgba(255,255,255,0.24);
      }
      #nxAvatarPanel button:active{ transform: translateY(0px); }
      #nxAvatarPanel button:disabled{ opacity:.6; cursor:not-allowed; transform:none; }

      #nxAvatarPanel button.primary{
        background:rgba(59,130,246,0.92);
        border-color:rgba(59,130,246,0.62);
        color:#fff;
      }
      #nxAvatarPanel button.primary:hover{
        background:rgba(59,130,246,0.84);
        border-color:rgba(59,130,246,0.78);
      }

      #nxHint{
        margin-top:10px;
        padding:8px 10px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,0.10);
        background:rgba(255,255,255,0.06);
        font-size:12px;
        line-height:1.5;
        color:var(--muted);
        user-select:text;
      }
      #nxHint b{ color:#fff; }

      /* Input row = Prop Studio: input + primary button (+ reset) */
      #nxRow{
        display:flex;
        gap:8px;
        margin-top:10px;
        align-items:center;
      }

      #nxCmd{
        flex:1;
        width:100%;
        padding:10px 11px;
        border-radius:10px;
        border:1px solid rgba(255,255,255,0.16);
        background:rgba(255,255,255,0.07);
        color:#fff;
        outline:none;
        font-size:13px;
        user-select:text;
        pointer-events:auto;
      }
      #nxCmd::placeholder{ color: rgba(255,255,255,0.55); }
      #nxCmd:focus{
        border-color: rgba(59,130,246,0.75);
        box-shadow: 0 0 0 4px rgba(59,130,246,0.18);
      }

      #nxChips{
        display:flex;
        gap:7px;
        flex-wrap:wrap;
        margin-top:10px;
      }
      #nxScenarioRow{
        display:flex;
        gap:8px;
        margin-top:10px;
        align-items:center;
      }
      #nxScenarioRun{
        flex:1;
      }
      #nxScenarioProgress{
        margin-top:8px;
        padding:8px 10px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,0.10);
        background:rgba(255,255,255,0.05);
      }
      #nxScenarioMeta{
        display:flex;
        justify-content:space-between;
        gap:10px;
        font-size:11.5px;
        color:rgba(255,255,255,0.76);
        margin-bottom:7px;
      }
      #nxScenarioStepTitle{
        min-width:0;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      #nxScenarioBar{
        height:6px;
        overflow:hidden;
        border-radius:999px;
        background:rgba(255,255,255,0.11);
      }
      #nxScenarioBarFill{
        height:100%;
        width:0%;
        border-radius:999px;
        background:linear-gradient(90deg, rgba(168,85,247,0.95), rgba(96,165,250,0.95));
        transition:width 220ms ease;
      }
      .nxChip{
        appearance:none;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(255,255,255,0.08);
        color:rgba(255,255,255,0.92);
        border-radius:10px;
        padding:7px 10px;
        font-size:11.5px;
        cursor:pointer;
        transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, opacity 120ms ease;
        user-select:none;
        white-space:nowrap;
      }
      .nxChip:hover{
        transform: translateY(-1px);
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.22);
      }
      .nxChip:disabled{ opacity:.6; cursor:not-allowed; transform:none; }

      #nxCameraRow{
        display:flex;
        gap:7px;
        flex-wrap:wrap;
        margin-top:10px;
      }

      #nxStatusRow{
        margin-top:10px;
        font-size:12px;
        color:var(--muted);
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }
      #nxStatusLeft{
        display:flex;
        align-items:center;
        gap:8px;
        min-width: 0;
      }
      #nxStatusDot{
        width:10px; height:10px;
        border-radius:999px;
        background:rgba(59,130,246,0.95);
        box-shadow: 0 0 0 4px rgba(59,130,246,0.14);
        flex:0 0 auto;
      }
      #nxStatusDot.busy{ box-shadow: 0 0 0 4px rgba(59,130,246,0.18); }
      #nxStatusDot.err{
        background:rgba(239,68,68,0.95);
        box-shadow: 0 0 0 4px rgba(239,68,68,0.16);
      }
      #nxStatusText{
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      #nxBrief{
        margin-top:10px;
        border:1px solid rgba(255,255,255,0.10);
        background:rgba(255,255,255,0.07);
        border-radius:12px;
        padding:10px 12px;
        user-select:text;
      }
      .nxBriefLabel{
        font-size:11px;
        color:var(--muted2);
        text-transform:uppercase;
        letter-spacing:.12em;
        margin-bottom:7px;
        font-weight:900;
        user-select:none;
      }
      #nxExplain{
        color:rgba(255,255,255,0.90);
        font-size:13px;
        line-height:1.38;
        overflow-wrap:anywhere;
      }

      #nxGrid{
        margin-top:10px;
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap:10px;
      }
      .nxCard{
        border:1px solid rgba(255,255,255,0.10);
        background:rgba(255,255,255,0.05);
        border-radius:12px;
        padding:9px 10px;
        min-height: 72px;
        overflow:hidden;
        user-select:text;
      }
      .nxCardTitle{
        font-size:11px;
        color:var(--muted2);
        text-transform:uppercase;
        letter-spacing:.12em;
        margin-bottom:8px;
        user-select:none;
      }
      .nxCardBody{
        font-size:13px;
        color:rgba(255,255,255,0.90);
        line-height:1.35;
        white-space:pre-wrap;
        overflow-wrap:anywhere;
      }
      #nxLog{
        font-family: ui-monospace, Menlo, Consolas, monospace;
        font-size:11.5px;
        color:rgba(255,255,255,0.82);
        white-space:pre-wrap;
        max-height:88px;
        overflow:auto;
      }
      #nxSubtitleOverlay{
        position:fixed;
        left:50%;
        bottom:22px;
        transform:translateX(-50%);
        max-width:min(780px, calc(100vw - 36px));
        padding:10px 16px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,0.14);
        background:rgba(8,12,22,0.72);
        color:rgba(255,255,255,0.94);
        box-shadow:0 16px 40px rgba(0,0,0,0.36);
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        font-size:14px;
        line-height:1.4;
        text-align:center;
        pointer-events:none;
        z-index:45;
        opacity:0;
        transition:opacity 160ms ease;
      }
      #nxSubtitleOverlay.is-visible{ opacity:1; }

      @media (max-width: 520px){
        #nxAvatarPanel{
          top:auto;
          bottom:14px;
          left:14px;
          right:14px;
          width:auto;
        }
        #nxRow{ flex-direction:column; align-items:stretch; }
        #nxScenarioRow{ flex-direction:column; align-items:stretch; }
        #nxGrid{ grid-template-columns: 1fr; }
      }
      `,
    ]);

    panel = el("div", { id: "nxAvatarPanel" });

    const headerRow = el("div", { id: "nxHeaderRow" }, [
      el("div", { id: "nxTitle" }, [
        el("span", {}, ["SceneForge"]),
        el("span", { class: "nxTitleSub" }, ["Avatar Director"]),
        el("span", { id: "nxBadge", title: "Commanded classroom simulator" }, ["Classroom"]),
      ]),
      el("div", { id: "nxHeaderActions" }, [
        el("button", { id: "nxMinimize", type: "button", title: "Collapse panel" }, ["Hide"]),
        el(
          "button",
          {
            id: "nxBack",
            type: "button",
            class: "secondary",
            title: "Back to Prop Studio",
            onclick: () => (location.href = "/?mode=asset"),
          },
          ["Asset"]
        ),
        el("button", { id: "nxHome", type: "button", class: "secondary", onclick: () => (location.href = "/") }, ["Home"]),
      ]),
    ]);

    const hint = el("div", { id: "nxHint" }, [
      "Try: ",
      el("b", {}, ['"Point at the screen"']),
      " - ",
      el("b", {}, ['"Walk to the desk"']),
      " - ",
      el("b", {}, ['"Wave hello"']),
      " - ",
      el("b", {}, ['"Walk back"']),
      ".",
    ]);

    // Input like Prop Studio
    const cmd = el("input", {
      id: "nxCmd",
      placeholder: 'Type a command, then press Enter...',
      autocomplete: "off",
      spellcheck: "false",
    });

    // Run button fixed (primary)
    const runBtn = el("button", { id: "nxRun", class: "primary", type: "button" }, ["Run"]);
    const resetBtn = el("button", { id: "nxReset", type: "button" }, ["Clear"]);
    const row = el("div", { id: "nxRow" }, [cmd, runBtn, resetBtn]);

    const scenarioRunBtn = el("button", { id: "nxScenarioRun", class: "primary", type: "button" }, [
      "Run Scenario",
    ]);
    const scenarioResetBtn = el("button", { id: "nxScenarioReset", type: "button" }, ["Reset"]);
    const scenarioRow = el("div", { id: "nxScenarioRow" }, [scenarioRunBtn, scenarioResetBtn]);
    const scenarioProgress = el("div", { id: "nxScenarioProgress" }, [
      el("div", { id: "nxScenarioMeta" }, [
        el("span", { id: "nxScenarioStepTitle" }, ["Scenario ready"]),
        el("span", { id: "nxScenarioCount" }, ["0/6"]),
      ]),
      el("div", { id: "nxScenarioBar" }, [el("div", { id: "nxScenarioBarFill" })]),
    ]);

    const chips = el("div", { id: "nxChips" }, [
      el("button", { class: "nxChip", type: "button", "data-t": "Walk to the desk" }, ["Desk"]),
      el("button", { class: "nxChip", type: "button", "data-t": "Point at the screen" }, ["Screen"]),
      el("button", { class: "nxChip", type: "button", "data-t": "Wave hello" }, ["Wave"]),
    ]);

    const cameraRow = el("div", { id: "nxCameraRow" }, [
      el("button", { class: "nxChip", type: "button", "data-camera": "student" }, ["Student View"]),
      el("button", { class: "nxChip", type: "button", "data-camera": "instructor" }, ["Instructor View"]),
      el("button", { class: "nxChip", type: "button", "data-camera": "overview" }, ["Overview"]),
    ]);

    const statusDot = el("span", { id: "nxStatusDot", title: "Ready" });
    const statusText = el("span", { id: "nxStatusText" }, ["Ready."]);
    const statusRow = el("div", { id: "nxStatusRow" }, [
      el("div", { id: "nxStatusLeft" }, [statusDot, statusText]),
    ]);

    const explainBody = el("div", { id: "nxExplain" }, ["Ready."]);
    const logBody = el("div", { id: "nxLog" }, [""]);

    const grid = el("div", { id: "nxGrid" }, [
      el("div", { class: "nxCard" }, [el("div", { class: "nxCardTitle" }, ["Explanation"]), explainBody]),
      el("div", { class: "nxCard" }, [el("div", { class: "nxCardTitle" }, ["Run log"]), logBody]),
    ]);
    const brief = el("div", { id: "nxBrief" }, [
      el("div", { class: "nxBriefLabel" }, ["Live note"]),
      explainBody,
    ]);

    panel.appendChild(style);
    panel.appendChild(headerRow);
    panel.appendChild(row);
    panel.appendChild(scenarioRow);
    panel.appendChild(scenarioProgress);
    panel.appendChild(chips);
    panel.appendChild(statusRow);
    panel.appendChild(brief);

    document.body.appendChild(panel);
    if (!document.querySelector("#nxSubtitleOverlay")) {
      document.body.appendChild(el("div", { id: "nxSubtitleOverlay", "aria-live": "polite" }, [""]));
    }
    return panel;
  }

  /* ============================================================
     Boot
     ============================================================ */
  async function bootAvatar() {
    const mountEl = await waitForMount();
    const panel = ensurePanel();

    const statusDotEl = document.querySelector("#nxStatusDot");
    const statusTextEl = document.querySelector("#nxStatusText");
    const explainEl = document.querySelector("#nxExplain");
    const logEl = document.querySelector("#nxLog");
    const cmdEl = document.querySelector("#nxCmd");
    const runBtnEl = document.querySelector("#nxRun");
    const resetBtnEl = document.querySelector("#nxReset");
    const scenarioRunBtnEl = document.querySelector("#nxScenarioRun");
    const scenarioResetBtnEl = document.querySelector("#nxScenarioReset");
    const scenarioStepTitleEl = document.querySelector("#nxScenarioStepTitle");
    const scenarioCountEl = document.querySelector("#nxScenarioCount");
    const scenarioBarFillEl = document.querySelector("#nxScenarioBarFill");
    const subtitleEl = document.querySelector("#nxSubtitleOverlay");
    const helpBtnEl = document.querySelector("#nxHelp");
    const minBtnEl = document.querySelector("#nxMinimize");

    function setStatus(state, text) {
      if (statusTextEl) statusTextEl.textContent = text || "";
      if (statusDotEl) {
        statusDotEl.classList.remove("busy", "err");
        if (state === "busy") statusDotEl.classList.add("busy");
        if (state === "err") statusDotEl.classList.add("err");
      }
    }

    function compactText(value, max = 170) {
      const clean = String(value || "").replace(/\s+/g, " ").trim();
      if (clean.length <= max) return clean;
      return `${clean.slice(0, max - 1).trim()}...`;
    }

    function logLine(kind, msg) {
      const ts = new Date();
      const hh = String(ts.getHours()).padStart(2, "0");
      const mm = String(ts.getMinutes()).padStart(2, "0");
      const ss = String(ts.getSeconds()).padStart(2, "0");
      const line = `[${hh}:${mm}:${ss}] ${kind}: ${msg}\n`;
      if (logEl) logEl.textContent = (line + logEl.textContent).slice(0, 6000);
    }

    // Init avatar mode
    setStatus("busy", "Initializing...");
    let api;
    try {
      api = await initAvatarMode({ mountEl });
    } catch (e) {
      setStatus("err", "Init failed");
      if (explainEl) explainEl.textContent = `Error: ${e?.message || String(e)}`;
      throw e;
    }

    if (!api || typeof api.runCommand !== "function") {
      setStatus("err", "API mismatch");
      const keys = api ? Object.keys(api).join(", ") : "(none)";
      if (explainEl) explainEl.textContent = `Error: Expected api.runCommand(). Got: ${keys}`;
      throw new Error("Avatar API mismatch (missing runCommand)");
    }
    window.SceneForge = window.SceneForge || {};
    window.SceneForge.avatar = api;

    const history = [];
    let hIdx = -1;
    let running = false;

    function setButtonsEnabled(on) {
      if (runBtnEl) runBtnEl.disabled = !on;
      if (resetBtnEl) resetBtnEl.disabled = !on;
      if (scenarioRunBtnEl) scenarioRunBtnEl.disabled = !on;
      if (scenarioResetBtnEl) scenarioResetBtnEl.disabled = !on;
      document.querySelectorAll("#nxChips .nxChip").forEach((b) => (b.disabled = !on));
      document.querySelectorAll("#nxCameraRow .nxChip").forEach((b) => (b.disabled = !on));
      if (cmdEl) cmdEl.disabled = !on;
    }

    function renderStep(step) {
      if (!explainEl || !step) return;
      const prefix = step.index && step.total ? `Step ${step.index}/${step.total}: ` : "";
      const detail = step.subtitle || step.text || "";
      explainEl.textContent = compactText(`${prefix}${step.title}${detail ? ` - ${detail}` : ""}`);
      updateScenarioProgress(step);
      showSubtitle(step.subtitle || step.text || "");
    }

    function updateScenarioProgress(step = {}) {
      const total = Number(step.total || 6);
      const index = Math.max(0, Number(step.index || 0));
      if (scenarioStepTitleEl) scenarioStepTitleEl.textContent = step.title || "Scenario ready";
      if (scenarioCountEl) scenarioCountEl.textContent = `${index}/${total}`;
      if (scenarioBarFillEl) {
        const pct = total > 0 ? Math.max(0, Math.min(100, (index / total) * 100)) : 0;
        scenarioBarFillEl.style.width = `${pct}%`;
      }
    }

    function showSubtitle(text) {
      if (!subtitleEl) return;
      const value = String(text || "").trim();
      subtitleEl.textContent = value;
      subtitleEl.classList.toggle("is-visible", Boolean(value));
    }

    function clearSubtitleSoon(delay = 1800) {
      window.setTimeout(() => {
        if (subtitleEl) subtitleEl.classList.remove("is-visible");
      }, delay);
    }

    async function runCommand(text) {
      const t = String(text || "").trim();
      if (!t) return;
      await api.runCommand(t, (msg) => {
        const s = typeof msg === "string" ? msg : String(msg || "");
        if (explainEl) explainEl.textContent = compactText(s);
      });
    }

    async function resetAll(options = {}) {
      if (running && !options.force) return;
      running = true;
      setButtonsEnabled(false);

      try {
        setStatus("busy", "Resetting...");
        logLine("RUN", "Walk back");
        if (cmdEl) cmdEl.value = "";
        if (explainEl) explainEl.textContent = "Resetting...";
        await runCommand("Walk back");
        setStatus("ok", "Ready");
        if (explainEl) explainEl.textContent = "Reset complete. Ready.";
        cmdEl?.focus();
      } catch (e) {
        const msg = e?.message || String(e);
        setStatus("err", "Error");
        if (explainEl) explainEl.textContent = `Error: ${msg}`;
        logLine("ERROR", msg);
        console.error(e);
      } finally {
        running = false;
        setButtonsEnabled(true);
      }
    }

    async function run(text) {
      const t = (text ?? cmdEl?.value ?? "").trim();
      if (!t || running) return;

      running = true;
      setButtonsEnabled(false);

      history.push(t);
      hIdx = history.length;

      setStatus("busy", "Running...");
        logLine("RUN", t);

      try {
        if (t.toLowerCase() === "reset") {
          await resetAll({ force: true });
          return;
        }
        await runCommand(t);
        setStatus("ok", "Ready");
        if (cmdEl) cmdEl.value = "";
        cmdEl?.focus();
      } catch (e) {
        const msg = e?.message || String(e);
        setStatus("err", "Error");
        if (explainEl) explainEl.textContent = `Error: ${msg}`;
        logLine("ERROR", msg);
        console.error(e);
      } finally {
        running = false;
        setButtonsEnabled(true);
      }
    }

    async function runScenario() {
      if (running) return;
      if (!api || typeof api.runScenario !== "function") {
        if (explainEl) explainEl.textContent = "Scenario API is not available.";
        return;
      }

      running = true;
      setButtonsEnabled(false);
      setStatus("busy", "Running scenario...");
      logLine("SCENARIO", "Emergency Response Walkthrough");

      try {
        const result = await api.runScenario({
          onStep: (step) => {
            renderStep(step);
            setStatus("busy", `${step.index}/${step.total} ${step.title}`);
          },
          onLog: (msg) => logLine("SCENARIO", msg),
          onComplete: (step) => renderStep({ ...step, index: 6, total: 6 }),
        });

        if (result?.ok === false) {
          setStatus("ok", "Scenario stopped");
          logLine("SCENARIO", result.reason || "Stopped");
          return;
        }

        setStatus("ok", "Scenario complete");
        if (explainEl) {
          explainEl.textContent = "Walkthrough complete. Ready for the next module.";
        }
        updateScenarioProgress({ title: "Walkthrough Complete", index: 6, total: 6 });
        showSubtitle("Walkthrough complete. The class is ready for the next module.");
        clearSubtitleSoon(3200);
      } catch (e) {
        const msg = e?.message || String(e);
        setStatus("err", "Scenario error");
        if (explainEl) explainEl.textContent = `Error: ${msg}`;
        logLine("ERROR", msg);
        console.error(e);
      } finally {
        running = false;
        setButtonsEnabled(true);
        cmdEl?.focus();
      }
    }

    async function resetScenario() {
      if (running) return;
      if (!api || typeof api.resetScenario !== "function") {
        await resetAll();
        return;
      }

      running = true;
      setButtonsEnabled(false);
      setStatus("busy", "Resetting scenario...");

      try {
        await api.resetScenario({
          onStep: renderStep,
          onLog: (msg) => logLine("SCENARIO", msg),
        });
        setStatus("ok", "Ready");
        clearSubtitleSoon(1600);
      } catch (e) {
        const msg = e?.message || String(e);
        setStatus("err", "Scenario error");
        if (explainEl) explainEl.textContent = `Error: ${msg}`;
        logLine("ERROR", msg);
        console.error(e);
      } finally {
        running = false;
        setButtonsEnabled(true);
        cmdEl?.focus();
      }
    }

    // Events
    runBtnEl?.addEventListener("click", () => run());
    resetBtnEl?.addEventListener("click", () => resetAll());
    scenarioRunBtnEl?.addEventListener("click", () => runScenario());
    scenarioResetBtnEl?.addEventListener("click", () => resetScenario());

    minBtnEl?.addEventListener("click", () => {
      const collapsed = !panel.classList.contains("is-collapsed");
      panel.classList.toggle("is-collapsed", collapsed);
      minBtnEl.textContent = collapsed ? "Open" : "Hide";
      minBtnEl.setAttribute("title", collapsed ? "Expand panel" : "Collapse panel");
      minBtnEl.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });

    helpBtnEl?.addEventListener("click", () => {
      if (explainEl) {
        explainEl.textContent =
          'Try manual commands, or press "Run Scenario" for the Emergency Response Walkthrough.';
      }
    });

    cmdEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        run();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        cmdEl.value = "";
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!history.length) return;
        hIdx = Math.max(0, hIdx - 1);
        cmdEl.value = history[hIdx] ?? cmdEl.value;
        cmdEl.setSelectionRange(cmdEl.value.length, cmdEl.value.length);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!history.length) return;
        hIdx = Math.min(history.length, hIdx + 1);
        cmdEl.value = history[hIdx] ?? "";
        cmdEl.setSelectionRange(cmdEl.value.length, cmdEl.value.length);
        return;
      }
    });

    document.querySelectorAll("#nxChips .nxChip").forEach((b) => {
      b.addEventListener("click", () => run(b.getAttribute("data-t")));
    });

    document.querySelectorAll("#nxCameraRow [data-camera]").forEach((b) => {
      b.addEventListener("click", () => {
        const preset = b.getAttribute("data-camera") || "student";
        api.setCameraPreset?.(preset);
        logLine("VIEW", b.textContent || preset);
      });
    });

    // Initial
    setButtonsEnabled(true);
    updateScenarioProgress({ title: "Scenario ready", index: 0, total: 6 });
    showSubtitle("");
    setTimeout(() => cmdEl?.focus(), 50);
    setStatus("ok", "Ready");
    if (explainEl) explainEl.textContent = "Ready.";
  }

  bootAvatar().catch((e) => {
    const msg = (e && e.message) ? e.message : String(e);
    showCrash("AVATAR BOOT ERROR", msg);
    console.error(e);
  });
})();
