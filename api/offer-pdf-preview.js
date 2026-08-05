const { buildOfferPdf } = require("./_offer-pdf");

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

function clampText(value, max) {
  return String(value == null ? "" : value).slice(0, max);
}

function clampArray(value, max, itemMax) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map(item => {
    if (typeof item === "string") return clampText(item, itemMax);
    return item;
  });
}

// Stateless PDF renderer for the panel's "Generuj PDF" button. The panel
// assembles the same insight-cards / included-items / photos data it always
// did client-side; this endpoint only replaces the drawing step so panel
// offers use the exact same pdf-lib + NotoSans renderer as the emailed
// offers (api/leads.js), instead of the old client-side jsPDF copy that
// mangled Polish diacritics and stacked device photos vertically.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = parseBody(req);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({ error: "Invalid JSON payload." });
  }

  try {
    const data = {
      clientName: clampText(payload.clientName, 120),
      location: clampText(payload.location, 160),
      dateStr: clampText(payload.dateStr, 40) || undefined,
      productTitle: clampText(payload.productTitle, 160) || undefined,
      productDesc: clampText(payload.productDesc, 400),
      recommendation: clampText(payload.recommendation, 600),
      configLines: clampArray(payload.configLines, 40, 200),
      priceLines: Array.isArray(payload.priceLines)
        ? payload.priceLines.slice(0, 20).map(p => ({
            label: clampText(p && p.label, 160),
            netto: clampText(p && p.netto, 60)
          }))
        : [],
      totalNetto: clampText(payload.totalNetto, 60),
      totalBrutto: clampText(payload.totalBrutto, 60),
      insightCards: Array.isArray(payload.insightCards)
        ? payload.insightCards.slice(0, 8).map(c => ({
            title: clampText(c && c.title, 120),
            desc: clampText(c && c.desc, 300)
          }))
        : [],
      includedItems: clampArray(payload.includedItems, 20, 200),
      photos: Array.isArray(payload.photos)
        ? payload.photos
            .slice(0, 4)
            .map(p => ({ file: clampText(p && p.file, 80), caption: clampText(p && p.caption, 160) }))
            .filter(p => /^[a-z0-9._-]+$/i.test(p.file))
        : [],
      docTitle: clampText(payload.docTitle, 160) || undefined
    };

    const pdfBuffer = await buildOfferPdf(data);
    const safeName = clampText(payload.filenameHint, 60)
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "klient";
    const filename = `oferta-${safeName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Offer PDF preview failed", error && error.message ? error.message : error);
    return res.status(500).json({ error: "PDF generation failed." });
  }
};
