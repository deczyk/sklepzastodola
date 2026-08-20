// Wysyłka maila z panelu, prawdziwym Gmailem (impersonacja kontakt@/j.deczynski@ przez to
// samo konto serwisowe co api/mail-sync.js), nie przez zewnętrzny serwis transakcyjny -
// mail trafia do Wysłanych na tej skrzynce, wątkuje się normalnie i ma zwykłą reputację
// nadawcy. Wymaga zakresu gmail.send dodanego do delegacji domenowej - patrz komentarz
// na górze api/_gmail.js.
const { hasGmailConfig, WATCHED_MAILBOXES, sendMessage } = require("./_gmail");
const { readPanelStore, mutatePanelStore, hasPanelStoreConfig } = require("./_panel-store");

const PANEL_PASSWORD = process.env.PANEL_PASSWORD;
const PANEL_BASIC_USER = process.env.PANEL_BASIC_USER;
const PANEL_BASIC_PASSWORD = process.env.PANEL_BASIC_PASSWORD;
const SENDER_DISPLAY_NAME = "Sklep za Stodołą";
const MAX_BODY_CHARS = 20000;
const MAX_SUBJECT_CHARS = 300;
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENTS_BYTES = Math.floor(2.6 * 1024 * 1024);
const DEFAULT_MAIL_SIGNATURES = {
  kontakt: "Pozdrawiam\nSklep za Stodołą Sp. z o.o.\n+48 735 115 427\nkontakt@sklepzastodola.pl\nwww.sklepzastodola.pl",
  jdeczynski: "Pozdrawiam\nJakub Deczyński\nSklep za Stodołą Sp. z o.o.\n+48 735 115 427\nj.deczynski@sklepzastodola.pl\nwww.sklepzastodola.pl"
};

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

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch (e) { return null; }
  }
  return req.body;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function parseImageAttachments(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENTS) throw new Error(`Maksymalnie ${MAX_ATTACHMENTS} zdjęcia.`);
  let totalBytes = 0;
  return value.map((item, index) => {
    const mimeType = String(item && item.mimeType || "").toLowerCase();
    const contentBase64 = String(item && item.contentBase64 || "").replace(/\s+/g, "");
    if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) throw new Error(`Załącznik ${index + 1} nie jest obsługiwanym zdjęciem.`);
    if (!contentBase64 || !/^[a-z0-9+/]+={0,2}$/i.test(contentBase64)) throw new Error(`Załącznik ${index + 1} ma nieprawidłową zawartość.`);
    const bytes = Buffer.from(contentBase64, "base64");
    totalBytes += bytes.length;
    if (totalBytes > MAX_ATTACHMENTS_BYTES) throw new Error("Łączny rozmiar zdjęć jest zbyt duży.");
    const filename = String(item.filename || `zdjecie-${index + 1}.jpg`).replace(/[\r\n"\\]/g, "_").slice(0, 160);
    return { filename, mimeType, contentBase64: bytes.toString("base64") };
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  if (!isAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
  if (!hasGmailConfig()) return res.status(500).json({ error: "Gmail service account not configured." });

  const payload = parseBody(req);
  if (!payload) return res.status(400).json({ error: "Invalid JSON payload." });

  const mailboxKey = String(payload.mailboxKey || "").trim();
  const mailboxEmail = WATCHED_MAILBOXES[mailboxKey];
  if (!mailboxEmail) return res.status(400).json({ error: `Unknown mailboxKey. Use one of: ${Object.keys(WATCHED_MAILBOXES).join(", ")}` });

  const to = String(payload.to || "").trim();
  if (!isValidEmail(to)) return res.status(400).json({ error: "Invalid or missing 'to' address." });

  const subject = String(payload.subject || "").trim().slice(0, MAX_SUBJECT_CHARS);
  if (!subject) return res.status(400).json({ error: "Subject is required." });

  const body = String(payload.body || "").trim().slice(0, MAX_BODY_CHARS);
  if (!body) return res.status(400).json({ error: "Body is required." });

  const senderName = String(payload.senderName || "").trim() || SENDER_DISPLAY_NAME;
  const clientId = payload.clientId ? String(payload.clientId) : "";
  let attachments;
  try {
    attachments = parseImageAttachments(payload.attachments);
  } catch (e) {
    return res.status(400).json({ error: e.message || "Invalid attachments." });
  }

  // Podpis zależny od skrzynki (kontakt@ vs j.deczynski@) - edytowalny w panelu (Ustawienia),
  // czytany tu na świeżo z tego samego magazynu co reszta danych panelu, więc zmiana w
  // ustawieniach działa od razu przy kolejnej wysyłce, bez osobnego wdrożenia.
  let fullBody = body;
  if (hasPanelStoreConfig()) {
    try {
      const store = await readPanelStore();
      const signature = String((store.data && store.data.mailSignatures && store.data.mailSignatures[mailboxKey]) || DEFAULT_MAIL_SIGNATURES[mailboxKey] || "").trim();
      if (signature) fullBody = `${body}\n\n${signature}`;
    } catch (e) {
      // Brak podpisu nie powinien blokować wysyłki - wyślij bez niego.
    }
  }

  let sent;
  try {
    sent = await sendMessage(mailboxEmail, { fromName: senderName, to, subject, body: fullBody, attachments });
  } catch (e) {
    return res.status(502).json({ error: "Gmail send failed.", message: e && e.message ? e.message : String(e) });
  }

  // Logowanie do historii klienta jest "best effort" - mail już poszedł, więc błąd zapisu
  // do panelu nie powinien wyglądać jak błąd wysyłki (mail-sync i tak by go później złapał
  // jako "Mail wychodzący", to tylko szybsza ścieżka bez czekania na cykl crona).
  let logged = false;
  if (clientId && hasPanelStoreConfig()) {
    try {
      await mutatePanelStore((data) => {
        const client = (data.klienci || []).find(c => c.id === clientId);
        if (!client) return;
        if (!Array.isArray(client.historia)) client.historia = [];
        const now = new Date().toISOString();
        client.historia.push({
          tekst: `[Mail wychodzący] Temat: ${subject}${attachments.length ? `\nZałączone zdjęcia: ${attachments.map(item => item.filename).join(", ")}` : ""}\n\n${fullBody}`,
          kto: `${senderName} (panel, ${mailboxEmail})`,
          data: now,
          utworzono: now,
          _mailMessageId: sent.id
        });
        client.zaktualizowano = now;
      });
      logged = true;
    } catch (e) {
      // nie failujemy requestu - patrz komentarz wyżej
    }
  }

  return res.status(200).json({ ok: true, messageId: sent.id, threadId: sent.threadId, attachmentCount: attachments.length, logged });
};
