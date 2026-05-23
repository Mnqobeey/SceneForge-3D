import { defineConfig } from "vite";
import healthHandler from "./api/health.js";
import modelHandler from "./api/model.js";
import modelGlbHandler from "./api/model-glb.js";

const apiRoutes = new Map([
  ["/api/health", healthHandler],
  ["/api/model", modelHandler],
  ["/api/model-glb", modelGlbHandler]
]);

function withVercelResponseHelpers(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  res.json = (payload) => {
    if (!res.headersSent) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify(payload));
    return res;
  };

  return res;
}

function parseBody(req) {
  if (!["POST", "PUT", "PATCH"].includes(req.method || "GET")) {
    req.body = undefined;
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        req.body = {};
        resolve();
        return;
      }

      try {
        req.body = JSON.parse(raw);
        resolve();
      } catch {
        req.body = raw;
        resolve();
      }
    });
    req.on("error", reject);
  });
}

function createApiMiddleware() {
  return async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    const handler = apiRoutes.get(url.pathname);
    if (!handler) return next();

    try {
      req.query = Object.fromEntries(url.searchParams.entries());
      await parseBody(req);
      await handler(req, withVercelResponseHelpers(res));
    } catch (error) {
      withVercelResponseHelpers(res)
        .status(500)
        .json({ ok: false, error: error?.message || "Local API middleware failed" });
    }
  };
}

export default defineConfig({
  base: "/",
  plugins: [
    {
      name: "sceneforge-local-api",
      configureServer(server) {
        server.middlewares.use(createApiMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createApiMiddleware());
      }
    }
  ],
  server: {
    port: 5173,
    strictPort: false
  }
});
