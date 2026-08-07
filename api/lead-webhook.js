// Odbiera leady wysylane przez Formspree z advisor.html / advisor_olx.html / kontakt.html
// i dopisuje je automatycznie jako nowego klienta w bazie panelu (Supabase).
//
// Konfiguracja w Formspree:
//   https://TWOJA-DOMENA/api/lead-webhook?token=SEKRET&source=advisor
//   https://TWOJA-DOMENA/api/lead-webhook?token=SEKRET&source=advisor_olx
//   https://TWOJA-DOMENA/api/lead-webhook?token=SEKRET&source=kontakt
//
// Wymagane zmienne srodowiskowe:
//   SUPABASE_URL, SUPABASE_SECRET_KEY lub SUPABASE_SERVICE_ROLE_KEY
//   LEAD_WEBHOOK_SECRET

const LEAD_WEBHOOK_SECRET = process.env.LEAD_WEBHOOK_SECRET;
const { hasPanelStoreConfig, mutatePanelStore, panelStoreConfigStatus } = require("./_panel-store");

function pick(obj, keys) {
  for (const key of keys) {
    const value = obj && obj[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

const SOURCE_LABELS = {
  advisor: "Strona internetowa - Advisor",
  advisor_olx: "Strona internetowa - Advisor OLX",
  kontakt: "Strona internetowa - formularz kontaktowy"
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!hasPanelStoreConfig()) {
    return res.status(500).json({
      error: "Lead webhook Supabase configuration is missing.",
      config: panelStoreConfigStatus()
    });
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

  const firma = pick(payload, ["Gospodarstwo", "farm", "firma", "Nazwa gospodarstwa"]);
  const osoba = pick(payload, ["Osoba kontaktowa", "owner", "osoba", "imie", "name", "Imie i nazwisko", "Imi\u0119 i nazwisko"]);
  const telefon = pick(payload, ["Telefon", "telefon", "phone"]);
  const email = pick(payload, ["email", "E-mail", "Email"]);
  const lokalizacjaRaw = pick(payload, ["Wojewodztwo / powiat", "Wojew\u00f3dztwo / powiat", "region", "lokalizacja"]);
  const produkt = pick(payload, ["Zainteresowanie", "zainteresowanie", "packageName", "temat"]);
  const wiadomosc = pick(payload, ["wiadomosc", "message", "Dodatkowe uwagi klienta"]);

  let wojewodztwo = lokalizacjaRaw;
  let miejscowosc = "";
  if (lokalizacjaRaw.includes("/")) {
    const parts = lokalizacjaRaw.split("/").map(part => part.trim());
    wojewodztwo = parts[0] || "";
    miejscowosc = parts[1] || "";
  }

  if (!firma && !osoba && !telefon && !email) {
    return res.status(400).json({ error: "Payload does not contain any recognizable lead data." });
  }

  try {
    const mutation = await mutatePanelStore((data) => {
      if (!Array.isArray(data.klienci)) data.klienci = [];
      if (!Array.isArray(data.powiadomienia)) data.powiadomienia = [];

      const now = new Date().toISOString();
      const client = {
        id: "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        firma,
        osoba,
        wojewodztwo,
        miejscowosc,
        ulica: "",
        telefon,
        email,
        zainteresowanie: produkt,
        produkt,
        priorytet: "B",
        status: "nowy",
        notatki: [wiadomosc, `Lead zapisany automatycznie z formularza (${zrodloLeada}).`].filter(Boolean).join("\n"),
        nastepnyFollowup: "",
        zrodloLeada,
        kategoriaLeada: sourceKey === "advisor_olx" ? "Advisor OLX" : sourceKey === "advisor" ? "Advisor" : "Kontakt",
        obiekcje: "",
        utworzono: now,
        zaktualizowano: now,
        historia: [{ tekst: `Lead z formularza: ${zrodloLeada}. ${wiadomosc || ""}`.trim(), kto: "System", data: now }],
        oferty: []
      };

      data.klienci.push(client);
      data.powiadomienia.unshift({
        id: "n_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        typ: "lead",
        zrodlo: zrodloLeada,
        tytul: "Nowy lead z formularza",
        tekst: `Dodano nowego leada: ${client.firma || client.osoba || "bez nazwy"}.`,
        data: now,
        przeczytane: false,
        klientId: client.id
      });
      data.powiadomienia = data.powiadomienia.slice(0, 200); // nie rosnij w nieskończoność

      return { clientId: client.id };
    });

    return res.status(200).json({ ok: true, ...mutation.result });
  } catch (e) {
    console.error("Lead webhook failed", {
      supabase: panelStoreConfigStatus(),
      message: e && e.message ? e.message : "Unknown error"
    });
    return res.status(500).json({
      error: "Lead webhook failed.",
      message: e && e.message ? e.message : "Unknown error"
    });
  }
};
