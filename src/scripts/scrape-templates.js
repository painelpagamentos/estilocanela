const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const chalk = require('chalk');
const axios = require('axios');
const URL = require('url').URL;

const DOMAIN = 'https://yunabella.myshopify.com';
const OUTPUT_DIR = path.join(__dirname, '../../public');
const ASSETS_DIR = path.join(OUTPUT_DIR, 'assets');
const VIEWS_DIR = path.join(__dirname, '../../views');
const SHOPIFY_ASSETS_DIR = path.join(__dirname, '../../../shopify/assets');

// URLs de tracking que queremos evitar baixar
const IGNORE_URLS = [
  'trekkie', 'boomerang', 'shopify-analytics', 'facebook.net',
  'google-analytics', 'utmify', 'pixel', 'hotjar', 'clarity'
];

const downloadedAssets = new Map();

async function downloadAsset(urlStr) {
  if (!urlStr) return urlStr;
  if (urlStr.startsWith('//')) urlStr = 'https:' + urlStr;
  if (!urlStr.startsWith('http')) return urlStr;
  
  for (const ignore of IGNORE_URLS) {
    if (urlStr.includes(ignore)) return '';
  }

  try {
    const url = new URL(urlStr);
    let filename = path.basename(url.pathname);
    if (!filename) return urlStr;
    
    filename = decodeURIComponent(filename.split('?')[0]);
    
    // Cache de assets já processados nesta sessão
    if (downloadedAssets.has(urlStr)) {
      return downloadedAssets.get(urlStr);
    }
    
    let safeFilename = filename;
    let counter = 1;
    // Evitar colisão de nomes
    while (fs.existsSync(path.join(ASSETS_DIR, safeFilename)) && !downloadedAssets.has(urlStr) && Array.from(downloadedAssets.values()).includes(`/assets/${safeFilename}`)) {
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        safeFilename = `${base}-${counter}${ext}`;
        counter++;
    }

    const localPath = `/assets/${safeFilename}`;
    const destPath = path.join(ASSETS_DIR, safeFilename);
    const localShopifyAsset = path.join(SHOPIFY_ASSETS_DIR, filename);
    
    downloadedAssets.set(urlStr, localPath);
    
    if (fs.existsSync(localShopifyAsset)) {
      await fs.copy(localShopifyAsset, destPath);
    } else if (!fs.existsSync(destPath)) {
      const response = await axios.get(urlStr, { responseType: 'arraybuffer', validateStatus: () => true });
      if (response.status === 200) {
        await fs.writeFile(destPath, response.data);
      }
    }
    return localPath;
  } catch (e) {
    console.error(chalk.red(`Erro ao processar ${urlStr}: ${e.message}`));
    return urlStr;
  }
}

async function scrapePage(browser, url, outputPath) {
  console.log(chalk.yellow(`\nIniciando raspagem de: ${url}`));
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    let html = await page.content();
    const $ = cheerio.load(html);
    
    // 1. Limpar scripts de tracking inline ou links bloqueados
    $('script').each((i, el) => {
       const src = $(el).attr('src');
       if (src) {
           for (const ignore of IGNORE_URLS) {
               if (src.includes(ignore)) {
                   $(el).remove();
                   return;
               }
           }
       } else {
           const content = $(el).html();
           if (content && (content.includes('trekkie') || content.includes('fbq') || content.includes('utmify'))) {
               $(el).remove();
           }
       }
    });

    // 2. Fixar links internos (navegação)
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith(DOMAIN)) {
        $(el).attr('href', href.replace(DOMAIN, ''));
      }
    });

    // 3. Processar CSS
    const cssLinks = $('link[rel="stylesheet"], link[as="style"]').toArray();
    for (const el of cssLinks) {
      const href = $(el).attr('href');
      if (href) {
        const local = await downloadAsset(href);
        if (local === '') $(el).remove();
        else $(el).attr('href', local);
      }
    }

    // 4. Processar JS externos
    const scripts = $('script[src]').toArray();
    for (const el of scripts) {
      const src = $(el).attr('src');
      if (src) {
        const local = await downloadAsset(src);
        if (local === '') $(el).remove();
        else $(el).attr('src', local);
      }
    }
    
    // 5. Processar Imagens
    const images = $('img[src], img[data-src]').toArray();
    for (const el of images) {
      const src = $(el).attr('src');
      const dataSrc = $(el).attr('data-src');
      
      if (src) {
        const local = await downloadAsset(src);
        $(el).attr('src', local);
      }
      if (dataSrc) {
        const local = await downloadAsset(dataSrc);
        $(el).attr('data-src', local);
      }
      
      // Remover srcset para forçar o navegador a usar o nosso src estático local
      $(el).removeAttr('srcset');
      $(el).removeAttr('data-srcset');
      $(el).removeAttr('sizes');
    }
    
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, $.html());
    console.log(chalk.green(`Salvo: ${outputPath}`));
    
  } catch (error) {
    console.error(chalk.red(`\nErro fatal no scrape de ${url}: ${error.message}`));
  } finally {
    await page.close();
  }
}

async function main() {
  console.log(chalk.blue.bold('=== Iniciando Etapa 1: Scrape dos Templates Mestre ==='));
  await fs.ensureDir(ASSETS_DIR);
  await fs.ensureDir(path.join(VIEWS_DIR, 'pages'));
  
  const browser = await puppeteer.launch({ headless: 'new' });

  // 1. Home
  await scrapePage(browser, DOMAIN, path.join(VIEWS_DIR, 'pages', 'home.ejs'));
  
  // 2. Collection
  await scrapePage(browser, `${DOMAIN}/collections/all`, path.join(VIEWS_DIR, 'pages', 'collection.ejs'));
  
  // 3. Product (Baseado no primeiro produto do CSV)
  await scrapePage(browser, `${DOMAIN}/products/regata-feminino-em-renda-com-bojo`, path.join(VIEWS_DIR, 'pages', 'product.ejs'));

  await browser.close();
  console.log(chalk.blue.bold('\n=== Etapa 1 Concluída! ==='));
}

main().catch(console.error);
