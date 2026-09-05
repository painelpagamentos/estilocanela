const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '../../..');
const CLOUDPANEL = path.join(BASE, 'cloudpanel-app');
const SHOPIFY = path.join(BASE, 'shopify');

const scrapedPath = path.join(CLOUDPANEL, 'data/yoficial-collection-products.json');
const productsPath = path.join(CLOUDPANEL, 'data/products.json');
const collectionsPath = path.join(CLOUDPANEL, 'data/collections.json');
const serverPath = path.join(CLOUDPANEL, 'src/server.js');
const shopifySettingsPath = path.join(SHOPIFY, 'config/settings_data.json');

const COLLECTION_HANDLE = 'festival-de-vestidos-preco-maximo-99-99';
const COLLECTION_TITLE = 'Festival de Vestidos Preço Máximo R$99,99';
const NEW_PRICE = 99.99;

function randomId() {
  return Math.floor(Math.random() * 1000000000000).toString();
}

function createProduct(item) {
  const variantId = randomId();
  const compareAtPrice = item.originalPrice > NEW_PRICE ? item.originalPrice : 0;
  return {
    id: randomId(),
    handle: item.handle,
    title: item.title,
    description: '',
    vendor: '',
    type: '',
    tags: [],
    published: true,
    seoTitle: '',
    seoDescription: '',
    options: [],
    variants: [
      {
        id: variantId,
        title: 'Default Title',
        option1: null,
        option2: null,
        option3: null,
        sku: '',
        price: NEW_PRICE,
        compareAtPrice,
        inventoryQuantity: 999,
        inventoryPolicy: 'continue',
        image: null
      }
    ],
    images: [
      {
        src: item.image,
        position: 1,
        alt: item.title
      }
    ],
    collections: [COLLECTION_HANDLE],
    price: NEW_PRICE,
    compareAtPrice
  };
}

// 1. Injetar produtos
const scraped = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const existingHandles = new Set(products.map(p => p.handle));

let added = 0;
for (const item of scraped) {
  if (existingHandles.has(item.handle)) {
    console.log(`⚠️ Handle já existe, pulando: ${item.handle}`);
    continue;
  }
  products.push(createProduct(item));
  existingHandles.add(item.handle);
  added++;
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
console.log(`✅ Adicionados ${added} produtos em ${productsPath}`);

// 2. Atualizar coleções
const collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf8'));
const existingColIndex = collections.findIndex(c => c.handle === COLLECTION_HANDLE);
const collectionProductHandles = scraped.map(item => item.handle);

const newCollection = {
  handle: COLLECTION_HANDLE,
  title: COLLECTION_TITLE,
  products: collectionProductHandles
};

if (existingColIndex >= 0) {
  collections[existingColIndex] = newCollection;
} else {
  collections.unshift(newCollection);
}

fs.writeFileSync(collectionsPath, JSON.stringify(collections, null, 2));
console.log(`✅ Coleção '${COLLECTION_TITLE}' inserida/atualizada em ${collectionsPath}`);

// 3. Atualizar homeOrder no server.js
let serverCode = fs.readFileSync(serverPath, 'utf8');
const homeOrderMatch = serverCode.match(/const homeOrder = \[([^\]]+)\];/);
if (homeOrderMatch) {
  const currentOrder = homeOrderMatch[1].replace(/['"\s]/g, '').split(',').filter(Boolean);
  if (currentOrder[0] !== COLLECTION_HANDLE) {
    const newOrder = [COLLECTION_HANDLE, ...currentOrder.filter(h => h !== COLLECTION_HANDLE)];
    const newOrderString = newOrder.map(h => `'${h}'`).join(', ');
    serverCode = serverCode.replace(/const homeOrder = \[[^\]]+\];/, `const homeOrder = [${newOrderString}];`);
    fs.writeFileSync(serverPath, serverCode);
    console.log(`✅ homeOrder atualizado no ${serverPath}`);
  } else {
    console.log(`ℹ️ Coleção já está em primeiro no homeOrder`);
  }
} else {
  console.log(`⚠️ Não foi possível encontrar homeOrder em ${serverPath}`);
}

// 4. Atualizar Shopify settings_data.json
let settings = JSON.parse(fs.readFileSync(shopifySettingsPath, 'utf8'));
const sections = settings.current.sections;
const sectionId = 'featured-collection-festival-vestidos-99-99';

sections[sectionId] = {
  type: 'featured-collection',
  settings: {
    collection: COLLECTION_HANDLE,
    title: COLLECTION_TITLE.toUpperCase(),
    products_count: 12,
    layout: 'vertical',
    stack_products: false,
    show_quick_buy: true
  }
};

const index = settings.current.content_for_index;
if (!index.includes(sectionId)) {
  index.unshift(sectionId);
}

fs.writeFileSync(shopifySettingsPath, JSON.stringify(settings, null, 2));
console.log(`✅ Seção Shopify '${sectionId}' adicionada em primeiro no ${shopifySettingsPath}`);
