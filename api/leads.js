const {
  hasPanelStoreConfig,
  panelStoreConfigStatus,
  mutatePanelStore
} = require("./_panel-store");

const ALLOWED_SOURCES = {
  kontakt: {
    zrodloLeada: "Formularz strony",
    kategoriaLeada: "Kontakt",
    status: "nowy",
    priorytet: "B",
    notificationTitle: "Nowe zgłoszenie ze strony"
  },
  advisor: {
    zrodloLeada: "Advisor",
    kategoriaLeada: "Advisor",
    status: "nowy",
    priorytet: "B",
    notificationTitle: "Nowy lead z Advisor"
  },
  advisor_olx: {
    zrodloLeada: "Advisor OLX",
    kategoriaLeada: "Advisor OLX",
    status: "nowy",
    priorytet: "B",
    notificationTitle: "Nowy lead z Advisor OLX"
  }
};

function clampText(value, max) {
  return String(value || "").trim().slice(0, max);
}

function normalizeEmail(value) {
  return clampText(value, 120).toLowerCase();
}

function normalizePhone(value) {
  return clampText(value, 120).replace(/\D/g, "");
}

function normalizeKey(value) {
  return clampText(value, 200).toLowerCase();
}

function sanitizeLongText(value) {
  return clampText(value, 5000);
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

function safeSource(value) {
  const source = clampText(value, 40).toLowerCase();
  return ALLOWED_SOURCES[source] ? source : "";
}

function getHoneypot(payload) {
  return clampText(payload.website || payload.company_url || "", 200);
}

function inferPriority(source, payload, metaText) {
  if (source === "kontakt") return "B";
  const haystack = `${metaText} ${payload.interest || ""} ${payload.packageName || ""} ${payload.temat || ""}`.toLowerCase();
  const strongSignals = [
    "premium",
    "pawilon",
    "pełny punkt sprzedaży",
    "pelny punkt sprzedazy",
    "finansowanie",
    "leasing",
    "dotacja",
    "cały system",
    "caly system"
  ];
  return strongSignals.some(token => haystack.includes(token)) ? "A" : "B";
}

function readString(payload, keys, max = 120) {
  for (const key of keys) {
    const value = clampText(payload[key], max);
    if (value) return value;
  }
  return "";
}

function buildLeadData(payload, source) {
  const sourceCfg = ALLOWED_SOURCES[source];
  const firma = readString(payload, ["firma", "farm", "gospodarstwo", "Nazwa gospodarstwa"], 120);
  const osoba = readString(payload, ["osoba", "owner", "name", "imie", "imieNazwisko", "kontakt", "Imię i nazwisko"], 120);
  const telefon = readString(payload, ["telefon", "phone"], 120);
  const email = readString(payload, ["email"], 120);
  const wojewodztwo = readString(payload, ["wojewodztwo", "region"], 120);
  const miejscowosc = readString(payload, ["miejscowosc", "county", "lokalizacja"], 120);
  const ulica = readString(payload, ["ulica"], 120);
  const zainteresowanie = readString(payload, ["zainteresowanie", "interestLabel", "temat"], 120);
  const produkt = readString(payload, ["produkt", "packageName", "interestLabel", "temat"], 120) || zainteresowanie;
  const obiekcje = readString(payload, ["obiekcje"], 120);
  const notes = sanitizeLongText(payload.notes || payload.wiadomosc || payload.message || payload.answersText || "");
  const answersText = sanitizeLongText(payload.answersText || payload.message || notes);
  const priorytet = inferPriority(source, payload, answersText);

  let historyText = "";
  if (source === "kontakt") {
    historyText = `[Formularz strony] Klient wysłał formularz kontaktowy. ${answersText}`.trim();
  } else if (source === "advisor") {
    historyText = `[Advisor] Klient wypełnił formularz doradczy. Odpowiedzi: ${answersText}`.trim();
  } else {
    historyText = `[Advisor OLX] Klient wypełnił formularz doradczy z OLX. Odpowiedzi: ${answersText}`.trim();
  }

  return {
    sourceCfg,
    firma,
    osoba,
    telefon,
    email,
    wojewodztwo,
    miejscowosc,
    ulica,
    zainteresowanie,
    produkt,
    obiekcje,
    notes,
    answersText,
    historyText,
    priorytet
  };
}

function findExistingClient(clients, lead) {
  const emailKey = normalizeEmail(lead.email);
  if (emailKey) {
    const byEmail = clients.find(client => normalizeEmail(client.email) === emailKey);
    if (byEmail) return byEmail;
  }
  const phoneKey = normalizePhone(lead.telefon);
  if (phoneKey) {
    const byPhone = clients.find(client => normalizePhone(client.telefon) === phoneKey);
    if (byPhone) return byPhone;
  }
  const firmaKey = normalizeKey(lead.firma);
  const osobaKey = normalizeKey(lead.osoba);
  if (firmaKey && osobaKey) {
    return clients.find(client => normalizeKey(client.firma) === firmaKey && normalizeKey(client.osoba) === osobaKey) || null;
  }
  return null;
}

function mergeNotes(existing, next) {
  const prev = sanitizeLongText(existing || "");
  const incoming = sanitizeLongText(next || "");
  if (!incoming) return prev;
  if (!prev) return incoming;
  if (prev.includes(incoming)) return prev;
  return sanitizeLongText(`${prev}\n\n${incoming}`);
}

function buildNotification(client, lead, now, updatedExisting) {
  return {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    typ: "lead",
    zrodlo: lead.sourceCfg.zrodloLeada,
    tytul: lead.sourceCfg.notificationTitle,
    tekst: updatedExisting
      ? `Zaktualizowano istniejącego klienta: ${client.firma || client.osoba || "bez nazwy"}.`
      : `Dodano nowego leada: ${client.firma || client.osoba || "bez nazwy"}.`,
    data: now,
    przeczytane: false,
    klientId: client.id
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!hasPanelStoreConfig()) {
    return res.status(500).json({
      error: "Lead intake Supabase configuration is missing.",
      config: panelStoreConfigStatus()
    });
  }

  const payload = parseBody(req);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({ error: "Invalid JSON payload." });
  }

  const source = safeSource(payload.source);
  if (!source) {
    return res.status(400).json({ error: "Unknown lead source." });
  }

  if (getHoneypot(payload)) {
    return res.status(200).json({ ok: true });
  }

  const lead = buildLeadData(payload, source);
  if (!lead.telefon && !lead.email) {
    return res.status(400).json({ error: "Phone or email is required." });
  }

  try {
    const mutation = await mutatePanelStore((data) => {
      if (!Array.isArray(data.klienci)) data.klienci = [];
      if (!Array.isArray(data.powiadomienia)) data.powiadomienia = [];

      const now = new Date().toISOString();
      const existing = findExistingClient(data.klienci, lead);

      if (existing) {
        if (!Array.isArray(existing.historia)) existing.historia = [];
        if (!Array.isArray(existing.oferty)) existing.oferty = [];
        existing.historia.push({ tekst: lead.historyText, kto: "System", data: now });
        existing.zaktualizowano = now;
        if (!existing.zrodloLeada) existing.zrodloLeada = lead.sourceCfg.zrodloLeada;
        if (!existing.kategoriaLeada) existing.kategoriaLeada = lead.sourceCfg.kategoriaLeada;
        if (!existing.telefon && lead.telefon) existing.telefon = lead.telefon;
        if (!existing.email && lead.email) existing.email = lead.email;
        if (!existing.firma && lead.firma) existing.firma = lead.firma;
        if (!existing.osoba && lead.osoba) existing.osoba = lead.osoba;
        if (!existing.wojewodztwo && lead.wojewodztwo) existing.wojewodztwo = lead.wojewodztwo;
        if (!existing.miejscowosc && lead.miejscowosc) existing.miejscowosc = lead.miejscowosc;
        if (!existing.ulica && lead.ulica) existing.ulica = lead.ulica;
        if (!existing.zainteresowanie && lead.zainteresowanie) existing.zainteresowanie = lead.zainteresowanie;
        if (!existing.produkt && lead.produkt) existing.produkt = lead.produkt;
        if (!existing.obiekcje && lead.obiekcje) existing.obiekcje = lead.obiekcje;
        existing.notatki = mergeNotes(existing.notatki, lead.notes);
        if (existing.priorytet !== "A" && lead.priorytet === "A") existing.priorytet = "A";
        if (!existing.status) existing.status = lead.sourceCfg.status;

        data.powiadomienia.unshift(buildNotification(existing, lead, now, true));

        return { updatedExisting: true, clientId: existing.id };
      }

      const client = {
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        firma: lead.firma,
        osoba: lead.osoba,
        wojewodztwo: lead.wojewodztwo,
        miejscowosc: lead.miejscowosc,
        ulica: lead.ulica,
        telefon: lead.telefon,
        email: lead.email,
        zainteresowanie: lead.zainteresowanie,
        produkt: lead.produkt,
        priorytet: lead.priorytet,
        status: lead.sourceCfg.status,
        zrodloLeada: lead.sourceCfg.zrodloLeada,
        kategoriaLeada: lead.sourceCfg.kategoriaLeada,
        obiekcje: lead.obiekcje,
        notatki: lead.notes,
        nastepnyFollowup: "",
        utworzono: now,
        zaktualizowano: now,
        historia: [{ tekst: lead.historyText, kto: "System", data: now }],
        oferty: []
      };

      data.klienci.push(client);
      data.powiadomienia.unshift(buildNotification(client, lead, now, false));

      return { created: true, clientId: client.id };
    });

    return res.status(200).json({ ok: true, ...mutation.result });
  } catch (error) {
    console.error("Lead intake failed", {
      source,
      supabase: panelStoreConfigStatus(),
      message: error && error.message ? error.message : "Unknown error"
    });
    return res.status(500).json({ error: "Lead intake failed." });
  }
};
