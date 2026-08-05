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
// buildAdvisorEmailText / buildOfferShowcaseEmailText below read much better.
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
// Logical photo filenames from buildPhotos()/offerPhotos() (shared with the
// PDF) mapped to hosted, email-safe copies.
const EMAIL_PHOTO_MAP = {
  "automat2.jpg": { url: `${EMAIL_ASSETS}/brunimat-front.jpg`, width: 255 },
  "sielaff-combi-m.jpg": { url: `${EMAIL_ASSETS}/sielaff.jpg`, width: 255 }
};

// Rich, table-based "showcase" offer email — visual style (colors, table
// chrome) is from a ChatGPT-authored mockup the client asked to reuse, but
// the CONTENT is wired to the exact same data object used to build the
// attached PDF (buildOfferData in api/leads.js), section for section, so
// the email body and the PDF never show different numbers or copy.
function buildOfferShowcaseEmailHtml(data) {
  const {
    clientName = "",
    location = "",
    dateStr = new Date().toLocaleDateString("pl-PL"),
    productTitle = "Oferta dla Twojego gospodarstwa",
    productDesc = "",
    recommendation = "",
    priceLines = [],
    totalNetto = "",
    totalBrutto = "",
    individualQuoteItems = [],
    insightCards = [],
    includedItems = [],
    photos = []
  } = data || {};

  const insightRows = [];
  for (let i = 0; i < insightCards.length; i += 2) {
    const row = insightCards.slice(i, i + 2);
    const cells = row.map(card => `<td width="50%" valign="top" style="padding:12px 14px;border:1px solid #d9ddd8;${row.length === 1 ? "" : ""}"><div style="font-size:13px;line-height:19px;font-weight:bold;color:#0f4a2f;">${esc(card.title)}</div><div style="padding-top:4px;font-size:12.5px;line-height:19px;color:#4c5952;">${esc(card.desc)}</div></td>`).join(
      row.length === 1 ? "" : `<td width="10" style="font-size:0;line-height:0;">&nbsp;</td>`
    );
    insightRows.push(`<tr>${cells}${row.length === 1 ? '<td width="50%">&nbsp;</td>' : ""}</tr>`);
  }
  const insightSection = insightCards.length ? `
<tr><td style="padding:0 30px 8px 30px;"><div style="font-size:21px;line-height:28px;font-weight:bold;color:#0f4a2f;">Dlaczego ten wariant pasuje do Twojego planu</div></td></tr>
<tr><td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0 8px;">
${insightRows.join("\n")}
</table></td></tr>` : "";

  const half = Math.ceil(includedItems.length / 2);
  const leftItems = includedItems.slice(0, half);
  const rightItems = includedItems.slice(half);
  const maxRows = Math.max(leftItems.length, rightItems.length);
  const checklistRows = [];
  for (let i = 0; i < maxRows; i++) {
    const left = leftItems[i] ? `&#10003;&nbsp; ${esc(leftItems[i])}` : "";
    const right = rightItems[i] ? `&#10003;&nbsp; ${esc(rightItems[i])}` : "";
    checklistRows.push(`<tr><td width="50%" valign="top" style="padding:5px 8px 5px 0;font-size:13px;line-height:19px;color:#24312b;">${left}</td><td width="50%" valign="top" style="padding:5px 0 5px 8px;font-size:13px;line-height:19px;color:#24312b;">${right}</td></tr>`);
  }
  const includedSection = includedItems.length ? `
<tr><td style="padding:0 30px 8px 30px;"><div style="font-size:21px;line-height:28px;font-weight:bold;color:#0f4a2f;">Co jest w zestawie</div></td></tr>
<tr><td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
${checklistRows.join("\n")}
</table></td></tr>` : "";

  const priceLineRows = priceLines.map(p => `<tr><td style="padding:6px 0;font-size:13px;line-height:19px;color:#4c5952;">${esc(p.label)}</td><td align="right" style="padding:6px 0;font-size:14px;line-height:19px;font-weight:bold;color:#24312b;">${esc(p.netto)} netto</td></tr>`).join("\n");
  const totalBox = totalNetto ? `
<tr><td style="padding-top:14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#eef5f1;border:1px solid #d7e4dc;">
<tr><td style="padding:16px 18px;">
<div style="font-size:11px;line-height:16px;font-weight:bold;color:#3d6538;">RAZEM — CENA KATALOGOWA NETTO</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;"><tr>
<td valign="bottom" style="padding-top:4px;font-size:26px;line-height:32px;font-weight:bold;color:#0f4a2f;">${esc(totalNetto)}</td>
${totalBrutto ? `<td align="right" valign="bottom" style="font-size:13px;line-height:19px;color:#5c6862;">Brutto: ${esc(totalBrutto)}</td>` : ""}
</tr></table>
</td></tr></table>
</td></tr>` : "";
  const quoteItemsBlock = individualQuoteItems.length ? `
<tr><td style="padding-top:16px;">
<div style="font-size:13px;line-height:19px;font-weight:bold;color:#24312b;">Do osobnej wyceny</div>
<div style="padding-top:2px;font-size:11.5px;line-height:17px;color:#8a8070;">(nie wliczone w cenę powyżej — wyceniamy indywidualnie po rozmowie)</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;padding-top:6px;">
${individualQuoteItems.map(label => `<tr><td style="padding:3px 0;font-size:12.5px;line-height:18px;color:#24312b;"><span style="color:#d0aa3d;">&mdash;</span> ${esc(label)}</td></tr>`).join("\n")}
</table>
</td></tr>` : "";
  const priceSection = (priceLines.length || totalNetto) ? `
<tr><td style="padding:0 30px 8px 30px;"><div style="font-size:21px;line-height:28px;font-weight:bold;color:#0f4a2f;">Cena i zakres wyceny</div></td></tr>
<tr><td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
${priceLineRows}
${totalBox}
${quoteItemsBlock}
</table></td></tr>` : "";

  const photoCells = photos
    .map(p => EMAIL_PHOTO_MAP[p.file] ? { ...EMAIL_PHOTO_MAP[p.file], caption: p.caption } : null)
    .filter(Boolean);
  const photoWidthPct = photoCells.length === 1 ? "100%" : "50%";
  const photosSection = photoCells.length ? `
<tr><td style="padding:0 30px 10px 30px;"><div style="font-size:21px;line-height:28px;font-weight:bold;color:#0f4a2f;">Zdjęcia urządzenia</div></td></tr>
<tr><td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
<tr>
${photoCells.map((p, i) => `<td width="${photoWidthPct}" valign="top" align="center" style="padding:0 ${i === 0 && photoCells.length > 1 ? "7px 0 0" : photoCells.length > 1 ? "0 0 7px" : "0"};"><img src="${p.url}" width="255" alt="${esc(p.caption)}" style="display:block;width:100%;max-width:255px;height:auto;border:1px solid #d9ddd8;"><div style="padding-top:8px;font-size:12px;line-height:18px;font-weight:bold;color:#0f4a2f;">${esc(p.caption)}</div></td>`).join("\n")}
</tr></table></td></tr>` : "";

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
<tr><td colspan="2" style="padding-top:8px;font-size:13px;line-height:20px;color:#dce9e1;">Dystrybucja, instalacja i serwis mlekomatów BRUNIMAT w Polsce</td></tr>
</table></td></tr>

<tr><td style="padding:34px 30px 16px 30px;">
<div style="font-size:29px;line-height:36px;font-weight:bold;color:#0f4a2f;">${esc(productTitle)}</div>
${productDesc ? `<div style="padding-top:14px;font-size:15px;line-height:23px;color:#3f4b45;">${esc(productDesc)}</div>` : ""}
</td></tr>

<tr><td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #d9ddd8;">
<tr>
<td width="34%" valign="top" style="padding:14px 12px;border-right:1px solid #d9ddd8;"><div style="font-size:10px;line-height:14px;color:#6b746f;font-weight:bold;">KLIENT</div><div style="padding-top:5px;font-size:13px;line-height:18px;font-weight:bold;">${esc(clientName || "—")}</div></td>
<td width="33%" valign="top" style="padding:14px 12px;border-right:1px solid #d9ddd8;"><div style="font-size:10px;line-height:14px;color:#6b746f;font-weight:bold;">LOKALIZACJA</div><div style="padding-top:5px;font-size:13px;line-height:18px;font-weight:bold;">${esc(location || "—")}</div></td>
<td width="33%" valign="top" style="padding:14px 12px;"><div style="font-size:10px;line-height:14px;color:#6b746f;font-weight:bold;">DATA</div><div style="padding-top:5px;font-size:13px;line-height:18px;font-weight:bold;">${esc(dateStr)}</div></td>
</tr></table></td></tr>

${recommendation ? `<tr><td style="padding:0 30px 24px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#0f4a2f;">
<tr><td style="padding:16px 18px;"><div style="font-size:11px;line-height:16px;font-weight:bold;color:#d0b45e;">REKOMENDACJA</div><div style="padding-top:6px;font-size:13.5px;line-height:20px;color:#ffffff;">${esc(recommendation)}</div></td></tr>
</table></td></tr>` : ""}
${insightSection}
${includedSection}
${priceSection}
${photosSection}

<tr><td style="padding:16px 30px;background-color:#f4f5f3;border-top:1px solid #d9ddd8;font-size:10px;line-height:15px;color:#747d78;">Oferta ma charakter wstępny i niewiążący. Cena, dostępność, VAT, warunki dostawy oraz zakres instalacji wymagają potwierdzenia po ocenie lokalizacji. Ważność oferty: 14 dni.</td></tr>
<tr><td style="padding:14px 30px 26px 30px;font-size:13px;line-height:19px;font-weight:bold;color:#0f4a2f;">735 115 427 &middot; kontakt@sklepzastodola.pl &middot; sklepzastodola.pl</td></tr>
</table></td></tr></table>
</body></html>`;

  return encodeNonAscii(html);
}

function buildOfferShowcaseEmailText(data) {
  const {
    clientName = "", location = "", dateStr = new Date().toLocaleDateString("pl-PL"),
    productTitle = "Oferta dla Twojego gospodarstwa", productDesc = "", recommendation = "",
    priceLines = [], totalNetto = "", totalBrutto = "", individualQuoteItems = [],
    insightCards = [], includedItems = []
  } = data || {};
  const lines = [
    "SKLEP ZA STODOŁĄ — OFERTA WSTĘPNA",
    "",
    productTitle,
    productDesc,
    "",
    `Klient: ${clientName || "—"} | Lokalizacja: ${location || "—"} | Data: ${dateStr}`
  ];
  if (recommendation) lines.push("", "Rekomendacja: " + recommendation);
  if (insightCards.length) {
    lines.push("", "Dlaczego ten wariant pasuje do Twojego planu:");
    insightCards.forEach(c => lines.push(`- ${c.title}: ${c.desc}`));
  }
  if (includedItems.length) {
    lines.push("", "Co jest w zestawie:");
    includedItems.forEach(i => lines.push(`- ${i}`));
  }
  if (priceLines.length || totalNetto) {
    lines.push("", "Cena i zakres wyceny:");
    priceLines.forEach(p => lines.push(`${p.label}: ${p.netto} netto`));
    if (totalNetto) lines.push(`RAZEM — CENA KATALOGOWA NETTO: ${totalNetto}${totalBrutto ? ` (brutto: ${totalBrutto})` : ""}`);
    if (individualQuoteItems.length) {
      lines.push("Do osobnej wyceny (nie wliczone w cenę powyżej):");
      individualQuoteItems.forEach(i => lines.push(`- ${i}`));
    }
  }
  lines.push(
    "",
    "Oferta ma charakter wstępny i niewiążący. Cena, dostępność, VAT, warunki dostawy oraz zakres instalacji wymagają potwierdzenia po ocenie lokalizacji. Ważność oferty: 14 dni.",
    "",
    "735 115 427 — kontakt@sklepzastodola.pl — sklepzastodola.pl"
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
