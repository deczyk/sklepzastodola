const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

// Renders an HTML string to a PDF Buffer using headless Chromium — used so
// the emailed/attached offer PDF is pixel-identical to the offer email body
// (both come from the exact same HTML, just two different outputs), instead
// of maintaining a second, hand-drawn pdf-lib layout that can drift from it.
//
// @sparticuz/chromium ships a Linux binary meant for Vercel's serverless
// runtime — it will not launch locally on Windows/macOS. This can only be
// exercised by deploying and testing against the live endpoint.
async function htmlToPdf(html) {
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 800, height: 1200 },
    executablePath,
    headless: chromium.headless
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" }
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = { htmlToPdf };
