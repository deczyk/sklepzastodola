const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_KEY_HEADER = process.env.JSONBIN_KEY_HEADER;

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

function jsonBinAuthHeaderVariants() {
  const preferred = JSONBIN_KEY_HEADER === "X-Access-Key" ? "X-Access-Key" : "X-Master-Key";
  const variants = [{ name: preferred, headers: { [preferred]: JSONBIN_API_KEY } }];

  if (!JSONBIN_KEY_HEADER) {
    const fallback = preferred === "X-Master-Key" ? "X-Access-Key" : "X-Master-Key";
    variants.push({ name: fallback, headers: { [fallback]: JSONBIN_API_KEY } });
  }

  return variants;
}

async function readUpstreamError(upstream) {
  let body = "";
  try {
    body = await upstream.text();
  } catch (e) {}

  return {
    status: upstream.status,
    usedHeader: upstream.usedJsonBinHeader,
    message: upstream.status === 401 || upstream.status === 403
      ? "JSONBin authorization failed."
      : "JSONBin request failed.",
    body: body.slice(0, 500)
  };
}

function logJsonBinError(method, details) {
  console.error("Lead intake JSONBin request failed", {
    method,
    jsonbinStatus: details && details.status,
    usedHeader: details && details.usedHeader,
    hasBinId: Boolean(JSONBIN_BIN_ID),
    hasApiKey: Boolean(JSONBIN_API_KEY),
    message: details && details.message,
    bodyPreview: details && details.body ? details.body.slice(0, 240) : ""
  });
}

async function fetchJsonBin(url, options = {}) {
  let lastResponse = null;
  const variants = jsonBinAuthHeaderVariants();

  for (const variant of variants) {
    const headers = {
      ...(options.headers || {}),
      ...variant.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    response.usedJsonBinHeader = variant.name;
    lastResponse = response;

    if (response.ok || !(response.status === 401 || response.status === 403)) {
      return response;
    }
  }

  return lastResponse;
}

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

  if (!JSONBIN_API_KEY || !JSONBIN_BIN_ID) {
    return res.status(500).json({ error: "Lead intake is not configured." });
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
    const upstreamGet = await fetchJsonBin(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`);

    if (!upstreamGet.ok) {
      const details = await readUpstreamError(upstreamGet);
      logJsonBinError("GET", details);
      return res.status(502).json({ error: "Failed to read CRM data.", details });
    }

    const upstreamJson = await upstreamGet.json();
    const data = upstreamJson.record || upstreamJson || {};
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

      const upstreamPut = await fetchJsonBin(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Bin-Versioning": "false"
        },
        body: JSON.stringify(data)
      });

      if (!upstreamPut.ok) {
        const details = await readUpstreamError(upstreamPut);
        logJsonBinError("PUT existing", details);
        return res.status(502).json({ error: "Failed to update existing client.", details });
      }

      return res.status(200).json({ ok: true, updatedExisting: true });
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

    const upstreamPut = await fetchJsonBin(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Bin-Versioning": "false"
      },
      body: JSON.stringify(data)
    });

    if (!upstreamPut.ok) {
      const details = await readUpstreamError(upstreamPut);
      logJsonBinError("PUT new", details);
      return res.status(502).json({ error: "Failed to save new client.", details });
    }

    return res.status(200).json({ ok: true, created: true });
  } catch (error) {
    console.error("Lead intake failed", {
      source,
      hasBinId: Boolean(JSONBIN_BIN_ID),
      hasApiKey: Boolean(JSONBIN_API_KEY),
      message: error && error.message ? error.message : "Unknown error"
    });
    return res.status(500).json({ error: "Lead intake failed." });
  }
};
