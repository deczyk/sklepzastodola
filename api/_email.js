const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "Sklep za Stodołą <oferty@sklepzastodola.pl>";

function hasEmailConfig() {
  return Boolean(RESEND_API_KEY);
}

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY || !to) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html })
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
<html lang="pl"><body style="margin:0;padding:0;background:#f7f4ee;font-family:Arial,Helvetica,sans-serif;color:#1e1e1a">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <div style="text-align:center;margin-bottom:24px">
    <span style="font-size:20px;font-weight:bold;color:#2d5a27">Sklep za Stodołą</span>
  </div>
  <div style="background:#ffffff;border:1px solid #e4ddd1;border-radius:12px;padding:28px 26px">
    ${bodyHtml}
  </div>
  <div style="text-align:center;margin-top:22px;font-size:12px;color:#8a8070">
    Sklep za Stodołą Sp. z o.o. &middot; 735 115 427 &middot; kontakt@sklepzastodola.pl &middot; sklepzastodola.pl
  </div>
</div>
</body></html>`;
}

function buildAdvisorEmailHtml(payload) {
  const owner = esc(payload.osoba || payload.owner || "");
  const farm = esc(payload.firma || "Twoje gospodarstwo");
  const wynik = esc(payload.wynikPotencjalu || "");
  const porada = esc(payload.porada || "");
  const roi = esc(payload.roiLata || "");
  const roiEu = esc(payload.roiLataZDofinansowaniem || "");
  const potencjal = esc(payload.potencjalRoczny || "");
  return wrapEmail(`
    <h1 style="font-size:20px;margin:0 0 12px;color:#1e1e1a">Cześć${owner ? " " + owner : ""}, wynik Twojej analizy jest gotowy</h1>
    <p style="line-height:1.6;font-size:14px;color:#3d3b35">Dziękujemy za wypełnienie kalkulatora Advisor dla ${farm}. Oto orientacyjne podsumowanie:</p>
    <div style="background:#f5eddb;border-radius:10px;padding:16px 18px;margin:18px 0">
      <div style="font-size:13px;color:#6b6454;text-transform:uppercase;letter-spacing:.05em;font-weight:bold">Potencjał projektu</div>
      <div style="font-size:28px;font-weight:bold;color:#2d5a27;margin-top:4px">${wynik}</div>
    </div>
    ${potencjal ? `<p style="line-height:1.6;font-size:14px"><strong>Szacowany potencjał roczny (przed kosztami):</strong> ${potencjal}</p>` : ""}
    ${roi ? `<p style="line-height:1.6;font-size:14px"><strong>Orientacyjny czas zwrotu inwestycji:</strong> ${roi} lat bez dofinansowania${roiEu ? `, ${roiEu} lat z dofinansowaniem UE` : ""}</p>` : ""}
    ${porada ? `<p style="line-height:1.6;font-size:14px;color:#3d3b35;border-left:3px solid #2d5a27;padding-left:12px;margin-top:18px">${porada}</p>` : ""}
    <p style="line-height:1.6;font-size:14px;margin-top:20px">To wynik orientacyjny — porozmawiajmy, żeby dobrać konkretny wariant pod Twoje gospodarstwo.</p>
    <div style="text-align:center;margin-top:22px">
      <a href="tel:735115427" style="display:inline-block;background:#2d5a27;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;font-size:14px">Zadzwoń: 735 115 427</a>
    </div>
  `);
}

function buildBriefEmailHtml(payload) {
  const owner = esc(payload.osoba || "");
  const konfiguracja = esc(payload.konfiguracja || "").replace(/\|/g, "<br>");
  const netto = esc(payload.cena_netto || "");
  const brutto = esc(payload.cena_brutto || "");
  const poDotacji = esc(payload.po_dotacji || "");
  return wrapEmail(`
    <h1 style="font-size:20px;margin:0 0 12px;color:#1e1e1a">Cześć${owner ? " " + owner : ""}, Twoja konfiguracja jest gotowa</h1>
    <p style="line-height:1.6;font-size:14px;color:#3d3b35">Dziękujemy za wypełnienie konfiguratora. Oto co przygotowałeś/aś dla swojego gospodarstwa:</p>
    <div style="background:#f5eddb;border-radius:10px;padding:16px 18px;margin:18px 0;font-size:14px;line-height:1.7;color:#1e1e1a">
      ${konfiguracja || "Szczegóły konfiguracji przekażemy podczas rozmowy."}
    </div>
    ${netto && netto !== "—" ? `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:14px">
      <tr><td style="padding:8px 0;color:#6b6454">Cena netto</td><td style="padding:8px 0;text-align:right;font-weight:bold">${netto}</td></tr>
      <tr><td style="padding:8px 0;color:#6b6454;border-top:1px solid #e4ddd1">Cena brutto</td><td style="padding:8px 0;text-align:right;font-weight:bold;border-top:1px solid #e4ddd1">${brutto}</td></tr>
      ${poDotacji ? `<tr><td style="padding:8px 0;color:#2d5a27;border-top:1px solid #e4ddd1">Po dotacji ARiMR 50%</td><td style="padding:8px 0;text-align:right;font-weight:bold;color:#2d5a27;border-top:1px solid #e4ddd1">${poDotacji}</td></tr>` : ""}
    </table>` : ""}
    <p style="line-height:1.6;font-size:14px;margin-top:20px">To wycena orientacyjna na podstawie cen katalogowych. Oddzwonimy w ciągu jednego dnia roboczego, żeby dopiąć szczegóły.</p>
    <div style="text-align:center;margin-top:22px">
      <a href="tel:735115427" style="display:inline-block;background:#2d5a27;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;font-size:14px">Zadzwoń: 735 115 427</a>
    </div>
  `);
}

module.exports = { hasEmailConfig, sendEmail, buildAdvisorEmailHtml, buildBriefEmailHtml };
