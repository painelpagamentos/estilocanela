const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const cheerio = require('cheerio');
const chalk = require('chalk');
const cliProgress = require('cli-progress');
const axios = require('axios');
const URL = require('url').URL;

const DOMAIN = 'https://yunabella.myshopify.com';
const CSV_PATH = path.join(__dirname, '../shopify/produtos.csv');
const OUTPUT_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(OUTPUT_DIR, 'assets');
const VIEWS_DIR = path.join(__dirname, 'views');

// Configuração do express
const serverCode = `const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let cart = {
  items: [],
  item_count: 0,
  total_price: 0,
  original_total_price: 0
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/products/:handle', (req, res) => {
  res.render(\`products/\${req.params.handle}\`);
});

app.get('/collections/all', (req, res) => {
  res.render('collections/all');
});

app.get('/cart.js', (req, res) => res.json(cart));
app.post('/cart/add.js', (req, res) => {
  const item = req.body;
  cart.items.push(item);
  cart.item_count += (parseInt(item.quantity) || 1);
  res.json(item);
});
app.post('/cart/change.js', (req, res) => {
  cart.items = [];
  cart.item_count = 0;
  cart.total_price = 0;
  res.json(cart);
});

app.get('/search', (req, res) => res.render('search'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
`;

async function readProducts() {
  return new Promise((resolve, reject) => {
    const products = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (data) => {
        if (data.Handle && !products.includes(data.Handle)) {
          products.push(data.Handle);
        }
      })
      .on('end', () => resolve(products))
      .on('error', reject);
  });
}

const downloadedAssets = new Set();

async function downloadAsset(urlStr) {
  try {
    if (urlStr.startsWith('//')) urlStr = 'https:' + urlStr;
    if (!urlStr.startsWith('http')) return urlStr;
    
    const url = new URL(urlStr);
    let filename = path.basename(url.pathname);
    if (!filename) return urlStr;
    
    filename = filename.split('?')[0];
    
    const localPath = \`/assets/\${filename}\`;
    const destPath = path.join(ASSETS_DIR, filename);
    const localShopifyAsset = path.join(__dirname, '../shopify/assets', filename);
    
    if (!downloadedAssets.has(filename)) {
      downloadedAssets.add(filename);
      
      // Se existir na pasta shopify/assets (otimizado), usamos ele
      if (fs.existsSync(localShopifyAsset)) {
        await fs.copy(localShopifyAsset, destPath);
      } else if (!fs.existsSync(destPath)) {
        // Caso contrário, baixamos do site
        const response = await axios.get(urlStr, { responseType: 'arraybuffer' });
        await fs.writeFile(destPath, response.data);
      }
    }
    return localPath;
  } catch (e) {
    return urlStr;
  }
}

async function scrapePage(browser, url, outputPath) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    let html = await page.content();
    
    const $ = cheerio.load(html);
    
    // Fix links to local routes
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith(DOMAIN)) {
        $(el).attr('href', href.replace(DOMAIN, ''));
      }
    });

    // Replace assets
    const cssLinks = $('link[rel="stylesheet"]').toArray();
    for (const el of cssLinks) {
      const href = $(el).attr('href');
      if (href) {
        const local = await downloadAsset(href);
        $(el).attr('href', local);
      }
    }

    const scripts = $('script[src]').toArray();
    for (const el of scripts) {
      const src = $(el).attr('src');
      if (src && src.includes('shopify')) {
        const local = await downloadAsset(src);
        $(el).attr('src', local);
      }
    }
    
    const images = $('img[src]').toArray();
    for (const el of images) {
      const src = $(el).attr('src');
      if (src && src.includes('cdn.shopify.com')) {
        const local = await downloadAsset(src);
        $(el).attr('src', local);
      }
    }
    
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, $.html());
    
  } catch (error) {
    console.error(chalk.red(\`\\nErro ao fazer scrape de \${url}: \${error.message}\`));
  } finally {
    await page.close();
  }
}

async function main() {
  console.log(chalk.blue('Iniciando o clone da loja: ' + DOMAIN));
  
  await fs.ensureDir(OUTPUT_DIR);
  await fs.ensureDir(ASSETS_DIR);
  await fs.ensureDir(VIEWS_DIR);
  await fs.ensureDir(path.join(VIEWS_DIR, 'products'));
  await fs.ensureDir(path.join(VIEWS_DIR, 'collections'));
  
  await fs.writeFile(path.join(__dirname, 'server.js'), serverCode);
  console.log(chalk.green('Servidor Express (server.js) criado.'));

  let products = [];
  if (fs.existsSync(CSV_PATH)) {
    products = await readProducts();
    console.log(chalk.green(\`\${products.length} produtos encontrados no CSV.\`));
  } else {
    console.log(chalk.yellow('Arquivo produtos.csv não encontrado. Clonando apenas a Home.'));
  }

  const browser = await puppeteer.launch({ headless: 'new' });

  const totalTasks = 1 + 1 + products.length; 
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(totalTasks, 0);
  let currentTask = 0;

  // Home
  await scrapePage(browser, DOMAIN, path.join(VIEWS_DIR, 'index.ejs'));
  currentTask++;
  progressBar.update(currentTask);

  // Collections
  await scrapePage(browser, \`\${DOMAIN}/collections/all\`, path.join(VIEWS_DIR, 'collections/all.ejs'));
  currentTask++;
  progressBar.update(currentTask);

  // Products
  const CONCURRENCY = 5;
  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const batch = products.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (handle) => {
      await scrapePage(browser, \`\${DOMAIN}/products/\${handle}\`, path.join(VIEWS_DIR, 'products', \`\${handle}.ejs\`));
      currentTask++;
      progressBar.update(currentTask);
    }));
  }

  progressBar.stop();
  await browser.close();
  
  console.log(chalk.blue.bold('\\nClone concluído com sucesso!'));
}

main().catch(console.error);
