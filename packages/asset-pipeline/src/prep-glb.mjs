import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { NodeIO } from "@gltf-transform/core";

// Usage:
// node prep-glb.mjs <inputGlbPath> <outputGlbPath> [targetHeightMeters]
// Example:
// node prep-glb.mjs public/assets/library/duck.glb public/assets/library/duck.prepped.glb 1

const [, , inPath, outPath, targetHeightArg] = process.argv;

if (!inPath || !outPath) {
  console.error("Usage: node prep-glb.mjs <inputGlbPath> <outputGlbPath> [targetHeightMeters]");
  process.exit(1);
}

const targetHeight = Number(targetHeightArg ?? "1");
if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
  console.error("targetHeightMeters must be a positive number.");
  process.exit(1);
}

const io = new NodeIO();
const document = await io.read(inPath);
const root = document.getRoot();

const scenes = root.listScenes();
if (!scenes.length) {
  console.error("No scenes found in GLB.");
  process.exit(1);
}

let min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
let max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];

function expandBounds(p) {
  min[0] = Math.min(min[0], p[0]);
  min[1] = Math.min(min[1], p[1]);
  min[2] = Math.min(min[2], p[2]);
  max[0] = Math.max(max[0], p[0]);
  max[1] = Math.max(max[1], p[1]);
  max[2] = Math.max(max[2], p[2]);
}

function vecAdd(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

const nodes = scenes.flatMap((scene) => scene.listChildren());
const allNodes = [];
const stack = [...nodes];

while (stack.length) {
  const node = stack.pop();
  allNodes.push(node);
  stack.push(...node.listChildren());
}

// Approximate bounds with node translation only. Most curated MVP assets are already near-correct.
for (const node of allNodes) {
  const mesh = node.getMesh();
  if (!mesh) continue;

  const translation = node.getTranslation();
  for (const primitive of mesh.listPrimitives()) {
    const position = primitive.getAttribute("POSITION");
    if (!position) continue;

    const values = position.getArray();
    for (let i = 0; i < values.length; i += 3) {
      expandBounds(vecAdd([values[i], values[i + 1], values[i + 2]], translation));
    }
  }
}

if (!Number.isFinite(min[0]) || !Number.isFinite(max[0])) {
  console.error("Could not compute bounds. No POSITION data found.");
  process.exit(1);
}

const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
const height = size[1] || 1;
const centerXZ = [(min[0] + max[0]) / 2, 0, (min[2] + max[2]) / 2];
const bottomY = min[1];
const translate = [-centerXZ[0], -bottomY, -centerXZ[2]];
const scale = targetHeight / height;

for (const scene of scenes) {
  const wrapper = document.createNode("PREP_WRAPPER");
  wrapper.setTranslation(translate);
  wrapper.setScale([scale, scale, scale]);

  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    wrapper.addChild(child);
  }

  scene.addChild(wrapper);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
await io.write(outPath, document);

console.log("Prepped GLB saved:", outPath);
console.log("Bounds min:", min, "max:", max, "size:", size, "origHeight:", height);
console.log("Applied translate:", translate, "scale:", scale);
