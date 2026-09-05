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

// Carregar dados na inicialização (em memória)
const productsPath = path.join(__dirname, '../data/products.json');
const collectionsPath = path.join(__dirname, '../data/collections.json');

let products = [];
let productsByHandle = {};
let collections = [];

if (fs.existsSync(productsPath)) {
  products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
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

// Rotas
app.get('/', (req, res) => {
  // Seções da home (featured-collection) alimentadas pelas coleções
  const homeOrder = ['festival-de-vestidos-preco-maximo-99-99', 'conjuntos', 'vestidos', 'calcas', 'blusas', 'macacoes'];
  const homeSections = homeOrder.map(handle => {
    const col = collections.find(c => c.handle === handle);
    const secProducts = col ? col.products.map(h => productsByHandle[h]).filter(Boolean) : [];
    return {
      handle,
      title: col ? col.title : handle,
      text: 'Na promoção',
      products: secProducts.slice(0, 8)
    };
  });

  res.render('pages/home', {
    homeSections,
    products: products.slice(0, 12),
    product: null
  });
});

app.get('/collections/:handle', (req, res) => {
  const handle = req.params.handle;
  const page = parseInt(req.query.page || '1', 10) || 1;
  const perPage = 24;
  let collectionProducts = [];
  let collectionTitle = 'Produtos';

  if (handle === 'all') {
    collectionProducts = products;
    collectionTitle = 'Todos os Produtos';
  } else {
    collectionProducts = products.filter(p => p.collections.includes(handle));
    const col = collections.find(c => c.handle === handle);
    if (col) collectionTitle = col.title;
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
});

app.get('/products/:handle', (req, res) => {
  const handle = req.params.handle;
  const product = productsByHandle[handle];
  
  if (!product) {
    return res.status(404).send('Produto não encontrado');
  }

  // Produtos relacionados: mesma coleção primeiro, senão catálogo (excluindo o atual)
  let related = [];
  const pool = product.collections.length
    ? products.filter(p => p.handle !== handle && p.collections.some(c => product.collections.includes(c)))
    : [];
  if (pool.length >= 4) {
    related = pool;
  } else {
    related = products.filter(p => p.handle !== handle).slice(0, 8);
  }
  related = related.slice(0, 8);

  res.render('pages/product', { product, relatedProducts: related });
});

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

    return res.json({ success: true, checkoutId: data.checkoutId, checkoutUrl: data.checkoutUrl });
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
const HOST = process.env.HOST || '127.0.0.1'; // atrás do nginx (CloudPanel) só localhost precisa acessar
app.listen(PORT, HOST, () => {
  console.log('Servidor rodando em http://' + HOST + ':' + PORT);
});
