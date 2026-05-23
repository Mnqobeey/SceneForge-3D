// src/entry.js
// Lightweight prototype mode router. Each prototype is imported only when selected.

// ---------- Debug switch ----------
const params = new URLSearchParams(location.search);
const DEBUG =
  params.get("debug") === "1" ||
  localStorage.getItem("SF_DEBUG") === "1" ||
  localStorage.getItem("NX_DEBUG") === "1";

function dbg(...args) {
  if (!DEBUG) return;
  console.info("[SceneForge]", ...args);
  const box = document.getElementById("nxDebug");
  if (!box) return;
  box.style.display = "block";
  const line = args
    .map((a) => {
      try {
        return typeof a === "string" ? a : JSON.stringify(a, null, 0);
      } catch {
        return String(a);
      }
    })
    .join(" ");
  box.textContent = `${new Date().toISOString()}  ${line}\n` + box.textContent;
}

function crash(title, err) {
  console.error(`[SceneForge:${title}]`, err);
  const msg = err && (err.stack || err.message) ? err.stack || err.message : String(err);
  if (DEBUG) dbg(`CRASH ${title}:`, msg);
}

// ---------- Global error hooks ----------
window.addEventListener("error", (e) => {
  renderLoadFailure("runtime", e?.error || e?.message || e);
});
window.addEventListener("unhandledrejection", (e) => {
  renderLoadFailure("runtime", e?.reason || e);
});

// ---------- Helpful runtime inspector ----------
window.SceneForge = {
  DEBUG,
  enableDebug() {
    localStorage.setItem("SF_DEBUG", "1");
    location.reload();
  },
  disableDebug() {
    localStorage.removeItem("SF_DEBUG");
    localStorage.removeItem("NX_DEBUG");
    const u = new URL(location.href);
    u.searchParams.delete("debug");
    location.href = u.toString();
  },
};

dbg("Booting entry.js");
dbg("location.href =", location.href);
dbg("origin =", location.origin);

// ---------- Mode routing ----------
const rawMode = (params.get("mode") || "landing").trim().toLowerCase();
const mode = ["landing", "asset", "avatar", "test"].includes(rawMode) ? rawMode : "landing";
const isUnknownMode = rawMode !== mode;

const modeLoaders = {
  landing: () => import("./landing-3d.js"),
  asset: () => import("./main.js"),
  avatar: () => import("./main-avatar.js"),
  test: () => import("./test-mode.js"),
};

function setModeClass(nextMode) {
  const root = document.documentElement;
  root.classList.remove("mode-landing", "mode-asset", "mode-avatar", "mode-test");
  root.classList.add(`mode-${nextMode}`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderModeNotice(requestedMode) {
  const target = document.getElementById("nxHeroMain") || document.getElementById("nxLanding") || document.body;
  if (!target || document.getElementById("nxModeNotice")) return;

  const notice = document.createElement("div");
  notice.id = "nxModeNotice";
  notice.innerHTML = `
    <strong>Unknown prototype mode "${escapeHtml(requestedMode)}".</strong>
    Showing the landing page instead.
    <a href="/?mode=asset">Open Prop Studio</a>
    <a href="/?mode=avatar">Open Avatar Director</a>
    <a href="/?mode=test">Open Match Lab</a>
  `;
  target.appendChild(notice);
}

function renderLoadFailure(selectedMode, err) {
  console.error(`[SceneForge:${selectedMode}] Prototype failed to load`, err);
  crash("PROTOTYPE FAILED", err);
  setModeClass("landing");

  const msg = err?.message || String(err || "Unknown error");
  document.body.innerHTML = `
    <main style="
      min-height:100vh;
      box-sizing:border-box;
      display:grid;
      place-items:center;
      padding:24px;
      background:#0b0f1a;
      color:rgba(255,255,255,0.94);
      font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    ">
      <section style="
        width:min(620px,100%);
        border:1px solid rgba(255,255,255,0.14);
        border-radius:16px;
        background:rgba(12,16,28,0.86);
        padding:22px;
        box-shadow:0 22px 60px rgba(0,0,0,0.6);
      ">
        <h1 style="margin:0 0 8px;font-size:24px;">Prototype failed to load.</h1>
        <p style="margin:0 0 16px;color:rgba(255,255,255,0.74);line-height:1.5;">
          Please return to the landing page and try another prototype.
        </p>
        <p style="margin:0 0 16px;color:rgba(255,255,255,0.58);font-size:13px;line-height:1.45;">
          ${escapeHtml(msg)}
        </p>
        <a href="/" style="
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-height:40px;
          padding:0 14px;
          border-radius:12px;
          background:#3b82f6;
          color:#fff;
          text-decoration:none;
          font-weight:800;
        ">Return to landing page</a>
      </section>
    </main>
  `;
}

setModeClass(mode);
dbg("requested mode =", rawMode);
dbg("resolved mode =", mode);

(async () => {
  try {
    if (isUnknownMode) renderModeNotice(rawMode);

    dbg(`Importing ${mode} mode...`);
    await modeLoaders[mode]();
    dbg(`${mode} mode loaded OK.`);
  } catch (e) {
    renderLoadFailure(mode, e);
  }
})();
