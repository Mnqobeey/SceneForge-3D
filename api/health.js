import { getAvailableAssets } from "./model.js";

export default function handler(req, res) {
  const assets = getAvailableAssets();

  res.status(200).json({
    ok: true,
    service: "sceneforge-3d",
    architecture: "vite-three-vercel-api",
    assets: assets.length
  });
}
