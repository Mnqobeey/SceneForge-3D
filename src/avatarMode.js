import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export async function initAvatarMode({ mountEl }) {
  /* =========================
     Renderer / Scene / Camera
  ========================== */
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;

  mountEl.innerHTML = "";
  mountEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141a24);
  scene.fog = new THREE.Fog(0x111722, 12, 30);

  const camera = new THREE.PerspectiveCamera(
    48,
    mountEl.clientWidth / mountEl.clientHeight,
    0.1,
    250
  );
  camera.position.set(4.05, 1.42, 3.0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.75, 1.22, -4.05);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.8;
  controls.maxDistance = 11;
  controls.maxPolarAngle = Math.PI * 0.5;
  controls.update();

  const cameraPresets = {
    student: {
      position: new THREE.Vector3(4.1, 1.38, 2.85),
      target: new THREE.Vector3(0.55, 1.2, -4.08),
    },
    instructor: {
      position: new THREE.Vector3(-2.85, 1.46, -2.18),
      target: new THREE.Vector3(1.1, 1.42, -4.55),
    },
    overview: {
      position: new THREE.Vector3(4.25, 2.42, 4.45),
      target: new THREE.Vector3(0.0, 1.08, -2.4),
    },
  };
  let cameraTween = null;

  function setCameraPreset(name = "student", options = {}) {
    const preset = cameraPresets[name] || cameraPresets.student;
    if (options.smooth) {
      cameraTween = {
        position: preset.position.clone(),
        target: preset.target.clone(),
      };
    } else {
      cameraTween = null;
      camera.position.copy(preset.position);
      controls.target.copy(preset.target);
      controls.update();
    }
  }

  /* =========================
     Lights (more real)
  ========================== */
  scene.add(new THREE.AmbientLight(0xc8d3e2, 0.4));
  scene.add(new THREE.HemisphereLight(0xf7fbff, 0x747c88, 1.14));

  const dir = new THREE.DirectionalLight(0xfff7e8, 1.34);
  dir.position.set(3.4, 6.8, 4.8);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 32;
  dir.shadow.camera.left = -7.5;
  dir.shadow.camera.right = 7.5;
  dir.shadow.camera.top = 7.5;
  dir.shadow.camera.bottom = -7.5;
  dir.shadow.bias = -0.0002;
  scene.add(dir);

  const warmFill = new THREE.PointLight(0xffead0, 0.88, 14, 2);
  warmFill.position.set(-2.8, 3.0, -4.5);
  scene.add(warmFill);

  const windowDaylight = new THREE.DirectionalLight(0xc9e4ff, 0.58);
  windowDaylight.position.set(-7.0, 3.2, 0.8);
  windowDaylight.target.position.set(0.5, 1.1, -1.3);
  scene.add(windowDaylight);
  scene.add(windowDaylight.target);

  const coolRim = new THREE.PointLight(0x7fb3ff, 0.42, 13, 2);
  coolRim.position.set(4.6, 2.6, 1.6);
  scene.add(coolRim);

  for (const [x, z] of [
    [-2.6, -2.8],
    [2.6, -2.8],
    [-2.6, 1.8],
    [2.6, 1.8],
  ]) {
    const overhead = new THREE.PointLight(0xfff3dc, 0.42, 8.5, 2.2);
    overhead.position.set(x, 4.35, z);
    scene.add(overhead);
  }

  const gltfLoader = new GLTFLoader();
  const fbxLoader = new FBXLoader();
  const envAssets = await loadEnvironmentAssets(gltfLoader);

  /* =========================
     Classroom Environment
  ========================== */
  const env = new THREE.Group();
  env.name = "NX_CLASSROOM_ENV";
  scene.add(env);

  const ROOM_W = 13.2;
  const ROOM_D = 10.2;
  const ROOM_H = 4.7;
  const BACK_Z = -5.25;
  const FRONT_Z = BACK_Z + ROOM_D;
  const SIDE_X = ROOM_W / 2;
  const ROOM_CENTER_Z = (BACK_Z + FRONT_Z) / 2;

  const matFloor = new THREE.MeshStandardMaterial({
    color: 0x5c554e,
    roughness: 0.86,
    metalness: 0.02,
  });

  const matWall = new THREE.MeshStandardMaterial({
    color: 0x343d50,
    roughness: 0.94,
    metalness: 0.0,
  });

  const matWallSide = new THREE.MeshStandardMaterial({
    color: 0x2b3447,
    roughness: 0.96,
    metalness: 0.0,
  });

  const matCeil = new THREE.MeshStandardMaterial({
    color: 0x3b4351,
    roughness: 0.86,
  });

  const matDesk = new THREE.MeshStandardMaterial({
    color: 0x2a3a46,
    roughness: 0.65,
    metalness: 0.05,
  });

  const matMetal = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    metalness: 0.62,
    roughness: 0.38,
  });

  const matBoard = new THREE.MeshStandardMaterial({
    color: 0x1b2f26,
    roughness: 0.55,
    emissive: new THREE.Color(0x08110d),
    emissiveIntensity: 0.25,
  });

  const screenDisplay = createTrainingScreenDisplay();
  const screenTexture = screenDisplay.texture;
  const matScreen = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: screenTexture,
    roughness: 0.2,
    metalness: 0.08,
    emissive: new THREE.Color(0x245bd8),
    emissiveMap: screenTexture,
    emissiveIntensity: 0.78,
  });

  const matStudentCloth = new THREE.MeshStandardMaterial({
    color: 0x435269,
    roughness: 0.9,
    metalness: 0.0,
  });
  const matStudentSkin = new THREE.MeshStandardMaterial({
    color: 0xd6b08a,
    roughness: 0.85,
    metalness: 0.0,
  });
  const matStudentHair = new THREE.MeshStandardMaterial({
    color: 0x1b2330,
    roughness: 0.8,
    metalness: 0.0,
  });

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = ROOM_CENTER_Z;
  floor.receiveShadow = true;
  env.add(floor);

  const grid = new THREE.GridHelper(ROOM_W, 12, 0x8f867a, 0x766f67);
  grid.position.set(0, 0.008, ROOM_CENTER_Z);
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  env.add(grid);

  // Walls
  const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), matWall);
  wallBack.position.set(0, ROOM_H / 2, BACK_Z);
  env.add(wallBack);

  const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), matWallSide);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.position.set(-SIDE_X, ROOM_H / 2, ROOM_CENTER_Z);
  env.add(wallLeft);

  const wallRight = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), matWallSide);
  wallRight.rotation.y = -Math.PI / 2;
  wallRight.position.set(SIDE_X, ROOM_H / 2, ROOM_CENTER_Z);
  env.add(wallRight);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), matCeil);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, ROOM_H, ROOM_CENTER_Z);
  env.add(ceil);

  const matTrim = new THREE.MeshStandardMaterial({ color: 0x838b95, roughness: 0.68, metalness: 0.05 });
  const baseboards = new THREE.Group();
  baseboards.name = "NX_ROOM_TRIM";
  const backTrim = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.12, 0.08), matTrim);
  backTrim.position.set(0, 0.11, BACK_Z + 0.04);
  const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, ROOM_D), matTrim);
  leftTrim.position.set(-SIDE_X + 0.04, 0.11, ROOM_CENTER_Z);
  const rightTrim = leftTrim.clone();
  rightTrim.position.x = SIDE_X - 0.04;
  const backChairRail = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.055, 0.055), matTrim);
  backChairRail.position.set(0, 1.25, BACK_Z + 0.045);
  const leftChairRail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, ROOM_D), matTrim);
  leftChairRail.position.set(-SIDE_X + 0.045, 1.25, ROOM_CENTER_Z);
  const rightChairRail = leftChairRail.clone();
  rightChairRail.position.x = SIDE_X - 0.045;
  baseboards.add(backTrim, leftTrim, rightTrim, backChairRail, leftChairRail, rightChairRail);
  env.add(baseboards);

  const architecture = new THREE.Group();
  architecture.name = "NX_ROOM_ARCHITECTURE";
  env.add(architecture);
  const windowZs = [-3.75, -0.8, 2.15];
  architecture.add(buildDoor({ x: SIDE_X - 0.055, z: 3.28, side: "right" }));
  windowZs.forEach((z) => architecture.add(buildWindow({ x: -SIDE_X + 0.06, z, side: "left" })));
  architecture.add(buildWallClock({ x: -5.05, y: 2.95, z: BACK_Z + 0.12 }));
  architecture.add(buildNoticeBoard({ x: SIDE_X - 0.08, y: 2.18, z: -1.15 }));
  architecture.add(buildStorageShelf({ x: SIDE_X - 0.48, z: 1.55 }));

  for (const z of windowZs) {
    const daylightPatch = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.35),
      new THREE.MeshBasicMaterial({
        color: 0xcbeaff,
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
      })
    );
    daylightPatch.rotation.x = -Math.PI / 2;
    daylightPatch.rotation.z = -0.18;
    daylightPatch.position.set(-3.7, 0.018, z + 0.32);
    env.add(daylightPatch);
  }

  // Ceiling panels
  const panels = new THREE.Group();
  panels.position.set(0, ROOM_H - 0.03, ROOM_CENTER_Z);
  env.add(panels);

  const panelGeo = new THREE.PlaneGeometry(1.7, 1.1);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x515967,
    roughness: 0.84,
    metalness: 0.0,
  });
  for (let x = -4; x <= 4; x += 2) {
    for (let z = -3.6; z <= 3.6; z += 2.4) {
      const p = new THREE.Mesh(panelGeo, panelMat);
      p.rotation.x = Math.PI / 2;
      p.position.set(x, 0, z);
      panels.add(p);
    }
  }

  for (const [x, z] of [
    [-2.6, -2.55],
    [2.6, -2.55],
    [-2.6, 1.45],
    [2.6, 1.45],
  ]) {
    const fixture = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 0.42),
      new THREE.MeshStandardMaterial({
        color: 0xfff1cf,
        roughness: 0.36,
        emissive: new THREE.Color(0xffdf9b),
        emissiveIntensity: 0.75,
      })
    );
    fixture.rotation.x = Math.PI / 2;
    fixture.position.set(x, 0.006, z);
    panels.add(fixture);
  }

  /* =========================
     Board + Screen (WORLD-safe)
  ========================== */
  const presentationBoard = envAssets.presentationBoard
    ? createAssetInstance(envAssets.presentationBoard, { height: 1.85 })
    : null;
  if (presentationBoard) {
    presentationBoard.position.set(-2.82, 0, BACK_Z + 0.72);
    presentationBoard.rotation.y = Math.PI * 0.93;
    env.add(presentationBoard);
  } else {
    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.85, 0.12), matMetal);
    boardFrame.position.set(-2.55, 2.1, BACK_Z + 0.06);
    boardFrame.castShadow = true;
    env.add(boardFrame);

    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 1.6), matBoard);
    board.position.set(-2.55, 2.1, BACK_Z + 0.12);
    env.add(board);
  }

  const presenterZone = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 1.55),
    new THREE.MeshBasicMaterial({
      color: 0x6ea8ff,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    })
  );
  presenterZone.rotation.x = -Math.PI / 2;
  presenterZone.position.set(0, 0.014, -3.65);
  env.add(presenterZone);

  // Screen group
  const screenGroup = new THREE.Group();
  screenGroup.name = "NX_SCREEN";

  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(3.15, 1.78, 0.13), matMetal);
  screenFrame.position.set(1.85, 2.25, BACK_Z + 0.07);
  screenFrame.castShadow = true;
  screenGroup.add(screenFrame);

  // screen plane (we point at THIS)
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 1.5), matScreen);
  screenMesh.position.set(1.85, 2.25, BACK_Z + 0.145);
  screenGroup.add(screenMesh);

  const screenShelf = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.08, 0.22), matMetal);
  screenShelf.position.set(1.85, 1.28, BACK_Z + 0.2);
  screenShelf.castShadow = true;
  screenGroup.add(screenShelf);

  const screenGlow = new THREE.PointLight(0x5ea1ff, 0.72, 7.5, 2);
  screenGlow.position.set(1.85, 2.24, BACK_Z + 0.92);
  screenGroup.add(screenGlow);

  env.add(screenGroup);

  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 0.72),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: createPosterTexture(),
      roughness: 0.55,
      metalness: 0.0,
    })
  );
  poster.position.set(5.05, 2.1, BACK_Z + 0.13);
  env.add(poster);

  /* =========================
     Student desks/chairs + students (MIRRORED)
  ========================== */
  const workstationGroup = new THREE.Group();
  workstationGroup.name = "NX_WORKSTATIONS";
  env.add(workstationGroup);

  const chairSpots = [];

  const dx = 2.42;
  const startX = -dx / 2;
  const startZ = -2.02;
  const dz = 1.42;

  const chairObjects = []; // for "walk to chair"

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const x = startX + col * dx;
      const z = startZ + row * dz;

      const d = envAssets.trainingDesk
        ? createAssetInstance(envAssets.trainingDesk, { height: 0.78 })
        : buildDesk({ w: 1.65, h: 0.72, d: 0.92 }, matDesk, matMetal);
      d.position.set(x, 0, z);
      d.rotation.y = Math.PI;
      workstationGroup.add(d);

      const terminal = buildTrainingTerminal(matMetal, matScreen);
      terminal.position.set(x + 0.03, 0.69, z - 0.24);
      terminal.rotation.y = Math.PI;
      workstationGroup.add(terminal);

      if ((row + col) % 2 === 0 && envAssets.bookStack) {
        const books = createAssetInstance(envAssets.bookStack, { width: 0.32 });
        books.position.set(x - 0.48, 0, z + 0.04);
        books.rotation.y = -0.28;
        placeObjectOnTop(books, d, 0.012);
        workstationGroup.add(books);
      }

      const chair = envAssets.trainingChair
        ? createAssetInstance(envAssets.trainingChair, { height: 0.88 })
        : buildChair(matDesk, matMetal);
      chair.position.set(x, 0, z + 0.78);
      chair.rotation.y = Math.PI;
      chair.name = `NX_CHAIR_${row}_${col}`;
      workstationGroup.add(chair);
      chairObjects.push(chair);

      chairSpots.push({ x: chair.position.x, z: chair.position.z, rotY: chair.rotation.y });
    }
  }

  const students = new THREE.Group();
  students.name = "NX_STUDENTS";
  env.add(students);

  const studentMixers = [];
  const realStudentIndices = new Set();
  const realStudentAssets = await loadRealStudentAssets(fbxLoader);
  if (realStudentAssets) {
    const realStudentPlan = [
      { chairIndex: 0, model: "primary", clip: "idle", xOffset: -0.05, zOffset: -0.08, yOffset: -0.01, scale: 0.0095, rotationOffset: -0.025, timeOffset: 0.25, timeScale: 0.62 },
      { chairIndex: 2, model: "idleAlt", clip: "talking", xOffset: -0.02, zOffset: -0.08, yOffset: -0.01, scale: 0.0061, rotationOffset: -0.016, timeOffset: 0.7, timeScale: 0.28 },
      { chairIndex: 3, model: "ch02", clip: "native", xOffset: 0.03, zOffset: -0.08, yOffset: -0.01, scale: 0.0082, rotationOffset: 0.018, timeOffset: 1.4, timeScale: 0.54 },
    ];

    for (const plan of realStudentPlan) {
      const spot = chairSpots[plan.chairIndex];
      if (!spot) continue;
      const student = createRealStudentInstance(realStudentAssets, spot, plan, studentMixers);
      if (!student) continue;
      students.add(student);
      realStudentIndices.add(plan.chairIndex);
    }
  }

  for (let i = 0; i < chairSpots.length; i++) {
    if (realStudentIndices.has(i)) continue;
    const s = buildStudent(matStudentCloth, matStudentSkin, matStudentHair, i);
    s.position.set(chairSpots[i].x + ((i % 2) * 2 - 1) * 0.045, 0, chairSpots[i].z - 0.05);
    s.rotation.y = chairSpots[i].rotY + (i % 2 === 0 ? -0.035 : 0.035);
    students.add(s);
  }

  /* =========================
     Front desk
  ========================== */
  const frontDesk = envAssets.presenterDesk
    ? createAssetInstance(envAssets.presenterDesk, { width: 2.25 })
    : buildDesk({ w: 2.45, h: 0.78, d: 1.05 }, matDesk, matMetal);
  frontDesk.position.set(-1.18, 0, -3.98);
  frontDesk.rotation.y = 0;
  frontDesk.name = "NX_FRONT_DESK";
  env.add(frontDesk);

  if (envAssets.deskLamp) {
    const lamp = createAssetInstance(envAssets.deskLamp, { height: 0.54 });
    lamp.position.set(-1.88, 0, -4.12);
    lamp.rotation.y = -0.55;
    placeObjectOnTop(lamp, frontDesk, 0.012);
    env.add(lamp);
  }

  if (envAssets.bookStack) {
    const teacherBooks = createAssetInstance(envAssets.bookStack, { width: 0.42 });
    teacherBooks.position.set(-0.52, 0, -4.1);
    teacherBooks.rotation.y = 0.35;
    placeObjectOnTop(teacherBooks, frontDesk, 0.012);
    env.add(teacherBooks);
  }

  const teachingProp = buildTeachingProp();
  teachingProp.position.set(-0.92, 0, -3.82);
  teachingProp.rotation.y = 0.12;
  placeObjectOnTop(teachingProp, frontDesk, 0.018);
  teachingProp.name = "NX_TEACHING_PROP";
  env.add(teachingProp);

  if (envAssets.pottedPlant) {
    const plant = createAssetInstance(envAssets.pottedPlant, { height: 0.92 });
    plant.position.set(5.55, 0, -4.55);
    plant.rotation.y = -0.8;
    env.add(plant);
  }

  const focusSystem = createTeachingFocusSystem({
    env,
    screenMesh,
    screenFrame,
    frontDesk,
    teachingProp,
    backZ: BACK_Z,
  });

  /* =========================
     Avatar + Animations
  ========================== */
  const avatar = await loadFBX(fbxLoader, "/avatar/Xbot.fbx");

  avatar.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false;
    }
  });

  avatar.scale.setScalar(0.01);

  // Teacher front position facing students (+Z)
  avatar.position.set(0.72, 0, -3.86);
  avatar.rotation.y = 0;
  scene.add(avatar);

  const mixer = new THREE.AnimationMixer(avatar);
  const actions = {};
  let active = null;

  async function loadClip(name, url) {
    const fbx = await loadFBX(fbxLoader, url);
    const clip = fbx.animations?.[0];
    if (!clip) throw new Error(`Missing animation in ${url}`);
    const a = mixer.clipAction(clip);
    a.enabled = true;
    a.setEffectiveTimeScale(1);
    a.setEffectiveWeight(1);
    actions[name] = a;
  }

  await Promise.all([
    loadClip("idle", "/avatar/idle.fbx"),
    loadClip("walk", "/avatar/walk.fbx"),
    loadClip("wave", "/avatar/wave.fbx"),
    loadClip("point", "/avatar/point.fbx"),
    loadClip("posture", "/avatar/posture.fbx"),
  ]);

  function fadeTo(action, fade = 0.28, timeScale = 1) {
    if (!action) return;

    for (const a of Object.values(actions)) {
      if (!a || a === action) continue;
      if (a.isRunning()) a.fadeOut(fade);
    }

    action.reset();
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.setEffectiveTimeScale(timeScale);
    action.fadeIn(fade).play();

    if (active && active !== action) active.crossFadeTo(action, fade, false);
    active = action;
  }

  function playLoop(name) {
    const a = actions[name];
    if (!a) return;
    a.setLoop(THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = false;
    fadeTo(a, name === "walk" ? 0.34 : 0.28, name === "walk" ? 0.74 : 1);
  }

  function playOnce(name) {
    const a = actions[name];
    if (!a) return 0;
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    const timeScale = name === "wave" ? 0.92 : name === "point" ? 0.9 : 1;
    fadeTo(a, 0.24, timeScale);
    return a.getClip().duration || 1.0;
  }

  playLoop("idle");

  /* =========================
     WORLD-SAFE target helpers (FIXES SCREEN BUGS)
  ========================== */
  const tmpBox = new THREE.Box3();
  const tmpCenter = new THREE.Vector3();
  const tmpSize = new THREE.Vector3();

  function getWorldCenter(obj) {
    tmpBox.setFromObject(obj);
    tmpBox.getCenter(tmpCenter);
    return tmpCenter.clone();
  }

  function getStopPointFor(obj, extra = 0.75) {
    tmpBox.setFromObject(obj);
    tmpBox.getCenter(tmpCenter);
    tmpBox.getSize(tmpSize);

    const maxDim = Math.max(tmpSize.x, tmpSize.z) || 1;
    const stopDist = maxDim * 0.5 + extra;

    const from = avatar.position.clone();
    const to = tmpCenter.clone();
    const dir = to.sub(from);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
    dir.normalize();

    return tmpCenter.clone().addScaledVector(dir, -stopDist);
  }

  function yawTo(facePos) {
    const v = facePos.clone().sub(avatar.position);
    v.y = 0;
    if (v.lengthSq() < 1e-6) return avatar.rotation.y;
    return Math.atan2(v.x, v.z);
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function rotLerpY(current, target, t) {
    const c = normalizeAngle(current);
    const d = normalizeAngle(target - c);
    return c + d * t;
  }

  function setTurnTargetYaw(yaw) {
    avatar.userData.__turnTarget = normalizeAngle(yaw);
  }

  function faceWorldSmooth(worldPos) {
    setTurnTargetYaw(yawTo(worldPos));
  }

  /* =========================
     Walk state + smooth turning
  ========================== */
  let walkingTo = null;
  let walkFace = null; // world position to face while walking
  let afterWalk = null;
  let resolveWalk = null;
  const WALK_SPEED = 0.56;
  const WALK_TURN_RATE = 5.6;
  const WALK_ARRIVE_RADIUS = 0.11;

  function cancelWalk() {
    walkingTo = null;
    walkFace = null;
    afterWalk = null;
    if (resolveWalk) {
      const resolve = resolveWalk;
      resolveWalk = null;
      resolve(false);
    }
  }

  function startWalkTo(dest, faceWorldPos, onArrive) {
    cancelWalk();
    delete avatar.userData.__turnTarget;
    walkingTo = dest.clone();
    walkingTo.y = avatar.position.y;
    walkFace = faceWorldPos ? faceWorldPos.clone() : null;
    playLoop("walk");
    return new Promise((resolve) => {
      resolveWalk = resolve;
      afterWalk = () => {
        Promise.resolve(typeof onArrive === "function" ? onArrive() : undefined).finally(() => {
          if (resolveWalk === resolve) resolveWalk = null;
          resolve(true);
        });
      };
    });
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Home for "walk back"/reset
  const HOME_POS = avatar.position.clone();
  const HOME_YAW = avatar.rotation.y; // facing students (+Z)

  /* =========================
     Screen flicker (subtle)
  ========================== */
  const baseEmissive = matScreen.emissiveIntensity;
  let flickerPhase = Math.random() * 1000;

  /* =========================
     Actions
  ========================== */
  async function pointThenPose(say) {
    playOnce("point");
    say?.("Pointing.");
    await wait(650);

    playOnce("posture");
    say?.("Safety posture.");
    await wait(900);

    playLoop("idle");
  }

  async function walkBack(say) {
    say?.("Walking back...");
    await startWalkTo(HOME_POS, new THREE.Vector3(0, avatar.position.y, 10), () => {
      avatar.position.copy(HOME_POS);
      setTurnTargetYaw(HOME_YAW);
      playLoop("idle");
      say?.("Back at the front.");
    });
  }

  /* =========================
     Commands (FIXED)
  ========================== */
  async function runCommand(text, say) {
    const t = String(text || "").toLowerCase().trim();
    if (!t) return;

    // back/reset
    if (t === "reset" || t.includes("walk back") || t.includes("go back") || t === "back") {
      await walkBack(say);
      return;
    }

    // walk to chair (nearest chair)
    if ((t.includes("walk") || t.includes("go")) && t.includes("chair")) {
      let best = null;
      let bestD = Infinity;
      for (const c of chairObjects) {
        const wc = getWorldCenter(c);
        const d = wc.distanceTo(avatar.position);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (!best) {
        say?.("No chair found.");
        return;
      }

      const center = getWorldCenter(best);
      const stop = getStopPointFor(best, 0.55);

      say?.("Walking to the chair...");
      await startWalkTo(stop, center, () => {
        playLoop("idle");
        setTurnTargetYaw(Math.PI);
        say?.("At the chair.");
      });
      return;
    }

    // walk to desk
    if ((t.includes("walk") || t.includes("go")) && (t.includes("desk") || t.includes("front desk"))) {
      const center = getWorldCenter(frontDesk);
      const stop = new THREE.Vector3(-0.08, avatar.position.y, -3.5);

      focusSystem.set("desk");
      say?.("Walking to the desk...");
      await startWalkTo(stop, center, () => {
        playLoop("idle");
        faceWorldSmooth(center);
        say?.("At the desk.");
      });
      return;
    }

    // walk to screen
    if ((t.includes("walk") || t.includes("go")) && t.includes("screen")) {
      const center = getWorldCenter(screenMesh); // point to the actual screen
      const stop = new THREE.Vector3(1.1, avatar.position.y, -3.58);

      focusSystem.set("screen");
      say?.("Walking to the screen...");
      await startWalkTo(stop, center, () => {
        playLoop("idle");
        faceWorldSmooth(center);
        say?.("Arrived at the screen.");
      });
      return;
    }

    // point at screen (walk -> point -> pose -> TURN BACK TO CLASS)
    if (t.includes("point") && t.includes("screen")) {
      const center = getWorldCenter(screenMesh);
      const stop = new THREE.Vector3(1.1, avatar.position.y, -3.58);

      focusSystem.set("screen");
      say?.("Walking to the screen...");
      await startWalkTo(stop, center, async () => {
        faceWorldSmooth(center);
        await wait(260);

        await pointThenPose(say);

        // IMPORTANT: turn back to class (students) and stay there
        say?.("Turning back to the class...");
        setTurnTargetYaw(HOME_YAW);
      });
      return;
    }

    // point at desk (no walk)
    if (t.includes("point") && t.includes("desk")) {
      const c = getWorldCenter(frontDesk);
      focusSystem.set("desk");
      faceWorldSmooth(c);
      playOnce("point");
      say?.("Pointing at the desk.");
      return;
    }

    // point at chair (no walk)
    if (t.includes("point") && t.includes("chair")) {
      let best = null;
      let bestD = Infinity;
      for (const c of chairObjects) {
        const wc = getWorldCenter(c);
        const d = wc.distanceTo(avatar.position);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (!best) {
        say?.("No chair found.");
        return;
      }
      const c = getWorldCenter(best);
      faceWorldSmooth(c);
      playOnce("point");
      say?.("Pointing at the chair.");
      return;
    }

    // wave
    if (t.includes("wave")) {
      setTurnTargetYaw(HOME_YAW);
      playOnce("wave");
      say?.("Waving.");
      return;
    }

    // posture
    if (t.includes("pose") || t.includes("posture")) {
      playOnce("posture");
      say?.("Safety posture.");
      return;
    }

    playLoop("idle");
    say?.("Ready.");
  }

  /* =========================
     Guided Scenario
  ========================== */
  let scenarioToken = 0;
  let scenarioRunning = false;

  const emergencyScenarioSteps = [
    {
      id: "welcome",
      title: "Welcome",
      text:
        "Welcome to the SceneForge Training Lab. Today we will go through an emergency response walkthrough.",
      subtitle: "Welcome. The instructor will guide the class through a short emergency response process.",
      screen: { mode: "default" },
      focus: "none",
      camera: "student",
      action: async () => {
        setTurnTargetYaw(HOME_YAW);
        await wait(450);
        playOnce("wave");
        await wait(1850);
        playLoop("idle");
      },
    },
    {
      id: "module-intro",
      title: "Module Intro",
      text:
        "We begin at the training screen, where the emergency response process is introduced.",
      subtitle: "The screen introduces the four-part response flow: recognise, alert, procedure, action.",
      screen: { mode: "module", active: 0, subtitle: "Recognise | Alert | Procedure | Action" },
      focus: "screen",
      camera: "student",
      action: async () => {
        const center = getWorldCenter(screenMesh);
        await startWalkTo(new THREE.Vector3(1.1, avatar.position.y, -3.58), center, () => {
          playLoop("idle");
          faceWorldSmooth(center);
        });
        await wait(700);
      },
    },
    {
      id: "emergency-response",
      title: "Emergency Response Module",
      text:
        "Emergency response includes recognising the issue, alerting others, following safety procedures, and taking the correct next action.",
      subtitle: "Recognise the issue, alert others, follow procedure, then take the safest action.",
      screen: { mode: "module", active: 1, subtitle: "Recognise the issue, then alert others" },
      focus: "screen",
      camera: "instructor",
      action: async () => {
        faceWorldSmooth(getWorldCenter(screenMesh));
        await wait(1250);
      },
    },
    {
      id: "key-focus",
      title: "Key Focus",
      text: "Please pay attention to the steps displayed on the screen.",
      subtitle: "Focus on the process displayed on the screen before moving to the desk materials.",
      screen: { mode: "module", active: 2, subtitle: "Follow procedure before taking action" },
      focus: "screen",
      camera: "instructor",
      action: async () => {
        faceWorldSmooth(getWorldCenter(screenMesh));
        await wait(450);
        await pointThenPose();
      },
    },
    {
      id: "presenter-area",
      title: "Presenter Area",
      text:
        "We now move to the desk area, where supporting training materials and instructions are available.",
      subtitle: "The instructor moves to the desk to show the supporting checklist and training materials.",
      screen: { mode: "module", active: 3, subtitle: "Use the checklist, then take safe action" },
      focus: "desk",
      camera: "instructor",
      action: async () => {
        const center = getWorldCenter(frontDesk);
        await startWalkTo(new THREE.Vector3(-0.08, avatar.position.y, -3.5), center, () => {
          playLoop("idle");
          faceWorldSmooth(center);
        });
        await wait(900);
      },
    },
    {
      id: "summary",
      title: "Summary",
      text:
        "This concludes the emergency response walkthrough. Always follow the correct procedure and remain calm.",
      subtitle: "Walkthrough complete. Remain calm, follow procedure, and take the correct next action.",
      screen: { mode: "complete" },
      focus: "none",
      camera: "student",
      action: async () => {
        setTurnTargetYaw(HOME_YAW);
        await wait(650);
        playOnce("posture");
        await wait(1650);
        playLoop("idle");
      },
    },
  ];

  function applyScenarioScreen(step, index, total) {
    const screen = step.screen || { mode: "default" };
    if (screen.mode === "complete") {
      screenDisplay.setComplete();
      return;
    }
    if (screen.mode === "module") {
      screenDisplay.setModule({
        title: "Emergency Response Module",
        subtitle: screen.subtitle || step.subtitle || "Recognise | Alert | Follow Procedure | Take Action",
        active: screen.active ?? index,
        progress: `${index + 1}/${total}`,
      });
      return;
    }
    screenDisplay.setDefault();
  }

  async function runEmergencyScenario(callbacks = {}) {
    if (scenarioRunning) return { ok: false, reason: "already-running" };
    const token = ++scenarioToken;
    scenarioRunning = true;

    try {
      callbacks.onLog?.("Emergency Response Walkthrough started.");
      for (let i = 0; i < emergencyScenarioSteps.length; i++) {
        if (token !== scenarioToken) return { ok: false, reason: "cancelled" };
        const step = emergencyScenarioSteps[i];
        applyScenarioScreen(step, i, emergencyScenarioSteps.length);
        focusSystem.set(step.focus || "none");
        if (step.camera) setCameraPreset(step.camera, { smooth: true });
        callbacks.onStep?.({
          id: step.id,
          title: step.title,
          text: step.text,
          subtitle: step.subtitle,
          index: i + 1,
          total: emergencyScenarioSteps.length,
        });
        callbacks.onLog?.(`Step ${i + 1}/${emergencyScenarioSteps.length}: ${step.title}`);
        await step.action?.();
        if (token !== scenarioToken) return { ok: false, reason: "cancelled" };
        await wait(700);
      }

      screenDisplay.setComplete();
      focusSystem.set("none");
      callbacks.onComplete?.({
        title: "Walkthrough Complete",
        text: "Emergency Response Walkthrough complete.",
        subtitle: "Emergency Response Walkthrough complete.",
      });
      callbacks.onLog?.("Emergency Response Walkthrough complete.");
      return { ok: true };
    } finally {
      if (token === scenarioToken) scenarioRunning = false;
    }
  }

  async function resetScenario(callbacks = {}) {
    scenarioToken++;
    scenarioRunning = false;
    cancelWalk();
    screenDisplay.setDefault();
    focusSystem.set("none");
    setCameraPreset("student", { smooth: true });
    callbacks.onLog?.("Scenario reset.");
    callbacks.onStep?.({
      id: "reset",
      title: "Scenario Reset",
      text: "The walkthrough has been reset. The training lab is ready.",
      subtitle: "Scenario reset. The training lab is ready.",
      index: 0,
      total: emergencyScenarioSteps.length,
    });
    await walkBack();
    return { ok: true };
  }

  /* =========================
     Resize
  ========================== */
  const ro = new ResizeObserver(() => {
    const w = Math.max(1, mountEl.clientWidth);
    const h = Math.max(1, mountEl.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  ro.observe(mountEl);

  /* =========================
     Update Loop
  ========================== */
  const clock = new THREE.Clock();

  function tick() {
    const dt = clock.getDelta();
    mixer.update(dt);
    for (const studentMixer of studentMixers) studentMixer.update(dt);
    if (cameraTween) {
      camera.position.lerp(cameraTween.position, Math.min(1, dt * 1.4));
      controls.target.lerp(cameraTween.target, Math.min(1, dt * 1.4));
      if (
        camera.position.distanceTo(cameraTween.position) < 0.015 &&
        controls.target.distanceTo(cameraTween.target) < 0.015
      ) {
        camera.position.copy(cameraTween.position);
        controls.target.copy(cameraTween.target);
        cameraTween = null;
      }
    }
    controls.update();
    focusSystem.update(dt);

    // Smooth "turn back" target (set by point-screen sequence)
    if (typeof avatar.userData.__turnTarget === "number") {
      const target = avatar.userData.__turnTarget;
      avatar.rotation.y = rotLerpY(avatar.rotation.y, target, Math.min(1, 6.5 * dt));
      if (Math.abs(normalizeAngle(target - avatar.rotation.y)) < 0.01) {
        delete avatar.userData.__turnTarget;
      }
    }

    // Walking movement + smooth face while walking (WORLD SAFE)
    if (walkingTo) {
      const desiredYaw = walkFace ? yawTo(walkFace) : yawTo(walkingTo);
      avatar.rotation.y = rotLerpY(avatar.rotation.y, desiredYaw, Math.min(1, WALK_TURN_RATE * dt));

      const v = walkingTo.clone().sub(avatar.position);
      v.y = 0;
      const remaining = v.length();

      if (remaining < WALK_ARRIVE_RADIUS) {
        avatar.position.x = walkingTo.x;
        avatar.position.z = walkingTo.z;
        walkingTo = null;
        walkFace = null;

        playLoop("idle");
        const cb = afterWalk;
        afterWalk = null;
        cb?.();
      } else {
        v.normalize();
        avatar.position.addScaledVector(v, Math.min(remaining, WALK_SPEED * dt));
      }
    }

    // Subtle screen flicker
    flickerPhase += dt;
    const slow = 0.08 * Math.sin(flickerPhase * 2.3);
    const wobble = 0.03 * Math.sin(flickerPhase * 17.0 + 1.7);
    matScreen.emissiveIntensity = baseEmissive * (1 + slow + wobble);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  return {
    runCommand,
    runScenario: runEmergencyScenario,
    resetScenario,
    setCameraPreset,
    getScreenState: () => screenDisplay.getState(),
    scene,
    renderer,
  };
}

function loadFBX(loader, url) {
  return new Promise((res, rej) => loader.load(url, res, undefined, rej));
}

function loadGLTF(loader, url) {
  return new Promise((res, rej) => loader.load(url, (gltf) => res(gltf.scene), undefined, rej));
}

async function loadEnvironmentAssets(loader) {
  const assets = {
    trainingDesk: "/avatar/environment/training_desk.glb",
    trainingChair: "/avatar/environment/training_chair.glb",
    presenterDesk: "/avatar/environment/presenter_desk.glb",
    presentationBoard: "/avatar/environment/presentation_board.glb",
    deskLamp: "/avatar/environment/desk_lamp.glb",
    bookStack: "/avatar/environment/book_stack.glb",
    pottedPlant: "/avatar/environment/potted_plant.glb",
  };

  const loaded = {};
  await Promise.all(
    Object.entries(assets).map(async ([key, url]) => {
      try {
        loaded[key] = await loadGLTF(loader, url);
        setObjectShadows(loaded[key]);
      } catch (error) {
        console.warn(`[SceneForge] Avatar environment asset failed: ${url}`, error);
        loaded[key] = null;
      }
    })
  );

  return loaded;
}

async function loadRealStudentAssets(loader) {
  const modelSources = {
    primary: "/avatar/students/sitting_student.fbx",
    idleAlt: "/avatar/students/sitting_idle_student_alt.fbx",
    ch02: "/avatar/students/sitting_student_ch02.fbx",
  };

  const clipSources = {
    idle: "/avatar/students/sitting_idle.fbx",
    talking: "/avatar/students/sitting_talking_student.fbx",
  };

  const models = {};
  await Promise.all(
    Object.entries(modelSources).map(async ([key, url]) => {
      try {
        const object = await loadFBX(loader, url);
        setObjectShadows(object);
        models[key] = {
          key,
          object,
          nativeClip: object.animations?.[0] || null,
        };
      } catch (error) {
        console.warn(`[SceneForge] Real student model failed: ${url}`, error);
      }
    })
  );

  if (!Object.keys(models).length) {
    console.warn("[SceneForge] No real student models loaded; using placeholders.");
    return null;
  }

  const clips = {};
  await Promise.all(
    Object.entries(clipSources).map(async ([key, url]) => {
      try {
        const fbx = await loadFBX(loader, url);
        if (fbx.animations?.[0]) clips[key] = fbx.animations[0];
      } catch (error) {
        console.warn(`[SceneForge] Student animation failed: ${url}`, error);
      }
    })
  );

  return { models, clips };
}

function createRealStudentInstance(assets, spot, plan, mixers) {
  try {
    const modelRecord =
      assets.models[plan.model] ||
      assets.models.primary ||
      Object.values(assets.models)[0];

    if (!modelRecord) return null;

    const student = SkeletonUtils.clone(modelRecord.object);
    student.name = `NX_REAL_STUDENT_${plan.chairIndex}`;
    applyStudentVariation(student, plan);
    student.scale.setScalar(plan.scale || 0.01);
    student.rotation.y = spot.rotY + (plan.rotationOffset || 0);
    student.position.set(
      spot.x + (plan.xOffset || 0),
      0,
      spot.z + (plan.zOffset || 0)
    );

    setObjectShadows(student);

    const box = new THREE.Box3().setFromObject(student);
    if (Number.isFinite(box.min.y)) student.position.y -= box.min.y;
    student.position.y += plan.yOffset ?? -0.01;

    const mixer = new THREE.AnimationMixer(student);
    const clip = pickStudentClip(assets, modelRecord, plan);
    if (clip) {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      action.enabled = true;
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(plan.timeScale ?? 0.6);
      action.play();
      action.time = plan.timeOffset ?? ((plan.chairIndex * 0.57) % Math.max(clip.duration, 1));
      mixers.push(mixer);
    }

    return student;
  } catch (error) {
    console.warn("[SceneForge] Real student instance failed; using placeholder.", error);
    return null;
  }
}

function pickStudentClip(assets, modelRecord, plan) {
  if (plan.clip === "idle" && modelRecord.key === "primary") {
    return assets.clips.idle || modelRecord.nativeClip;
  }

  if (plan.clip === "talking") {
    return assets.clips.talking || modelRecord.nativeClip || assets.clips.idle;
  }

  return modelRecord.nativeClip || assets.clips.idle;
}

function applyStudentVariation(student, plan) {
  if (!plan.clothTint) return;

  const tint = new THREE.Color(plan.clothTint);
  const strength = plan.tintStrength ?? 0.28;

  student.traverse((node) => {
    if (!node.isMesh || !node.material) return;

    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const cloned = materials.map((material) => {
      const next = material.clone();
      if (shouldTintStudentMaterial(node.name, next.name) && next.color) {
        next.color.lerp(tint, strength);
        next.needsUpdate = true;
      }
      return next;
    });

    node.material = Array.isArray(node.material) ? cloned : cloned[0];
  });
}

function shouldTintStudentMaterial(meshName = "", materialName = "") {
  const label = `${meshName} ${materialName}`.toLowerCase();
  const excluded = ["skin", "face", "head", "hair", "eye", "lash", "teeth", "shoe", "sneaker", "sole"];
  if (excluded.some((token) => label.includes(token))) return false;

  const included = ["cloth", "clothes", "dress", "shirt", "top", "torso", "pants", "short", "skirt", "outfit"];
  return included.some((token) => label.includes(token));
}

function setObjectShadows(object) {
  object.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
    if (node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        material.needsUpdate = true;
      });
    }
  });
}

function createAssetInstance(template, target = {}) {
  const root = template.clone(true);
  const group = new THREE.Group();
  group.add(root);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  let scale = 1;
  if (target.height && size.y > 0) scale = target.height / size.y;
  else if (target.width && size.x > 0) scale = target.width / size.x;
  else if (target.depth && size.z > 0) scale = target.depth / size.z;
  root.scale.multiplyScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(root);
  const center = scaledBox.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= scaledBox.min.y;

  setObjectShadows(group);
  return group;
}

function placeObjectOnTop(object, surface, gap = 0.01) {
  const surfaceBox = new THREE.Box3().setFromObject(surface);
  const objectBox = new THREE.Box3().setFromObject(object);
  if (!Number.isFinite(surfaceBox.max.y) || !Number.isFinite(objectBox.min.y)) return;
  object.position.y += surfaceBox.max.y - objectBox.min.y + gap;
}

function createTeachingFocusSystem({ env, screenMesh, screenFrame, frontDesk, teachingProp, backZ }) {
  const group = new THREE.Group();
  group.name = "NX_TEACHING_FOCUS";
  env.add(group);

  const screenMat = new THREE.MeshBasicMaterial({
    color: 0x9bd7ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffd36e,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const labelMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: createFocusLabelTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const screenBox = new THREE.Box3().setFromObject(screenFrame || screenMesh);
  const screenCenter = screenBox.getCenter(new THREE.Vector3());
  const screenSize = screenBox.getSize(new THREE.Vector3());
  const screenFrameGroup = new THREE.Group();
  screenFrameGroup.name = "NX_SCREEN_FOCUS";
  const z = backZ + 0.21;
  const w = Math.max(screenSize.x + 0.18, 3.3);
  const h = Math.max(screenSize.y + 0.18, 1.92);
  const bars = [
    [0, h / 2, w, 0.045],
    [0, -h / 2, w, 0.045],
    [-w / 2, 0, 0.045, h],
    [w / 2, 0, 0.045, h],
  ];
  for (const [x, y, bw, bh] of bars) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), screenMat);
    bar.position.set(screenCenter.x + x, screenCenter.y + y, z);
    screenFrameGroup.add(bar);
  }
  group.add(screenFrameGroup);

  const deskRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.69, 64), ringMat);
  deskRing.name = "NX_DESK_FOCUS";
  deskRing.rotation.x = -Math.PI / 2;
  deskRing.position.set(-0.92, 0.035, -3.82);
  group.add(deskRing);

  const propLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.28), labelMat);
  propLabel.position.set(-0.92, 1.18, -3.48);
  propLabel.rotation.x = -0.12;
  group.add(propLabel);

  const screenLight = new THREE.PointLight(0x80c8ff, 0, 5.2, 2);
  screenLight.position.set(screenCenter.x, screenCenter.y, z + 0.56);
  group.add(screenLight);

  const deskLight = new THREE.PointLight(0xffd68a, 0, 3.2, 2.4);
  deskLight.position.copy(getObjectTopCenter(teachingProp || frontDesk));
  deskLight.position.y += 0.55;
  group.add(deskLight);

  let active = "none";
  let phase = 0;

  function set(target = "none") {
    active = target;
  }

  function update(dt) {
    phase += dt;
    const pulse = 0.72 + 0.28 * Math.sin(phase * 3.2);
    const screenOpacity = active === "screen" ? 0.42 * pulse : 0;
    const deskOpacity = active === "desk" ? 0.5 * pulse : 0;
    screenFrameGroup.traverse((node) => {
      if (node.material) node.material.opacity = screenOpacity;
    });
    ringMat.opacity = deskOpacity;
    labelMat.opacity = active === "desk" ? 0.72 : 0;
    screenLight.intensity = active === "screen" ? 0.95 * pulse : 0;
    deskLight.intensity = active === "desk" ? 0.82 * pulse : 0;
  }

  return { set, update, getActive: () => active };
}

function getObjectTopCenter(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  center.y = box.max.y;
  return center;
}

function buildDoor({ x, z }) {
  const g = new THREE.Group();
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.72, metalness: 0.02 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4d7dd, roughness: 0.62, metalness: 0.02 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xc7b26f, roughness: 0.35, metalness: 0.55 });

  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.08, 0.92), doorMat);
  slab.position.set(x, 1.08, z);
  slab.castShadow = true;
  slab.receiveShadow = true;
  g.add(slab);

  for (const [dy, dz, sx, sy, sz] of [
    [0, -0.52, 0.12, 2.32, 0.09],
    [0, 0.52, 0.12, 2.32, 0.09],
    [2.22, 0, 0.12, 0.12, 1.16],
  ]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frameMat);
    frame.position.set(x - 0.015, dy ? dy : 1.16, z + dz);
    frame.castShadow = true;
    g.add(frame);
  }

  const panelA = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.58, 0.56), doorMat);
  panelA.position.set(x - 0.045, 1.38, z);
  panelA.scale.x = 0.6;
  const panelB = panelA.clone();
  panelB.position.y = 0.66;
  g.add(panelA, panelB);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), metalMat);
  knob.position.set(x - 0.09, 0.95, z - 0.32);
  knob.castShadow = true;
  g.add(knob);

  return g;
}

function buildWindow({ x, z }) {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xd6dce5, roughness: 0.48, metalness: 0.04 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xd2ebff,
    roughness: 0.12,
    metalness: 0.0,
    emissive: new THREE.Color(0xa8d8ff),
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.72,
  });
  const blindMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });

  const outsideSky = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 1.02, 1.22),
    new THREE.MeshBasicMaterial({
      color: 0xccecff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    })
  );
  outsideSky.position.set(x - 0.042, 2.58, z);
  g.add(outsideSky);

  const outsideHorizon = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.2, 1.14),
    new THREE.MeshBasicMaterial({
      color: 0x8ab6a5,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );
  outsideHorizon.position.set(x - 0.05, 2.18, z);
  g.add(outsideHorizon);

  const skyGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 1.02, 1.24),
    new THREE.MeshBasicMaterial({
      color: 0xdff4ff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  skyGlow.position.set(x - 0.03, 2.48, z);
  g.add(skyGlow);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.08, 1.36), glassMat);
  glass.position.set(x, 2.48, z);
  g.add(glass);

  const strips = [
    [0, 0.6, 0, 0.075, 0.09, 1.54],
    [0, -0.6, 0, 0.075, 0.09, 1.54],
    [0, 0, -0.74, 0.075, 1.28, 0.09],
    [0, 0, 0.74, 0.075, 1.28, 0.09],
    [0, 0, 0, 0.08, 1.13, 0.045],
  ];
  for (const [dx, dy, dz, sx, sy, sz] of strips) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frameMat);
    frame.position.set(x + dx + 0.012, 2.48 + dy, z + dz);
    frame.castShadow = true;
    g.add(frame);
  }

  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 1.68), frameMat);
  sill.position.set(x + 0.08, 1.8, z);
  sill.castShadow = true;
  sill.receiveShadow = true;
  g.add(sill);

  for (let i = 0; i < 4; i++) {
    const blind = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.035, 1.26), blindMat);
    blind.position.set(x + 0.038, 2.78 - i * 0.16, z);
    g.add(blind);
  }

  return g;
}

function buildTeachingProp() {
  const g = new THREE.Group();
  const manualMat = new THREE.MeshStandardMaterial({ color: 0xf4f0df, roughness: 0.64, metalness: 0.0 });
  const coverMat = new THREE.MeshStandardMaterial({ color: 0x1f4f7a, roughness: 0.68, metalness: 0.0 });
  const accentMat = new THREE.MeshBasicMaterial({ color: 0xffc857 });

  const manual = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.035, 0.44), manualMat);
  manual.castShadow = true;
  manual.receiveShadow = true;
  g.add(manual);

  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.014, 0.34), coverMat);
  cover.position.set(0, 0.028, 0);
  cover.castShadow = true;
  g.add(cover);

  const label = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.016, 0.042), accentMat);
  label.position.set(0, 0.04, -0.08);
  g.add(label);

  const lineA = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.016, 0.026), new THREE.MeshBasicMaterial({ color: 0xe8f2ff }));
  lineA.position.set(0, 0.041, 0.05);
  const lineB = lineA.clone();
  lineB.scale.x = 0.68;
  lineB.position.z = 0.12;
  g.add(lineA, lineB);

  const kitMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.58, metalness: 0.03 });
  const kit = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.24), kitMat);
  kit.position.set(0.52, 0.08, 0.03);
  kit.castShadow = true;
  kit.receiveShadow = true;
  g.add(kit);

  const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.026), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  crossA.position.set(0.52, 0.166, 0.03);
  const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.012, 0.12), crossA.material);
  crossB.position.copy(crossA.position);
  g.add(crossA, crossB);

  return g;
}

function buildStorageShelf({ x, z }) {
  const g = new THREE.Group();
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x39485a, roughness: 0.74, metalness: 0.04 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x8a929e, roughness: 0.5, metalness: 0.15 });
  const boxMatA = new THREE.MeshStandardMaterial({ color: 0xb98644, roughness: 0.82, metalness: 0.0 });
  const boxMatB = new THREE.MeshStandardMaterial({ color: 0x4b6478, roughness: 0.76, metalness: 0.02 });

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.82, 1.5), shelfMat);
  cabinet.position.set(x, 0.41, z);
  cabinet.castShadow = true;
  cabinet.receiveShadow = true;
  g.add(cabinet);

  for (const y of [0.28, 0.54, 0.79]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 1.55), edgeMat);
    rail.position.set(x - 0.01, y, z);
    rail.castShadow = true;
    g.add(rail);
  }

  const boxA = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.36), boxMatA);
  boxA.position.set(x - 0.08, 0.93, z - 0.38);
  boxA.castShadow = true;
  g.add(boxA);

  const boxB = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.42), boxMatB);
  boxB.position.set(x - 0.1, 0.9, z + 0.34);
  boxB.castShadow = true;
  g.add(boxB);

  const label = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.16, 0.54),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc })
  );
  label.position.set(x - 0.3, 0.62, z);
  g.add(label);

  return g;
}

function buildWallClock({ x, y, z }) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 40),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42, metalness: 0.0 })
  );
  face.position.set(x, y, z);
  g.add(face);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.325, 0.018, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.38, metalness: 0.3 })
  );
  rim.position.copy(face.position);
  g.add(rim);

  const handMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
  const hour = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.012), handMat);
  hour.position.set(x, y + 0.075, z + 0.01);
  hour.rotation.z = -0.55;
  const minute = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.25, 0.012), handMat);
  minute.position.set(x + 0.06, y + 0.08, z + 0.012);
  minute.rotation.z = 0.75;
  g.add(hour, minute);
  return g;
}

function buildNoticeBoard({ x, y, z }) {
  const g = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 1.0, 1.28),
    new THREE.MeshStandardMaterial({ color: 0x9b6a35, roughness: 0.86, metalness: 0.0 })
  );
  board.position.set(x, y, z);
  board.castShadow = true;
  g.add(board);

  const paperMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  for (const [py, pz, color] of [
    [0.22, -0.32, 0xfef3c7],
    [0.1, 0.25, 0xdbeafe],
    [-0.24, -0.02, 0xdcfce7],
  ]) {
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.28, 0.32), paperMat.clone());
    paper.material.color.setHex(color);
    paper.position.set(x - 0.04, y + py, z + pz);
    g.add(paper);
  }
  return g;
}

function buildTrainingTerminal(matMetal, matScreen) {
  const g = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.03, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.55, metalness: 0.2 })
  );
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.2, 0.038), matMetal);
  stand.position.set(0, 0.115, -0.08);
  stand.castShadow = true;
  stand.receiveShadow = true;
  g.add(stand);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.34, 0.035), matMetal);
  frame.position.set(0, 0.31, -0.10);
  frame.castShadow = true;
  frame.receiveShadow = true;
  g.add(frame);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.27),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: createTerminalTexture(),
      roughness: 0.24,
      metalness: 0.12,
      emissive: new THREE.Color(0x102a54),
      emissiveIntensity: 0.72,
    })
  );
  screen.position.set(0, 0.31, -0.12);
  screen.rotation.y = Math.PI;
  g.add(screen);

  const keyboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.022, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x202637, roughness: 0.72, metalness: 0.05 })
  );
  keyboard.position.set(0, 0.018, -0.24);
  keyboard.castShadow = true;
  keyboard.receiveShadow = true;
  g.add(keyboard);

  return g;
}

/* ---------- Helpers ---------- */
function buildDesk(size, matTop, matLeg) {
  const g = new THREE.Group();

  const top = new THREE.Mesh(new THREE.BoxGeometry(size.w, 0.10, size.d), matTop);
  top.position.set(0, size.h, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, size.h, 14);
  const legPos = [
    [-size.w / 2 + 0.18, size.h / 2, -size.d / 2 + 0.18],
    [ size.w / 2 - 0.18, size.h / 2, -size.d / 2 + 0.18],
    [-size.w / 2 + 0.18, size.h / 2,  size.d / 2 - 0.18],
    [ size.w / 2 - 0.18, size.h / 2,  size.d / 2 - 0.18],
  ];
  for (const [x, y, z] of legPos) {
    const leg = new THREE.Mesh(legGeo, matLeg);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    g.add(leg);
  }
  return g;
}

function buildChair(matSeat, matLeg) {
  const g = new THREE.Group();

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.85), matSeat);
  seat.position.set(0, 0.48, 0);
  seat.castShadow = true;
  seat.receiveShadow = true;
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 0.08), matSeat);
  back.position.set(0, 0.86, 0.38);
  back.castShadow = true;
  g.add(back);

  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.48, 12);
  const legPos = [
    [-0.34, 0.24, -0.34],
    [ 0.34, 0.24, -0.34],
    [-0.34, 0.24,  0.34],
    [ 0.34, 0.24,  0.34],
  ];
  for (const [x, y, z] of legPos) {
    const leg = new THREE.Mesh(legGeo, matLeg);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    g.add(leg);
  }
  return g;
}

function buildStudent(matCloth, matSkin, matHair, variant = 0) {
  const g = new THREE.Group();

  const clothPalette = [0x3f536d, 0x5a4b68, 0x3e5d55, 0x5b5544, 0x3e4f63, 0x57405b];
  const skinPalette = [0xd6b08a, 0xc99470, 0xb9855f, 0xe1bd98];
  const cloth = matCloth.clone();
  cloth.color.setHex(clothPalette[variant % clothPalette.length]);
  const skin = matSkin.clone();
  skin.color.setHex(skinPalette[variant % skinPalette.length]);
  const hairMat = matHair.clone();
  hairMat.color.setHex(variant % 3 === 0 ? 0x23202a : variant % 3 === 1 ? 0x111827 : 0x3b2f27);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 8, 14), cloth);
  torso.position.set(0, 0.82, 0.02);
  torso.rotation.x = -0.12;
  torso.castShadow = true;
  g.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.09, 12), skin);
  neck.position.set(0, 1.05, 0.035);
  neck.castShadow = true;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 18), skin);
  head.position.set(0, 1.18, 0.035);
  head.scale.set(0.94, 1.05, 0.92);
  head.castShadow = true;
  g.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 18, 18), hairMat);
  hair.scale.set(1, 0.58, 0.96);
  hair.position.set(0, 1.27, 0.02);
  hair.castShadow = true;
  g.add(hair);

  const shoulder = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.28, 6, 10), cloth);
  shoulder.position.set(0, 0.98, 0.02);
  shoulder.rotation.z = Math.PI / 2;
  shoulder.castShadow = true;
  g.add(shoulder);

  const armGeo = new THREE.CapsuleGeometry(0.035, 0.26, 6, 10);
  const armL = new THREE.Mesh(armGeo, cloth);
  armL.position.set(-0.18, 0.8, 0.08);
  armL.rotation.x = 0.7;
  armL.rotation.z = 0.22;
  armL.castShadow = true;

  const armR = armL.clone();
  armR.position.x = 0.18;
  armR.rotation.z = -0.22;
  g.add(armL, armR);

  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 10);
  const legL = new THREE.Mesh(legGeo, cloth);
  legL.position.set(-0.08, 0.5, -0.04);
  legL.rotation.x = Math.PI / 2.55;
  legL.castShadow = true;

  const legR = legL.clone();
  legR.position.x = 0.08;
  g.add(legL, legR);

  const footGeo = new THREE.BoxGeometry(0.12, 0.06, 0.18);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
  const footL = new THREE.Mesh(footGeo, footMat);
  footL.position.set(-0.08, 0.34, 0.12);
  footL.castShadow = true;

  const footR = footL.clone();
  footR.position.x = 0.08;
  g.add(footL, footR);

  g.scale.setScalar(variant % 2 === 0 ? 1 : 0.96);
  return g;
}

function createTrainingScreenDisplay() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  let state = { mode: "default", title: "SceneForge Training Lab" };

  function background() {
    const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grd.addColorStop(0, "#15336f");
    grd.addColorStop(0.58, "#1d4ed8");
    grd.addColorStop(1, "#0f172a");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(70 + i * 96, 84, 54, 4);
    }
  }

  function flow(active = 0, complete = false) {
    const labels = ["Recognise", "Alert", "Procedure", "Action"];
    ctx.strokeStyle = "rgba(191,219,254,0.78)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(175, 404);
    ctx.lineTo(840, 404);
    ctx.stroke();

    labels.forEach((label, i) => {
      const x = 175 + i * 222;
      const isActive = complete || i <= active;
      ctx.fillStyle = isActive ? "#bfdbfe" : "rgba(255,255,255,0.24)";
      ctx.beginPath();
      ctx.arc(x, 404, isActive ? 19 : 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isActive ? "#f8fbff" : "rgba(255,255,255,0.62)";
      ctx.font = "700 23px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, x, 452);
      ctx.textAlign = "start";
    });
  }

  function drawDefault() {
    state = { mode: "default", title: "SceneForge Training Lab" };
    background();
    ctx.fillStyle = "#f8fbff";
    ctx.font = "700 54px Arial, sans-serif";
    ctx.fillText("SceneForge Training Lab", 70, 128);
    ctx.font = "500 28px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText("Commanded avatar training simulation", 72, 176);

    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 4;
    ctx.strokeRect(72, 230, 270, 142);
    ctx.strokeRect(405, 230, 270, 142);
    ctx.strokeRect(738, 230, 210, 142);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(102, 260, 210, 16);
    ctx.fillRect(102, 296, 155, 16);
    ctx.fillRect(435, 260, 210, 16);
    ctx.fillRect(435, 296, 182, 16);
    ctx.fillRect(768, 260, 150, 16);
    ctx.fillRect(768, 296, 94, 16);
    flow(0, false);
    texture.needsUpdate = true;
  }

  function drawModule({ title, subtitle, active = 0, progress = "" }) {
    state = {
      mode: "module",
      title: title || "Emergency Response Module",
      subtitle: subtitle || "Recognise | Alert | Follow Procedure | Take Action",
      active,
      progress,
    };
    background();
    ctx.fillStyle = "#dbeafe";
    ctx.font = "700 46px Arial, sans-serif";
    ctx.fillText(title || "Emergency Response Module", 70, 116);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "500 26px Arial, sans-serif";
    ctx.fillText(subtitle || "Recognise | Alert | Follow Procedure | Take Action", 72, 164);
    if (progress) {
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.font = "700 24px Arial, sans-serif";
      ctx.fillText(`Step ${progress}`, 792, 116);
    }

    const cards = [
      ["1", "Recognise", "Identify the issue"],
      ["2", "Alert", "Notify others"],
      ["3", "Procedure", "Follow safety steps"],
      ["4", "Action", "Take the next safe action"],
    ];
    cards.forEach(([num, heading, copy], i) => {
      const x = 72 + i * 232;
      const isActive = i <= active;
      ctx.fillStyle = isActive ? "rgba(147,197,253,0.22)" : "rgba(255,255,255,0.08)";
      ctx.strokeStyle = isActive ? "#bfdbfe" : "rgba(255,255,255,0.22)";
      ctx.lineWidth = 4;
      ctx.fillRect(x, 228, 190, 112);
      ctx.strokeRect(x, 228, 190, 112);
      ctx.fillStyle = isActive ? "#eff6ff" : "rgba(255,255,255,0.68)";
      ctx.font = "700 32px Arial, sans-serif";
      ctx.fillText(num, x + 18, 272);
      ctx.font = "700 21px Arial, sans-serif";
      ctx.fillText(heading, x + 58, 270);
      ctx.font = "500 17px Arial, sans-serif";
      ctx.fillText(copy, x + 18, 314);
    });
    flow(active, false);
    texture.needsUpdate = true;
  }

  function drawComplete() {
    state = { mode: "complete", title: "Walkthrough Complete" };
    background();
    ctx.fillStyle = "#dcfce7";
    ctx.font = "700 58px Arial, sans-serif";
    ctx.fillText("Walkthrough Complete", 70, 142);
    ctx.fillStyle = "rgba(255,255,255,0.84)";
    ctx.font = "500 30px Arial, sans-serif";
    ctx.fillText("Emergency Response Module", 72, 194);
    ctx.fillStyle = "#bbf7d0";
    ctx.fillRect(72, 250, 620, 18);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "600 24px Arial, sans-serif";
    ctx.fillText("Remain calm. Follow procedure. Take the correct action.", 72, 326);
    flow(3, true);
    texture.needsUpdate = true;
  }

  drawDefault();
  return {
    texture,
    setDefault: drawDefault,
    setModule: drawModule,
    setComplete: drawComplete,
    getState: () => ({ ...state }),
  };
}

function createPosterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#172033";
  ctx.font = "700 40px Arial, sans-serif";
  ctx.fillText("LAB READY", 46, 78);
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(46, 110, 330, 18);
  ctx.fillStyle = "#0f766e";
  ctx.fillRect(46, 154, 250, 18);
  ctx.fillStyle = "#d97706";
  ctx.fillRect(46, 198, 165, 18);
  ctx.strokeStyle = "#d7dde8";
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, 472, 280);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function createFocusLabelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(15,23,42,0.78)";
  roundRect(ctx, 18, 22, 476, 84, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,211,110,0.8)";
  ctx.lineWidth = 5;
  roundRect(ctx, 18, 22, 476, 84, 20);
  ctx.stroke();
  ctx.fillStyle = "#fff7d6";
  ctx.font = "700 34px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Focus: Training Materials", 256, 75);
  ctx.textAlign = "start";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createTerminalTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 188;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(0, 0, canvas.width, 34);
  ctx.fillStyle = "#eff6ff";
  ctx.font = "700 18px Arial, sans-serif";
  ctx.fillText("Training", 18, 23);
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(24, 62, 190, 10);
  ctx.fillRect(24, 92, 145, 10);
  ctx.fillStyle = "#a7f3d0";
  ctx.fillRect(24, 124, 226, 10);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.strokeRect(230, 54, 58, 58);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
