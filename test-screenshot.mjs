import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Light mode - Index page
await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: 'screenshots/index-light.png', fullPage: true });

// Dark mode - Toggle via JS
await page.evaluate(() => {
  document.documentElement.classList.add('dark');
  localStorage.setItem('theme', 'dark');
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/index-dark.png', fullPage: true });

// Light mode - Detail page (first listing)
await page.evaluate(() => {
  document.documentElement.classList.remove('dark');
  localStorage.setItem('theme', 'light');
});
const firstLink = await page.$('a[href^="/listings/"]');
if (firstLink) {
  await firstLink.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/detail-light.png', fullPage: true });

  // Dark mode detail
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/detail-dark.png', fullPage: true });
}

await browser.close();
console.log('Screenshots saved to screenshots/');
