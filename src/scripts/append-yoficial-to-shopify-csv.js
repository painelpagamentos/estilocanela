const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '../../..');
const scrapedPath = path.join(BASE, 'cloudpanel-app/data/yoficial-collection-products.json');
const csvPath = path.join(BASE, 'shopify/produtos.csv');

const scraped = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const header = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/)[0];
const colCount = header.split(',').length;

const newRows = scraped.map(item => {
  const row = new Array(colCount).fill('');
  const fields = header.split(',');
  fields.forEach((col, i) => {
    switch (col.trim()) {
      case 'Handle': row[i] = item.handle; break;
      case 'Title': row[i] = item.title; break;
      case 'Published': row[i] = 'true'; break;
      case 'Variant Price': row[i] = '99.99'; break;
      case 'Variant Compare At Price': row[i] = item.originalPrice > 99.99 ? String(item.originalPrice) : ''; break;
      case 'Variant Inventory Qty': row[i] = '999'; break;
      case 'Variant Inventory Policy': row[i] = 'continue'; break;
      case 'Image Src': row[i] = item.image; break;
      case 'Image Position': row[i] = '1'; break;
      case 'Image Alt Text': row[i] = item.title; break;
      case 'Status': row[i] = 'active'; break;
      default: row[i] = '';
    }
  });
  return row.map(csvEscape).join(',');
});

fs.appendFileSync(csvPath, '\n' + newRows.join('\n'));
console.log(`✅ Adicionadas ${newRows.length} linhas ao ${csvPath}`);
