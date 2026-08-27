const {
  hasPanelStoreConfig,
  panelStoreConfigStatus,
  mutatePanelStore
} = require("./_panel-store");
const {
  hasEmailConfig,
  sendEmail,
  buildAdvisorEmailHtml,
  buildAdvisorEmailText,
  buildOfferShowcaseEmailHtml,
  buildOfferShowcaseEmailText
} = require("./_email");
const { buildOfferPdf } = require("./_offer-pdf");

function briefConfigLines(payload) {
  const raw = String(payload.konfiguracja || "").replace(/^\[[^\]]*\]\s*/, "");
  return raw.split(/\s*\|\s*/).filter(Boolean);
}

function fmtZl(n) {
  const num = Number(n);
  return num > 0 ? `${num.toLocaleString("pl-PL")} zł` : "";
}

const DEFAULT_INDIVIDUAL_QUOTE_ITEMS = ["Transport i dostawa", "Rozładunek, ustawienie i uruchomienie", "Serwis pogwarancyjny"];

function mlekomatIncludedItems(konfigText) {
  const items = [
    "Certyfikat CE-MID — legalizowany pomiar wydawanej ilości",
    "System gotówkowy — monety i banknoty z automatycznym wydawaniem reszty",
    "Drukarka paragonów po każdej transakcji",
    "Ogrzewanie termostatyczne Anti-Frost"
  ];
  const t = (konfigText || "").toLowerCase();
  if (t.includes("gsm")) items.push("Monitoring GSM — zdalny podgląd i kontrola poziomu mleka");
  if (t.includes("płukanie") || t.includes("plukanie")) items.push("Automatyczne płukanie strefy dozowania");
  if (t.includes("alarm")) items.push("Alarm i syrena antywłamaniowa");
  if (t.includes("kartą") || t.includes("karta") || t.includes("nayax")) items.push("Płatność kartą (terminal Nayax)");
  if (t.includes("wózek")) items.push("Wózek do kannych 50 L");
  return items;
}

// Zgodne z opisem realnego automatu na automat-chlodniczy.html (nie wymyślone) - "spiralna
// lub z popychaczami" i "ekran za szybą bezpieczną" to dosłowne sformułowania stamtąd.
// Banknoty/karta to płatne opcje w konfiguratorze (brief.html), nie standard - pokazujemy
// je warunkowo, tak jak GSM/płukanie przy mlekomacie wyżej. Ta sama poprawka co w panel.html
// (offerIncludedItems) - patrz komentarz tam.
function sielaffIncludedItems(konfigText) {
  const t = (konfigText || "").toLowerCase();
  const items = [
    "Konfiguracja pod Twój asortyment — układ spiralny lub z popychaczami, dla produktów stojących, leżących, butelek PET lub szklanych",
    "Dotykowy ekran za szybą bezpieczną — prezentacja produktów i komunikaty dla klienta",
    "Chłodzenie utrzymujące świeżość produktów",
    "Zabezpieczony odbiór — silnikowo blokowana klapa ograniczająca manipulacje przy odbiorze"
  ];
  if (t.includes("banknot")) items.push("Płatność banknotami");
  if (t.includes("cashless") || t.includes("nayax")) items.push("Płatność kartą i BLIK (Nayax)");
  if (!t.includes("banknot") && !t.includes("cashless") && !t.includes("nayax")) {
    items.push("Standardowy system płatności monetami — płatność banknotami i kartą/BLIK można dodać jako opcję");
  }
  return items;
}

function buildInsightCards(payload, priorHistoria, konfigText) {
  const cards = [];
  const krowy = String(payload.krowy || "");
  const litry = String(payload.litry || "");
  const pawilon = String(payload.pawilon || "");

  if (litry && !/^do 50/i.test(litry)) {
    cards.push({
      title: "Wystarczająca produkcja",
      desc: `Zadeklarowana produkcja (${litry}) daje realny wolumen do sprzedaży bezpośredniej bez ryzyka pustego punktu.`
    });
  }
  if (/tak/i.test(pawilon)) {
    cards.push({
      title: "Gotowe miejsce na start",
      desc: "Masz już miejsce pod automat — to skraca czas wdrożenia, bo nie czekamy na budowę pawilonu."
    });
  } else if (/nie/i.test(pawilon)) {
    cards.push({
      title: "Pawilon do zaplanowania",
      desc: "Nie masz jeszcze gotowego miejsca — pomożemy dobrać i wycenić drewniany pawilon pod automat."
    });
  }

  // Enrich from a prior Advisor submission on the same client, if present.
  const advisorEntry = (priorHistoria || []).find(h => /^\[advisor\]/i.test(String(h.tekst || "")));
  if (advisorEntry) {
    const text = String(advisorEntry.tekst || "");
    if (/nieformaln[aą] baz[eę] klient[oó]w.*TAK/i.test(text)) {
      cards.push({
        title: "Stała grupa odbiorców",
        desc: "Z ankiety Advisor wynika, że masz już nieformalną bazę klientów — to zmniejsza ryzyko startu."
      });
    }
    if (/dost[eę]p do energii elektrycznej.*TAK/i.test(text) && /dost[eę]p do wody.*TAK/i.test(text)) {
      cards.push({
        title: "Media na miejscu",
        desc: "Masz już dostęp do prądu i wody w lokalizacji — instalacja będzie prostsza i szybsza."
      });
    }
  }

  // Anti-Frost i "po uruchomieniu mlekomatu" dotyczą wyłącznie mlekomatu - w ofercie samego
  // Sielaffa (automat uniwersalny: jaja, sery itd., bez związku z mlekiem) nie mają się
  // pojawiać. Sielaff dostaje własną, ogólną wersję karty "Rozbudowa" (bez wymieniania
  // z nazwy mlekomatu/butelek). Ta sama poprawka co w panel.html (offerInsightCards).
  const t = (konfigText || "").toLowerCase();
  if (t.includes("mlekomat")) {
    cards.push({
      title: "Sprzedaż przez cały rok",
      desc: "Konfiguracja z ogrzewaniem Anti-Frost pozwala sprzedawać bez przerw również zimą."
    });
    cards.push({
      title: "Rozbudowa w kolejnych etapach",
      desc: "Automat chłodniczy Sielaff (jaja, sery, napoje) albo szklane butelki z etykietą można dołączyć po uruchomieniu mlekomatu."
    });
  } else if (t.includes("sielaff")) {
    cards.push({
      title: "Rozbudowa w kolejnych etapach",
      desc: "Automat Sielaff możesz w każdej chwili rozbudować o kolejne urządzenia i etapy sprzedaży bezpośredniej."
    });
  }
  return cards.slice(0, 6);
}

// Podtytuł w nagłówku PDF-a - dopasowany do wybranych produktów, żeby oferta samego
// Sielaffa nie zaczynała się od "mlekomatów BRUNIMAT" w nagłówku. Ta sama logika co
// offerHeaderTagline w panel.html (tam dla ręcznego konfiguratora oferty w panelu,
// tutaj dla PDF-a automatycznie wysyłanego po zgłoszeniu z brief.html/advisor.html).
function offerHeaderTagline(sel) {
  const only = Object.keys(sel).filter(k => sel[k]);
  if (only.length === 1) {
    if (only[0] === "mlekomat") return "Dystrybucja, instalacja i serwis mlekomatów BRUNIMAT w Polsce";
    if (only[0] === "sielaff") return "Dystrybucja, instalacja i serwis automatów sprzedażowych Sielaff w Polsce";
    if (only[0] === "butelki") return "Butelki i etykiety pod sprzedaż bezpośrednią z gospodarstwa";
    if (only[0] === "pawilon") return "Pawilony pod punkt sprzedaży bezpośredniej z gospodarstwa";
  }
  return "Sprzedaż bezpośrednia z gospodarstwa — urządzenia, punkty sprzedaży, wdrożenie";
}

function buildPhotos(konfigText) {
  const t = (konfigText || "").toLowerCase();
  const photos = [];
  if (t.includes("mlekomat") || t.includes("brunimat")) {
    photos.push({ file: "automat2.jpg", caption: "Mlekomat BRUNIMAT — front z dozownikiem" });
  }
  if (t.includes("sielaff")) {
    photos.push({ file: "sielaff-combi-m.jpg", caption: "Automat chłodniczy Sielaff SiLine SÜ Combi-M" });
  }
  if (t.includes("butelk")) {
    photos.push({ file: "butelka.jpg", caption: "Szklane butelki z etykietą Sklep za Stodołą" });
  }
  if (t.includes("pawilon")) {
    photos.push({ file: "pawilon.jpg", caption: "Pawilon drewniany" });
  }
  return photos;
}

async function buildBriefPdfAttachment(payload, lead, priorHistoria) {
  try {
    const priceLines = [];
    const mNetto = Number(payload.mlekomat_netto) || 0;
    const sNetto = Number(payload.sielaff_netto) || 0;
    if (mNetto > 0) priceLines.push({ label: "Mlekomat BRUNIMAT 650 Premium DUO", netto: fmtZl(mNetto) });
    if (sNetto > 0) priceLines.push({ label: "Automat chłodniczy Sielaff SiLine SÜ Combi-M", netto: fmtZl(sNetto) });

    const konfigText = String(payload.konfiguracja || "");
    const hasButelki = /butelk/i.test(konfigText);
    const hasPawilon = /pawilon/i.test(konfigText);
    // Butelki/pawilon nie mają jeszcze cen katalogowych w konfiguratorze —
    // pokazujemy je jako osobne pozycje z wyceną indywidualną, nie wliczamy
    // do sumy "RAZEM" (ta pozostaje tylko dla realnie wycenionych produktów).
    if (hasButelki) priceLines.push({ label: "Szklane butelki z etykietą", netto: "wycena indywidualna" });
    if (hasPawilon) priceLines.push({ label: "Pawilon drewniany", netto: "wycena indywidualna" });

    const includedItems = [
      ...(mNetto > 0 ? mlekomatIncludedItems(konfigText) : []),
      ...(sNetto > 0 ? sielaffIncludedItems(konfigText) : [])
    ];

    const pdfBuffer = await buildOfferPdf({
      clientName: lead.osoba || lead.firma || "",
      location: [lead.miejscowosc, lead.wojewodztwo].filter(Boolean).join(", "),
      productTitle: lead.produkt || lead.zainteresowanie || "Oferta dla Twojego gospodarstwa",
      productDesc: "Oferta wstępna przygotowana na podstawie konfiguracji wybranej w konfiguratorze.",
      recommendation: "Poniżej znajdziesz wybraną konfigurację i orientacyjną cenę katalogową. Skontaktujemy się, żeby dopiąć szczegóły i potwierdzić dostępność.",
      configLines: briefConfigLines(payload),
      priceLines,
      totalNetto: (mNetto > 0 || sNetto > 0) ? (payload.cena_netto && payload.cena_netto !== "—" ? payload.cena_netto : "") : "",
      totalBrutto: (mNetto > 0 || sNetto > 0) ? (payload.cena_brutto && payload.cena_brutto !== "—" ? payload.cena_brutto : "") : "",
      headerTagline: offerHeaderTagline({ mlekomat: mNetto > 0, sielaff: sNetto > 0, butelki: hasButelki, pawilon: hasPawilon }),
      insightCards: buildInsightCards(payload, priorHistoria, konfigText),
      includedItems,
      photos: buildPhotos(konfigText)
    });
    const safeName = (lead.osoba || lead.firma || "klient").toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "klient";
    return [{
      filename: `oferta-${safeName}.pdf`,
      content: pdfBuffer.toString("base64")
    }];
  } catch (error) {
    console.error("Offer PDF generation failed", error && error.message ? error.message : error);
    return undefined;
  }
}

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
  },
  brief: {
    zrodloLeada: "Brief konfiguracja",
    kategoriaLeada: "Brief",
    status: "nowy",
    priorytet: "B",
    notificationTitle: "Nowa konfiguracja z brief"
  }
};

function clampText(value, max) {
  return String(value || "").trim().slice(0, max);
}

const DOTACJA_LABELS = {
  tak: "Tak — chce cenę po dotacji",
  nie: "Nie",
  nie_wiem: "Nie wiem jeszcze"
};

// Dane z konfiguratora (brief.html) trafiały wcześniej WYŁĄCZNIE jako jeden zlepiony
// tekst w historii klienta (patrz `detale` w buildLeadData) - w panelu było je widać
// dopiero po rozwinięciu historii i doczytaniu zdania. Budujemy je tu dodatkowo jako
// osobne, płaskie pola na karcie klienta (konf*), żeby panel mógł je pokazać i
// edytować jak zwykłe pola CRM, a nie jako sparsowany tekst.
function buildBriefConfigFields(payload) {
  const konfKonfiguracja = clampText(String(payload.konfiguracja || "").replace(/^\[[^\]]*\]\s*/, ""), 2000);
  const dotacjaRaw = clampText(payload.dotacja, 40);
  const out = {
    konfKrowy: clampText(payload.krowy, 120),
    konfLitry: clampText(payload.litry, 120),
    konfPawilon: clampText(payload.pawilon, 120),
    konfDotacja: DOTACJA_LABELS[dotacjaRaw] || dotacjaRaw,
    konfKonfiguracja,
    konfCenaNetto: clampText(payload.cena_netto, 60),
    konfCenaBrutto: clampText(payload.cena_brutto, 60),
    konfPoDotacji: clampText(payload.po_dotacji, 60)
  };
  const hasAny = Object.values(out).some(Boolean);
  return hasAny ? out : null;
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

// Surowe liczby z kalkulatora Advisor (nie tylko sformatowany tekst wyniku) - trzymamy je
// przy notatce, żeby panel mógł odtworzyć ten sam kalkulator i przeliczać scenariusze zamiast
// tylko czytać zamrożony wynik z chwili wysyłki. Białalistowane klucze + walidacja liczb, bo
// to pole trafia tu wprost z publicznego formularza.
const CALC_INPUT_NUMERIC_KEYS = ["cows", "yield", "priceDairy", "priceDirect", "litersDirect", "investment", "sellThrough", "opCosts", "days", "down", "years", "rate"];
function sanitizeCalcInputs(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  let hasAny = false;
  for (const key of CALC_INPUT_NUMERIC_KEYS) {
    const n = Number(raw[key]);
    if (Number.isFinite(n)) { out[key] = n; hasAny = true; }
  }
  if (!hasAny) return null;
  out.euEnabled = Boolean(raw.euEnabled);
  return out;
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
  const zainteresowanie = readString(payload, ["zainteresowanie", "interestLabel", "temat"], 120) || (source === "brief" ? "BRUNIMAT 650 Premium DUO" : "");
  const produkt = readString(payload, ["produkt", "packageName", "interestLabel", "temat"], 120) || zainteresowanie;
  const obiekcje = readString(payload, ["obiekcje"], 120);
  const notes = sanitizeLongText(payload.notes || payload.wiadomosc || payload.message || payload.answersText || "");
  let answersText = sanitizeLongText(payload.answersText || payload.message || notes);
  if (source === "brief") {
    // payload.konfiguracja bywał obcinany do 500 znaków - dla wielu wybranych produktów naraz
    // (mlekomat + sielaff + opcje) to realnie ucinało część konfiguracji przed dotarciem do panelu.
    // 2000 znaków z zapasem mieści pełną listę, a i tak jest ograniczone przez sanitizeLongText(5000)
    // na całym złączonym tekście poniżej.
    const detale = [
      payload.konfiguracja ? `Konfiguracja: ${clampText(payload.konfiguracja, 2000)}` : "",
      payload.krowy ? `Stado: ${clampText(payload.krowy, 120)}` : "",
      payload.litry ? `Produkcja: ${clampText(payload.litry, 120)}` : "",
      payload.pawilon ? `Pawilon: ${clampText(payload.pawilon, 120)}` : "",
      payload.dotacja ? `Zainteresowanie dotacją ARiMR: ${clampText(payload.dotacja, 120)}` : "",
      [payload.cena_netto, payload.cena_brutto, payload.po_dotacji].filter(Boolean).length
        ? `Wycena (netto | brutto | po dotacji): ${[payload.cena_netto, payload.cena_brutto, payload.po_dotacji].filter(Boolean).join(" | ")}`
        : ""
    ].filter(Boolean).join("; ");
    answersText = sanitizeLongText(detale);
  }
  const priorytet = inferPriority(source, payload, answersText);
  const calcInputs = (source === "advisor" || source === "advisor_olx") ? sanitizeCalcInputs(payload.calcInputs) : null;
  const briefConfig = source === "brief" ? buildBriefConfigFields(payload) : null;

  let historyText = "";
  if (source === "kontakt") {
    historyText = `[Formularz strony] Klient wysłał formularz kontaktowy. ${answersText}`.trim();
  } else if (source === "advisor") {
    historyText = `[Advisor] Klient wypełnił formularz doradczy. Odpowiedzi: ${answersText}`.trim();
  } else if (source === "advisor_olx") {
    historyText = `[Advisor OLX] Klient wypełnił formularz doradczy z OLX. Odpowiedzi: ${answersText}`.trim();
  } else {
    historyText = `[Brief] Klient skonfigurował mlekomat w konfiguratorze. ${answersText}`.trim();
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
    priorytet,
    calcInputs,
    briefConfig
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
        const priorHistoria = existing.historia.slice();
        existing.historia.push({ tekst: lead.historyText, kto: "System", data: now, ...(lead.calcInputs ? { calcInputs: lead.calcInputs } : {}) });
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
        // Konfiguracja z brief.html nadpisuje poprzednią - to najświeższy stan
        // konfiguratora klienta, w przeciwieństwie do np. telefonu/adresu, które
        // się nie zmieniają, więc tam trzymamy pierwszą podaną wartość.
        if (lead.briefConfig) {
          Object.assign(existing, lead.briefConfig);
          existing.konfZaktualizowano = now;
        }
        if (existing.priorytet !== "A" && lead.priorytet === "A") existing.priorytet = "A";
        if (!existing.status) existing.status = lead.sourceCfg.status;
        // Ten sam numer telefonu/e-mail wypełnił teraz prawdziwy formularz —
        // "awansujemy" go z listy potencjalnych klientów OLX do zwykłej bazy.
        if (existing.segment === "olx_potencjalny") existing.segment = null;

        data.powiadomienia.unshift(buildNotification(existing, lead, now, true));
        data.powiadomienia = data.powiadomienia.slice(0, 200); // nie rosnij w nieskończoność

        return { updatedExisting: true, clientId: existing.id, priorHistoria };
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
        ...(lead.briefConfig || {}),
        ...(lead.briefConfig ? { konfZaktualizowano: now } : {}),
        utworzono: now,
        zaktualizowano: now,
        historia: [{ tekst: lead.historyText, kto: "System", data: now, ...(lead.calcInputs ? { calcInputs: lead.calcInputs } : {}) }],
        oferty: []
      };

      data.klienci.push(client);
      data.powiadomienia.unshift(buildNotification(client, lead, now, false));
      data.powiadomienia = data.powiadomienia.slice(0, 200); // nie rosnij w nieskończoność

      return { created: true, clientId: client.id };
    });

    if (hasEmailConfig() && lead.email && (source === "advisor" || source === "brief")) {
      let emailResult = null;
      try {
        if (source === "advisor") {
          emailResult = await sendEmail({
            to: lead.email,
            subject: "Twój wynik z kalkulatora — Sklep za Stodołą",
            html: buildAdvisorEmailHtml(payload),
            text: buildAdvisorEmailText(payload)
          });
        } else {
          const attachments = await buildBriefPdfAttachment(payload, lead, mutation.result.priorHistoria || []);
          const mNetto = Number(payload.mlekomat_netto) || 0;
          const sNetto = Number(payload.sielaff_netto) || 0;
          const mBrutto = Number(payload.mlekomat_brutto) || 0;
          const sBrutto = Number(payload.sielaff_brutto) || 0;
          const konfigText = String(payload.konfiguracja || "");
          // Fall back to keyword sniffing when no priced line was sent (e.g.
          // an individually-quoted Sielaff config, or butelki/pawilon which
          // never have a catalog price) so the block still shows.
          const hasMlekomat = mNetto > 0 || /mlekomat|brunimat/i.test(konfigText);
          const hasSielaff = sNetto > 0 || /sielaff/i.test(konfigText);
          const hasButelki = /butelk/i.test(konfigText);
          const hasPawilon = /pawilon/i.test(konfigText);
          const showcaseData = {
            clientName: lead.osoba || lead.firma || "",
            location: [lead.miejscowosc, lead.wojewodztwo].filter(Boolean).join(", "),
            hasMlekomat,
            hasSielaff,
            hasButelki,
            hasPawilon,
            mlekomatPriceNetto: mNetto > 0 ? fmtZl(mNetto) : "",
            mlekomatPriceBrutto: mBrutto > 0 ? fmtZl(mBrutto) : "",
            sielaffPriceNetto: sNetto > 0 ? fmtZl(sNetto) : "",
            sielaffPriceBrutto: sBrutto > 0 ? fmtZl(sBrutto) : "",
            totalNetto: (mNetto > 0 || sNetto > 0) ? (payload.cena_netto && payload.cena_netto !== "—" ? payload.cena_netto : "") : "",
            totalBrutto: (mNetto > 0 || sNetto > 0) ? (payload.cena_brutto && payload.cena_brutto !== "—" ? payload.cena_brutto : "") : "",
            individualQuoteItems: DEFAULT_INDIVIDUAL_QUOTE_ITEMS
          };
          emailResult = await sendEmail({
            to: lead.email,
            subject: "Twoja oferta — Sklep za Stodołą",
            html: buildOfferShowcaseEmailHtml(showcaseData),
            text: buildOfferShowcaseEmailText(showcaseData),
            attachments
          });
        }
      } catch (emailError) {
        console.error("Offer email failed", emailError && emailError.message ? emailError.message : emailError);
        emailResult = { ok: false, error: emailError && emailError.message };
      }

      // Wcześniej błąd wysyłki trafiał WYŁĄCZNIE do console.error (widoczne tylko
      // w logach Vercela, które i tak trzymają się krótko) — nikt tego nie widział,
      // a klient dostawał "sukces" w przeglądarce mimo braku maila. Zostawiamy więc
      // ślad wprost w karcie klienta w panelu.
      if (emailResult && !emailResult.ok && !emailResult.skipped) {
        const failureLabel = source === "advisor"
          ? "Automatyczny mail z wynikiem kalkulatora NIE wysłał się"
          : "Automatyczny mail z ofertą NIE wysłał się";
        const failureDetail = emailResult.status ? `status ${emailResult.status}` : (emailResult.error || "nieznany błąd dostawcy poczty");
        try {
          await mutatePanelStore((data) => {
            const client = (data.klienci || []).find(c => c.id === mutation.result.clientId);
            if (!client) return;
            if (!Array.isArray(client.historia)) client.historia = [];
            client.historia.push({
              tekst: `⚠️ ${failureLabel} (${failureDetail}). Sprawdź adres e-mail klienta i skrzynkę Resend.`,
              kto: "System",
              data: new Date().toISOString()
            });
          });
        } catch (noteError) {
          console.error("Failed to record email failure note", noteError && noteError.message ? noteError.message : noteError);
        }
      }
    }

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
