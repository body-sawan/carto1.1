const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(`PAGEERROR: ${error.message}`);
  });
  await page.goto("http://localhost:8081", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(8000);
  const bodyText = await page.locator("body").innerText();
  const hasMapTitle = await page.locator("text=Map").count().catch(() => 0);
  const hasCheckout = await page.locator("text=Checkout").count().catch(() => 0);
  await page.screenshot({ path: ".codex-temp/cart-screen-check.png", fullPage: true });
  console.log(JSON.stringify({
    title: await page.title(),
    bodySnippet: bodyText.replace(/\s+/g, " ").slice(0, 300),
    hasMapTitle,
    hasCheckout,
    consoleErrors
  }, null, 2));
  await browser.close();
})();
