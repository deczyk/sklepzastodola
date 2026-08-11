// Wywoływane cyklicznie przez Vercel Cron (patrz vercel.json). Sprawdza obie firmowe
// skrzynki Gmail (kontakt@, j.deczynski@) i dla każdej nowej wiadomości - wysłanej z tych
// adresów albo przychodzącej na nie - sprawdza, czy druga strona ma e-mail już zapisany
// przy którymś kliencie w panelu. Jeśli tak, dopisuje pełną treść wiadomości do historii
// tego klienta. Wymaga jednorazowej konfiguracji delegacji domenowej w Google Workspace -
// patrz komentarz na górze api/_gmail.js.
const { hasGmailConfig, WATCHED_MAILBOXES, listMessageIdsAfter, getMessage, extractEmails } = require("./_gmail");
const { htmlToPlainFallback } = require("./_email");
const { mutatePanelStore, hasPanelStoreConfig } = require("./_panel-store");

const CRON_SECRET = process.env.CRON_SECRET;
const OWN_ADDRESSES = new Set(Object.values(WATCHED_MAILBOXES).map(a => a.toLowerCase()));
// Pierwsze uruchomienie (brak zapisanego stanu) - nie schodzimy w nieskończoność w historię,
// tylko bierzemy ostatni tydzień, żeby nie zalać paneli setkami starych maili na starcie.
const DEFAULT_LOOKBACK_SECONDS = 7 * 24 * 3600;
// Bufor cofnięty względem ostatniego przetworzonego maila - Gmaila "after:" z sekundami
// jest w praktyce trochę mniej precyzyjny niż inne pola daty, więc lekko nachodzimy na
// poprzedni zakres i polegamy na processedIds, żeby nie dodać tej samej wiadomości dwa razy.
const OVERLAP_BUFFER_SECONDS = 6 * 3600;
const MAX_PROCESSED_IDS_KEPT = 500;
const MAX_BODY_CHARS = 20000;

function clampBody(text) {
  const value = String(text || "").trim();
  if (value.length <= MAX_BODY_CHARS) return value;
  return `${value.slice(0, MAX_BODY_CHARS)}\n\n[... treść obcięta, pełna wiadomość jest w skrzynce ...]`;
}

function isAuthorizedCron(req) {
  if (!CRON_SECRET) return false;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${CRON_SECRET}`;
}

function findClientByEmail(klienci, email) {
  const needle = String(email || "").toLowerCase().trim();
  if (!needle) return null;
  return (klienci || []).find(c => (c.email || "").toLowerCase().trim() === needle) || null;
}

async function syncMailbox(mailboxKey, mailboxEmail, data, log) {
  const state = data.mailSyncState[mailboxKey] || {};
  const afterEpoch = Number(state.lastInternalDateSec) > 0
    ? Number(state.lastInternalDateSec) - OVERLAP_BUFFER_SECONDS
    : Math.floor(Date.now() / 1000) - DEFAULT_LOOKBACK_SECONDS;
  const alreadyProcessed = new Set(Array.isArray(state.processedIds) ? state.processedIds : []);

  const ids = await listMessageIdsAfter(mailboxEmail, afterEpoch);
  const newIds = ids.filter(id => !alreadyProcessed.has(id));

  let maxInternalDateSec = Number(state.lastInternalDateSec) || 0;
  let matched = 0;

  for (const id of newIds) {
    let message;
    try {
      message = await getMessage(mailboxEmail, id, htmlToPlainFallback);
    } catch (e) {
      log.errors.push(`${mailboxEmail} ${id}: ${e.message}`);
      continue;
    }

    const msgDateSec = Math.floor(message.internalDate / 1000);
    if (msgDateSec > maxInternalDateSec) maxInternalDateSec = msgDateSec;
    alreadyProcessed.add(id);

    const fromEmails = extractEmails(message.from);
    const toEmails = extractEmails(message.to);
    const isOutgoing = fromEmails.some(e => OWN_ADDRESSES.has(e.toLowerCase()));
    const otherPartyEmails = (isOutgoing ? toEmails : fromEmails)
      .filter(e => !OWN_ADDRESSES.has(e.toLowerCase()));

    const matchedClients = new Set();
    otherPartyEmails.forEach(email => {
      const client = findClientByEmail(data.klienci, email);
      if (client) matchedClients.add(client);
    });
    if (!matchedClients.size) continue;

    const tag = isOutgoing ? "Mail wychodzący" : "Mail przychodzący";
    const subject = message.subject || "(bez tematu)";
    const body = clampBody(message.body) || "(brak treści / tylko załączniki)";
    const entryDate = new Date(message.internalDate).toISOString();
    const tekst = `[${tag}] Temat: ${subject}\n\n${body}`;

    matchedClients.forEach(client => {
      if (!Array.isArray(client.historia)) client.historia = [];
      const alreadyThere = client.historia.some(h => h && h._mailMessageId === id);
      if (alreadyThere) return;
      client.historia.push({
        tekst,
        kto: `System (${mailboxEmail})`,
        data: entryDate,
        utworzono: new Date().toISOString(),
        _mailMessageId: id
      });
      client.zaktualizowano = new Date().toISOString();
      matched += 1;
    });
  }

  data.mailSyncState[mailboxKey] = {
    lastInternalDateSec: maxInternalDateSec,
    // Trzymamy tylko ograniczone okno ID - starsze niż nasz bufor nakładania i tak nigdy
    // więcej nie zostaną ponownie sprawdzone (są poza zakresem "after:"), więc nie muszą
    // tu zostawać w nieskończoność.
    processedIds: Array.from(alreadyProcessed).slice(-MAX_PROCESSED_IDS_KEPT)
  };

  return { checked: ids.length, new: newIds.length, matched };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: "Unauthorized. Set CRON_SECRET and let Vercel Cron call this with it." });
  }
  if (!hasGmailConfig()) {
    return res.status(200).json({ ok: false, skipped: true, reason: "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY." });
  }
  if (!hasPanelStoreConfig()) {
    return res.status(200).json({ ok: false, skipped: true, reason: "Panel store (Supabase) not configured." });
  }

  const log = { errors: [] };
  const summary = {};

  try {
    const { result } = await mutatePanelStore(async (data) => {
      if (!Array.isArray(data.klienci)) data.klienci = [];
      if (!data.mailSyncState || typeof data.mailSyncState !== "object") data.mailSyncState = {};

      for (const [key, email] of Object.entries(WATCHED_MAILBOXES)) {
        try {
          summary[key] = await syncMailbox(key, email, data, log);
        } catch (e) {
          log.errors.push(`${email}: ${e.message}`);
          summary[key] = { error: e.message };
        }
      }
      return summary;
    });
    return res.status(200).json({ ok: true, summary: result, errors: log.errors });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : "Unknown error", errors: log.errors });
  }
};
