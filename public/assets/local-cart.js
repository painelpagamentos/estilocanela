// ============================================================
// YBCart — Fonte Única de Verdade do carrinho
// Persistência: localStorage ('yunabella_cart')
// Consumido por: /cart, header (badge), página de produto,
// adicionar/alterar/remover quantidade.
// Dispara o evento global "cart-updated" a cada mudança.
// ============================================================
(function () {
  'use strict';

  var KEY = 'yunabella_cart';

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { items: [], item_count: 0, total_price: 0 };
      var cart = JSON.parse(raw);
      if (!cart || !Array.isArray(cart.items)) return { items: [], item_count: 0, total_price: 0 };
      return cart;
    } catch (e) {
      return { items: [], item_count: 0, total_price: 0 };
    }
  }

  function countOf(cart) {
    return (cart.items || []).reduce(function (acc, item) {
      return acc + (parseInt(item.quantity, 10) || 0);
    }, 0);
  }

  function totalOf(cart) {
    return (cart.items || []).reduce(function (acc, item) {
      return acc + ((Number(item.variant && item.variant.price) || 0) * (parseInt(item.quantity, 10) || 0));
    }, 0);
  }

  function persist(cart) {
    cart.item_count = countOf(cart);
    cart.total_price = totalOf(cart);
    localStorage.setItem(KEY, JSON.stringify(cart));
    return cart;
  }

  function syncTheme() {
    // O tema lê window.theme.cartCount na inicialização e no rerender.
    // Mantemos SEMPRE sincronizado com a fonte de verdade.
    if (window.theme) {
      window.theme.cartCount = YBCart.getCount();
    }
  }

  function emit() {
    syncTheme();
    window.dispatchEvent(new CustomEvent('cart-updated'));
  }

  function updateBadge() {
    var count = countOf(YBCart.getCart());
    // Mantém window.theme.cartCount sincronizado (o tema lê esse valor)
    if (window.theme) {
      window.theme.cartCount = count;
    }
    document.querySelectorAll('.header__cart-count').forEach(function (el) {
      el.textContent = count;
    });
  }

  var YBCart = {
    getCart: function () {
      return read();
    },

    getCount: function () {
      return countOf(read());
    },

    add: function (product, variant, quantity) {
      var cart = read();
      var qty = Math.max(1, parseInt(quantity, 10) || 1);
      var vid = String(variant.id);
      var existing = cart.items.find(function (i) { return String(i.variant && i.variant.id) === vid; });
      if (existing) {
        existing.quantity += qty;
      } else {
        cart.items.push({
          product: {
            id: String(product.id),
            handle: product.handle,
            title: product.title
          },
          variant: {
            id: vid,
            title: variant.title,
            price: Number(variant.price) || 0,
            image: variant.image || ''
          },
          quantity: qty
        });
      }
      persist(cart);
      emit();
      return YBCart.getCount();
    },

    updateQuantity: function (variantId, quantity) {
      var cart = read();
      var qty = parseInt(quantity, 10) || 0;
      if (qty <= 0) {
        cart.items = cart.items.filter(function (i) { return String(i.variant && i.variant.id) !== String(variantId); });
      } else {
        cart.items.forEach(function (i) {
          if (String(i.variant && i.variant.id) === String(variantId)) i.quantity = qty;
        });
      }
      persist(cart);
      emit();
      return YBCart.getCount();
    },

    remove: function (variantId) {
      var cart = read();
      cart.items = cart.items.filter(function (i) { return String(i.variant && i.variant.id) !== String(variantId); });
      persist(cart);
      emit();
      return YBCart.getCount();
    },

    clear: function () {
      persist({ items: [], item_count: 0, total_price: 0 });
      emit();
      return 0;
    }
  };

  window.YBCart = YBCart;

  // IMPORTANTE: tema.min.js (defer) lê window.theme.cartCount na inicialização.
  // Este script é síncrono e roda antes, então definimos o valor real aqui.
  if (window.theme) {
    window.theme.cartCount = YBCart.getCount();
  }

  // Badge: atualiza sempre que o carrinho mudar (mesma fonte de verdade)
  window.addEventListener('cart-updated', updateBadge);

  // Sincronização entre abas: o evento nativo "storage" só dispara nas
  // OUTRAS abas; aqui ele garante que todas reflitam o mesmo carrinho.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) {
      syncTheme();
      updateBadge();
      window.dispatchEvent(new CustomEvent('cart-updated'));
    }
  });

  // Atualiza o badge após o DOM estar pronto (hidratação do localStorage)
  document.addEventListener('DOMContentLoaded', function () {
    syncTheme();
    updateBadge();
  });

  // Botão "Adicionar ao carrinho" da página de produto
  document.addEventListener('submit', function (e) {
    var form = e.target;
    // Usar getAttribute: o form tem <input name="id">, o que faz a
    // propriedade form.id retornar o input em vez do atributo id.
    if (!form || form.getAttribute('id') !== 'yb-product-form' || !window.__YB_PRODUCT__) return;
    e.preventDefault();
    e.stopPropagation();

    var data = window.__YB_PRODUCT__;
    var variantId = String(form.querySelector('#yb-variant-id').value);
    var variant = data.variants.find(function (v) { return String(v.id) === variantId; }) || data.variants[0];
    var qtyInput = form.querySelector('input[name="quantity"]');
    var quantity = Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1);

    YBCart.add(
      { id: String(data.id), handle: data.handle, title: data.title },
      {
        id: String(variant.id),
        title: variant.title,
        price: variant.price,
        image: variant.image || (data.images[0] && data.images[0].src) || ''
      },
      quantity
    );

    window.location.href = '/cart';
  }, true);

  // ------------------------------------------------------------
  // Neutralizar o tema: intercepta fetch de endpoints de carrinho
  // (.js = JSON) para que o tema leia SEMPRE a nossa fonte de verdade.
  // /cart (sem .js) continua sendo HTML (mini-cart/página).
  // ------------------------------------------------------------
  var nativeFetch = window.fetch;
  if (typeof nativeFetch === 'function') {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';

      // JSON do carrinho: /cart.js, /cart/add.js, /cart/change.js, /cart/update.js, /cart/clear.js
      if (/\/cart(\.js|\/add\.js|\/change\.js|\/update\.js|\/clear\.js)\b/.test(url)) {
        var cart = YBCart.getCart();
        var body = JSON.stringify({
          items: cart.items || [],
          item_count: countOf(cart),
          total_price: totalOf(cart)
        });
        return Promise.resolve(new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }

      // Mini-cart: o tema faz fetch de /cart?view=mini-cart e reescreve o
      // badge com o atributo data-item-count do primeiro elemento do HTML.
      // Respondemos com o valor real para o badge nunca zerar.
      if (/\/cart\?[^"'\s]*view=mini-cart/.test(url)) {
        var html = '<div data-item-count="' + YBCart.getCount() + '"></div>';
        return Promise.resolve(new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }));
      }

      return nativeFetch.call(window, input, init);
    };
  }
})();
