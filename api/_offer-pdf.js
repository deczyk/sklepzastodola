const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const FOREST = rgb(0x2d / 255, 0x5a / 255, 0x27 / 255);
const GOLD = rgb(0xb8 / 255, 0x90 / 255, 0x2a / 255);
const CREAM = rgb(0xf7 / 255, 0xf4 / 255, 0xee / 255);
const SAGE = rgb(0xe8 / 255, 0xf0 / 255, 0xe6 / 255);
const INK = rgb(0x1e / 255, 0x1e / 255, 0x1a / 255);
const MUTED = rgb(0x6b / 255, 0x64 / 255, 0x54 / 255);
const DIM = rgb(0x8a / 255, 0x80 / 255, 0x70 / 255);
const LINE = rgb(0xe4 / 255, 0xdd / 255, 0xd1 / 255);
const WHITE = rgb(1, 1, 1);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 44;

function wrapText(font, size, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildOfferPdf(data) {
  const {
    clientName = "",
    location = "",
    dateStr = new Date().toLocaleDateString("pl-PL"),
    productTitle = "Punkt sprzedaży bezpośredniej",
    productDesc = "",
    recommendation = "",
    configLines = [],
    priceNetto = "",
    priceBrutto = "",
  } = data;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const regularBytes = fs.readFileSync(path.join(__dirname, "fonts", "NotoSans-Regular.ttf"));
  const boldBytes = fs.readFileSync(path.join(__dirname, "fonts", "NotoSans-Bold.ttf"));
  const font = await doc.embedFont(regularBytes, { subset: true });
  const fontBold = await doc.embedFont(boldBytes, { subset: true });

  const page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  // Header band
  const headerH = 96;
  page.drawRectangle({ x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH, color: FOREST });
  page.drawText("SKLEP ZA STODOŁĄ", { x: MARGIN, y: PAGE_H - 40, size: 17, font: fontBold, color: WHITE });
  page.drawText("Dystrybucja, instalacja i serwis mlekomatów BRUNIMAT w Polsce", {
    x: MARGIN, y: PAGE_H - 58, size: 9, font, color: rgb(0.85, 0.9, 0.85)
  });
  const badgeText = "OFERTA WSTĘPNA";
  const badgeSize = 9;
  const badgeTextW = fontBold.widthOfTextAtSize(badgeText, badgeSize);
  const badgeW = badgeTextW + 26;
  const badgeH = 24;
  const badgeX = PAGE_W - MARGIN - badgeW;
  const badgeY = PAGE_H - 46;
  page.drawRectangle({ x: badgeX, y: badgeY, width: badgeW, height: badgeH, color: GOLD });
  page.drawText(badgeText, { x: badgeX + 13, y: badgeY + 8, size: badgeSize, font: fontBold, color: WHITE });

  y = PAGE_H - headerH - 44;

  // Product title + description
  const titleLines = wrapText(fontBold, 22, productTitle, PAGE_W - MARGIN * 2);
  titleLines.forEach(line => {
    page.drawText(line, { x: MARGIN, y, size: 22, font: fontBold, color: INK });
    y -= 27;
  });
  y -= 6;
  if (productDesc) {
    const descLines = wrapText(font, 11, productDesc, PAGE_W - MARGIN * 2);
    descLines.forEach(line => {
      page.drawText(line, { x: MARGIN, y, size: 11, font, color: MUTED });
      y -= 15;
    });
  }
  y -= 20;

  // Client info bar
  const barH = 54;
  page.drawRectangle({
    x: MARGIN, y: y - barH, width: PAGE_W - MARGIN * 2, height: barH,
    color: CREAM, borderColor: LINE, borderWidth: 1
  });
  const cols = [
    ["KLIENT", clientName || "—"],
    ["LOKALIZACJA", location || "—"],
    ["DATA", dateStr],
  ];
  const colW = (PAGE_W - MARGIN * 2 - 32) / cols.length;
  cols.forEach(([label, value], i) => {
    const cx = MARGIN + 16 + i * colW;
    page.drawText(label, { x: cx, y: y - 22, size: 8, font: fontBold, color: DIM });
    const valueLines = wrapText(fontBold, 11, value, colW - 12);
    page.drawText(valueLines[0] || "—", { x: cx, y: y - 38, size: 11, font: fontBold, color: INK });
  });
  y -= barH + 26;

  // Recommendation box
  if (recommendation) {
    const recLines = wrapText(font, 10.5, recommendation, PAGE_W - MARGIN * 2 - 32);
    const recBoxH = 26 + recLines.length * 14 + 14;
    page.drawRectangle({ x: MARGIN, y: y - recBoxH, width: PAGE_W - MARGIN * 2, height: recBoxH, color: FOREST });
    page.drawText("REKOMENDACJA", { x: MARGIN + 16, y: y - 22, size: 8.5, font: fontBold, color: GOLD });
    let ry = y - 38;
    recLines.forEach(line => {
      page.drawText(line, { x: MARGIN + 16, y: ry, size: 10.5, font, color: WHITE });
      ry -= 14;
    });
    y -= recBoxH + 26;
  }

  // Configuration
  if (configLines.length) {
    page.drawText("Wybrana konfiguracja", { x: MARGIN, y, size: 13, font: fontBold, color: INK });
    y -= 20;
    for (const raw of configLines) {
      const lines = wrapText(font, 10.5, raw, PAGE_W - MARGIN * 2 - 16);
      lines.forEach((line, idx) => {
        const bullet = idx === 0 ? "•" : " ";
        page.drawText(bullet, { x: MARGIN, y, size: 10.5, font: fontBold, color: FOREST });
        page.drawText(line, { x: MARGIN + 14, y, size: 10.5, font, color: INK });
        y -= 15;
      });
    }
    y -= 12;
  }

  // Pricing block
  if (priceNetto) {
    const priceBoxH = 74;
    page.drawRectangle({ x: MARGIN, y: y - priceBoxH, width: PAGE_W - MARGIN * 2, height: priceBoxH, color: SAGE });
    page.drawText("CENA KATALOGOWA NETTO", { x: MARGIN + 18, y: y - 24, size: 8.5, font: fontBold, color: rgb(0.24, 0.4, 0.22) });
    page.drawText(priceNetto, { x: MARGIN + 18, y: y - 52, size: 24, font: fontBold, color: FOREST });
    if (priceBrutto) {
      const bruttoLabel = `Brutto: ${priceBrutto}`;
      const bw = font.widthOfTextAtSize(bruttoLabel, 10.5);
      page.drawText(bruttoLabel, { x: PAGE_W - MARGIN - 18 - bw, y: y - 40, size: 10.5, font, color: MUTED });
    }
    y -= priceBoxH + 20;
  }

  // Footer
  const footerY = 64;
  page.drawLine({ start: { x: MARGIN, y: footerY + 18 }, end: { x: PAGE_W - MARGIN, y: footerY + 18 }, thickness: 1, color: LINE });
  const disclaimer = "Oferta ma charakter wstępny i niewiążący. Cena, dostępność, VAT, warunki dostawy oraz zakres instalacji wymagają potwierdzenia po ocenie lokalizacji. Ważność oferty: 14 dni.";
  const discLines = wrapText(font, 8, disclaimer, PAGE_W - MARGIN * 2);
  let fy = footerY;
  discLines.forEach(line => {
    page.drawText(line, { x: MARGIN, y: fy, size: 8, font, color: DIM });
    fy -= 11;
  });
  page.drawText("735 115 427  ·  kontakt@sklepzastodola.pl  ·  sklepzastodola.pl", {
    x: MARGIN, y: fy - 8, size: 9, font: fontBold, color: FOREST
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

module.exports = { buildOfferPdf };
