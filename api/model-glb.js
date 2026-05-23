import { buildModelResponse } from "./model.js";

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

export default function handler(req, res) {
  const method = req.method || "GET";
  if (!["GET", "POST"].includes(method)) {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const payload = buildModelResponse(promptFromRequest(req));
  res.setHeader("Cache-Control", "no-store");
  res.writeHead(302, { Location: payload.model.url });
  res.end();
}
