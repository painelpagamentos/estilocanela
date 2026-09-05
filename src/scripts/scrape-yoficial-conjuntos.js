const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const COLLECTION_URL = 'https://www.yoficial.com.br/festival-de-conjunto-r8999';
const OUTPUT_PATH = path.join(__dirname, '../../data/yoficial-conjunto-products.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getCollectionItems(page) {
  const allItems = [];
  const seen = new Set();
  let pageNum = 1;
  while (true) {
    const url = pageNum === 1 ? COLLECTION_URL : `${COLLECTION_URL}?page=${pageNum}`;
    console.log(`  → página ${pageNum}: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    const products = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('a.product-link[href*="/"]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href.includes('#') || href.includes('/festival-de-conjunto')) return;
        const match = href.match(/^\/(?:[\w-]+\/)*([\w-]+)\/([\w-]+)$/);
        if (!match) return;
        const handle = match[1];
        const color = match[2];
        const title = (a.getAttribute('aria-label') || '').trim();
        const img = a.querySelector('img');
        let image = img ? (img.getAttribute('data-src') || img.getAttribute('src')) : null;
        if (image && image.startsWith('//')) image = 'https:' + image;
        const reviews = a.querySelector('.NETREVIEWS_PRODUCT_STARS');
        const originalPrice = reviews ? parseFloat(reviews.getAttribute('data-product-price') || '0') : 0;
        items.push({ handle, color, title, image, originalPrice });
      });
      return items;
    });

    if (products.length === 0) break;

    const pageSeenBefore = products.every(p => seen.has(`${p.handle}:${p.color}`));
    if (pageSeenBefore) break;

    for (const p of products) {
      const key = `${p.handle}:${p.color}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const existing = allItems.find(x => x.handle === p.handle);
      if (!existing) {
        allItems.push({ handle: p.handle, title: p.title, originalPrice: p.originalPrice, colors: [p.color], firstImage: p.image });
      } else {
        if (!existing.colors.includes(p.color)) existing.colors.push(p.color);
      }
    }
    pageNum++;
  }
  return allItems;
}

async function scrapeProduct(page, baseHandle, color) {
  const url = `https://www.yoficial.com.br/${baseHandle}/${color}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(500);

    const result = await page.evaluate(() => {
      const result = { title: '', description: '', images: [] };

      // título
      const h1 = document.querySelector('h1.h1');
      result.title = h1 ? h1.textContent.trim() : document.title.split('|')[0].trim();

      // descrição
      const descEl = document.querySelector('.product-description .cms');
      result.description = descEl ? descEl.innerHTML.trim() : '';

      // imagens da galeria
      const seenImg = new Set();
      document.querySelectorAll('a.product-image, .product-gallery img, [data-zoom], [data-image]').forEach(el => {
        let src = el.getAttribute('data-src') || el.getAttribute('data-zoom') || el.getAttribute('data-image') || el.getAttribute('src');
        if (!src) return;
        if (src.startsWith('//')) src = 'https:' + src;
        if (!src.includes('cdn.dooca.store')) return;
        // pegar a imagem sem redimensionamento para melhor qualidade
        src = src.replace(/_\d+x\d+(?:[^.?]*)(?=\.(?:jpe?g|png|webp|gif))/, '');
        // garantir extensao .jpeg para nao quebrar
        if (!/\.(?:jpe?g|png|webp|gif)(?:\?|$)/i.test(src)) src = src.replace(/\?(.*)$/, '.jpeg?$1');
        if (!seenImg.has(src)) {
          seenImg.add(src);
          result.images.push(src);
        }
      });

      // variações / tamanhos
      result.sizes = [];
      document.querySelectorAll('.product-variant, [data-variant], .variant').forEach(el => {
        const txt = el.textContent.trim();
        const title = el.getAttribute('data-variant') || el.getAttribute('title') || txt;
        if (title && !result.sizes.includes(title)) result.sizes.push(title);
      });

      // fallback: procurar por radio/select de tamanho
      if (result.sizes.length === 0) {
        const labels = document.querySelectorAll('.product-variant label, [class*="variant"] label, .size-selector label');
        labels.forEach(l => {
          const t = l.textContent.trim();
          if (t && !result.sizes.includes(t)) result.sizes.push(t);
        });
      }

      // cor atual
      const activeColor = document.querySelector('.product-color .active a');
      result.color = activeColor ? activeColor.getAttribute('title') || activeColor.textContent.trim() : '';

      // outras cores disponíveis na página
      result.otherColors = [];
      document.querySelectorAll('.product-color a[href^="/"]').forEach(a => {
        const href = a.getAttribute('href');
        const m = href && href.match(/\/([^/]+)$/);
        const title = a.getAttribute('title') || (m && m[1]);
        if (m && title && title !== result.color) {
          result.otherColors.push({ slug: m[1], name: title });
        }
      });

      // tamanhos via descricao (P/M/G)
      if (result.sizes.length === 0) {
        const m = result.description.match(/Tamanhos[^:]*:\s*P[^\n]*M[^\n]*G/i);
        if (m) result.sizes = ['P', 'M', 'G'];
      }

      // limpar titulo (remover cor repetida no final)
      if (result.color) {
        result.title = result.title.replace(new RegExp('\\s+' + result.color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), '').trim();
      }

      return result;
    });
    return result;
  } catch (err) {
    console.error(`    ✗ Erro em ${url}:`, err.message);
    return null;
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Listando coleção...');
  const collectionItems = await getCollectionItems(page);
  console.log(`Encontrados ${collectionItems.length} produtos`);

  const output = [];
  for (const item of collectionItems) {
    console.log(`Scraping ${item.handle}...`);
    const colorData = [];
    const seenColors = new Set();
    const colorsToScrape = [...item.colors];

    for (let i = 0; i < colorsToScrape.length; i++) {
      const colorSlug = colorsToScrape[i];
      if (seenColors.has(colorSlug)) continue;
      seenColors.add(colorSlug);
      const scraped = await scrapeProduct(page, item.handle, colorSlug);
      if (scraped) {
        colorData.push({ colorSlug, ...scraped });
        if (Array.isArray(scraped.otherColors)) {
          for (const oc of scraped.otherColors) {
            if (!seenColors.has(oc.slug) && !colorsToScrape.includes(oc.slug)) {
              colorsToScrape.push(oc.slug);
            }
          }
        }
      }
    }
    if (colorData.length > 0) {
      output.push({
        handle: item.handle,
        title: colorData[0].title || item.title,
        originalPrice: item.originalPrice,
        colors: colorData
      });
    }
  }

  await browser.close();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Salvo ${output.length} produtos em ${OUTPUT_PATH}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
