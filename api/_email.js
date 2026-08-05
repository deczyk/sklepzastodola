const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "Sklep za Stodołą <oferty@sklepzastodola.pl>";
const LOGO_URL = "https://www.sklepzastodola.pl/favicon-192.png";
const SITE_URL = "https://www.sklepzastodola.pl";

function hasEmailConfig() {
  return Boolean(RESEND_API_KEY);
}

async function sendEmail({ to, subject, html, text, attachments }) {
  if (!RESEND_API_KEY || !to) return { ok: false, skipped: true };
  try {
    // Always send a text/plain alternative alongside the HTML body. An
    // HTML-only email (no multipart/alternative) is a well-known spam
    // signal for filters, including Gmail's — this affected the Advisor
    // "potencjał" email specifically once it started landing in spam.
    const body = { from: RESEND_FROM, to, subject, html, text: text || htmlToPlainFallback(html) };
    if (Array.isArray(attachments) && attachments.length) body.attachments = attachments;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Resend send failed", res.status, text);
      return { ok: false, status: res.status };
    }
    return { ok: true };
  } catch (error) {
    console.error("Resend send error", error && error.message ? error.message : error);
    return { ok: false, error: error && error.message };
  }
}

// Last-resort plain-text version if a caller doesn't supply one explicitly —
// strips tags/entities well enough to not be empty, but the dedicated
// buildAdvisorEmailText / buildBriefEmailText below read much better.
function htmlToPlainFallback(html) {
  return String(html || "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

// Belt-and-suspenders fix for Polish diacritics arriving garbled in some
// clients despite a correct charset meta tag: encode every non-ASCII
// character as a numeric HTML entity, so rendering never depends on the
// mail pipeline (Resend, intermediate relays, the client) honoring UTF-8.
function encodeNonAscii(html) {
  let out = "";
  for (const ch of html) {
    const code = ch.codePointAt(0);
    out += code > 127 ? `&#${code};` : ch;
  }
  return out;
}

function wrapEmail(bodyHtml) {
  const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>
<body style="margin:0;padding:0;background:#f7f4ee;font-family:Arial,Helvetica,sans-serif;color:#1e1e1a">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <div style="text-align:center;margin-bottom:20px">
    <img src="${LOGO_URL}" width="48" height="48" alt="Sklep za Stodołą" style="display:block;margin:0 auto 8px">
    <span style="font-size:20px;font-weight:bold;color:#2d5a27">Sklep za Stodołą</span>
  </div>
  <div style="background:#ffffff;border:1px solid #e4ddd1;border-top:3px solid #2d5a27;border-radius:12px;padding:28px 26px">
    ${bodyHtml}
  </div>
  <div style="text-align:center;margin-top:22px;font-size:12px;color:#8a8070">
    Sklep za Stodołą Sp. z o.o. &middot; 735 115 427 &middot; kontakt@sklepzastodola.pl &middot; sklepzastodola.pl
  </div>
</div>
</body></html>`;
  return encodeNonAscii(html);
}

function ctaButton(href, label) {
  return `<div style="text-align:center;margin-top:22px">
    <a href="${esc(href)}" style="display:inline-block;background:#2d5a27;color:#fff;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:8px;font-size:14px">${esc(label)}</a>
  </div>`;
}

function firstName(value) {
  return esc(String(value || "").trim().split(/\s+/)[0] || "");
}

function buildAdvisorEmailHtml(payload) {
  const name = firstName(payload.osoba || payload.owner);
  const wynik = esc(payload.wynikPotencjalu || "");
  const farma = esc(payload.firma || payload.farm || "");
  return wrapEmail(`
    <p style="font-size:13px;color:#6b6454;margin:0 0 4px">Dzień dobry${name ? ", " + name : ""},</p>
    <h1 style="font-size:20px;margin:0 0 12px;color:#1e1e1a">Wynik z kalkulatora Advisor</h1>
    <p style="line-height:1.6;font-size:14px;color:#3d3b35">Dziękujemy za wypełnienie kalkulatora${farma ? " dla " + farma : ""}. Na podstawie podanych danych wyszło nam:</p>
    <div style="background:#f5eddb;border-radius:10px;padding:14px 18px;margin:18px 0;text-align:center">
      <div style="font-size:12px;color:#6b6454;text-transform:uppercase;letter-spacing:.05em;font-weight:bold">Potencjał projektu</div>
      <div style="font-size:24px;font-weight:bold;color:#2d5a27;margin-top:4px">${wynik}</div>
    </div>
    <p style="line-height:1.6;font-size:14px">Jeśli chcesz zobaczyć dokładną cenę, możesz wypełnić nasz konfigurator — zajmuje kilka minut.</p>
    ${ctaButton(`${SITE_URL}/brief.html`, "Otwórz konfigurator")}
    <p style="line-height:1.6;font-size:13px;color:#6b6454;margin-top:20px;text-align:center">Masz pytania? Zadzwoń: <strong>735 115 427</strong></p>
  `);
}

function buildAdvisorEmailText(payload) {
  const name = firstName(payload.osoba || payload.owner) || "";
  const wynik = String(payload.wynikPotencjalu || "").trim();
  const farma = String(payload.firma || payload.farm || "").trim();
  return [
    `Dzień dobry${name ? ", " + name : ""},`,
    "",
    `Dziękujemy za wypełnienie kalkulatora${farma ? " dla " + farma : ""}. Wynik: ${wynik || "brak danych"}.`,
    "",
    "Jeśli chcesz zobaczyć dokładną cenę, wypełnij konfigurator (kilka minut):",
    `${SITE_URL}/brief.html`,
    "",
    "Masz pytania? Zadzwoń: 735 115 427.",
    "",
    "Sklep za Stodołą Sp. z o.o. — 735 115 427 — kontakt@sklepzastodola.pl — sklepzastodola.pl"
  ].join("\n");
}

const EMAIL_ASSETS = `${SITE_URL}/email-assets`;

// Rich, table-based "showcase" offer email — layout/styling is 1:1 from a
// ChatGPT-authored mockup (client asked it to be reused verbatim), only
// data-wired here: dynamic client/price fields, hosted (not base64) photos
// so Gmail doesn't clip the message past ~102KB, and BRUNIMAT/Sielaff
// blocks shown only when that product is actually part of the order. The
// mockup's "Proponowane wdrożenie" (rollout stages) section was dropped —
// same call the client made for the PDF.
function buildOfferShowcaseEmailHtml(data) {
  const {
    clientName = "",
    location = "",
    dateStr = new Date().toLocaleDateString("pl-PL"),
    hasMlekomat = false,
    hasSielaff = false,
    mlekomatPriceNetto = "",
    sielaffPriceNetto = ""
  } = data || {};

  const both = hasMlekomat && hasSielaff;
  const titleHtml = both
    ? "BRUNIMAT 650 Premium DUO<br>+ automat Sielaff"
    : hasSielaff ? "Automat Sielaff" : "BRUNIMAT 650 Premium DUO";
  const subtitle = both
    ? "Kompleksowy punkt sprzedaży bezpośredniej: mlekomat BRUNIMAT + automat produktowy Sielaff"
    : hasSielaff
      ? "Automat do sprzedaży produktów gospodarstwa"
      : "Całoroczny punkt sprzedaży świeżego mleka bezpośrednio z gospodarstwa";
  const heroDesc = both
    ? "Całoroczny punkt sprzedaży świeżego mleka oraz produktów gospodarstwa, przygotowany do uruchomienia etapowego."
    : hasSielaff
      ? "Punkt sprzedaży produktów gospodarstwa, przygotowany do szybkiego uruchomienia."
      : "Całoroczny punkt sprzedaży świeżego mleka bezpośrednio z gospodarstwa.";

  let n = 0;
  const zestawRows = [];
  if (hasMlekomat) {
    n++;
    zestawRows.push(`<tr><td style="padding:10px 0;${hasSielaff ? "border-bottom:1px solid #e3e6e3;" : ""}font-size:14px;line-height:21px;"><strong style="color:#0f4a2f;">${n}. BRUNIMAT 650 Premium DUO.</strong> Sprzedaż świeżego mleka z dwóch pojemników po 50 l, dwoma liniami mleka, pomiarem CE-MID, monitoringiem GSM, płukaniem automatycznym, Anti-Frost, alarmem, drukarką oraz płatnościami gotówkowymi.</td></tr>`);
  }
  if (hasSielaff) {
    n++;
    zestawRows.push(`<tr><td style="padding:10px 0;font-size:14px;line-height:21px;"><strong style="color:#0f4a2f;">${n}. Automat Sielaff.</strong> Sprzedaż dodatkowych produktów gospodarstwa, takich jak jaja, nabiał, miód, sery, przetwory, kasze, mąki, soki i syropy. Finalny model, liczba półek, system chłodzenia i płatności wymagają osobnej konfiguracji.</td></tr>`);
  }

  const photoRows = [];
  if (hasMlekomat) {
    photoRows.push(`<tr><td style="padding:0 30px 18px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
<tr>
<td width="50%" valign="top" align="center" style="padding:0 7px 0 0;"><img src="${EMAIL_ASSETS}/brunimat-front.jpg" width="255" alt="Front mlekomatu BRUNIMAT 650 Premium DUO" style="display:block;width:255px;max-width:100%;height:auto;border:1px solid #d9ddd8;"><div style="padding-top:8px;font-size:12px;line-height:18px;font-weight:bold;color:#0f4a2f;">Front mlekomatu BRUNIMAT</div></td>
<td width="50%" valign="top" align="center" style="padding:0 0 0 7px;"><img src="${EMAIL_ASSETS}/brunimat-serwis.jpg" width="255" alt="Komora serwisowa mlekomatu BRUNIMAT" style="display:block;width:255px;max-width:100%;height:auto;border:1px solid #d9ddd8;"><div style="padding-top:8px;font-size:12px;line-height:18px;font-weight:bold;color:#0f4a2f;">Komora serwisowa BRUNIMAT</div></td>
</tr></table></td></tr>`);
  }
  if (hasSielaff) {
    photoRows.push(`<tr><td align="center" style="padding:0 30px 10px 30px;"><img src="${EMAIL_ASSETS}/sielaff.jpg" width="420" alt="Automat Sielaff do sprzedaży produktów gospodarstwa" style="display:block;width:420px;max-width:100%;height:auto;border:1px solid #d9ddd8;"></td></tr>
<tr><td align="center" style="padding:0 30px 10px 30px;font-size:12px;line-height:18px;color:#5d6862;">Automat Sielaff do sprzedaży produktów dodatkowych — zdjęcie poglądowe.</td></tr>`);
  }
  const photosSection = photoRows.length ? `
<tr><td style="padding:0 30px 10px 30px;"><div style="font-size:21px;line-height:28px;font-weight:bold;color:#0f4a2f;">Zdjęcia urządzeń</div></td></tr>
${photoRows.join("\n")}` : "";

  const fitRows = [
    `<tr><td style="padding:9px 0;border-bottom:1px solid #e3e6e3;font-size:14px;line-height:21px;"><strong style="color:#0f4a2f;">Sprzedaż przez cały rok.</strong> ${hasMlekomat ? "Mlekomat jest przygotowany do pracy w różnych temperaturach i bieżącego monitoringu." : "Punkt sprzedaży jest przygotowany do pracy przez cały rok."}</td></tr>`
  ];
  if (both) {
    fitRows.push(`<tr><td style="padding:9px 0;border-bottom:1px solid #e3e6e3;font-size:14px;line-height:21px;"><strong style="color:#0f4a2f;">Jedna lokalizacja, szersza oferta.</strong> Klient może kupić mleko i produkty dodatkowe podczas jednej wizyty.</td></tr>`);
  }
  fitRows.push(`<tr><td style="padding:9px 0;${both ? "border-bottom:1px solid #e3e6e3;" : ""}font-size:14px;line-height:21px;"><strong style="color:#0f4a2f;">Istniejąca grupa odbiorców.</strong> Dotychczasowi klienci zmniejszają ryzyko startu.</td></tr>`);
  if (both) {
    fitRows.push(`<tr><td style="padding:9px 0;font-size:14px;line-height:21px;"><strong style="color:#0f4a2f;">Rozwój etapowy.</strong> Najpierw uruchomienie mlekomatu, następnie dołączenie automatu Sielaff po potwierdzeniu popytu i asortymentu.</td></tr>`);
  }

  const outdoorNote = hasSielaff
    ? " Warunki montażowe automatu Sielaff należy potwierdzić po wyborze konkretnego modelu."
    : "";

  const priceRows = [];
  if (hasMlekomat) {
    priceRows.push(`<div style="font-size:26px;line-height:32px;font-weight:bold;color:#0f4a2f;">BRUNIMAT: ${esc(mlekomatPriceNetto || "wycena indywidualna")}${mlekomatPriceNetto ? " netto" : ""}</div>
<div style="padding-top:14px;font-size:14px;line-height:21px;">Cena obejmuje mlekomat, 2 pojemniki 50 l, system gotówkowy, drukarkę, GSM, automatyczne płukanie, Anti-Frost, alarm, 2 linie mleka oraz certyfikat CE-MID.</div>`);
  }
  if (hasSielaff) {
    priceRows.push(`<div style="${hasMlekomat ? "padding-top:14px;" : ""}font-size:26px;line-height:32px;font-weight:bold;color:#0f4a2f;">Sielaff: ${sielaffPriceNetto ? esc(sielaffPriceNetto) + " netto" : "osobna wycena"}</div>
<div style="padding-top:5px;font-size:14px;line-height:21px;">${sielaffPriceNetto ? "Cena obejmuje automat, ekran dotykowy i system płatności w wybranej konfiguracji." : "Wycena po ustaleniu modelu, liczby modułów, chłodzenia, systemu płatności i zakresu dostawy."}</div>`);
  }

  const nextStepText = both
    ? "Po ustaleniu warunków przygotujemy ofertę końcową na cały zestaw: mlekomat BRUNIMAT 650 Premium DUO oraz dobrany automat Sielaff."
    : hasSielaff
      ? "Po ustaleniu warunków przygotujemy ofertę końcową na automat Sielaff dobrany do Twoich potrzeb."
      : "Po ustaleniu warunków przygotujemy ofertę końcową na mlekomat BRUNIMAT 650 Premium DUO.";

  const disclaimerProduct = both ? "Cena automatu Sielaff, dostępność" : "Cena, dostępność";

  const html = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Oferta wstępna — Sklep za Stodołą</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f1e8;font-family:Arial,Helvetica,sans-serif;color:#24312b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#f3f1e8;">
<tr><td align="center" style="padding:24px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border-collapse:collapse;background-color:#ffffff;border:1px solid #d9ddd8;">
<tr><td style="padding:26px 30px;background-color:#0f4a2f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
<tr><td valign="top" style="font-size:20px;line-height:26px;font-weight:bold;color:#ffffff;">SKLEP ZA STODOŁĄ</td><td align="right" valign="top" style="font-size:12px;line-height:18px;color:#ffffff;">OFERTA WSTĘPNA</td></tr>
<tr><td colspan="2" style="padding-top:8px;font-size:13px;line-height:20px;color:#dce9e1;">${esc(subtitle)}</td></tr>
</table></td></tr>

<tr><td style="padding:34px 30px 16px 30px;">
<div style="font-size:29px;line-height:36px;font-weight:bold;color:#0f4a2f;">${titleHtml}</div>
<div style="padding-top:14px;font-size:16px;line-height:24px;color:#3f4b45;">${esc(heroDesc)}</div>
</td></tr>

<tr><td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #d9ddd8;">
<tr>
<td width="25%" valign="top" style="padding:14px 12px;border-right:1px solid #d9ddd8;"><div style="font-size:10px;line-height:14px;color:#6b746f;font-weight:bold;">KLIENT</div><div style="padding-top:5px;font-size:13px;line-height:18px;font-weight:bold;">${esc(clientName || "—")}</div></td>
<td width="25%" valign="top" style="padding:14px 12px;border-right:1px solid #d9ddd8;"><div style="font-size:10px;line-height:14px;color:#6b746f;font-weight:bold;">LOKALIZACJA</div><div style="padding-top:5px;font-size:13px;line-height:18px;font-weight:bold;">${esc(location || "—")}</div></td>
<td width="25%" valign="top" style="padding:14px 12px;border-right:1px solid #d9ddd8;"><div style="font-size:10px;line-height:14px;color:#6b746f;font-weight:bold;">DATA</div><div style="padding-top:5px;font-size:13px;line-height:18px;font-weight:bold;">${esc(dateStr)}</div></td>
<td width="25%" valign="top" style="padding:14px 12px;"><div style="font-size:10px;line-height:14px;color:#6b746f;font-weight:bold;">WAŻNOŚĆ</div><div style="padding-top:5px;font-size:13px;line-height:18px;font-weight:bold;">14 dni</div></td>
</tr></table></td></tr>

<tr><td style="padding:0 30px 8px 30px;"><div style="font-size:21px;line-height:28px;font-weight:bold;color:#0f4a2f;">Proponowany zestaw</div></td></tr>
<tr><td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
${zestawRows.join("\n")}
</table></td></tr>
${photosSection}

<tr><td style="padding:0 30px 8px 30px;"><div style="font-size:21px;line-height:28px;font-weight:bold;color:#0f4a2f;">Dlaczego ten wariant pasuje do planu</div></td></tr>
<tr><td style="padding:0 30px 22px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
${fitRows.join("\n")}
</table></td></tr>

<tr><td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#f8edc9;border:1px solid #d0aa3d;">
<tr><td style="padding:17px 18px;font-size:13px;line-height:20px;color:#4e4428;"><strong style="color:#0f4a2f;">WAŻNE PRZY USTAWIENIU NA ZEWNĄTRZ</strong><br>Należy zapewnić wypoziomowane podłoże, dostęp do wymaganych przyłączy i ochronę przed bezpośrednimi opadami. Zadaszenie nie może ograniczać chłodzenia; zalecane jest pozostawienie co najmniej 30 cm wolnej przestrzeni nad urządzeniem.${outdoorNote}</td></tr>
</table></td></tr>

<tr><td style="padding:0 30px 8px 30px;"><div style="font-size:21px;line-height:28px;font-weight:bold;color:#0f4a2f;">Cena i zakres wyceny</div></td></tr>
<tr><td style="padding:0 30px 22px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#eef5f1;border:1px solid #d7e4dc;">
<tr><td style="padding:20px;">
${priceRows.join("\n")}
<div style="padding-top:12px;font-size:13px;line-height:20px;color:#6c4b1f;"><strong>Osobno:</strong> transport, rozładunek, ustawienie, przygotowanie miejsca i przyłączy${hasSielaff ? " oraz instalacja automatu Sielaff" : ""}.</div>
</td></tr></table></td></tr>

<tr><td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#0f4a2f;">
<tr><td style="padding:22px;color:#ffffff;"><div style="font-size:12px;line-height:18px;color:#d0b45e;font-weight:bold;">NASTĘPNY KROK</div><div style="padding-top:8px;font-size:16px;line-height:24px;font-weight:bold;">Krótka rozmowa telefoniczna i zdjęcia lokalizacji.</div><div style="padding-top:6px;font-size:14px;line-height:21px;color:#e5eee9;">${esc(nextStepText)}</div></td></tr>
</table></td></tr>

<tr><td style="padding:0 30px 30px 30px;"><div style="font-size:16px;line-height:22px;font-weight:bold;color:#0f4a2f;">Jarosław Deczyński</div><div style="padding-top:4px;font-size:13px;line-height:20px;color:#4c5952;">Sklep za Stodołą Sp. z o.o.<br>tel. +48 735 115 427<br>j.deczynski@sklepzastodola.pl<br>www.sklepzastodola.pl</div></td></tr>
<tr><td style="padding:16px 30px;background-color:#f4f5f3;border-top:1px solid #d9ddd8;font-size:10px;line-height:15px;color:#747d78;">Oferta ma charakter wstępny i niewiążący. ${esc(disclaimerProduct)}, VAT, warunki dostawy oraz zakres instalacji wymagają potwierdzenia po ocenie lokalizacji. Zdjęcia urządzeń są poglądowe.</td></tr>
</table></td></tr></table>
</body></html>`;

  return encodeNonAscii(html);
}

function buildOfferShowcaseEmailText(data) {
  const {
    clientName = "", location = "", dateStr = new Date().toLocaleDateString("pl-PL"),
    hasMlekomat = false, hasSielaff = false,
    mlekomatPriceNetto = "", sielaffPriceNetto = ""
  } = data || {};
  const lines = [
    "SKLEP ZA STODOŁĄ — OFERTA WSTĘPNA",
    "",
    `Klient: ${clientName || "—"} | Lokalizacja: ${location || "—"} | Data: ${dateStr} | Ważność: 14 dni`,
    "",
    "Proponowany zestaw:"
  ];
  if (hasMlekomat) lines.push("- BRUNIMAT 650 Premium DUO — mlekomat z pełnym wyposażeniem (CE-MID, GSM, płukanie, Anti-Frost, alarm, płatności gotówkowe).");
  if (hasSielaff) lines.push("- Automat Sielaff — sprzedaż dodatkowych produktów gospodarstwa (jaja, nabiał, miód, sery, przetwory i inne).");
  lines.push("", "Cena i zakres wyceny:");
  if (hasMlekomat) lines.push(`BRUNIMAT: ${mlekomatPriceNetto ? mlekomatPriceNetto + " netto" : "wycena indywidualna"}`);
  if (hasSielaff) lines.push(`Sielaff: ${sielaffPriceNetto ? sielaffPriceNetto + " netto" : "osobna wycena"}`);
  lines.push(
    "",
    "Osobno: transport, rozładunek, ustawienie, przygotowanie miejsca i przyłączy" + (hasSielaff ? " oraz instalacja automatu Sielaff." : "."),
    "",
    "Następny krok: krótka rozmowa telefoniczna i zdjęcia lokalizacji.",
    "",
    "Jarosław Deczyński",
    "Sklep za Stodołą Sp. z o.o.",
    "tel. +48 735 115 427 — j.deczynski@sklepzastodola.pl — www.sklepzastodola.pl",
    "",
    "Oferta ma charakter wstępny i niewiążący. Cena, dostępność, VAT, warunki dostawy oraz zakres instalacji wymagają potwierdzenia po ocenie lokalizacji."
  );
  return lines.join("\n");
}

module.exports = {
  hasEmailConfig,
  sendEmail,
  buildAdvisorEmailHtml,
  buildAdvisorEmailText,
  buildOfferShowcaseEmailHtml,
  buildOfferShowcaseEmailText
};
