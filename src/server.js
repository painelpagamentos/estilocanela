const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Carregar variáveis de ambiente do arquivo .env (sem dependência externa)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
}

const app = express();

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Carregar políticas da loja
const policies = require('./policies');

// Carregar dados na inicialização (em memória)
const productsPath = path.join(__dirname, '../data/products.json');
const collectionsPath = path.join(__dirname, '../data/collections.json');

let products = [];
let productsByHandle = {};
let collections = [];

function normalizeProductImageUrl(value) {
  if (typeof value !== 'string' || !value.includes('cdn.dooca.store/')) return value;
  const queryIndex = value.indexOf('?');
  const pathPart = queryIndex >= 0 ? value.slice(0, queryIndex) : value;
  const queryPart = queryIndex >= 0 ? value.slice(queryIndex) : '';
  if (/\.(?:jpe?g|png|webp|gif)$/i.test(pathPart)) return value;
  return pathPart + '.jpeg' + queryPart;
}

function normalizeProductImages(product) {
  if (Array.isArray(product.images)) {
    product.images.forEach(image => {
      if (image && typeof image === 'object') {
        image.src = normalizeProductImageUrl(image.src);
      }
    });
  }
  if (Array.isArray(product.variants)) {
    product.variants.forEach(variant => {
      if (variant && typeof variant === 'object') {
        variant.image = normalizeProductImageUrl(variant.image);
      }
    });
  }
  return product;
}

if (fs.existsSync(productsPath)) {
  products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  products = products.map(normalizeProductImages);
  products.forEach(p => {
    productsByHandle[p.handle] = p;
  });
  console.log(`Carregados ${products.length} produtos em memória.`);
}

if (fs.existsSync(collectionsPath)) {
  collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf8'));
  console.log(`Carregadas ${collections.length} coleções em memória.`);
}

// Helper global de moeda (BRL)
app.locals.money = (v) => {
  const n = Number(v) || 0;
  return 'R$ ' + n.toFixed(2).replace('.', ',');
};

// ---------------------------------------------------------------
// ecPrepare: converte o produto (estrutura Shopify importada) para
// a estrutura ecProduct usada pelos partials do tema rio (Nuvemshop)
// ---------------------------------------------------------------
function ecPrepare(p) {
  if (!p) return p;
  if (p.__ecPrepared) return p;

  const variantsRaw = Array.isArray(p.variants) ? p.variants : [];
  const inStock = variantsRaw.some(v => (Number(v.inventoryQuantity) || 0) > 0 || v.inventoryPolicy === 'continue');
  const firstVariant = variantsRaw[0] || {};
  const firstImage = (Array.isArray(p.images) && p.images[0] && p.images[0].src) || (firstVariant.image) || '';
  const secondImage = (Array.isArray(p.images) && p.images[1] && p.images[1].src) || '';

  // srcset no padrão do tema (480w, 640w)
  const buildSrcset = (src) => {
    if (!src) return '';
    return src + ' 480w, ' + src + ' 640w, ' + src + ' 1024w';
  };

  // ratio natural da imagem (igual Nuvemshop: padding-bottom = altura/largura)
  const ratioOf = (img) => (img && img.width && img.height) ? Math.round((img.height / img.width) * 10000) / 100 : 150;
  const firstImgObj = (Array.isArray(p.images) && p.images[0]) || null;

  const price = Number(firstVariant.price != null ? firstVariant.price : p.price) || 0;
  const compare = Number(firstVariant.compareAtPrice) || 0;
  const compareClean = compare > price ? compare : 0;

  // opções por variação (Cor, Tamanho, ...) no formato do tema
  const options = Array.isArray(p.options) ? p.options : [];
  const variantOptions = options.map((opt, idx) => {
    const seen = new Set();
    const values = [];
    variantsRaw.forEach(v => {
      const val = v['option' + (idx + 1)];
      if (val && !seen.has(val)) { seen.add(val); values.push(val); }
    });
    return { name: opt.name || ('Variação ' + (idx + 1)), options: values };
  }).filter(o => o.options.length);

  // variantes em JSON para o quickshop (data-variants)
  const quickshopVariants = variantsRaw.map(v => {
    const opts = variantOptions.map((o, idx) => v['option' + (idx + 1)] || o.options[0] || '');
    const img = v.image || firstImage;
    return {
      id: String(v.id || ''),
      options: opts,
      title: String(v.title || opts.join(' / ')),
      price: Number(v.price) || 0,
      image: img,
      stock: (Number(v.inventoryQuantity) || 0) > 0 || v.inventoryPolicy === 'continue'
    };
  });

  const cents = Math.round(price * 100);
  const measurementGuide = p.measurementGuide || {
    headers: ['Tamanho', 'Numeração', 'Busto', 'Cintura', 'Quadril'],
    rows: [
      ['PP', '34/36', '78-85', '60-66', '92-97'],
      ['P', '36/38', '86-89', '67-73', '98-102'],
      ['M', '40', '90-97', '74-80', '103-108'],
      ['G', '42', '98-103', '81-87', '109-114']
    ],
    note: '* Todas as medidas estão em centímetros.'
  };

  p.__ecPrepared = true;
  p.ec = {
    id: String(p.id || p.handle),
    handle: p.handle,
    name: p.title || '',
    description: (p.shortDescription || p.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400),
    fullDescription: p.description || '',
    measurementGuide,
    sku: String(firstVariant.sku || ''),
    price: cents,
    priceDisplay: price.toFixed(2).replace('.', ','),
    priceDecimal: price.toFixed(2),
    comparePrice: compareClean > 0 ? Math.round(compareClean * 100) : 0,
    comparePriceDisplay: compareClean > 0 ? compareClean.toFixed(2).replace('.', ',') : '',
    image: firstImage,
    image2: secondImage,
    imgRatio: ratioOf(firstImgObj),
    imgWidth: (firstImgObj && firstImgObj.width) || 1600,
    imgHeight: (firstImgObj && firstImgObj.height) || 2400,
    srcset: buildSrcset(firstImage),
    srcset2: buildSrcset(secondImage),
    variants: variantOptions,
    variantsJson: JSON.stringify({ variants: quickshopVariants }),
    quickshopVariants,
    variantId: String(firstVariant.id || ''),
    inStock,
    installments: { amount: 7, value: (Math.floor(cents / 7) / 100).toFixed(2).replace('.', ',') }
  };

  // expõe as chaves ec direto no objeto (os partials usam ecProduct.price etc.)
  Object.assign(p, p.ec);
  return p;
}

app.locals.ecPrepare = ecPrepare;

// isHome: partials (header) usam para renderizar h1 oculto apenas na home (padrão Nuvemshop)
app.use((req, res, next) => {
  res.locals.isHome = (req.path === '/' || req.path === '');
  next();
});

// Rotas
app.get('/', (req, res) => {
  // Seções da home (featured-collection) alimentadas pelas coleções
  const homeOrder = ['lancamentos', 'best-sellers', 'sale', 'conjuntos', 'vestidos', 'calcas', 'blusas'];
  // Quantidade exibida por seção = igual à Nuvemshop original
  const sectionLimit = { 'lancamentos': 3, 'best-sellers': 10, 'sale': 24 };
  const homeSections = homeOrder.map(handle => {
    const col = collections.find(c => c.handle === handle);
    const secProducts = col ? col.products.map(h => productsByHandle[h]).filter(Boolean) : [];
    return {
      handle,
      title: col ? col.title : handle,
      text: 'Na promoção',
      products: secProducts.slice(0, sectionLimit[handle] || 8)
    };
  });

  // produtos para o quickshop do tema (window.__EC_PRODUCTS__) — apenas os exibidos
  const ecProductsMap = {};
  homeSections.forEach(sec => {
    sec.products.forEach(p => {
      const prepared = ecPrepare(p);
      ecProductsMap[prepared.ec.id] = prepared.ec;
    });
  });

  res.render('pages/home', {
    homeSections,
    products: products.slice(0, 12),
    product: null,
    ecProductsMap
  });
});

// ---------------------------------------------------------------
// Página de coleção no padrão Nuvemshop: /colecoes/:handle/
// Também atende às categorias /roupas/:handle/ e featured
// (/lancamentos/, /exclusivo-canela/, /best-sellers/, /sale/)
// ---------------------------------------------------------------
function renderCollection(req, res, handle, overTitle) {
  const page = parseInt(req.query.page || '1', 10) || 1;
  const perPage = 12;
  let collectionProducts = [];
  let collectionTitle = overTitle || 'Produtos';

  if (handle === 'all') {
    collectionProducts = products;
    collectionTitle = overTitle || 'Todos os Produtos';
  } else {
    // Ordem dos produtos = ordem da grid na Nuvemshop (collections.json)
    const col = collections.find(c => c.handle === handle);
    if (col) {
      collectionProducts = (col.products || []).map(h => productsByHandle[h]).filter(Boolean);
    } else {
      collectionProducts = products.filter(p => (p.collections || []).includes(handle));
    }
    if (col && col.title) collectionTitle = overTitle || col.title;
  }

  const total = collectionProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageProducts = collectionProducts.slice((currentPage - 1) * perPage, currentPage * perPage);

  res.render('pages/collection', {
    products: pageProducts,
    collectionTitle,
    total,
    totalPages,
    currentPage,
    handle,
    product: null
  });
}

app.get('/colecoes', (req, res) => renderCollection(req, res, 'colecoes'));
app.get('/colecoes/:handle', (req, res) => renderCollection(req, res, req.params.handle));
app.get('/colecoes/:handle/', (req, res) => renderCollection(req, res, req.params.handle));

app.get('/roupas', (req, res) => renderCollection(req, res, 'roupas'));
app.get('/roupas/:handle', (req, res) => renderCollection(req, res, req.params.handle));
app.get('/roupas/:handle/', (req, res) => renderCollection(req, res, req.params.handle));

app.get('/roupas/vestidos/curto1', (req, res) => renderCollection(req, res, 'curto1'));
app.get('/roupas/vestidos/midi1', (req, res) => renderCollection(req, res, 'midi1'));
app.get('/roupas/vestidos/longo1', (req, res) => renderCollection(req, res, 'longo1'));

app.get('/lancamentos', (req, res) => renderCollection(req, res, 'lancamentos', 'LANÇAMENTOS'));
app.get('/exclusivo-canela', (req, res) => renderCollection(req, res, 'exclusivo-canela', 'EXCLUSIVO CANELA⚡'));
app.get('/best-sellers', (req, res) => renderCollection(req, res, 'best-sellers', 'BEST SELLERS'));
app.get('/sale', (req, res) => renderCollection(req, res, 'sale', 'SALE'));

// Compat: URLs Shopify antigas redirecionam para o padrão Nuvemshop
app.get('/collections/:handle', (req, res) => res.redirect(301, '/colecoes/' + req.params.handle + '/'));
app.get('/collections/:handle/', (req, res) => res.redirect(301, '/colecoes/' + req.params.handle + '/'));

// ---------------------------------------------------------------
// Página de produto no padrão Nuvemshop: /produtos/:handle/
// ---------------------------------------------------------------
function renderProduct(req, res, handle) {
  const product = productsByHandle[handle];

  if (!product) {
    return res.status(404).send('Produto não encontrado');
  }

  // Produtos relacionados: mesma coleção primeiro, senão catálogo (excluindo o atual)
  let related = [];
  const pool = product.collections && product.collections.length
    ? products.filter(p => p.handle !== handle && p.collections.some(c => product.collections.includes(c)))
    : [];
  if (pool.length >= 4) {
    related = pool;
  } else {
    related = products.filter(p => p.handle !== handle).slice(0, 8);
  }
  related = related.slice(0, 8);

  res.render('pages/product', { product, relatedProducts: related });
}

app.get('/produtos/:handle', (req, res) => renderProduct(req, res, req.params.handle));
app.get('/produtos/:handle/', (req, res) => renderProduct(req, res, req.params.handle));
app.get('/products/:handle', (req, res) => res.redirect(301, '/produtos/' + req.params.handle + '/'));
app.get('/products/:handle/', (req, res) => res.redirect(301, '/produtos/' + req.params.handle + '/'));

// Página de Carrinho
// Busca (formulário do header usa /search?q=...)
app.get('/search', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const isAjax = (req.query.view === 'ajax');
  const type = (req.query.type || '').toString();
  const wantsProducts = type.includes('product');

  const term = q.toLowerCase();
  const results = term
    ? products.filter(p =>
        p.title.toLowerCase().includes(term) ||
        (p.tags || []).some(t => t.toLowerCase().includes(term)) ||
        (p.type || '').toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term)
      )
    : [];

  // Deduplicação por handle (identificador único), preservando ordem
  const unique = [];
  const seen = new Set();
  results.forEach(p => {
    if (!seen.has(p.handle)) { seen.add(p.handle); unique.push(p); }
  });

  // Resposta AJAX usada pelo autocomplete do tema (view=ajax).
  // O tema faz DUAS chamadas (type=product e type=article,page) e concatena as
  // respostas. Por isso só devolvemos sugestões na chamada de produto; a de
  // conteúdo retorna vazio, evitando produtos duplicados e "Ver todos" repetido.
  if (isAjax) {
    if (!wantsProducts) {
      return res.send('');
    }
    return res.render('partials/search-results', {
      results: unique.slice(0, 4),
      total: unique.length,
      query: q,
      product: null
    });
  }

  res.render('pages/search', { products: unique, query: q, product: null });
});

app.get('/cart', (req, res) => {
  res.render('pages/cart', { product: null });
});

// Login visual (tema nuvem: link do header aponta para /account/login/)
app.get('/account/login', (req, res) => {
  res.send('<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><title>Entrar | Estilo Canela Shop</title><link rel="stylesheet" type="text/css" href="/assets/ec-theme.css" media="all"><link rel="stylesheet" type="text/css" href="/assets/ec-colors.css" media="all"></head><body class="template-login"><div class="container" style="max-width: 480px; padding: 60px 15px;"><h1 class="h4 mb-4">Entrar</h1><div class="alert alert-info">Para acompanhar seus pedidos e cashback, entre com sua conta.</div><form><div class="form-group mb-3"><input class="form-control" type="email" name="email" placeholder="E-mail" aria-label="E-mail"></div><div class="form-group mb-4"><input class="form-control" type="password" name="password" placeholder="Senha" aria-label="Senha"></div><button type="button" class="btn btn-primary btn-block">Entrar</button></form><div class="divider my-4"></div><a href="/" class="btn-link">Voltar para a loja</a></div></body></html>');
});

// Frete (o tema referencia /frete/ para o calculador; endpoint simples)
app.get('/frete', (req, res) => {
  res.json({ success: true, methods: [] });
});

// Mock simples de carrinho para evitar erros de scripts antigos e permitir API REST
app.get('/cart.js', (req, res) => {
  res.json({ items: [], item_count: 0, total_price: 0 });
});

app.post('/cart/add.js', (req, res) => {
  res.json(req.body || {});
});

// Fallback no-JS: form da página de produto posta aqui
app.post('/cart/add', (req, res) => {
  res.redirect('/cart');
});

app.post('/cart/change.js', (req, res) => {
  res.json({ items: [], item_count: 0, total_price: 0 });
});

// ---------------------------------------------------------------
// Checkout Corvex: cria checkout externo e devolve a URL de pagamento
// Doc: https://corvex.readme.io/reference/criar-checkout
// ---------------------------------------------------------------
app.post('/api/checkout', async (req, res) => {
  await settingsReady;
  const apiKey = cfg('CORVEX_API_KEY');
  const apiBase = (cfg('CORVEX_API_BASE') || 'https://apiv3.usecorvex.com.br').replace(/\/$/, '');

  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'Pagamento indisponível no momento (configuração ausente)' });
  }

  const items = (req.body && Array.isArray(req.body.items)) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).json({ success: false, error: 'Carrinho vazio' });
  }

  // Imagem de fallback (a API exige URL absoluta válida por item)
  const fallbackImage = (products[0] && products[0].images[0] && products[0].images[0].src)
    || 'https://cdn.shopify.com/s/files/1/0759/9698/7590/files/753225090_18122631268692490_8950782146721076647_n.jpg?v=1787587655';

  const corvexItems = items.slice(0, 100).map(it => {
    const product = it.product || {};
    const variant = it.variant || {};
    const catalog = productsByHandle[product.handle];
    const image = (variant.image && /^https?:\/\//.test(variant.image)) ? variant.image
      : (catalog && catalog.images[0] && catalog.images[0].src) || fallbackImage;
    const title = String(product.title || 'Produto').slice(0, 500)
      + (variant.title && variant.title !== 'Default Title' ? ' — ' + String(variant.title).slice(0, 200) : '');
    const unitPrice = Math.max(0, Math.round((Number(variant.price) || 0) * 100)); // reais -> centavos
    const quantity = Math.min(999, Math.max(1, parseInt(it.quantity, 10) || 1));
    return {
      title,
      quantity,
      unitPrice,
      image,
      externalProductId: String(product.id || product.handle || ''),
      externalVariantId: String(variant.id || ''),
      url: product.handle ? '/products/' + product.handle : undefined
    };
  });

  const publicBase = (cfg('PUBLIC_BASE_URL') || (req.protocol + '://' + req.get('host'))).replace(/\/$/, '');

  try {
    const response = await fetch(apiBase + '/stores/external/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        cart: {
          token: crypto.randomUUID(),
          currency: 'BRL',
          requiresShipping: true,
          items: corvexItems
        },
        redirect: {
          successUrl: publicBase + '/obrigado',
          cancelUrl: publicBase + '/cart?checkout=cancel'
        }
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || !data.success) {
      const msg = (data && data.error && data.error.message) || ('HTTP ' + response.status);
      console.error('Corvex checkout falhou:', msg, data ? JSON.stringify(data.error || '') : '');
      return res.status(response.status >= 400 ? response.status : 502).json({ success: false, error: msg });
    }

    const utmParams = new URLSearchParams();
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(key => {
      if (req.query[key]) utmParams.append(key, req.query[key]);
    });
    let checkoutUrl = data.checkoutUrl;
    if (utmParams.toString()) {
      const separator = checkoutUrl.includes('?') ? '&' : '?';
      checkoutUrl = checkoutUrl + separator + utmParams.toString();
    }

    return res.json({ success: true, checkoutId: data.checkoutId, checkoutUrl: checkoutUrl });
  } catch (err) {
    console.error('Erro ao chamar Corvex:', err.message);
    return res.status(502).json({ success: false, error: 'Falha de comunicação com o gateway de pagamento' });
  }
});

// ---------------------------------------------------------------
// Página de obrigado (retorno de sucesso do checkout)
// ---------------------------------------------------------------
app.get('/obrigado', (req, res) => {
  res.render('pages/thank-you');
});

// ---------------------------------------------------------------
// Páginas institucionais (políticas e contato)
// ---------------------------------------------------------------
app.get('/pages/:handle', (req, res) => {
  const handle = req.params.handle;

  // Handles institucionais do site original (nuvemshop)
  const policyByHandle = {
    'politica-de-privacidade': 'privacy',
    'trocas-e-devolucoes': 'returns',
    'politica-de-envio': 'shipping',
    'termos-de-uso': 'terms',
    'politica-de-pagamento': 'payment',
    'como-funciona-o-pagamento': 'payment'
  };

  const policyKey = policyByHandle[handle];
  if (policyKey && policies[policyKey]) {
    const policy = policies[policyKey];
    const content = fs.existsSync(policy.file)
      ? fs.readFileSync(policy.file, 'utf8')
      : policy.defaultContent;
    return res.render('pages/policy', { title: policy.title, content, product: null });
  }

  if (handle === 'contact') {
    return res.render('pages/contact', { product: null });
  }

  // Páginas institucionais (quem-somos, como-comprar, sobre-cashback)
  const institutional = {
    'quem-somos': {
      title: 'Quem Somos',
      content: '<p>A Estilo Canela nasceu para vestir mulheres que gostam de se destacar com peças selecionadas que valorizam a silhueta e transmitem confiança.</p><p>Av. Miruna, 187 - Indianópolis, São Paulo - SP, 04084-000</p>'
    },
    'como-comprar': {
      title: 'Como Comprar',
      content: '<p>Para comprar em nossa loja é muito fácil:</p><p><strong>1)</strong> Navegue pelas páginas de produtos, categorias, novidades, ofertas e destaques. Clique em Comprar ou em Ver Detalhes para obter mais informações. Depois, o produto será inserido no carrinho.</p><p><strong>2)</strong> Continue navegando até escolher todos os produtos desejados. Clique em Finalizar para concluir a compra.</p><p><strong>3)</strong> Entre com seu e-mail e senha. Se ainda não tiver cadastro, faça seu cadastro rapidamente.</p><p><strong>4)</strong> Escolha a forma de envio. Trabalhamos com Correios e transportadoras, com opções como Sedex e encomenda simples.</p><p><strong>5)</strong> Escolha a forma de pagamento disponível no checkout.</p><p><strong>6)</strong> As demais instruções serão enviadas por e-mail após a finalização do pedido.</p>'
    },
    'sobre-cashback': {
      title: 'Sobre Cashback',
      content: '<h2>Como funciona</h2><p>A cada compra realizada na Estilo Canela, você recebe <strong>8% de cashback</strong> sobre o valor das peças. Esse valor volta para você em dinheiro (R$) para usar como desconto na sua próxima compra.</p><h2>Como ganhar cashback</h2><ul><li>Você recebe 8% do valor das peças compradas.</li><li>O cálculo é feito somente sobre os produtos.</li><li>É válido para todas as formas de pagamento e todos os produtos do site.</li></ul><p><strong>Exemplo:</strong> comprou R$100 em peças, ganha R$8 de cashback.</p><h2>Como usar</h2><ol><li>Adicione os produtos ao carrinho.</li><li>Clique em Iniciar Compra.</li><li>Na etapa Entrega, informe seu CPF no campo de cashback.</li><li>O sistema identificará automaticamente seu saldo.</li><li>Escolha o valor dentro do limite permitido e conclua o pedido.</li></ol><p>O cashback pode ser usado para pagar até 20% do valor do pedido. Fica disponível em até 24 horas após a compra e vale por 45 dias corridos. O saldo é pessoal, vinculado ao CPF e não inclui o frete.</p><h2>Comunicação</h2><p>As informações da compra e do cashback serão enviadas pelo e-mail cadastrado.</p><h2>Trocas e devoluções</h2><p>Em caso de troca, vale-troca ou devolução, o crédito será gerado apenas sobre o valor efetivamente pago, sem incluir o valor resgatado em cashback.</p>'
    }
  };

  if (institutional[handle]) {
    return res.render('pages/policy', {
      title: institutional[handle].title,
      content: institutional[handle].content,
      product: null
    });
  }

  return res.status(404).send('Página não encontrada');
});

// ---------------------------------------------------------------
// Webhook Corvex: recebe eventos de pedido e carrinho abandonado
// Doc: https://corvex.readme.io/reference/webhook
// Assinatura: HMAC-SHA256 do corpo JSON, header X-Webhook-Signature
// ---------------------------------------------------------------
const processedWebhookEvents = new Set(); // idempotência (event + id)
const ordersLogPath = path.join(__dirname, '../data/orders-log.json');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const EVENT_STATUS = {
  ORDER_CREATED: 'created',
  ORDER_PAID: 'paid',
  ORDER_CANCELLED: 'cancelled',
  ORDER_REFUNDED: 'refunded',
  CART_ABANDONED: 'cart_abandoned'
};

// Config da loja: variáveis de ambiente (.env local) têm prioridade; o que
// faltar vem da tabela store_settings no banco. Assim o runtime publicado,
// que recebe apenas as credenciais públicas do Supabase, obtém a config da
// Corvex sem nenhum segredo no código-fonte.
const SETTINGS_GATE = 'yunabella-liga-config-2026';
let STORE_SETTINGS = {};
const settingsReady = (async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/get_store_settings', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_gate: SETTINGS_GATE })
    });
    if (res.ok) {
      STORE_SETTINGS = (await res.json()) || {};
      console.log('Config da loja carregada do banco:', Object.keys(STORE_SETTINGS).length, 'chaves.');
    } else {
      console.error('Falha ao carregar config do banco: HTTP', res.status);
    }
  } catch (err) {
    console.error('Falha ao carregar config do banco:', err.message);
  }
})();

function cfg(name) {
  return process.env[name] || STORE_SETTINGS[name] || '';
}

// Grava o pedido no Supabase via RPC security-definer (o role público anon
// só tem EXECUTE na função; pedidos não podem ser lidos nem alterados).
// A unique index (event, order, lead) garante idempotência após restart.
// Retorna 'inserted' | 'duplicate' | null (banco não configurado)
async function saveOrderToDatabase(entry, rawPayload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const p_order = {
    corvex_order_id: String(entry.id || 'sem-id'),
    lead_id: rawPayload.leadId || null,
    event: entry.event,
    status: entry.status || EVENT_STATUS[entry.event] || 'unknown',
    customer_name: entry.client.name,
    customer_email: entry.client.email,
    customer_phone: entry.client.phone,
    total_cents: Number.isFinite(Number(entry.amount)) ? Math.round(Number(entry.amount)) : 0,
    currency: 'BRL',
    payload: rawPayload
  };
  const p_items = entry.items.map(it => ({
    product_id: it.externalRef ? String(it.externalRef) : null,
    title: String(it.name || 'Item'),
    quantity: Number(it.quantity) || 1,
    unit_price_cents: Number.isFinite(Number(it.price)) ? Math.round(Number(it.price)) : 0
  }));
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/insert_order_webhook', {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_order, p_items })
  });
  if (!res.ok) throw new Error('Supabase rpc HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
  const newId = await res.json(); // uuid do pedido ou null (duplicata)
  return newId ? 'inserted' : 'duplicate';
}

// Fallback local (dev sem banco configurado ou falha de rede)
function appendOrderLog(logEntry) {
  try {
    let log = [];
    if (fs.existsSync(ordersLogPath)) {
      log = JSON.parse(fs.readFileSync(ordersLogPath, 'utf8') || '[]');
    }
    log.push(logEntry);
    fs.writeFileSync(ordersLogPath, JSON.stringify(log, null, 2));
  } catch (err) {
    console.error('Falha ao gravar orders-log.json:', err.message);
  }
}

app.post('/webhooks/corvex', async (req, res) => {
  await settingsReady;
  const payload = req.body;
  const secret = cfg('CORVEX_WEBHOOK_SECRET');
  const signature = req.headers['x-webhook-signature'];

  if (!payload || typeof payload !== 'object' || !payload.event) {
    return res.status(400).json({ error: 'Payload inválido' });
  }

  // Validação de assinatura (se o secret estiver configurado e o header presente)
  if (secret && signature) {
    const expected = crypto.createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    const a = Buffer.from(String(signature));
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.warn('Webhook Corvex com assinatura inválida:', payload.event, payload.id);
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
  }

  // Idempotência: event + id (+ leadId para carrinho abandonado)
  const dedupeKey = payload.event + ':' + (payload.id || '') + ':' + (payload.leadId || '');
  if (processedWebhookEvents.has(dedupeKey)) {
    return res.json({ received: true, duplicate: true });
  }
  processedWebhookEvents.add(dedupeKey);

  const client = payload.client || {};
  const logEntry = {
    receivedAt: new Date().toISOString(),
    event: payload.event,
    id: payload.id || null,
    status: payload.status || null,
    method: payload.method || null,
    amount: payload.amount || null,
    paidAt: payload.paidAt || null,
    client: {
      name: client.name || null,
      email: client.email || null,
      phone: client.phone || null,
      doc: client.doc || null
    },
    items: Array.isArray(payload.items) ? payload.items.map(it => ({
      name: it.name, quantity: it.quantity, price: it.price, externalRef: it.externalRef || it.sku || null
    })) : [],
    address: payload.address || null,
    url_checkout: payload.url_checkout || null
  };

  console.log('Webhook Corvex:', payload.event, '| id:', payload.id, '| status:', payload.status,
    '| valor:', payload.amount, '| cliente:', client.name, client.phone || client.email);

  // Persistir: Supabase (banco) com fallback para orders-log.json
  try {
    const dbResult = await saveOrderToDatabase(logEntry, payload);
    if (dbResult === 'duplicate') {
      return res.json({ received: true, duplicate: true });
    }
    if (!dbResult) appendOrderLog(logEntry);
  } catch (err) {
    console.error('Falha ao gravar pedido no banco, usando orders-log.json:', err.message);
    appendOrderLog(logEntry);
  }

  // Ponto de extensão: aqui entrarão ações por evento
  // (ex.: corvex.order.paid -> enviar confirmação/avisar expedição via WhatsApp ou e-mail)

  return res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '::'; // '::' escuta IPv4+IPv6 (localhost resolve para ::1 ou 127.0.0.1)
app.listen(PORT, HOST, () => {
  console.log('Servidor rodando em http://' + HOST + ':' + PORT);
});
