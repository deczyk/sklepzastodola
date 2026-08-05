const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const FOREST = rgb(0x2d / 255, 0x5a / 255, 0x27 / 255);
const FOREST_DARK = rgb(0x24 / 255, 0x40 / 255, 0x22 / 255);
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
const BOTTOM = 60;
const CONTENT_W = PAGE_W - MARGIN * 2;

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

function loadImage(name) {
  return fs.readFileSync(path.join(__dirname, "images", name));
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
    priceLines = [],
    totalNetto = "",
    totalBrutto = "",
    individualQuoteItems = ["Transport i dostawa", "Rozładunek, ustawienie i uruchomienie", "Serwis pogwarancyjny"],
    insightCards = [],
    includedItems = [],
    photos = [],
    docTitle = "BRUNIMAT 650 Premium DUO",
  } = data;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const font = await doc.embedFont(fs.readFileSync(path.join(__dirname, "fonts", "NotoSans-Regular.ttf")), { subset: true });
  const fontBold = await doc.embedFont(fs.readFileSync(path.join(__dirname, "fonts", "NotoSans-Bold.ttf")), { subset: true });

  let sectionCounter = 0;
  let pageIndex = 0;

  function drawMainHeader(page) {
    const headerH = 96;
    page.drawRectangle({ x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH, color: FOREST });
    page.drawText("SKLEP ZA STODOŁĄ", { x: MARGIN, y: PAGE_H - 40, size: 17, font: fontBold, color: WHITE });
    page.drawText("Dystrybucja, instalacja i serwis mlekomatów BRUNIMAT w Polsce", {
      x: MARGIN, y: PAGE_H - 58, size: 9, font, color: rgb(0.85, 0.9, 0.85)
    });
    const badgeText = "OFERTA WSTĘPNA";
    const badgeSize = 9;
    const badgeW = fontBold.widthOfTextAtSize(badgeText, badgeSize) + 26;
    const badgeH = 24;
    const badgeX = PAGE_W - MARGIN - badgeW;
    const badgeY = PAGE_H - 46;
    page.drawRectangle({ x: badgeX, y: badgeY, width: badgeW, height: badgeH, color: GOLD });
    page.drawText(badgeText, { x: badgeX + 13, y: badgeY + 8, size: badgeSize, font: fontBold, color: WHITE });
    return PAGE_H - headerH - 40;
  }

  function drawContinuationHeader(page) {
    page.drawRectangle({ x: 0, y: PAGE_H - 36, width: PAGE_W, height: 36, color: FOREST });
    page.drawText("SKLEP ZA STODOŁĄ", { x: MARGIN, y: PAGE_H - 23, size: 10, font: fontBold, color: WHITE });
    const right = `Oferta | ${docTitle}`;
    const rw = font.widthOfTextAtSize(right, 8.5);
    page.drawText(right, { x: PAGE_W - MARGIN - rw, y: PAGE_H - 22, size: 8.5, font, color: rgb(0.85, 0.9, 0.85) });
    return PAGE_H - 36 - 28;
  }

  function newPage() {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    pageIndex++;
    const y = pageIndex === 1 ? drawMainHeader(page) : drawContinuationHeader(page);
    return { page, y };
  }

  let ctx = newPage();

  function ensureSpace(needed) {
    if (ctx.y - needed < BOTTOM) ctx = newPage();
  }

  function sectionTitle(title) {
    sectionCounter++;
    ensureSpace(30);
    const badgeR = 8;
    // Circle center and title baseline are picked independently so the
    // digit's visual (cap-height) center lines up with the title's —
    // drawCircle's y is a center, drawText's y is a baseline, so naively
    // sharing one offset between them left the badge sitting low.
    const titleBaselineY = ctx.y - 4;
    const badgeCenterY = titleBaselineY + 4.85; // ~half the 13.5pt title's cap-height
    page().drawCircle({ x: MARGIN + badgeR, y: badgeCenterY, size: badgeR, color: FOREST });
    const numTxt = String(sectionCounter);
    const nw = fontBold.widthOfTextAtSize(numTxt, 8.5);
    page().drawText(numTxt, { x: MARGIN + badgeR - nw / 2, y: badgeCenterY - 3, size: 8.5, font: fontBold, color: WHITE });
    page().drawText(title, { x: MARGIN + badgeR * 2 + 8, y: titleBaselineY, size: 13.5, font: fontBold, color: INK });
    ctx.y -= 22;
    page().drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.75, color: LINE });
    ctx.y -= 16;
  }

  function page() { return ctx.page; }

  // Font glyph coverage for "✓" is unreliable across subsets — draw it as two
  // short vector strokes instead of relying on a text glyph.
  function drawCheckmark(x, y) {
    page().drawLine({ start: { x, y: y - 2 }, end: { x: x + 3, y: y - 5 }, thickness: 1.3, color: FOREST });
    page().drawLine({ start: { x: x + 3, y: y - 5 }, end: { x: x + 8, y: y + 3 }, thickness: 1.3, color: FOREST });
  }

  // ── Title + description ─────────────────────────────────────
  ensureSpace(60);
  const titleLines = wrapText(fontBold, 20, productTitle, CONTENT_W);
  titleLines.forEach(line => {
    page().drawText(line, { x: MARGIN, y: ctx.y, size: 20, font: fontBold, color: INK });
    ctx.y -= 24;
  });
  if (productDesc) {
    const descLines = wrapText(font, 10.5, productDesc, CONTENT_W);
    descLines.forEach(line => {
      page().drawText(line, { x: MARGIN, y: ctx.y, size: 10.5, font, color: MUTED });
      ctx.y -= 14;
    });
  }
  ctx.y -= 12;

  // ── Client info bar ─────────────────────────────────────────
  ensureSpace(60);
  const barH = 46;
  page().drawRectangle({ x: MARGIN, y: ctx.y - barH, width: CONTENT_W, height: barH, color: CREAM, borderColor: LINE, borderWidth: 1 });
  const cols = [["KLIENT", clientName || "—"], ["LOKALIZACJA", location || "—"], ["DATA", dateStr]];
  const colW = (CONTENT_W - 32) / cols.length;
  cols.forEach(([label, value], i) => {
    const cx = MARGIN + 16 + i * colW;
    page().drawText(label, { x: cx, y: ctx.y - 16, size: 7.5, font: fontBold, color: DIM });
    page().drawText(wrapText(fontBold, 11, value, colW - 12)[0] || "—", { x: cx, y: ctx.y - 32, size: 11, font: fontBold, color: INK });
  });
  ctx.y -= barH + 20;

  // ── Recommendation box ──────────────────────────────────────
  if (recommendation) {
    const recLines = wrapText(font, 10, recommendation, CONTENT_W - 32);
    const recBoxH = 22 + recLines.length * 13.5;
    ensureSpace(recBoxH + 14);
    page().drawRectangle({ x: MARGIN, y: ctx.y - recBoxH, width: CONTENT_W, height: recBoxH, color: FOREST });
    page().drawText("REKOMENDACJA", { x: MARGIN + 16, y: ctx.y - 18, size: 8, font: fontBold, color: GOLD });
    let ry = ctx.y - 33;
    recLines.forEach(line => { page().drawText(line, { x: MARGIN + 16, y: ry, size: 10, font, color: WHITE }); ry -= 13.5; });
    ctx.y -= recBoxH + 20;
  }

  // ── 1. Dlaczego ten wariant pasuje (insight cards, 2 col) ───
  if (insightCards.length) {
    sectionTitle("Dlaczego ten wariant pasuje do Twojego planu");
    const gap = 12;
    const cardW = (CONTENT_W - gap) / 2;
    let colX = [MARGIN, MARGIN + cardW + gap];
    let colY = [ctx.y, ctx.y];
    insightCards.forEach((card, i) => {
      const col = i % 2;
      const descLines = wrapText(font, 8.8, card.desc, cardW - 20);
      const cardH = 34 + descLines.length * 11.5;
      if (colY[col] - cardH < BOTTOM) {
        ctx = newPage();
        colY = [ctx.y, ctx.y];
      }
      const cx = colX[col], cy = colY[col];
      page().drawRectangle({ x: cx, y: cy - cardH, width: cardW, height: cardH, borderColor: LINE, borderWidth: 1, color: WHITE });
      page().drawText(card.title, { x: cx + 12, y: cy - 18, size: 9.5, font: fontBold, color: INK });
      let dy = cy - 32;
      descLines.forEach(line => { page().drawText(line, { x: cx + 12, y: dy, size: 8.8, font, color: MUTED }); dy -= 11.5; });
      colY[col] = cy - cardH - 10;
    });
    ctx.y = Math.min(colY[0], colY[1]) - 10;
  }

  // ── 2. Co jest w zestawie (checklist, 2 col) ────────────────
  if (includedItems.length) {
    sectionTitle("Co jest w zestawie");
    const gap = 20;
    const colW2 = (CONTENT_W - gap) / 2;
    const half = Math.ceil(includedItems.length / 2);
    const leftItems = includedItems.slice(0, half);
    const rightItems = includedItems.slice(half);
    const startY = ctx.y;
    function drawChecklist(items, x, topY) {
      let yy = topY;
      items.forEach(label => {
        const lines = wrapText(font, 9, label, colW2 - 20);
        drawCheckmark(x + 1, yy + 3);
        lines.forEach((line, idx) => {
          page().drawText(line, { x: x + 14, y: yy - idx * 11, size: 9, font, color: INK });
        });
        yy -= lines.length * 11 + 5;
      });
      return yy;
    }
    ensureSpace(20);
    const leftEnd = drawChecklist(leftItems, MARGIN, startY);
    const rightEnd = drawChecklist(rightItems, MARGIN + colW2 + gap, startY);
    ctx.y = Math.min(leftEnd, rightEnd) - 8;
  }

  // ── 3. Cena i zakres wyceny ──────────────────────────────────
  if (priceLines.length || totalNetto) {
    sectionTitle("Cena i zakres wyceny");
    for (const item of priceLines) {
      ensureSpace(16);
      page().drawText(item.label, { x: MARGIN, y: ctx.y, size: 9.5, font, color: MUTED });
      // Priced items read as "62 730 zł netto"; free-text items ("wycena
      // indywidualna") should stand on their own, not "wycena indywidualna netto".
      const nettoTxt = /zł/i.test(item.netto) ? `${item.netto} netto` : String(item.netto);
      const nw = fontBold.widthOfTextAtSize(nettoTxt, 10);
      page().drawText(nettoTxt, { x: PAGE_W - MARGIN - nw, y: ctx.y, size: 10, font: fontBold, color: INK });
      ctx.y -= 15;
    }
    if (priceLines.length) {
      ctx.y -= 4;
      ensureSpace(8);
      page().drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 0.75, color: LINE });
      ctx.y -= 12;
    }
    if (totalNetto) {
      const priceBoxH = 42;
      ensureSpace(priceBoxH + 10);
      page().drawRectangle({ x: MARGIN, y: ctx.y - priceBoxH, width: CONTENT_W, height: priceBoxH, color: SAGE });
      page().drawText("RAZEM — CENA KATALOGOWA NETTO", { x: MARGIN + 14, y: ctx.y - 16, size: 8, font: fontBold, color: FOREST_DARK });
      page().drawText(String(totalNetto), { x: MARGIN + 14, y: ctx.y - 33, size: 19, font: fontBold, color: FOREST });
      if (totalBrutto) {
        const bruttoLabel = `Brutto: ${totalBrutto}`;
        const bw = font.widthOfTextAtSize(bruttoLabel, 10);
        page().drawText(bruttoLabel, { x: PAGE_W - MARGIN - 14 - bw, y: ctx.y - 25, size: 10, font, color: MUTED });
      }
      ctx.y -= priceBoxH + 18;
    }
    if (individualQuoteItems.length) {
      ensureSpace(20 + individualQuoteItems.length * 13);
      page().drawText("Do osobnej wyceny", { x: MARGIN, y: ctx.y, size: 10.5, font: fontBold, color: INK });
      page().drawText("(nie wliczone w cenę powyżej — wyceniamy indywidualnie po rozmowie)", { x: MARGIN, y: ctx.y - 11, size: 7.8, font, color: DIM });
      ctx.y -= 26;
      individualQuoteItems.forEach(label => {
        page().drawText("—", { x: MARGIN, y: ctx.y, size: 9.5, font, color: GOLD });
        page().drawText(label, { x: MARGIN + 12, y: ctx.y, size: 9.5, font, color: INK });
        ctx.y -= 13;
      });
    }
    ctx.y -= 10;
  }

  // ── 4. Zdjęcia urządzenia ────────────────────────────────────
  if (photos.length) {
    sectionTitle("Zdjęcia urządzenia");
    const gap = 16;
    const photoW = (CONTENT_W - gap * (photos.length - 1)) / photos.length;
    const photoH = photoW * 1.3;
    ensureSpace(photoH + 30);
    for (let i = 0; i < photos.length; i++) {
      const ph = photos[i];
      try {
        const bytes = loadImage(ph.file);
        const img = ph.file.toLowerCase().endsWith(".png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const dims = img.scaleToFit(photoW, photoH);
        const px = MARGIN + i * (photoW + gap) + (photoW - dims.width) / 2;
        page().drawImage(img, { x: px, y: ctx.y - photoH + (photoH - dims.height), width: dims.width, height: dims.height });
        page().drawRectangle({ x: MARGIN + i * (photoW + gap), y: ctx.y - photoH, width: photoW, height: photoH, borderColor: LINE, borderWidth: 1 });
        if (ph.caption) {
          page().drawText(wrapText(font, 8, ph.caption, photoW)[0] || "", { x: MARGIN + i * (photoW + gap), y: ctx.y - photoH - 13, size: 8, font, color: MUTED });
        }
      } catch (e) {
        console.error("Photo embed failed", ph.file, e && e.message);
      }
    }
    ctx.y -= photoH + 26;
  }

  // ── Footer (right after content — no forced bottom placement, so it
  //    never strands itself alone on an otherwise-empty new page) ──
  ensureSpace(50);
  const footerY = ctx.y - 10;
  page().drawLine({ start: { x: MARGIN, y: footerY + 18 }, end: { x: PAGE_W - MARGIN, y: footerY + 18 }, thickness: 1, color: LINE });
  const disclaimer = "Oferta ma charakter wstępny i niewiążący. Cena, dostępność, VAT, warunki dostawy oraz zakres instalacji wymagają potwierdzenia po ocenie lokalizacji. Ważność oferty: 14 dni.";
  const discLines = wrapText(font, 8, disclaimer, CONTENT_W);
  let fy = footerY;
  discLines.forEach(line => { page().drawText(line, { x: MARGIN, y: fy, size: 8, font, color: DIM }); fy -= 11; });
  page().drawText("735 115 427  ·  kontakt@sklepzastodola.pl  ·  sklepzastodola.pl", {
    x: MARGIN, y: fy - 8, size: 9, font: fontBold, color: FOREST
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

module.exports = { buildOfferPdf };
