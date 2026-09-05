const fs = require('fs');
const path = require('path');

const CLOUDPANEL = path.join(__dirname, '../..');
const dataPath = path.join(CLOUDPANEL, 'data');

const scrapedPath = path.join(dataPath, 'yoficial-conjunto-products.json');
const productsPath = path.join(dataPath, 'products.json');
const collectionsPath = path.join(dataPath, 'collections.json');
const serverPath = path.join(CLOUDPANEL, 'src/server.js');

const COLLECTION_HANDLE = 'festival-de-conjunto-r8999';
const COLLECTION_TITLE = 'Festival de Conjuntos R$99,99';
const NEW_PRICE = 99.99;

function randomId() {
  return Math.floor(Math.random() * 1000000000000).toString();
}

function normalizeImageUrl(src) {
  if (!src || typeof src !== 'string') return src;
  if (src.startsWith('//')) src = 'https:' + src;
  src = src.replace(/_\d+x\d+(?:[^.?]*)(?=\.(?:jpe?g|png|webp|gif))/, '');
  if (!/\.(?:jpe?g|png|webp|gif)(?:\?|$)/i.test(src)) src = src.replace(/\?(.*)$/, '.jpeg?$1');
  // preferir sem webp para compatibilidade
  if (!src.includes('webp=')) src += (src.includes('?') ? '&' : '?') + 'webp=0';
  return src;
}

function createProduct(item) {
  const colorNames = item.colors.map(c => c.color.trim());
  const sizeNames = ['P', 'M', 'G'];

  // imagens: juntar todas as cores, cada cor primeiro, depois alternar posicoes
  const images = [];
  const seenImg = new Set();
  // para cada cor, sua primeira imagem principal vem primeiro
  const maxImages = Math.max(...item.colors.map(c => c.images.length), 0);
  for (let i = 0; i < maxImages; i++) {
    for (const color of item.colors) {
      const src = color.images[i];
      if (!src) continue;
      const normalized = normalizeImageUrl(src);
      if (seenImg.has(normalized)) continue;
      seenImg.add(normalized);
      images.push({ src: normalized, position: images.length + 1, alt: `${item.title} - ${color.color}` });
    }
  }

  // fallback: se alguma cor nao teve imagem
  item.colors.forEach(color => {
    if (color.images.length === 0) {
      // tentar usar a primeira imagem de outra cor
      const fallback = item.colors.find(c => c.images.length > 0);
      if (fallback) color.images = [...fallback.images];
    }
  });

  const variants = [];
  item.colors.forEach(color => {
    const colorImage = normalizeImageUrl(color.images[0]);
    sizeNames.forEach(size => {
      variants.push({
        id: randomId(),
        title: `${color.color.trim()} / ${size}`,
        option1: color.color.trim(),
        option2: size,
        option3: null,
        sku: '',
        price: NEW_PRICE,
        compareAtPrice: item.originalPrice > NEW_PRICE ? item.originalPrice : 0,
        inventoryQuantity: 999,
        inventoryPolicy: 'continue',
        image: colorImage
      });
    });
  });

  return {
    id: randomId(),
    handle: item.handle,
    title: item.title,
    description: item.colors[0].description || '',
    vendor: 'CONJUNTOS',
    type: '',
    tags: ['festival-de-conjuntos'],
    published: true,
    seoTitle: '',
    seoDescription: '',
    options: [
      { name: 'Cor', values: colorNames },
      { name: 'Tamanho', values: sizeNames }
    ],
    variants,
    images,
    collections: [COLLECTION_HANDLE],
    price: NEW_PRICE,
    compareAtPrice: item.originalPrice > NEW_PRICE ? item.originalPrice : 0
  };
}

// 1. Injetar produtos
const scraped = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const existingHandles = new Set(products.map(p => p.handle));

let added = 0;
let skipped = 0;
for (const item of scraped) {
  if (existingHandles.has(item.handle)) {
    console.log(`⚠️ Handle já existe, pulando: ${item.handle}`);
    skipped++;
    continue;
  }
  products.push(createProduct(item));
  existingHandles.add(item.handle);
  added++;
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
console.log(`✅ Adicionados ${added} produtos em ${productsPath} (${skipped} pulados)`);

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
