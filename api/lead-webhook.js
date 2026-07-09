// Odbiera leady wysyłane przez Formspree z advisor.html / advisor_olx.html / kontakt.html
// i dopisuje je automatycznie jako nowego klienta w bazie panelu (JSONBin).
//
// Konfiguracja w Formspree (dla każdego formularza osobno):
//   Ustawienia formularza -> Integrations -> Webhooks -> dodaj URL:
//   https://TWOJA-DOMENA/api/lead-webhook?token=SEKRET&source=advisor
//   https://TWOJA-DOMENA/api/lead-webhook?token=SEKRET&source=advisor_olx
//   https://TWOJA-DOMENA/api/lead-webhook?token=SEKRET&source=kontakt
//
// Wymagane zmienne środowiskowe (Vercel -> Settings -> Environment Variables):
//   JSONBIN_API_KEY, JSONBIN_BIN_ID, JSONBIN_KEY_HEADER  (te same co dla /api/panel-data)
//   LEAD_WEBHOOK_SECRET  — dowolny losowy sekret, ten sam co w "token" powyżej

const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_KEY_HEADER = process.env.JSONBIN_KEY_HEADER;
const LEAD_WEBHOOK_SECRET = process.env.LEAD_WEBHOOK_SECRET;

function jsonBinAuthHeaders() {
  const keyHeader = JSONBIN_KEY_HEADER === "X-Access-Key" ? "X-Access-Key" : "X-Master-Key";
  return { [keyHeader]: JSONBIN_API_KEY };
}

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj && obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

const SOURCE_LABELS = {
  advisor: "Strona internetowa — Advisor EU",
  advisor_olx: "Strona internetowa — kalkulator",
  kontakt: "Strona internetowa — formularz kontaktowy"
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
    return res.status(500).json({ error: "Lead webhook: missing JSONBin configuration." });
  }

  if (!LEAD_WEBHOOK_SECRET || req.query.token !== LEAD_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let payload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON payload." });
  }

  const sourceKey = String(req.query.source || "").toLowerCase();
  const zrodloLeada = SOURCE_LABELS[sourceKey] || "Strona internetowa";

  const firma = pick(payload, ["Gospodarstwo", "farm", "Nazwa gospodarstwa"]);
  const osoba = pick(payload, ["Osoba kontaktowa", "owner", "imie", "name", "Imię i nazwisko"]);
  const telefon = pick(payload, ["Telefon", "telefon", "phone"]);
  const email = pick(payload, ["email", "E-mail", "Email"]);
  const lokalizacjaRaw = pick(payload, ["Województwo / powiat", "region", "lokalizacja"]);
  let wojewodztwo = lokalizacjaRaw, miejscowosc = "";
  if (lokalizacjaRaw.includes("/")) {
    const parts = lokalizacjaRaw.split("/").map(s => s.trim());
    wojewodztwo = parts[0] || "";
    miejscowosc = parts[1] || "";
  }
  const produkt = pick(payload, ["Zainteresowanie", "packageName", "temat"]);

  const notatkiParts = [];
  const wiadomosc = pick(payload, ["wiadomosc", "message", "Dodatkowe uwagi klienta"]);
  if (wiadomosc) notatkiParts.push(wiadomosc);
  notatkiParts.push(`— lead zapisany automatycznie z formularza (${zrodloLeada}).`);

  if (!firma && !osoba && !telefon && !email) {
    return res.status(400).json({ error: "Payload does not contain any recognizable lead data." });
  }

  try {
    const getUpstream = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: jsonBinAuthHeaders()
    });
    if (!getUpstream.ok) {
      return res.status(502).json({ error: "Failed to read panel data." });
    }
    const current = await getUpstream.json();
    const data = current.record || current;
    if (!Array.isArray(data.klienci)) data.klienci = [];

    const now = new Date().toISOString();
    data.klienci.push({
      id: "c_" + Date.now(),
      firma, osoba,
      wojewodztwo, miejscowosc, ulica: "",
      telefon, email,
      zainteresowanie: "", priorytet: "B",
      status: "nowy",
      notatki: notatkiParts.join("\n"),
      nastepnyFollowup: "", zrodloLeada, produkt, obiekcje: "",
      utworzono: now, zaktualizowano: now, historia: [], oferty: []
    });

    const putUpstream = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...jsonBinAuthHeaders(),
        "X-Bin-Versioning": "false"
      },
      body: JSON.stringify(data)
    });
    if (!putUpstream.ok) {
      return res.status(502).json({ error: "Failed to save new client." });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      error: "Lead webhook failed.",
      message: e && e.message ? e.message : "Unknown error"
    });
  }
};
