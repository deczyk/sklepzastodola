const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "Sklep za Stodołą <oferty@sklepzastodola.pl>";
const LOGO_URL = "https://www.sklepzastodola.pl/favicon-192.png";
const SITE_URL = "https://www.sklepzastodola.pl";

function hasEmailConfig() {
  return Boolean(RESEND_API_KEY);
}

async function sendEmail({ to, subject, html, attachments }) {
  if (!RESEND_API_KEY || !to) return { ok: false, skipped: true };
  try {
    const body = { from: RESEND_FROM, to, subject, html };
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

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function wrapEmail(bodyHtml) {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>
<body style="margin:0;padding:0;background:#f7f4ee;font-family:Arial,Helvetica,sans-serif;color:#1e1e1a">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <div style="text-align:center;margin-bottom:20px">
    <img src="${LOGO_URL}" width="40" height="40" alt="Sklep za Stodołą" style="display:block;margin:0 auto 8px">
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
}

function ctaButton(href, label) {
  return `<div style="text-align:center;margin-top:22px">
    <a href="${esc(href)}" style="display:inline-block;background:#2d5a27;color:#fff;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:8px;font-size:14px">${esc(label)}</a>
  </div>`;
}

function buildAdvisorEmailHtml(payload) {
  const owner = esc(payload.osoba || payload.owner || "");
  const wynik = esc(payload.wynikPotencjalu || "");
  return wrapEmail(`
    <h1 style="font-size:20px;margin:0 0 12px;color:#1e1e1a">Cześć${owner ? " " + owner : ""}, obliczyliśmy Twój potencjał</h1>
    <p style="line-height:1.6;font-size:14px;color:#3d3b35">Dziękujemy za wypełnienie kalkulatora Advisor. Oto wynik:</p>
    <div style="background:#f5eddb;border-radius:10px;padding:16px 18px;margin:18px 0;text-align:center">
      <div style="font-size:13px;color:#6b6454;text-transform:uppercase;letter-spacing:.05em;font-weight:bold">Potencjał projektu</div>
      <div style="font-size:32px;font-weight:bold;color:#2d5a27;margin-top:4px">${wynik}</div>
    </div>
    <p style="line-height:1.6;font-size:14px">Następny krok: skonfiguruj swój punkt sprzedaży w naszym konfiguratorze — w kilka minut dostaniesz spersonalizowaną ofertę z ceną.</p>
    ${ctaButton(`${SITE_URL}/brief.html`, "Skonfiguruj swoją ofertę →")}
    <p style="line-height:1.6;font-size:13px;color:#6b6454;margin-top:20px;text-align:center">Masz pytania? Zadzwoń: <strong>735 115 427</strong></p>
  `);
}

function buildBriefEmailHtml(payload) {
  const owner = esc(payload.osoba || "");
  return wrapEmail(`
    <h1 style="font-size:20px;margin:0 0 12px;color:#1e1e1a">Cześć${owner ? " " + owner : ""}, Twoja oferta jest gotowa</h1>
    <p style="line-height:1.6;font-size:14px;color:#3d3b35">Dziękujemy za wypełnienie konfiguratora. W załączniku znajdziesz ofertę PDF przygotowaną na podstawie Twojej konfiguracji.</p>
    <p style="line-height:1.6;font-size:14px;color:#3d3b35">To wycena orientacyjna na podstawie cen katalogowych. Oddzwonimy w ciągu jednego dnia roboczego, żeby dopiąć szczegóły.</p>
    <div style="text-align:center;margin-top:22px">
      <a href="tel:735115427" style="display:inline-block;background:#2d5a27;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;font-size:14px">Zadzwoń: 735 115 427</a>
    </div>
  `);
}

module.exports = { hasEmailConfig, sendEmail, buildAdvisorEmailHtml, buildBriefEmailHtml };
