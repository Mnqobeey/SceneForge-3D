console.info("[SceneForge] Landing scene loaded");
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const requestedMode = (new URLSearchParams(location.search).get("mode") || "landing").trim().toLowerCase();
const isLandingMode = !["asset", "avatar", "test"].includes(requestedMode);

if (!isLandingMode) {
  // not landing
} else {
  const host = document.getElementById("nxLanding3D");
  if (!host) throw new Error("Missing #nxLanding3D");

  // =========================
  // PLACEMENT (BIG MOVE UP)
  // =========================
  // Portal world position (higher = higher in the scene)
  const PORTAL_Y = 1.75;

  // Camera aims LOWER than the portal so portal appears near TOP of screen
  const LOOK_Y = 0.55;

  // Camera base height
  const CAM_Y = 0.35;

  // Fine X positioning (0 = center)
  const PORTAL_X = 0.0;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);

  // Make sure canvas truly fills host (prevents "rarely shows" sizing weirdness)
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";

  host.innerHTML = "";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x05060a, 6, 22);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
  camera.position.set(0.2, CAM_Y, 7.5);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));

  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(4.0, 6.0, 3.0);
  scene.add(key);

  const rim = new THREE.PointLight(0x3b82f6, 2.0, 30, 2);
  rim.position.set(-2.6, 1.3, 1.2);
  scene.add(rim);

  const rim2 = new THREE.PointLight(0xa855f7, 1.6, 30, 2);
  rim2.position.set(2.8, 0.8, 1.2);
  scene.add(rim2);

  // Composer + Bloom
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.0, 0.9, 0.15);
  bloom.strength = 1.12;
  bloom.radius = 0.72;
  bloom.threshold = 0.10;
  composer.addPass(bloom);

  // Resize (stable)
  function resize() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // =========================
  // Portal hero (RAISED)
  // =========================
const HERO_SCALE = 0.42;
const hero = new THREE.Group();
hero.position.set(PORTAL_X, PORTAL_Y, 2.0);
hero.scale.setScalar(HERO_SCALE);

// NEW: horizon look
hero.rotation.x = -0.95;
hero.rotation.z = 0.12;
hero.scale.y *= 0.55;

scene.add(hero);



  const matPortal = new THREE.MeshStandardMaterial({
    color: 0x0b1224,
    metalness: 0.65,
    roughness: 0.25,
    emissive: new THREE.Color(0x07122a),
    emissiveIntensity: 0.95,
  });

  const matNeonBlue = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    metalness: 0.35,
    roughness: 0.15,
    emissive: new THREE.Color(0x1533aa),
    emissiveIntensity: 1.2,
  });

  const matNeonPurple = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    metalness: 0.35,
    roughness: 0.18,
    emissive: new THREE.Color(0x3b1469),
    emissiveIntensity: 1.12,
  });

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.08, 20, 90), matNeonBlue);
  hero.add(ring);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 18, 80), matNeonPurple);
  ring2.rotation.x = Math.PI / 2.3;
  hero.add(ring2);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), matPortal);
  core.position.set(0, 0.05, 0);
  hero.add(core);

  // Orbiting tokens (lightweight)
  const tokenGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  const tokens = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(tokenGeo, i % 2 ? matNeonBlue : matNeonPurple);
    const a = (i / 14) * Math.PI * 2;
    const r = 1.65 + (i % 3) * 0.12;
    m.position.set(Math.cos(a) * r, Math.sin(a * 2) * 0.15, Math.sin(a) * r);
    hero.add(m);
    tokens.push({ mesh: m, a, r, s: 0.9 + Math.random() * 0.6 });
  }

  // Particle field (stable)
  const pCount = 1300;
  const pos = new Float32Array(pCount * 3);
  const spd = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) {
    pos[i * 3 + 0] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 2] = -Math.random() * 18;
    spd[i] = 0.20 + Math.random() * 0.60;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ size: 0.012, transparent: true, opacity: 0.72, depthWrite: false })
  );
  scene.add(pts);

  // Mouse parallax
  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // IMPORTANT: lookAt is intentionally LOWER than the portal (pushes portal UP on screen)
  const lookAt = new THREE.Vector3(0, LOOK_Y, 0);

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();

    // Smooth camera
    camera.position.x = 0.2 + mouse.x * 0.35;
    camera.position.y = CAM_Y + -mouse.y * 0.18;
    camera.position.z = 7.5 + Math.sin(t * 0.15) * 0.14;
    camera.lookAt(lookAt);

    // Portal motion
    ring.rotation.y = t * 0.65;
    ring.rotation.x = Math.sin(t * 0.55) * 0.08;

    ring2.rotation.y = -t * 0.55;
    ring2.rotation.z = Math.cos(t * 0.35) * 0.10;

    core.rotation.y = t * 0.55;
    core.rotation.x = t * 0.35;
    const s = 1 + Math.sin(t * 1.8) * 0.05;
    core.scale.setScalar(s);

    for (const tk of tokens) {
      tk.a += 0.006 * tk.s;
      tk.mesh.position.x = Math.cos(tk.a) * tk.r;
      tk.mesh.position.z = Math.sin(tk.a) * tk.r;
      tk.mesh.position.y = Math.sin(t * 1.1 + tk.a * 2) * 0.16;
      tk.mesh.rotation.x += 0.01 * tk.s;
      tk.mesh.rotation.y += 0.012 * tk.s;
    }

    // Particles drift
    const a = pGeo.attributes.position.array;
    for (let i = 0; i < pCount; i++) {
      a[i * 3 + 2] += 0.012 * spd[i];
      if (a[i * 3 + 2] > 2) a[i * 3 + 2] = -18 - Math.random() * 6;
    }
    pGeo.attributes.position.needsUpdate = true;

    composer.render();
    requestAnimationFrame(tick);
  }
  tick();
}
