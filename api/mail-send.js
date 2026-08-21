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
// Podniesione z 2.6 MB (tylko zdjęcia) - PDF (np. wygenerowana oferta) zwykle waży
// więcej niż skompresowane zdjęcie, ale i tak zostajemy daleko poniżej limitu Gmaila
// na wiadomość (25 MB) i limitu treści requestu na Vercelu.
const MAX_ATTACHMENTS_BYTES = Math.floor(8 * 1024 * 1024);
const ALLOWED_ATTACHMENT_MIME = /^(image\/(jpeg|png|webp)|application\/pdf)$/;
const DEFAULT_MAIL_SIGNATURES = {
  kontakt: "Pozdrawiam\nJakub Deczyński\nSklep za Stodołą Sp. z o.o.\n+48 690 000 923\nkontakt@sklepzastodola.pl\nwww.sklepzastodola.pl",
  jdeczynski: "Pozdrawiam\nJarosław Deczyński\nSklep za Stodołą Sp. z o.o.\n+48 735 115 427\nj.deczynski@sklepzastodola.pl\nwww.sklepzastodola.pl"
};
// Dane do graficznej stopki (logo + imię/nazwisko/telefon w stylu Google Workspace),
// dokładana jako alternatywna wersja html obok zwykłego tekstu - patrz buildHtmlSignature.
const SIGNATURE_PEOPLE = {
  kontakt: { name: "Jakub Deczyński", phone: "+48 690 000 923", phoneHref: "+48690000923" },
  jdeczynski: { name: "Jarosław Deczyński", phone: "+48 735 115 427", phoneHref: "+48735115427" }
};
// Nazwa widoczna u odbiorcy w polu "Od" - zależna od SKRZYNKI, nie od tego, kto akurat
// jest zalogowany w panelu (payload.senderName/getWhoAmI() bywa inną osobą, np. gdy Jakub
// wysyła w zastępstwie z j.deczynski@). Mail z kontakt@ ma zawsze podpisywać się jako
// Jakub, mail z j.deczynski@ zawsze jako Jarosław - patrz użycie w handlerze niżej.
const MAIL_FROM_DISPLAY_NAMES = {
  kontakt: "Jakub | Sklep za Stodołą",
  jdeczynski: "Jarosław | Sklep za Stodołą"
};
const LOGO_URL = "https://www.sklepzastodola.pl/favicon-192.png";
// Te same adresy, których strona www używa konsekwentnie we wszystkich stopkach
// (index.html, kontakt.html, itd.) - żeby link w mailu prowadził na ten sam profil.
// Prawdziwe ikony marek (oficjalne loga Facebook/Instagram/TikTok z Wikimedia Commons,
// domena publiczna/wolna licencja - używane tu tylko jako link do własnych profili firmy),
// wgrane jako małe PNG-i do repo (social-*.png) i hostowane na własnej domenie - tak jak
// LOGO_URL. Nie hotlinkujemy do Wikipedii (wolniej, mniej niezawodnie) i nie używamy SVG
// (Outlook i część klientów pocztowych nie renderuje SVG w mailach).
const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61591710038575", iconUrl: "https://www.sklepzastodola.pl/social-facebook.png" },
  { label: "Instagram", href: "https://www.instagram.com/sklepzastodola/", iconUrl: "https://www.sklepzastodola.pl/social-instagram.png" },
  { label: "TikTok", href: "https://www.tiktok.com/@sklepzastodola", iconUrl: "https://www.sklepzastodola.pl/social-tiktok.png" }
];

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlSignature(mailboxKey, mailboxEmail) {
  const person = SIGNATURE_PEOPLE[mailboxKey];
  if (!person) return "";
  return [
    '<table cellpadding="0" cellspacing="0" style="margin-top:18px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">',
    "<tr>",
    '<td style="padding-right:14px;vertical-align:top;">',
    `<img src="${LOGO_URL}" width="46" height="46" alt="Sklep za Stodołą" style="display:block;border-radius:10px;">`,
    "</td>",
    '<td style="border-left:2px solid #d0aa3d;padding-left:14px;vertical-align:top;">',
    '<div style="font-size:11px;letter-spacing:.5px;color:#8a8070;text-transform:uppercase;font-weight:bold;">Sklep za Stodołą</div>',
    `<div style="font-size:16px;font-weight:bold;color:#0f4a2f;margin:2px 0 6px;">${escapeHtml(person.name)}</div>`,
    `<div style="font-size:13px;color:#3d3b35;margin:2px 0;">&#9993; <a href="mailto:${mailboxEmail}" style="color:#3d3b35;text-decoration:none;">${mailboxEmail}</a></div>`,
    `<div style="font-size:13px;color:#3d3b35;margin:2px 0;">&#9742; <a href="tel:${person.phoneHref}" style="color:#3d3b35;text-decoration:none;">${escapeHtml(person.phone)}</a></div>`,
    `<div style="margin-top:8px;">${SOCIAL_LINKS.map(social =>
      `<a href="${social.href}" title="${social.label}" style="display:inline-block;margin-right:14px;text-decoration:none;" target="_blank" rel="noopener"><img src="${social.iconUrl}" width="20" height="20" alt="${social.label}" style="display:block;"></a>`
    ).join("")}</div>`,
    "</td>",
    "</tr>",
    "</table>"
  ].join("");
}

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

// Zdjęcia (JPEG/PNG/WebP) i PDF (np. wygenerowana oferta) - ta sama walidacja i ten sam
// limit łączny, bo _gmail.js buildRawMessage() dokłada je do maila identycznie (multipart/
// mixed, base64), bez różnicy między typem pliku.
function parseAttachments(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_ATTACHMENTS) throw new Error(`Maksymalnie ${MAX_ATTACHMENTS} załączniki.`);
  let totalBytes = 0;
  return value.map((item, index) => {
    const mimeType = String(item && item.mimeType || "").toLowerCase();
    const contentBase64 = String(item && item.contentBase64 || "").replace(/\s+/g, "");
    if (!ALLOWED_ATTACHMENT_MIME.test(mimeType)) throw new Error(`Załącznik ${index + 1} ma nieobsługiwany format (obsługujemy JPG, PNG, WebP i PDF).`);
    if (!contentBase64 || !/^[a-z0-9+/]+={0,2}$/i.test(contentBase64)) throw new Error(`Załącznik ${index + 1} ma nieprawidłową zawartość.`);
    const bytes = Buffer.from(contentBase64, "base64");
    totalBytes += bytes.length;
    if (totalBytes > MAX_ATTACHMENTS_BYTES) throw new Error("Łączny rozmiar załączników jest zbyt duży.");
    const defaultName = mimeType === "application/pdf" ? `dokument-${index + 1}.pdf` : `zdjecie-${index + 1}.jpg`;
    const filename = String(item.filename || defaultName).replace(/[\r\n"\\]/g, "_").slice(0, 160);
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

  // actorName = kto fizycznie kliknął "Wyślij" w panelu (do wewnętrznego śladu w historii
  // klienta). fromDisplayName = co widzi odbiorca w polu "Od" - zależne wyłącznie od
  // skrzynki, patrz komentarz przy MAIL_FROM_DISPLAY_NAMES.
  const actorName = String(payload.senderName || "").trim() || SENDER_DISPLAY_NAME;
  const fromDisplayName = MAIL_FROM_DISPLAY_NAMES[mailboxKey] || SENDER_DISPLAY_NAME;
  const clientId = payload.clientId ? String(payload.clientId) : "";
  let attachments;
  try {
    attachments = parseAttachments(payload.attachments);
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

  // Graficzna stopka (logo + imię/nazwisko/telefon) tylko jako alternatywna wersja html -
  // treść tekstowa (fullBody, z podpisem tekstowym powyżej) zostaje głównym źródłem prawdy
  // i tym, co ląduje w historii klienta w panelu.
  let htmlBody = null;
  if (SIGNATURE_PEOPLE[mailboxKey]) {
    const htmlSignature = buildHtmlSignature(mailboxKey, mailboxEmail);
    if (htmlSignature) {
      htmlBody = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#1e1e1a;white-space:pre-wrap;">${escapeHtml(body)}</div>${htmlSignature}`;
    }
  }

  let sent;
  try {
    sent = await sendMessage(mailboxEmail, { fromName: fromDisplayName, to, subject, body: fullBody, html: htmlBody, attachments });
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
          tekst: `[Mail wychodzący] Temat: ${subject}${attachments.length ? `\nZałączniki: ${attachments.map(item => item.filename).join(", ")}` : ""}\n\n${fullBody}`,
          kto: `${actorName} (panel, ${mailboxEmail} → ${to})`,
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
