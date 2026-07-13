const PANEL_PASSWORD = process.env.PANEL_PASSWORD;
const PANEL_BASIC_USER = process.env.PANEL_BASIC_USER;
const PANEL_BASIC_PASSWORD = process.env.PANEL_BASIC_PASSWORD;
const {
  hasPanelStoreConfig,
  panelStoreConfigStatus,
  readPanelStore,
  savePanelStore
} = require("./_panel-store");

function getBasicAuth(req) {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme !== "Basic" || !encoded) return null;

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return null;

  return {
    user: decoded.slice(0, separator),
    password: decoded.slice(separator + 1)
  };
}

function isAuthorized(req) {
  const password = req.headers["x-panel-password"];
  const allowed = [PANEL_PASSWORD, PANEL_BASIC_PASSWORD].filter(Boolean);

  if (password && allowed.includes(password)) return true;

  const basic = getBasicAuth(req);
  return Boolean(
    basic &&
    PANEL_BASIC_USER &&
    PANEL_BASIC_PASSWORD &&
    basic.user === PANEL_BASIC_USER &&
    basic.password === PANEL_BASIC_PASSWORD
  );
}

function serverConfigStatus() {
  return {
    hasPanelPassword: Boolean(PANEL_PASSWORD),
    hasPanelBasicPassword: Boolean(PANEL_BASIC_PASSWORD),
    supabase: panelStoreConfigStatus()
  };
}

function parseVersionHeader(req) {
  const raw = req.headers["x-panel-version"];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!hasPanelStoreConfig() || (!PANEL_PASSWORD && !PANEL_BASIC_PASSWORD)) {
    return res.status(500).json({
      error: "Panel Supabase configuration is missing.",
      config: serverConfigStatus()
    });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const store = await readPanelStore();
      return res.status(200).json({
        record: store.data || {},
        version: store.version,
        database: "supabase"
      });
    }

    if (req.method === "PUT") {
      const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const expectedVersion = parseVersionHeader(req);
      const current = expectedVersion === null ? await readPanelStore() : null;
      const versionToSave = expectedVersion === null ? current.version : expectedVersion;
      const ok = await savePanelStore(versionToSave, payload);

      if (!ok) {
        return res.status(409).json({
          error: "Panel data version conflict.",
          message: "Dane w Supabase zmienily sie w trakcie zapisu. Odswiez panel i sprobuj ponownie."
        });
      }

      return res.status(200).json({
        ok: true,
        version: versionToSave + 1,
        database: "supabase"
      });
    }
  } catch (e) {
    console.error("Panel Supabase API failed", {
      method: req.method,
      config: panelStoreConfigStatus(),
      message: e && e.message ? e.message : "Unknown error"
    });

    return res.status(500).json({
      error: "Panel Supabase API failed.",
      message: e && e.message ? e.message : "Unknown error"
    });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
};
