const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const PANEL_PASSWORD = process.env.PANEL_PASSWORD;
const PANEL_BASIC_USER = process.env.PANEL_BASIC_USER;
const PANEL_BASIC_PASSWORD = process.env.PANEL_BASIC_PASSWORD;
const JSONBIN_KEY_HEADER = process.env.JSONBIN_KEY_HEADER;

function getBasicAuth(req) {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme !== "Basic" || !encoded) {
    return null;
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");

  if (separator === -1) {
    return null;
  }

  return {
    user: decoded.slice(0, separator),
    password: decoded.slice(separator + 1)
  };
}

function isAuthorized(req) {
  const password = req.headers["x-panel-password"];
  const allowed = [PANEL_PASSWORD, PANEL_BASIC_PASSWORD].filter(Boolean);

  if (password && allowed.includes(password)) {
    return true;
  }

  const basic = getBasicAuth(req);
  return Boolean(
    basic &&
    PANEL_BASIC_USER &&
    PANEL_BASIC_PASSWORD &&
    basic.user === PANEL_BASIC_USER &&
    basic.password === PANEL_BASIC_PASSWORD
  );
}

function jsonBinAuthHeaderVariants() {
  const preferred = JSONBIN_KEY_HEADER === "X-Access-Key" ? "X-Access-Key" : "X-Master-Key";
  const variants = [{ name: preferred, headers: { [preferred]: JSONBIN_API_KEY } }];

  if (!JSONBIN_KEY_HEADER) {
    const fallback = preferred === "X-Master-Key" ? "X-Access-Key" : "X-Master-Key";
    variants.push({ name: fallback, headers: { [fallback]: JSONBIN_API_KEY } });
  }

  return variants;
}

function jsonBinKeyHeaderName() {
  return JSONBIN_KEY_HEADER === "X-Access-Key" ? "X-Access-Key" : "X-Master-Key";
}

function serverConfigStatus() {
  return {
    hasJsonBinApiKey: Boolean(JSONBIN_API_KEY),
    hasJsonBinBinId: Boolean(JSONBIN_BIN_ID),
    hasPanelPassword: Boolean(PANEL_PASSWORD),
    hasPanelBasicPassword: Boolean(PANEL_BASIC_PASSWORD)
  };
}

async function readUpstreamError(upstream) {
  let body = "";
  try {
    body = await upstream.text();
  } catch (e) {}

  const safeBody = body.slice(0, 500);
  return {
    status: upstream.status,
    message: upstream.status === 401 || upstream.status === 403
      ? "JSONBin authorization failed."
      : "JSONBin request failed.",
    body: safeBody
  };
}

function logJsonBinError(method, payloadLength, details) {
  console.error("JSONBin request failed", {
    method,
    jsonbinStatus: details && details.status,
    hasBinId: Boolean(JSONBIN_BIN_ID),
    hasApiKey: Boolean(JSONBIN_API_KEY),
    keyHeader: jsonBinKeyHeaderName(),
    payloadLength,
    message: details && details.message,
    bodyPreview: details && details.body ? details.body.slice(0, 240) : ""
  });
}

async function fetchJsonBin(url, options = {}) {
  let lastResponse = null;
  const variants = jsonBinAuthHeaderVariants();

  for (const variant of variants) {
    const headers = {
      ...(options.headers || {}),
      ...variant.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    response.usedJsonBinHeader = variant.name;
    lastResponse = response;

    if (response.ok || !(response.status === 401 || response.status === 403)) {
      return response;
    }
  }

  return lastResponse;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID || (!PANEL_PASSWORD && !PANEL_BASIC_PASSWORD)) {
    return res.status(500).json({
      error: "Panel server configuration is missing.",
      config: serverConfigStatus()
    });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const upstream = await fetchJsonBin(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`);

      if (!upstream.ok) {
        const details = await readUpstreamError(upstream);
        details.usedHeader = upstream.usedJsonBinHeader;
        logJsonBinError("GET", 0, details);
        return res.status(502).json(details);
      }

      const body = await upstream.text();
      res.status(upstream.status);
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
      return res.send(body);
    }

    if (req.method === "PUT") {
      const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const payloadLength = Buffer.byteLength(payload || "", "utf8");
      const upstream = await fetchJsonBin(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Bin-Versioning": "false"
        },
        body: payload
      });

      if (!upstream.ok) {
        const details = await readUpstreamError(upstream);
        details.usedHeader = upstream.usedJsonBinHeader;
        logJsonBinError("PUT", payloadLength, details);
        return res.status(502).json(details);
      }

      const body = await upstream.text();
      res.status(upstream.status);
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
      return res.send(body);
    }
  } catch (e) {
    return res.status(500).json({
      error: "Panel API failed before JSONBin response.",
      message: e && e.message ? e.message : "Unknown error"
    });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
};
