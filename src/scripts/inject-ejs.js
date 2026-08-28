const fs = require('fs');
const path = require('path');

const productPath = path.join(__dirname, '../../views/pages/product.ejs');
let html = fs.readFileSync(productPath, 'utf8');

// Replace Title
html = html.replace(/Regata Corset Luxo Em Renda Com Bojo/g, '<%= product.title %>');
html = html.replace(/regata-feminino-em-renda-com-bojo/g, '<%= product.handle %>');

// Replace Price
html = html.replace(/R\$ 59,99/g, 'R$ <%= product.price.toFixed(2).replace(".", ",") %>');
html = html.replace(/R\$ 109,80/g, 'R$ <%= product.compareAtPrice.toFixed(2).replace(".", ",") %>');

// Replace Description
const descStart = html.indexOf('<div class="product-info__description');
if (descStart !== -1) {
  const innerStart = html.indexOf('>', descStart) + 1;
  const nextDiv = html.indexOf('</div>', innerStart);
  // We can just inject the description here simply by replacing the known text
}

// Write back
fs.writeFileSync(productPath, html);
console.log('Template product.ejs atualizado com tags EJS.');
