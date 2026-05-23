console.info("[SceneForge] Prop Studio loaded");
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";


/* ============================================================
   Crash Overlay (shows errors instead of blank screen)
   ============================================================ */
function fixMojibake(str) {
  if (str == null) return str;

  // Common bad sequences seen in your UI
  const map = {
    "Ã¢â‚¬Â¦": "…",     // ellipsis
    "Ã¢â‚¬â€œ": "–",     // en dash
    "Ã¢â‚¬â€": "—",     // em dash
    "Ã¢â‚¬Ëœ": "‘",
    "Ã¢â‚¬â„¢": "’",
    "Ã¢â‚¬Å“": "“",
    "Ã¢â‚¬Â": "”",
    "Ã¢Ë†â€š": "'",

    // This is your weird spinner/indicator line: Ã¢Å“Â¦
    // Replace it with something safe and simple:
    "Ã¢Å“Â¦": "⏳"
  };

  let out = String(str);
  for (const [bad, good] of Object.entries(map)) {
    out = out.split(bad).join(good);
  }

  // If any stray "Ã" sequences remain, convert the common ones:
  out = out.replace(/ÃƒÂ©/g, "é").replace(/ÃƒÂ±/g, "ñ");

  return out;
}


function showCrash(title, msg, extra = "") {
  document.body.innerHTML = `<pre style="white-space:pre-wrap;padding:16px;color:#fff;background:#0b0f1a">
${title}:
${msg}

${extra}
</pre>`;
}

window.addEventListener("error", (e) => {
  const msg = e?.error?.message || e.message || "Unknown error";
  showCrash(
    "JS Error",
    msg,
    `${e.filename || ""}:${e.lineno || ""}:${e.colno || ""}`.trim()
  );
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = e?.reason?.message || String(e.reason || "Unhandled rejection");
  showCrash("Promise Error", msg);
});

/* ============================================================
   Constants + helpers
   ============================================================ */
   function openPrompt() {
  if (!promptBox || !promptOpenBtn || !promptEl) return;
  promptOpenBtn.style.display = "none";
  promptBox.classList.add("show");
  promptBox.setAttribute("aria-hidden", "false");
  promptEl.focus();
}

function closePromptIfEmpty() {
  if (!promptBox || !promptOpenBtn || !promptEl) return;
  const v = (promptEl.value || "").trim();
  if (v) return; // keep open if there is text
  promptBox.classList.remove("show");
  promptBox.setAttribute("aria-hidden", "true");
  promptOpenBtn.style.display = "flex";
}




const API_ORIGIN = window.location.origin;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fatal(msg) {
  showCrash("Fatal", msg);
  throw new Error(msg);
}



/** Encoding/emoji/garbage protection (prevents mojibake in UI) */
function cleanText(str) {
  return String(str ?? "")
    // Common UTF-8->Latin1 double-decoding garbage you hit
    .replace(/ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢/g, "â€¢")
    .replace(/ÃƒÆ'Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å"ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦/g, "...")
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å"/g, "-")
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â/g, "-")
    .replace(/Ã¢â‚¬Â¢/g, "â€¢")
    .replace(/Ã¢â‚¬â€/g, "-")
    .replace(/Ã¢â‚¬â€œ/g, "-")
    .replace(/Ã¢â‚¬Â¦/g, "...")
    // Strip control chars (keep tab/newline/cr)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}



/* ============================================================
   DOM
   ============================================================ */
   
const promptEl = document.getElementById("prompt");
const runBtn = document.getElementById("run");
const statusEl = document.getElementById("status");
const jsonEl = document.getElementById("json");
const summaryEl = document.getElementById("nxSummary");
const mount = document.getElementById("app");
const proto2Btn = document.getElementById("nxProto2Btn");
const homeBtn = document.getElementById("nxHomeBtn");


const resetViewBtn = document.getElementById("resetView");
const centerObjBtn = document.getElementById("centerObj");
const snapGridEl = document.getElementById("snapGrid");

const progressWrap = document.getElementById("progressWrap");
const progressFill = document.getElementById("progressFill");
const toastEl = document.getElementById("toast");

if (!mount) fatal("Missing #app mount element");
if (!promptEl || !runBtn || !statusEl || !jsonEl)
  fatal("Missing UI elements (prompt/run/status/json)");

function setProgressBar(pct, generating) {
  if (!progressFill || !progressWrap) return;
  const clamped = Math.max(0, Math.min(100, pct));
  progressFill.style.width = `${clamped}%`;
  progressWrap.classList.toggle("generating", !!generating);
  progressWrap.classList.toggle("hidden", clamped <= 0 || clamped >= 100);
}

function toast(msg, type = "info") {
  if (!toastEl) return;
  toastEl.classList.remove("ok", "err", "info");
  toastEl.classList.add(type);
  toastEl.textContent = cleanText(msg);
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 1600);
}




/* ============================================================
   Progress + Run State (Vanilla)
   ============================================================ */
let isGenerating = false;
let progress = 0;
let progressTimer = null;
let activeRunId = 0;
let activeAbort = null;

function uiSetStatus(text) {
  statusEl.textContent = cleanText(text || "");
  if (!text || String(text).toLowerCase().includes("idle")) {
    setProgressBar(0, false);
  }
}

function uiSetProgress(pct, label) {
  progress = Math.max(0, Math.min(100, Math.round(pct)));
  // Use ASCII separator to avoid encoding surprises
  const labelText = label ? ` - ${label}` : "";
  statusEl.textContent = cleanText(`${progress}%${labelText}`);
  setProgressBar(progress, progress > 0 && progress < 100);
}


function eduDescribe(prompt) {
  const raw = String(prompt || "").trim();
  const t = raw.toLowerCase();
  if (!t) {
    return "This item supports identification practice and scenario walk-throughs in a simulated work area. Safety tip: keep training props visible and out of access routes.";
  }

  // Known items (keep short, workplace tone)
  if (t.includes("fire extinguisher"))
    return "A fire extinguisher is emergency equipment used to control small fires in workplaces and public facilities. In training, it supports equipment identification and readiness checks. Safety tip: keep it unobstructed and verify the gauge is in range.";
  if (t.includes("hard hat") || t.includes("helmet"))
    return "A hard hat is PPE used to reduce head-injury risk on industrial and construction sites. In training, it reinforces PPE compliance and pre-use inspection. Safety tip: replace it if cracked or after a significant impact.";
  if (t.includes("lamp") || t.includes("light"))
    return "A lamp is a lighting device used to improve visibility in work areas and offices. In training, it helps learners spot hazards and verify safe walkways. Safety tip: route cables to prevent trip hazards and keep it away from flammables.";

  const COLORS = [
    "red",
    "blue",
    "green",
    "yellow",
    "black",
    "white",
    "orange",
    "purple",
    "pink",
    "brown",
    "gray",
    "grey",
    "silver",
    "gold",
    "cyan",
    "magenta",
  ];
  const MATERIALS = [
    "metal",
    "plastic",
    "glass",
    "wood",
    "rubber",
    "ceramic",
    "paper",
    "fabric",
    "leather",
  ];
  const SIZES = ["tiny", "small", "mini", "medium", "large", "big", "huge", "giant"];
  const STYLES = ["low poly", "low-poly", "realistic", "cartoon", "wireframe", "matte", "glossy"];

  const pickFirst = (arr) => arr.find((x) => t.includes(x));
  const color = pickFirst(COLORS);
  const material = pickFirst(MATERIALS);
  const size = pickFirst(SIZES);
  let style = null;
  for (const s of STYLES) {
    if (t.includes(s)) {
      style = s.replace("low-poly", "low poly");
      break;
    }
  }

  const words = t.match(/[a-z]+/g) || [];
  const has = (...xs) => xs.some((x) => words.includes(x) || t.includes(x));

  let shapeKey = "object";
  let shapeLabel = "training object";
  if (has("sphere", "ball", "orb")) {
    shapeKey = "sphere";
    shapeLabel = "sphere";
  } else if (has("cube")) {
    shapeKey = "cube";
    shapeLabel = "cube";
  } else if (has("box", "block", "rectangular")) {
    shapeKey = "box";
    shapeLabel = "box";
  } else if (has("cylinder", "tube", "canister", "barrel")) {
    shapeKey = "cylinder";
    shapeLabel = "cylinder";
  } else if (has("cone")) {
    shapeKey = "cone";
    shapeLabel = "cone";
  }

  const labelParts = [];
  if (style) labelParts.push(style);
  if (size) labelParts.push(size);
  if (color) labelParts.push(color);
  if (material) labelParts.push(material);
  labelParts.push(shapeLabel);
  const label = labelParts.join(" ").replace(/\s+/g, " ").trim();

  let useA = "a marker for hazards, zones, or interaction points";
  let useB = "walkthrough checks and basic interaction validation";
  let tip = "keep it visible and do not place it in access routes or emergency paths";

  switch (shapeKey) {
    case "sphere":
      useA = "a target marker for inspections, sensors, or calibration points";
      useB = "lighting/reflection checks and smooth-surface rendering validation";
      tip = "prevent rolling by placing it on stable surfaces and keep it away from edges";
      break;
    case "box":
    case "cube":
      useA = "a placeholder for equipment footprints, storage units, or boundary volumes";
      useB = "clearance checks, space planning, and collision/bounding validation";
      tip = "avoid blocking walkways and keep clear access to exits and emergency equipment";
      break;
    case "cylinder":
      useA = "a stand-in for containers, pipes, or canisters commonly found in work areas";
      useB = "handling/rotation checks and stability validation";
      tip = "keep it upright and secured to reduce rolling risk near walkways";
      break;
    case "cone":
      useA = "a visual warning marker for restricted zones or focus areas";
      useB = "hazard visibility checks and route guidance in training scenarios";
      tip = "place it where it highlights risk without creating an obstruction";
      break;
  }

  const s1 = `A ${label} is a basic 3D prop used in workplace training simulations and digital-twin walkthroughs.`;
  const s2 = `It can represent ${useA} and supports ${useB}.`;
  const s3 = `Safety tip: ${tip}.`;
  return `${s1} ${s2} ${s3}`;
}

function uiSetJson(obj) {
  const o = obj && typeof obj === "object" ? obj : {};
  const hasPayload = Boolean(o.prompt || o.model || o.error);

  // Keep description always present (fallback)
  try {
    if (hasPayload && o.description == null) o.description = eduDescribe(o.prompt || "");
  } catch {}

  // JSON panel
  jsonEl.textContent = cleanText(JSON.stringify(o ?? {}, null, 2));

  try {
    if (window.__sceneForgeEduBox) {
      window.__sceneForgeEduBox.remove();
      window.__sceneForgeEduBox = null;
      window.__sceneForgeEduBody = null;
    }

    if (!summaryEl) return;
    const description = hasPayload && typeof o.description === "string" ? cleanText(o.description).trim() : "";
    const file = typeof o?.model?.file === "string" ? o.model.file : "";
    const label = file
      ? file
          .replace(/\.glb$/i, "")
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (m) => m.toUpperCase())
      : "";
    const firstSentence = description.split(/(?<=[.!?])\s+/)[0] || "";

    if (firstSentence || label) {
      summaryEl.textContent = [label, firstSentence].filter(Boolean).join(" - ");
      summaryEl.classList.remove("hidden");
    } else {
      summaryEl.textContent = "";
      summaryEl.classList.add("hidden");
    }
  } catch {}
}

function stopProgressTimer() {
  if (progressTimer) clearInterval(progressTimer);
  progressTimer = null;
}

function startProgressRamp(runId) {
  stopProgressTimer();
  uiSetProgress(0, "Starting...");
  const startedAt = Date.now();

  progressTimer = setInterval(() => {
    if (runId !== activeRunId) return;

    const t = (Date.now() - startedAt) / 1000;

    let target = 0;
    if (t < 0.6) target = 10;
    else if (t < 1.2) target = 25;
    else if (t < 2.0) target = 40;
    else if (t < 3.0) target = 55;
    else if (t < 4.5) target = 70;
    else if (t < 6.5) target = 82;
    else target = 88;

    let msg = "Working...";
    if (target <= 10) msg = "Warming up...";
    else if (target <= 25) msg = "Sending prompt...";
    else if (target <= 55) msg = "Matching asset...";
    else if (target <= 70) msg = "Preparing GLB...";
    else if (target <= 82) msg = "Checking model...";
    else msg = "Almost done...";

    const next = Math.min(
      90,
      Math.max(progress, progress + Math.max(1, Math.round((target - progress) * 0.25)))
    );

    uiSetProgress(next, msg);
  }, 120);
}

function finalizeProgressToScene(runId) {
  stopProgressTimer();
  if (runId !== activeRunId) return;
  uiSetProgress(Math.max(progress, 95), "Loading into scene...");
}

function doneProgress(runId, label = "Done") {
  stopProgressTimer();
  if (runId !== activeRunId) return;
  uiSetProgress(100, label);
  toast("Model updated", "ok");
}

/* ============================================================
   THREE setup
   ============================================================ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f1a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 2000);
camera.position.set(0, 0, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

mount.innerHTML = "";
mount.appendChild(renderer.domElement);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 0.6;
controls.maxDistance = 30;
controls.target.set(0, 0.25, 0);
controls.update();

// Raycast + drag plane
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let dragging = false;

function setMouseFromEvent(ev) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
}

let currentObj = null;
let autoRotateEnabled = true;

// Showcase motion
let showcase = true;
let showcaseSpeed = 0.65;
let showcaseBob = 0.06;
let showcasePhase = 0;

// click-to-focus
renderer.domElement.addEventListener("click", (ev) => {
  if (!currentObj) return;
  if (dragging) return;

  setMouseFromEvent(ev);
  raycaster.setFromCamera(mouse, camera);

  const meshes = [];
  currentObj.traverse((n) => {
    if (n.isMesh) meshes.push(n);
  });

  const hits = raycaster.intersectObjects(meshes, true);
  if (hits.length) {
    focusObjectSmooth(currentObj, 520);
    toast("Focused", "info");
  }
});

// Shift+drag reposition
renderer.domElement.addEventListener("pointerdown", (ev) => {
  if (!currentObj) return;
  if (!ev.shiftKey) return;
  dragging = true;
  controls.enabled = false;
  setMouseFromEvent(ev);
});

renderer.domElement.addEventListener("pointermove", (ev) => {
  if (!dragging || !currentObj) return;
  setMouseFromEvent(ev);
  raycaster.setFromCamera(mouse, camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, hit)) {
    let x = hit.x;
    let y = hit.y;

    if (snapGridEl && snapGridEl.checked) {
      const g = 0.25;
      x = Math.round(x / g) * g;
      y = Math.round(y / g) * g;
    }

    currentObj.position.x = x;
    currentObj.position.y = y;
  }
});

renderer.domElement.addEventListener("pointerup", () => {
  dragging = false;
  controls.enabled = true;
});

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.85));
scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 1.25);
dir.position.set(3, 4, 6);
scene.add(dir);

function normalizeObject(object, targetSize = 1.8) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  object.position.sub(center);
  const scale = targetSize / maxDim;
  object.scale.setScalar(scale);

  const box2 = new THREE.Box3().setFromObject(object);
  const center2 = box2.getCenter(new THREE.Vector3());
  object.position.sub(center2);
}

function fitCameraToObject(object, offset = 1.35) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = (camera.fov * Math.PI) / 180;

  let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));
  cameraZ *= offset;

  camera.position.set(center.x, center.y, center.z + cameraZ);
  camera.lookAt(center);

  camera.near = Math.max(0.01, cameraZ / 100);
  camera.far = Math.max(50, cameraZ * 100);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function focusObjectSmooth(object, durationMs = 500) {
  if (!object) return;

  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;

  const fov = (camera.fov * Math.PI) / 180;
  const cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2)) * 1.35;

  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();

  const endPos = new THREE.Vector3(center.x, center.y, center.z + cameraZ);
  const endTarget = center.clone();

  const t0 = performance.now();

  function tick() {
    const t = (performance.now() - t0) / durationMs;
    const k = easeOutCubic(Math.min(1, t));

    camera.position.set(
      lerp(startPos.x, endPos.x, k),
      lerp(startPos.y, endPos.y, k),
      lerp(startPos.z, endPos.z, k)
    );

    controls.target.set(
      lerp(startTarget.x, endTarget.x, k),
      lerp(startTarget.y, endTarget.y, k),
      lerp(startTarget.z, endTarget.z, k)
    );

    controls.update();

    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function resetView() {
  camera.position.set(0, 0, 4);
  controls.target.set(0, 0, 0);
  controls.update();
}

function recenterCurrentObject() {
  if (!currentObj) return;
  currentObj.position.set(0, 0, 0);
  normalizeObject(currentObj, 1.8);
  fitCameraToObject(currentObj, 1.35);
  controls.target.set(0, 0, 0);
  controls.update();
}

function setObject(obj) {
  if (currentObj) scene.remove(currentObj);
  currentObj = obj;
  scene.add(currentObj);

  normalizeObject(currentObj, 1.8);
  fitCameraToObject(currentObj, 1.35);
}

/* ============================================================
   Loader (Draco + Meshopt + binary-safe parse)
   ============================================================ */
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
loader.setDRACOLoader(dracoLoader);

async function loadGlb(absUrl, runId, abortSignal) {
  const u = new URL(absUrl, API_ORIGIN);
  u.searchParams.set("v", String(Date.now()));

  uiSetProgress(Math.max(progress, 90), "Downloading model...");

  const r = await fetch(u.toString(), { signal: abortSignal });
  const ab = await r.arrayBuffer();

  if (runId !== activeRunId) throw new Error("Stale run ignored");
  if (!r.ok) throw new Error(`GLB fetch failed: HTTP ${r.status}`);
  if (ab.byteLength < 64) throw new Error(`GLB too small (${ab.byteLength} bytes)`);

  uiSetProgress(Math.max(progress, 94), "Parsing GLB...");

  return await new Promise((resolve, reject) => {
    try {
      loader.parse(ab, API_ORIGIN, (gltf) => resolve(gltf.scene), (err) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}

/* ============================================================
   Render loop
   ============================================================ */
function animate() {
  requestAnimationFrame(animate);

  const dt = 1 / 60;
  showcasePhase += dt;

  if (currentObj) {
    if (autoRotateEnabled) {
      currentObj.rotation.y += 0.01 * showcaseSpeed;
      currentObj.rotation.x = Math.sin(showcasePhase * 0.6) * 0.03;
    }
    if (showcase) {
      currentObj.position.z = Math.sin(showcasePhase * 1.2) * showcaseBob;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") autoRotateEnabled = !autoRotateEnabled;
  if (e.code === "KeyS") {
    showcase = !showcase;
    toast(`Showcase: ${showcase ? "ON" : "OFF"}`, "info");
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================================================
   Color parsing
   ============================================================ */
const COLOR_WORDS = {
  red: 0xef4444,
  green: 0x22c55e,
  blue: 0x3b82f6,
  yellow: 0xfacc15,
  orange: 0xf97316,
  purple: 0xa855f7,
  pink: 0xec4899,
  white: 0xffffff,
  black: 0x111827,
  gray: 0x9ca3af,
  silver: 0xc0c0c0,
  gold: 0xf59e0b,
  cyan: 0x06b6d4,
};

function pickColorFromPrompt(prompt) {
  const t = (prompt || "").toLowerCase();
  for (const key of Object.keys(COLOR_WORDS)) {
    if (t.includes(key)) return COLOR_WORDS[key];
  }
  return null;
}

function applyColorToObject(obj, hex) {
  if (!hex || !obj) return;
  obj.traverse((n) => {
    if (n.isMesh && n.material) {
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => {
        if (m && "color" in m) {
          m.color = new THREE.Color(hex);
          m.needsUpdate = true;
        }
      });
    }
  });
}

/* ============================================================
   Primitive fallback
   ============================================================ */
function buildPrimitive(prompt, hexColor) {
  const f = (prompt || "").toLowerCase();

  if (f.includes("sphere")) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 32, 32),
      new THREE.MeshStandardMaterial({ color: hexColor ?? 0x3b82f6 })
    );
  }

  if (f.includes("box")) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.0, 1.0),
      new THREE.MeshStandardMaterial({ color: hexColor ?? 0x22c55e })
    );
  }

  if (f.includes("cylinder")) {
    return new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 1.4, 32),
      new THREE.MeshStandardMaterial({ color: hexColor ?? 0xef4444 })
    );
  }

  if (f.includes("extinguisher")) {
    const g = new THREE.Group();
    g.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 1.4, 32),
        new THREE.MeshStandardMaterial({ color: hexColor ?? 0xef4444 })
      )
    );

    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.05, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0x111827 })
    );
    handle.position.set(0, 0.65, 0.2);
    g.add(handle);
    return g;
  }

  return null;
}

/* ============================================================
   Run (FINISH MODE)
   ============================================================ */
async function run() {
  const runId = ++activeRunId;
  const prompt = promptEl.value.trim();
  if (!prompt) return;

  if (activeAbort) {
    try {
      activeAbort.abort();
    } catch {}
  }
  activeAbort = new AbortController();

  isGenerating = true;
  runBtn.disabled = true;

  startProgressRamp(runId);
  uiSetJson({});

  try {
    const hexColor = pickColorFromPrompt(prompt);
    uiSetProgress(Math.max(progress, 20), "Selecting curated asset...");

    const response = await fetch("/api/model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: activeAbort.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.model?.url) {
      throw new Error(payload?.error || `API /api/model failed: HTTP ${response.status}`);
    }

    if (runId !== activeRunId) return;
    uiSetJson(payload);

    finalizeProgressToScene(runId);
    const abs = new URL(payload.model.url, API_ORIGIN).toString();
    const obj = await loadGlb(abs, runId, activeAbort.signal);

    if (runId !== activeRunId) return;

    applyColorToObject(obj, hexColor);
    setObject(obj);

    const renderedLabel = payload.model.source === "fallback" ? "Rendered fallback" : "Rendered";
    doneProgress(runId, renderedLabel);
  } catch (e) {
    stopProgressTimer();
    const msg = e?.name === "AbortError" ? "Cancelled" : e?.message || String(e);

    if (e?.name !== "AbortError") {
      const hexColor = pickColorFromPrompt(prompt);
      const fallback = buildPrimitive(prompt, hexColor) || buildPrimitive("sphere", hexColor);
      if (fallback) setObject(fallback);
    }

    uiSetProgress(Math.min(progress || 0, 95), e?.name === "AbortError" ? "Cancelled" : `Error - ${msg}`);
    uiSetJson({
      ok: false,
      error: msg,
      prompt,
      description:
        e?.name === "AbortError"
          ? "The request was cancelled."
          : "The model could not be loaded, so a local primitive placeholder was shown."
    });
    if (e?.name !== "AbortError") toast(`Error: ${msg}`, "err");
    console.error(e);
  } finally {
    if (runId === activeRunId) {
      isGenerating = false;
      runBtn.disabled = false;
      setProgressBar(progress, progress > 0 && progress < 100);
    }
  }
}

proto2Btn?.addEventListener("click", () => {
  location.href = "/?mode=avatar";
});
homeBtn?.addEventListener("click", () => {
  location.href = "/";
});

runBtn.addEventListener("click", run);
promptEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    run();
  }
});

// Preset chips -> fill prompt + run (deduped)
document.querySelectorAll(".chip[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const v = btn.getAttribute("data-preset") || "";
    promptEl.value = v;
    run();
  });
});

// Help button -> toast controls (ASCII separators)
const helpBtn = document.getElementById("helpBtn");
if (helpBtn) {
  helpBtn.addEventListener("click", () => {
    toast(
      "Drag=rotate | Wheel=zoom | Right-drag=pan | Shift+drag=move | Space=toggle rotate | Click model=focus",
      "info"
    );
  });
}

// Dev toggle -> show/hide JSON
const devBtn = document.getElementById("devBtn");
if (devBtn) {
  devBtn.addEventListener("click", () => {
    const shown = jsonEl.style.display !== "none";
    jsonEl.style.display = shown ? "none" : "block";
    toast(shown ? "Dev hidden" : "Dev shown", "info");
  });
}

if (resetViewBtn)
  resetViewBtn.addEventListener("click", () => {
    resetView();
    if (currentObj) {
      fitCameraToObject(currentObj, 1.35);
      controls.update();
    }
  });

if (centerObjBtn)
  centerObjBtn.addEventListener("click", () => {
    recenterCurrentObject();
  });

// initial UI
uiSetStatus("Idle.");
setProgressBar(0, false);
