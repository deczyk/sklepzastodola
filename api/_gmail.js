const crypto = require("crypto");

// Tej samej pary GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY używa już
// api/drive-documents.js do Google Drive. Do czytania Gmaila to konto serwisowe
// potrzebuje DODATKOWO delegacji domenowej (domain-wide delegation) nadanej przez
// administratora Google Workspace — zwykłe dodanie service accounta nie wystarczy,
// bo tu nie "dzielimy się" jednym zasobem (jak Shared Drive), tylko podszywamy się
// pod istniejące, prywatne skrzynki innych użytkowników Workspace ("sub" w JWT).
//
// Jednorazowa konfiguracja w Google Workspace Admin (robi administrator, np. Jarosław):
// 1. console.cloud.google.com -> IAM i administrowanie -> Konta usługi -> otwórz to
//    konto serwisowe -> zakładka "Szczegóły" -> skopiuj "Unikalny identyfikator" (długi
//    numer, NIE e-mail konta serwisowego).
// 2. admin.google.com -> Bezpieczeństwo -> Kontrola dostępu do API -> Delegowanie
//    dostępu na poziomie domeny -> Dodaj nowe -> ID klienta = ten numer z kroku 1,
//    zakresy OAuth = https://www.googleapis.com/auth/gmail.readonly
// Bez tego GMAIL_SYNC_ENABLED zwróci błąd 403 "unauthorized_client" przy próbie
// synchronizacji - to nie jest błąd w kodzie, tylko brak tego kroku.
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

// Skrzynki, które panel ma obserwować. Nazwa po lewej to tylko klucz do zapisu stanu
// synchronizacji (data.mailSyncState) - nie musi się zmieniać, nawet gdyby adres kiedyś
// się zmienił. Nadpisywalne przez env, gdyby adres okazał się inny niż zakładamy.
const WATCHED_MAILBOXES = {
  kontakt: process.env.MAILBOX_KONTAKT || "kontakt@sklepzastodola.pl",
  jdeczynski: process.env.MAILBOX_JDECZYNSKI || "j.deczynski@sklepzastodola.pl"
};

function hasGmailConfig() {
  return Boolean(GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY);
}

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signJwt(payload) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const signature = crypto.createSign("RSA-SHA256").update(data).sign(key);
  return `${data}.${base64url(signature)}`;
}

// Jeden token na skrzynkę (impersonacja przez "sub") - tokeny NIE są wymienne między
// skrzynkami, więc cache jest osobny dla każdego adresu.
const tokenCacheByMailbox = new Map();

async function getGmailAccessToken(mailboxEmail) {
  const cached = tokenCacheByMailbox.get(mailboxEmail);
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > now) return cached.token;

  const jwt = signJwt({
    iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: GMAIL_READONLY_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    sub: mailboxEmail,
    iat: now,
    exp: now + 3600
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = json.error_description || json.error || "Google token request failed.";
    throw new Error(`Gmail auth failed for ${mailboxEmail}: ${reason}`);
  }

  tokenCacheByMailbox.set(mailboxEmail, {
    token: json.access_token,
    expiresAt: now + Number(json.expires_in || 3600)
  });
  return json.access_token;
}

async function gmailFetch(mailboxEmail, path, params) {
  const token = await getGmailAccessToken(mailboxEmail);
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = (json.error && json.error.message) || `HTTP ${res.status}`;
    throw new Error(`Gmail API (${mailboxEmail}) ${path} failed: ${reason}`);
  }
  return json;
}

function decodeBase64UrlToBuffer(value) {
  if (!value) return Buffer.alloc(0);
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

// Dla treści tekstowej wiadomości (text/plain, text/html) - NIE używać do załączników
// binarnych (obrazy, PDF), bo toString("utf8") zniszczyłby ich zawartość.
function decodeBase64Url(value) {
  return decodeBase64UrlToBuffer(value).toString("utf8");
}

// Wiadomości bywają multipart (text/plain + text/html + załączniki zagnieżdżone w
// kolejnych "parts"). Szukamy najpierw czystego text/plain; text/html tylko jako
// zapasowy wariant, i to zamieniony na tekst (współdzielimy tę samą funkcję, której
// już używa api/_email.js do wersji tekstowej wysyłanych maili).
function extractPlainTextBody(payload, htmlToPlainFallback) {
  if (!payload) return "";
  let plain = "", html = "";
  const walk = node => {
    if (!node) return;
    const mime = node.mimeType || "";
    if (mime === "text/plain" && node.body && node.body.data && !plain) {
      plain = decodeBase64Url(node.body.data);
    } else if (mime === "text/html" && node.body && node.body.data && !html) {
      html = decodeBase64Url(node.body.data);
    }
    (node.parts || []).forEach(walk);
  };
  walk(payload);
  if (plain) return plain.trim();
  if (html) return htmlToPlainFallback(html).trim();
  return "";
}

function headerValue(headers, name) {
  const found = (headers || []).find(h => (h.name || "").toLowerCase() === name.toLowerCase());
  return found ? found.value || "" : "";
}

// Wyciąga same adresy e-mail z pola typu "Jan Kowalski <jan@przyklad.pl>, inny@x.pl"
function extractEmails(headerText) {
  return String(headerText || "").match(/[^\s<>",;]+@[^\s<>",;]+\.[^\s<>",;]+/g) || [];
}

// after: epoch sekundy (Gmail search operator "after:") - lista ID nowych wiadomości
// w całej skrzynce (Wysłane + Odebrane + wszystko inne), bez filtrowania po etykiecie,
// żeby złapać obie strony korespondencji jednym zapytaniem na skrzynkę.
async function listMessageIdsAfter(mailboxEmail, afterEpochSeconds, pageLimit = 100) {
  const ids = [];
  let pageToken = "";
  do {
    const json = await gmailFetch(mailboxEmail, "messages", {
      q: `after:${afterEpochSeconds}`,
      maxResults: "100",
      ...(pageToken ? { pageToken } : {})
    });
    (json.messages || []).forEach(m => ids.push(m.id));
    pageToken = json.nextPageToken || "";
  } while (pageToken && ids.length < pageLimit);
  return ids;
}

// Część MIME jest załącznikiem, jeśli ma nazwę pliku - to samo rozróżnienie, którego
// używa Gmail we własnym UI (treść wiadomości ma pusty "filename").
function extractAttachmentMeta(payload) {
  const attachments = [];
  const walk = node => {
    if (!node) return;
    if (node.filename && node.body && (node.body.attachmentId || node.body.data)) {
      attachments.push({
        filename: node.filename,
        mimeType: node.mimeType || "application/octet-stream",
        attachmentId: node.body.attachmentId || "",
        size: Number(node.body.size || 0),
        inlineData: node.body.attachmentId ? null : node.body.data
      });
    }
    (node.parts || []).forEach(walk);
  };
  walk(payload);
  return attachments;
}

async function getMessage(mailboxEmail, id, htmlToPlainFallback) {
  const json = await gmailFetch(mailboxEmail, `messages/${encodeURIComponent(id)}`, { format: "full" });
  const headers = (json.payload && json.payload.headers) || [];
  return {
    id: json.id,
    threadId: json.threadId,
    internalDate: Number(json.internalDate || 0),
    from: headerValue(headers, "From"),
    to: headerValue(headers, "To"),
    subject: headerValue(headers, "Subject"),
    body: extractPlainTextBody(json.payload, htmlToPlainFallback),
    attachments: extractAttachmentMeta(json.payload)
  };
}

// Osobne wywołanie - treść załącznika ściągamy TYLKO dla wiadomości, które faktycznie
// dopasowaliśmy do klienta (patrz mail-sync.js), żeby nie marnować czasu/limitów Gmail API
// na maile, które i tak zostaną odrzucone.
async function getAttachmentData(mailboxEmail, messageId, attachmentId) {
  const json = await gmailFetch(mailboxEmail, `messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`);
  return { size: Number(json.size || 0), data: json.data || "" };
}

module.exports = {
  hasGmailConfig,
  WATCHED_MAILBOXES,
  getGmailAccessToken,
  listMessageIdsAfter,
  getMessage,
  getAttachmentData,
  decodeBase64UrlToBuffer,
  extractEmails
};
