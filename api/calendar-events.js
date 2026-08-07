const crypto = require("crypto");

const PANEL_PASSWORD = process.env.PANEL_PASSWORD;
const PANEL_BASIC_USER = process.env.PANEL_BASIC_USER;
const PANEL_BASIC_PASSWORD = process.env.PANEL_BASIC_PASSWORD;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

// Ten sam wzorzec autoryzacji i tego samego konta serwisowego co api/drive-documents.js —
// tylko inny (węższy) zakres OAuth: tylko wydarzenia w kalendarzu, nie cały Drive.
let tokenCache = { token: "", expiresAt: 0 };

function getBasicAuth(req) {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return null;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return null;
  return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

function isAuthorized(req) {
  const password = req.headers["x-panel-password"];
  const allowed = [PANEL_PASSWORD, PANEL_BASIC_PASSWORD].filter(Boolean);
  if (password && allowed.includes(password)) return true;
  const basic = getBasicAuth(req);
  return Boolean(
    basic && PANEL_BASIC_USER && PANEL_BASIC_PASSWORD &&
    basic.user === PANEL_BASIC_USER && basic.password === PANEL_BASIC_PASSWORD
  );
}

function calendarConfigStatus() {
  return {
    hasGoogleServiceAccountEmail: Boolean(GOOGLE_SERVICE_ACCOUNT_EMAIL),
    hasGooglePrivateKey: Boolean(GOOGLE_PRIVATE_KEY),
    hasGoogleCalendarId: Boolean(GOOGLE_CALENDAR_ID),
    hasPanelPassword: Boolean(PANEL_PASSWORD),
    hasPanelBasicPassword: Boolean(PANEL_BASIC_PASSWORD)
  };
}

function assertConfig() {
  return Boolean(
    GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY && GOOGLE_CALENDAR_ID &&
    (PANEL_PASSWORD || PANEL_BASIC_PASSWORD)
  );
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signJwt(header, payload) {
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const signature = crypto.createSign("RSA-SHA256").update(data).sign(key);
  return `${data}.${base64url(signature)}`;
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.expiresAt - 60 > now) return tokenCache.token;

  const jwt = signJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/calendar.events",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    }
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error_description || json.error || "Google token request failed.");

  tokenCache = { token: json.access_token, expiresAt: now + Number(json.expires_in || 3600) };
  return tokenCache.token;
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch (e) { return null; }
  }
  return req.body;
}

function clamp(value, max) {
  return String(value || "").trim().slice(0, max);
}

// Wydarzenie całodniowe na dzień następnego kontaktu — prostsze niż zgadywanie godziny,
// a mniej podatne na pomyłki ze strefą czasową niż wydarzenie z konkretną godziną.
function buildEventBody({ clientName, phone, notes, date }) {
  const start = String(date || "").slice(0, 10);
  const end = new Date(start + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    summary: `Kontakt: ${clamp(clientName, 200) || "klient"}`,
    description: [phone ? `Telefon: ${clamp(phone, 60)}` : "", clamp(notes, 1500)].filter(Boolean).join("\n\n"),
    start: { date: start },
    end: { date: end.toISOString().slice(0, 10) }
  };
}

async function upsertEvent(token, payload) {
  const body = buildEventBody(payload);
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`;
  const existingId = clamp(payload.eventId, 200);

  if (existingId) {
    const res = await fetch(`${base}/${encodeURIComponent(existingId)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.status === 404 || res.status === 410) {
      // Wydarzenie ktoś usunął ręcznie w Kalendarzu — utwórz nowe zamiast się wywalać.
    } else {
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error && json.error.message ? json.error.message : "Calendar update failed.");
      return { eventId: json.id, htmlLink: json.htmlLink || "" };
    }
  }

  const res = await fetch(base, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error && json.error.message ? json.error.message : "Calendar create failed.");
  return { eventId: json.id, htmlLink: json.htmlLink || "" };
}

async function deleteEvent(token, eventId) {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`;
  const res = await fetch(`${base}/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  // 404/410 = już nie istnieje, traktujemy jak sukces (to i tak był cel operacji).
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error && json.error.message ? json.error.message : "Calendar delete failed.");
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!assertConfig()) {
    return res.status(500).json({ error: "Google Calendar server configuration is missing.", config: calendarConfigStatus() });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = await getAccessToken();

    if (req.method === "POST") {
      const payload = parseBody(req);
      if (!payload) return res.status(400).json({ error: "Invalid JSON payload." });
      if (!payload.date) return res.status(400).json({ error: "Missing date." });
      const result = await upsertEvent(token, payload);
      return res.status(200).json(result);
    }

    if (req.method === "DELETE") {
      const eventId = clamp(req.query && req.query.eventId, 200);
      if (!eventId) return res.status(400).json({ error: "Missing eventId." });
      await deleteEvent(token, eventId);
      return res.status(200).json({ deleted: true });
    }
  } catch (e) {
    return res.status(500).json({ error: "Google Calendar operation failed.", message: e && e.message ? e.message : "Unknown error" });
  }

  res.setHeader("Allow", "POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
};
