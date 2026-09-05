const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const COLLECTION_URL = 'https://www.yoficial.com.br/festival-de-vestidos-preco-maximo-12999';
const OUTPUT_PATH = path.join(__dirname, '../../data/yoficial-collection-products.json');

async function scrapeCollection() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  await page.goto(COLLECTION_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  const products = await page.evaluate(() => {
    const items = [];
    const seen = new Set();

    document.querySelectorAll('a.product-link[href*="/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.includes('#') || href.includes('/festival-de-vestidos')) return;
      const match = href.match(/^\/(?:[\w-]+\/)*([\w-]+)\/([\w-]+)$/);
      if (!match) return;
      const handle = match[1];
      if (seen.has(handle)) return;

      const title = (a.getAttribute('aria-label') || '').trim();
      const img = a.querySelector('img');
      let image = img ? (img.getAttribute('data-src') || img.getAttribute('src')) : null;
      if (image && image.startsWith('//')) image = 'https:' + image;

      const reviews = a.querySelector('.NETREVIEWS_PRODUCT_STARS');
      const originalPrice = reviews ? parseFloat(reviews.getAttribute('data-product-price') || '0') : 0;

      if (title && image) {
        seen.add(handle);
        items.push({ handle, title, image, originalPrice });
      }
    });

    return items;
  });

  await browser.close();

  console.log(`Encontrados ${products.length} produtos`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(products, null, 2));
  console.log(`Salvo em ${OUTPUT_PATH}`);
}

scrapeCollection().catch(err => {
  console.error(err);
  process.exit(1);
});
