// Rebuild data/products.json e data/collections.json a partir de shopify/produtos.csv (fonte da verdade)
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../../shopify/produtos.csv');
const outProducts = path.join(__dirname, '../data/products.json');
const outCollections = path.join(__dirname, '../data/collections.json');

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
      else if (c === '\r') {}
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
const header = rows[0];
const col = {};
header.forEach((h, i) => col[h] = i);
const data = rows.slice(1);

function get(r, name) { return r[col[name]] || ''; }
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };

// Agrupar por handle preservando ordem de aparição
const order = [];
const groups = new Map();
data.forEach(r => {
  const h = get(r, 'Handle');
  if (!h) return;
  if (!groups.has(h)) { groups.set(h, []); order.push(h); }
  groups.get(h).push(r);
});

const products = order.map(handle => {
  const rs = groups.get(handle);
  const first = rs[0];
  const main = rs.filter(r => get(r, 'Image Position') === '1')[0] || first;

  // options
  const options = [];
  [['Option1 Name', 'Option1 Value'], ['Option2 Name', 'Option2 Value'], ['Option3 Name', 'Option3 Value']].forEach(([n, v], i) => {
    const name = get(first, n);
    if (!name) return;
    const values = [];
    rs.forEach(r => { const val = get(r, v); if (val && !values.includes(val)) values.push(val); });
    if (values.length) options.push({ name, values });
  });

  // variants
  const variants = rs.map(r => ({
    id: String(stableHash(handle + '|' + get(r, 'Variant SKU') + '|' + get(r, 'Option1 Value') + '|' + get(r, 'Option2 Value') + '|' + get(r, 'Option3 Value'))),
    title: [get(r, 'Option1 Value'), get(r, 'Option2 Value'), get(r, 'Option3 Value')].filter(Boolean).join(' / ') || 'Default Title',
    option1: get(r, 'Option1 Value') || null,
    option2: get(r, 'Option2 Value') || null,
    option3: get(r, 'Option3 Value') || null,
    sku: get(r, 'Variant SKU'),
    price: num(get(r, 'Variant Price')) || 0,
    compareAtPrice: num(get(r, 'Variant Compare At Price')) || null,
    inventoryQuantity: parseInt(get(r, 'Variant Inventory Qty') || '0', 10) || 0,
    inventoryPolicy: get(r, 'Variant Inventory Policy') || 'deny',
    image: get(r, 'Variant Image') || get(r, 'Image Src') || ''
  }));

  // images (position order)
  const imgMap = new Map();
  rs.forEach(r => {
    const src = get(r, 'Image Src');
    const pos = parseInt(get(r, 'Image Position') || '0', 10) || 0;
    if (src && !imgMap.has(src)) {
      const key = pos || imgMap.size + 1;
      imgMap.set(src, { src, position: pos, alt: get(r, 'Image Alt Text') || '' });
    }
  });
  const images = [...imgMap.values()].sort((a, b) => a.position - b.position);

  const prices = variants.map(v => v.price);
  const comps = variants.map(v => v.compareAtPrice).filter(v => v != null && v > 0);
  const minPrice = Math.min(...prices);
  const maxComp = comps.length ? Math.max(...comps) : null;

  return {
    id: String(stableHash(handle)),
    handle,
    title: get(first, 'Title'),
    description: get(first, 'Body (HTML)'),
    vendor: get(first, 'Vendor'),
    type: get(first, 'Type'),
    tags: get(first, 'Tags') ? get(first, 'Tags').split(',').map(t => t.trim()).filter(Boolean) : [],
    published: get(first, 'Published') === 'true' || get(first, 'Published') === 'TRUE',
    seoTitle: get(first, 'SEO Title'),
    seoDescription: get(first, 'SEO Description'),
    options,
    variants,
    images,
    collections: [],
    price: minPrice,
    compareAtPrice: maxComp && maxComp > minPrice ? maxComp : null
  };
});

// status ativo
const active = products.filter(p => p.published !== false);

// Coleções curadas a partir da home estática
const home = fs.readFileSync(path.join(__dirname, '../views/pages/home.ejs'), 'utf8');
const collectionMemberships = {
  conjuntos: ['conjunto-samira-lancamento', 'conjunto-aurora-lancamento', 'conjunto-elisa-lancamento-2', 'conjunto-cintia-lancamento'],
  vestidos: ['vestido-luxo-fenda-lancamento', 'vestido-suplex-manga-longa-gola-alta-lancamento', 'vestido-longo-geometrico-lancamento', 'vestido-plissado-rafa-lancamento'],
  calcas: ['calca-sabrina-lancamento', 'calca-legging-flanelada-lancamento', 'calca-paloma-lancamento', 'meia-calca-translucida-lancamento'],
  blusas: ['regata-feminino-em-renda-com-bojo', 'blusa-transpassada-joy-lancamento', 'blusa-basic-lancamento', 'blusa-transpassada-lancamento'],
  macacoes: ['macacao-isadora-lancamento', 'macacao-manuela-lancamento', 'macacao-manga-longa-cris-lancamento', 'macacao-luisa']
};

const byHandle = {};
active.forEach(p => byHandle[p.handle] = p);
Object.entries(collectionMemberships).forEach(([handle, handles]) => {
  handles.forEach(h => { if (byHandle[h]) byHandle[h].collections.push(handle); });
});

const collections = [
  { handle: 'all', title: 'Todos os Produtos', products: active.map(p => p.handle) },
  ...Object.entries(collectionMemberships).map(([handle, handles]) => ({
    handle,
    title: handle.charAt(0).toUpperCase() + handle.slice(1),
    products: handles.filter(h => byHandle[h])
  }))
];

fs.writeFileSync(outProducts, JSON.stringify(active));
fs.writeFileSync(outCollections, JSON.stringify(collections.map(c => ({ handle: c.handle, title: c.title, products: c.products }))));

console.log('Produtos gerados:', active.length);
console.log('Coleções:', collections.map(c => c.handle + '(' + c.products.length + ')').join(', '));

function stableHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}
