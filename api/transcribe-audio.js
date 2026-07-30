const PANEL_PASSWORD = process.env.PANEL_PASSWORD;
const PANEL_BASIC_USER = process.env.PANEL_BASIC_USER;
const PANEL_BASIC_PASSWORD = process.env.PANEL_BASIC_PASSWORD;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

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

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return null;
    }
  }
  return req.body;
}

function decodeBase64File(value) {
  const raw = String(value || "");
  const payload = raw.includes(",") ? raw.split(",").pop() : raw;
  return Buffer.from(payload, "base64");
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!PANEL_PASSWORD && !PANEL_BASIC_PASSWORD) {
    return res.status(500).json({
      error: "Panel password configuration is missing.",
      message: "Brakuje konfiguracji hasła panelu."
    });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OpenAI API key is missing.",
      message: "Brakuje zmiennej OPENAI_API_KEY w Vercel."
    });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = parseBody(req);
    if (!payload) {
      return res.status(400).json({
        error: "Invalid JSON payload.",
        message: "Nie udało się odczytać nagrania wysłanego z panelu."
      });
    }

    const name = String(payload.name || "notatka-glosowa.m4a").slice(0, 180);
    const mimeType = String(payload.mimeType || "audio/mp4").slice(0, 120);
    const content = decodeBase64File(payload.contentBase64);

    if (!content.length) {
      return res.status(400).json({
        error: "Audio file is empty.",
        message: "Plik audio jest pusty."
      });
    }
    if (content.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({
        error: "Audio file is too large.",
        message: "Nagranie jest za duże do transkrypcji w panelu. Maksymalny rozmiar to 8 MB.",
        maxMb: 8
      });
    }

    const form = new FormData();
    form.append("model", OPENAI_TRANSCRIPTION_MODEL);
    form.append("language", "pl");
    form.append("file", new Blob([content], { type: mimeType }), name);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: "OpenAI transcription failed.",
        message: json.error && json.error.message ? json.error.message : "Unknown error"
      });
    }

    return res.status(200).json({ text: json.text || "" });
  } catch (e) {
    return res.status(500).json({
      error: "Transcription failed.",
      message: e && e.message ? e.message : "Unknown error"
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb"
    }
  }
};
