const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const CSV_PATH = path.join(__dirname, '../../../shopify/produtos.csv');
const PRODUCTS_JSON_PATH = path.join(__dirname, '../../data/products.json');
const COLLECTIONS_JSON_PATH = path.join(__dirname, '../../data/collections.json');

const products = {};
const collections = new Set();

function formatPrice(priceStr) {
  if (!priceStr) return 0;
  return parseFloat(priceStr.replace(',', '.')) || 0;
}

fs.createReadStream(CSV_PATH)
  .pipe(csv())
  .on('data', (row) => {
    const handle = row['Handle'];
    if (!handle) return;

    if (!products[handle]) {
      products[handle] = {
        id: Math.floor(Math.random() * 1000000000000).toString(),
        handle: handle,
        title: row['Title'] || '',
        description: row['Body (HTML)'] || '',
        vendor: row['Vendor'] || '',
        type: row['Type'] || '',
        tags: (row['Tags'] || '').split(',').map(t => t.trim()).filter(Boolean),
        published: row['Published'] === 'true',
        seoTitle: row['SEO Title'] || '',
        seoDescription: row['SEO Description'] || '',
        options: [],
        variants: [],
        images: [],
        collections: []
      };

      // Add options
      if (row['Option1 Name'] && row['Option1 Name'] !== 'Title') {
        products[handle].options.push({ name: row['Option1 Name'], values: new Set() });
      }
      if (row['Option2 Name']) {
        products[handle].options.push({ name: row['Option2 Name'], values: new Set() });
      }
      if (row['Option3 Name']) {
        products[handle].options.push({ name: row['Option3 Name'], values: new Set() });
      }

      // Add to collections (simple inference from tags/type for now)
      if (row['Type']) {
        const colHandle = row['Type'].toLowerCase().replace(/\s+/g, '-');
        products[handle].collections.push(colHandle);
        collections.add(colHandle);
      }
    }

    const product = products[handle];

    // Add Image
    if (row['Image Src']) {
      product.images.push({
        src: row['Image Src'],
        position: parseInt(row['Image Position'] || '1', 10),
        alt: row['Image Alt Text'] || ''
      });
    }

    // Add Variant
    if (row['Variant Price']) {
      const variant = {
        id: Math.floor(Math.random() * 1000000000000).toString(),
        title: [row['Option1 Value'], row['Option2 Value'], row['Option3 Value']].filter(Boolean).join(' / ') || 'Default Title',
        option1: row['Option1 Value'] || null,
        option2: row['Option2 Value'] || null,
        option3: row['Option3 Value'] || null,
        sku: row['Variant SKU'] || '',
        price: formatPrice(row['Variant Price']),
        compareAtPrice: formatPrice(row['Variant Compare At Price']),
        inventoryQuantity: parseInt(row['Variant Inventory Qty'] || '0', 10),
        inventoryPolicy: row['Variant Inventory Policy'] || 'deny',
        image: row['Variant Image'] || null
      };
      
      product.variants.push(variant);

      // Collect option values
      if (variant.option1 && product.options[0]) product.options[0].values.add(variant.option1);
      if (variant.option2 && product.options[1]) product.options[1].values.add(variant.option2);
      if (variant.option3 && product.options[2]) product.options[2].values.add(variant.option3);
    }
  })
  .on('end', () => {
    // Convert sets to arrays and calculate min price
    const productList = Object.values(products).map(p => {
      p.options = p.options.map(opt => ({ name: opt.name, values: Array.from(opt.values) }));
      
      // Sort images
      p.images.sort((a, b) => a.position - b.position);
      
      // Set main price
      if (p.variants.length > 0) {
        p.price = Math.min(...p.variants.map(v => v.price));
        p.compareAtPrice = Math.max(...p.variants.map(v => v.compareAtPrice));
      }
      return p;
    });

    // Write products
    fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(productList, null, 2));
    console.log(`✅ Importados ${productList.length} produtos para data/products.json`);

    // Write collections
    const collectionsList = Array.from(collections).map(c => ({
      handle: c,
      title: c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
    collectionsList.push({ handle: 'all', title: 'Todos os Produtos' });
    
    fs.writeFileSync(COLLECTIONS_JSON_PATH, JSON.stringify(collectionsList, null, 2));
    console.log(`✅ Importadas ${collectionsList.length} coleções para data/collections.json`);
  });
