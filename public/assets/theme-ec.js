// ============================================================
// Estilo Canela — JS do tema rio (Nuvemshop) adaptado
// Fonte de verdade do carrinho: window.YBCart (local-cart.js)
// Checkout: Corvex via /api/checkout
// ============================================================

// createSwiper wrapper (mesma API do tema nuvem)
window.swiperInstanceCache = window.swiperInstanceCache || {};
function createSwiper(selector, swiperParams, callback = null) {
    var elements = document.querySelectorAll(selector);
    if (!elements.length) {
        if (typeof callback === 'function') callback(null);
        return null;
    }
    var swiper = new Swiper(elements[0], swiperParams);
    window.swiperInstanceCache[selector] = swiper;
    if (typeof callback === 'function') callback(swiper);
    return swiper;
}
window.createSwiper = createSwiper;
window.swiperLoader = window.swiperLoader || function (selector, params, callback) {
    return createSwiper(selector, params, callback);
};

// jQuery mínimo para os seletores do tema (jQueryNuvem)
(function () {
    if (window.jQueryNuvem) return;

    function jQueryLite(selector, context) {
        var elements = [];
        if (typeof selector === 'function') {
            // $(callback) — executa no DOMContentLoaded
            if (document.readyState !== 'loading') {
                setTimeout(selector, 0);
            } else {
                document.addEventListener('DOMContentLoaded', selector);
            }
            return { each: function () { return this; }, length: 0 };
        }
        if (typeof selector === 'string') {
            try {
                elements = Array.prototype.slice.call((context || document).querySelectorAll(selector));
            } catch (e) {
                elements = [];
            }
        } else if (selector && (selector.nodeType || selector === window || selector === document)) {
            elements = [selector];
        } else if (selector && typeof selector.length === 'number') {
            elements = Array.prototype.slice.call(selector);
        } else if (selector && selector.__liteElements) {
            elements = selector.__liteElements;
        }

        var api = {
            __liteElements: elements,
            length: elements.length,
            each: function (fn) {
                elements.forEach(function (el, i) { fn.call(el, i, el); });
                return this;
            },
            on: function (event, handlerOrSelector, maybeHandler) {
                // assinaturas: .on(evento, fn) OU .on(evento, seletor, fn) — jQuery delegado
                var selector = null, handler = handlerOrSelector;
                if (typeof handlerOrSelector === 'string' && typeof maybeHandler === 'function') {
                    selector = handlerOrSelector;
                    handler = maybeHandler;
                }
                if (typeof handler !== 'function') return this;
                elements.forEach(function (el) {
                    el.addEventListener(event, function (e) {
                        if (selector) {
                            var target = e.target && e.target.closest ? e.target.closest(selector) : null;
                            if (!target || !el.contains(target)) return;
                            handler.call(target, e);
                        } else {
                            handler.call(el, e);
                        }
                    });
                });
                return this;
            },
            off: function (event, handler) {
                elements.forEach(function (el) { el.removeEventListener(event, handler); });
                return this;
            },
            attr: function (name, value) {
                if (typeof value !== 'undefined') {
                    elements.forEach(function (el) { el.setAttribute(name, value); });
                    return this;
                }
                return elements[0] ? elements[0].getAttribute(name) : '';
            },
            val: function (value) {
                if (typeof value !== 'undefined') {
                    elements.forEach(function (el) { el.value = value; });
                    return this;
                }
                return elements[0] ? elements[0].value : '';
            },
            text: function (value) {
                if (typeof value !== 'undefined') {
                    elements.forEach(function (el) { el.textContent = value; });
                    return this;
                }
                return elements[0] ? elements[0].textContent : '';
            },
            html: function (value) {
                if (typeof value !== 'undefined') {
                    elements.forEach(function (el) { el.innerHTML = value; });
                    return this;
                }
                return elements[0] ? elements[0].innerHTML : '';
            },
            show: function () {
                elements.forEach(function (el) { el.style.display = ''; el.classList.remove('d-none'); });
                return this;
            },
            hide: function () {
                elements.forEach(function (el) { el.style.display = 'none'; });
                return this;
            },
            toggle: function () {
                elements.forEach(function (el) { el.style.display = (el.style.display === 'none') ? '' : 'none'; });
                return this;
            },
            addClass: function (cls) {
                elements.forEach(function (el) { cls.split(' ').forEach(function (c) { el.classList.add(c); }); });
                return this;
            },
            removeClass: function (cls) {
                elements.forEach(function (el) { cls.split(' ').forEach(function (c) { el.classList.remove(c); }); });
                return this;
            },
            toggleClass: function (cls) {
                elements.forEach(function (el) { cls.split(' ').forEach(function (c) { el.classList.toggle(c); }); });
                return this;
            },
            hasClass: function (cls) {
                return elements[0] ? elements[0].classList.contains(cls) : false;
            },
            css: function (name, value) {
                if (typeof name === 'object') {
                    elements.forEach(function (el) {
                        Object.keys(name).forEach(function (k) { el.style[k] = name[k]; });
                    });
                    return this;
                }
                if (typeof value !== 'undefined') {
                    elements.forEach(function (el) { el.style[name] = value; });
                    return this;
                }
                return elements[0] ? getComputedStyle(elements[0])[name] : '';
            },
            closest: function (sel) {
                var found = [];
                elements.forEach(function (el) {
                    var p = el.closest(sel);
                    if (p && found.indexOf(p) < 0) found.push(p);
                });
                return jQueryLite(found);
            },
            find: function (sel) {
                var found = [];
                elements.forEach(function (el) {
                    Array.prototype.slice.call(el.querySelectorAll(sel)).forEach(function (f) {
                        if (found.indexOf(f) < 0) found.push(f);
                    });
                });
                return jQueryLite(found);
            },
            next: function (sel) {
                var found = [];
                elements.forEach(function (el) {
                    var p = el.nextElementSibling;
                    while (p) {
                        if (!sel || (p.matches && p.matches(sel))) { if (found.indexOf(p) < 0) found.push(p); break; }
                        p = p.nextElementSibling;
                    }
                });
                return jQueryLite(found);
            },
            prev: function (sel) {
                var found = [];
                elements.forEach(function (el) {
                    var p = el.previousElementSibling;
                    while (p) {
                        if (!sel || (p.matches && p.matches(sel))) { if (found.indexOf(p) < 0) found.push(p); break; }
                        p = p.previousElementSibling;
                    }
                });
                return jQueryLite(found);
            },
            parent: function (sel) {
                var found = [];
                elements.forEach(function (el) {
                    var p = el.parentElement;
                    if (p && found.indexOf(p) < 0) found.push(p);
                });
                return jQueryLite(found);
            },
            children: function (sel) {
                var found = [];
                elements.forEach(function (el) {
                    Array.prototype.slice.call(el.children).forEach(function (f) {
                        if (!sel || (f.matches && f.matches(sel))) found.push(f);
                    });
                });
                return jQueryLite(found);
            },
            submit: function () {
                if (elements[0] && typeof elements[0].requestSubmit === 'function') {
                    elements[0].requestSubmit();
                } else if (elements[0]) {
                    elements[0].submit();
                }
                return this;
            },
            focus: function () {
                if (elements[0]) elements[0].focus();
                return this;
            },
            slideDown: function () { this.show(); return this; },
            slideUp: function () { this.hide(); return this; },
            slideToggle: function () { this.toggle(); return this; },
            fadeIn: function () { this.show(); return this; },
            fadeOut: function () { this.hide(); return this; },
            trigger: function (event) {
                elements.forEach(function (el) {
                    var evt;
                    if (event === 'click') {
                        evt = new MouseEvent('click', { bubbles: true, cancelable: true });
                    } else if (event === 'focus') {
                        el.focus();
                        return;
                    } else if (event === 'submit') {
                        evt = new Event('submit', { bubbles: true, cancelable: true });
                    } else {
                        evt = new Event(event, { bubbles: true, cancelable: true });
                    }
                    el.dispatchEvent(evt);
                });
                return this;
            },
            data: function (name, value) {
                if (typeof value !== 'undefined') {
                    elements.forEach(function (el) { el.dataset[name] = value; });
                    return this;
                }
                return elements[0] ? elements[0].dataset[name] : null;
            },
            removeAttr: function (name) {
                elements.forEach(function (el) { el.removeAttribute(name); });
                return this;
            },
            remove: function () {
                elements.forEach(function (el) { el.remove(); });
                return this;
            },
            appendChild: function (child) {
                if (elements[0]) elements[0].appendChild(child);
                return this;
            },
            get: function (i) {
                return typeof i === 'undefined' ? elements : elements[i];
            },
            toArray: function () {
                return elements;
            }
        };
        return api;
    }

    window.jQueryLite = jQueryLite;
    window.jQueryNuvem = jQueryLite;
    window.$ = window.$ || jQueryLite;
})();

(function () {
    var sliders = document.querySelectorAll('[data-ec-store-slider]');
    sliders.forEach(function (slider) {
        var slides = Array.prototype.slice.call(slider.querySelectorAll('.ec-store-showcase__slide'));
        var dots = Array.prototype.slice.call(slider.querySelectorAll('[data-ec-store-dot]'));
        var current = 0;
        if (!slides.length) return;
        function show(index) {
            current = (index + slides.length) % slides.length;
            slides.forEach(function (slide, i) { slide.classList.toggle('is-active', i === current); });
            dots.forEach(function (dot, i) { dot.classList.toggle('is-active', i === current); });
        }
        var next = slider.querySelector('[data-ec-store-next]');
        var previous = slider.querySelector('[data-ec-store-prev]');
        if (next) next.addEventListener('click', function () { show(current + 1); });
        if (previous) previous.addEventListener('click', function () { show(current - 1); });
        dots.forEach(function (dot) {
            dot.addEventListener('click', function () { show(Number(dot.getAttribute('data-ec-store-dot')) || 0); });
        });
        setInterval(function () { show(current + 1); }, 5000);
    });
})();

// cookieService mínimo (usado pelo tema)
window.cookieService = window.cookieService || {
    get: function (name) {
        var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return m ? m.pop() : null;
    },
    set: function (name, value, days) {
        var d = new Date();
        d.setTime(d.getTime() + (days || 7) * 24 * 3600 * 1000);
        document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/';
    },
    remove: function (name) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
    }
};

// LS stub: os scripts do tema chamam LS.*, mas nossa fonte de verdade é YBCart
window.LS = window.LS || {
    ready: { then: function (cb) { cb(); } },
    data: { cart: { total: 0, products: [] } },
    currency: { code: 'BRL', display_short: 'R$', display_long: 'R$' },
    formatToCurrency: function (v) { return 'R$ ' + Number(v).toFixed(2).replace('.', ','); },
    registerOnChangeVariant: function (cb) { window.__registerOnChangeVariant = cb; },
    on: function () {},
    addToTotal: function () {},
    search: function () {},
    removeFromItem: function () {},
    updateNotificationDiscountLabel: function () {},
    subscriptionSubmit: function (container, onError, e) { if (typeof onError === 'function') onError(); },
    saveCalculatedShipping: function () {},
    calculateShippingAjax: function () {},
    removeItem: function (itemId, silent) {
        YBCart.remove(itemId);
    },
    changeQuantity: function (itemId, qty, silent) {
        YBCart.updateQuantity(itemId, qty);
    },
    fillQuickshop: function () {},
    fillCrossSelling: function () {},
    addToCartEnhanced: function () {},
    ShippingDiscountRow: { apply: function () {} },
    events: { productAddedToCart: 'productAddedToCart' }
};

// helper: preço formatado
function ecFormatPrice(cents) {
    return 'R$' + (cents / 100).toFixed(2).replace('.', ',');
}

// helper: abre modal do tema
function modalOpen(modalId) {
    var modal = document.querySelector(modalId);
    var overlay = document.querySelector('.js-modal-overlay[data-modal-id="' + modalId + '"]');
    if (!modal) return;
    modal.style.display = 'block';
    modal.classList.add('modal-show');
    if (overlay) overlay.style.display = 'block';
    document.body.classList.add('overflow-none');
}
window.modalOpen = modalOpen;

function modalClose(modalId) {
    var modal = document.querySelector(modalId);
    var overlay = document.querySelector('.js-modal-overlay[data-modal-id="' + modalId + '"]');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('modal-show');
    }
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('overflow-none');
}
window.modalClose = modalClose;

// ============================================================
// Render do carrinho (mesma fonte de verdade: YBCart)
// ============================================================
window.ecRenderCart = function () {
    var cart = window.YBCart ? YBCart.getCart() : { items: [] };
    var items = cart.items || [];

    // badge
    var amount = items.reduce(function (a, it) { return a + (parseInt(it.quantity, 10) || 0); }, 0);
    document.querySelectorAll('.js-cart-widget-amount').forEach(function (el) { el.textContent = amount; });

    // lista do modal
    var list = document.querySelector('.js-ajax-cart-list');
    var empty = document.querySelector('.js-empty-ajax-cart');
    var filled = document.querySelectorAll('.js-visible-on-cart-filled');
    var totals = document.querySelectorAll('.js-cart-total');
    var subtotal = 0;

    if (list) {
        list.innerHTML = items.map(function (it, i) {
            var v = it.variant || {};
            var p = it.product || {};
            var price = Math.round((Number(v.price) || 0) * 100);
            var qty = parseInt(it.quantity, 10) || 1;
            subtotal += price * qty;
            var url = '/produtos/' + String(p.handle || '') + '/';
            return [
                '<div class="js-cart-item js-cart-item-shippable cart-item form-row position-relative" data-item-id="' + String(v.id) + '" data-store="cart-item-' + String(v.id) + '">',
                '    <div class="col-2">',
                '        <a href="' + url + '">',
                '            <img src="' + String(v.image || '') + '" alt="' + String(p.title || '') + '" class="img-fluid">',
                '        </a>',
                '    </div>',
                '    <div class="col-10 d-flex align-items-center">',
                '        <div class="w-100">',
                '            <div class="cart-item-name">',
                '                <a href="' + url + '">' + String(p.title || '') + '</a>',
                '                <small>(' + String(v.title || '') + ')</small>',
                '            </div>',
                '            <div class="cart-item-quantity">',
                '                <div class="form-group float-left form-quantity cart-item-quantity small mb-0">',
                '                    <div class="row m-0 align-items-center">',
                '                        <span class="js-cart-quantity-btn form-quantity-icon btn" data-variant-id="' + String(v.id) + '" data-delta="-1" aria-label="Diminuir quantidade">',
                '                            <svg class="icon-inline icon-lg svg-icon-text"><use xlink:href="#minus"/></svg>',
                '                        </span>',
                '                        <div class="form-control-container js-cart-quantity-container col px-1">',
                '                            <input type="number" class="form-control js-cart-quantity-input text-center form-control-inline" autocorrect="off" autocapitalize="off" pattern="\\d*" value="' + qty + '" data-variant-id="' + String(v.id) + '" aria-label="Quantidade">',
                '                        </div>',
                '                        <span class="js-cart-quantity-btn form-quantity-icon btn" data-variant-id="' + String(v.id) + '" data-delta="1" aria-label="Aumentar quantidade">',
                '                            <svg class="icon-inline icon-lg svg-icon-text"><use xlink:href="#plus"/></svg>',
                '                        </span>',
                '                    </div>',
                '                </div>',
                '            </div>',
                '            <div class="cart-item-subtotal">',
                '                <span class="js-cart-item-subtotal font-weight-bold">' + ecFormatPrice(price * qty) + '</span>',
                '            </div>',
                '        </div>',
                '    </div>',
                '    <div class="cart-item-delete col-1 text-right">',
                '        <button type="button" class="btn js-remove-item" data-variant-id="' + String(v.id) + '" aria-label="Remover produto">',
                '            <svg class="icon-inline svg-icon-text icon-lg"><use xlink:href="#trash-alt"/></svg>',
                '        </button>',
                '    </div>',
                '</div>'
            ].join('');
        }).join('');
    }

    if (empty) empty.style.display = items.length ? 'none' : 'block';
    if (list) list.style.display = items.length ? 'block' : 'none';
    filled.forEach(function (el) { el.style.display = items.length ? 'block' : 'none'; });
    totals.forEach(function (el) {
        el.textContent = ecFormatPrice(subtotal);
        el.dataset.componentValue = subtotal;
    });
    document.querySelectorAll('.js-ajax-cart-total, .js-cart-subtotal').forEach(function (el) {
        el.textContent = ecFormatPrice(subtotal);
    });
    document.querySelectorAll('.js-installments-cart-total').forEach(function (el) {
        if (!items.length) { el.style.display = 'none'; return; }
        var amountEl = el.querySelector('.js-cart-installments-amount');
        var valueEl = el.querySelector('.js-cart-installments');
        var n = 8;
        if (amountEl) amountEl.textContent = n;
        if (valueEl) valueEl.textContent = ecFormatPrice(Math.round(subtotal / n));
        el.style.display = '';
    });

    // frete grátis: barra de progresso acima de R$999 (igual Nuvemshop)
    var FREE_SHIPPING_CENTS = 99900;
    document.querySelectorAll('.js-bar-progress-active').forEach(function (el) {
        var pct = Math.max(0, Math.min(100, (subtotal / FREE_SHIPPING_CENTS) * 100));
        el.style.width = pct.toFixed(3) + '%';
        el.style.visibility = 'visible';
    });
    document.querySelectorAll('.js-ship-free-dif').forEach(function (el) {
        var dif = FREE_SHIPPING_CENTS - subtotal;
        el.textContent = dif > 0 ? ecFormatPrice(dif) : '';
    });
    document.querySelectorAll('.ship-free-rest-text.bar-progress-success').forEach(function (el) {
        el.style.display = subtotal >= FREE_SHIPPING_CENTS ? '' : 'none';
    });
    document.querySelectorAll('.ship-free-rest-text.bar-progress-amount').forEach(function (el) {
        el.style.display = (subtotal > 0 && subtotal < FREE_SHIPPING_CENTS) ? '' : 'none';
    });
    document.querySelectorAll('.ship-free-rest-text.bar-progress-condition').forEach(function (el) {
        el.style.display = (subtotal > 0 && subtotal < FREE_SHIPPING_CENTS) ? 'none' : '';
    });

    // linha "Frete: Calcule para ver" (igual Nuvemshop)
    document.querySelectorAll('.js-shipping-cost-table').forEach(function (el) {
        el.style.display = items.length ? 'flex' : 'none';
    });
    document.querySelectorAll('.js-shipping-cost-empty').forEach(function (el) {
        el.style.display = items.length ? '' : 'none';
    });
};

// ============================================================
// Inicialização
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    var $ = window.jQueryNuvem;

    // Render inicial do carrinho
    window.ecRenderCart();
    window.addEventListener('cart-updated', window.ecRenderCart);

    // ------------------------------------------------------------
    // Modais (tema rio)
    // ------------------------------------------------------------
    $(document).on('click', '.js-modal-open', function (e) {
        e.preventDefault();
        var toggle = this.getAttribute('data-toggle');
        if (toggle) modalOpen(toggle);
    });

    $(document).on('click', '.js-modal-close', function (e) {
        e.preventDefault();
        var modal = this.closest('.js-modal');
        if (modal && modal.id) modalClose('#' + modal.id);
    });

    $(document).on('click', '.js-modal-overlay', function (e) {
        var id = this.getAttribute('data-modal-id');
        if (id) modalClose(id);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.js-modal.modal-show').forEach(function (m) {
                if (m.id) modalClose('#' + m.id);
            });
        }
    });

    // ------------------------------------------------------------
    // Menu mobile: painéis e hamburguer
    // ------------------------------------------------------------
    $(document).on('click', '.js-toggle-menu-panel', function (e) {
        e.preventDefault();
        var next = this.nextElementSibling;
        if (next && next.classList.contains('js-menu-panel')) {
            next.style.display = 'block';
            next.classList.add('nav-list-panel-show');
        }
    });

    $(document).on('click', '.js-toggle-menu-back', function (e) {
        e.preventDefault();
        var panel = this.closest('.js-menu-panel');
        if (panel) {
            panel.classList.remove('nav-list-panel-show');
            setTimeout(function () { panel.style.display = 'none'; }, 600);
        }
    });

    window.closeHamburgerSubpanels = function () {
        document.querySelectorAll('.js-menu-panel').forEach(function (p) {
            p.classList.remove('nav-list-panel-show');
        });
        setTimeout(function () {
            document.querySelectorAll('.js-menu-panel').forEach(function (p) {
                p.style.display = 'none';
            });
        }, 1000);
    };

    $(document).on('click', '.js-toggle-menu-close, .js-modal-overlay[data-modal-id="#nav-hamburger"]', function () {
        window.closeHamburgerSubpanels();
    });

    // header comprimido ao rolar
    var adbar = document.querySelector('.js-adbar');
    window.addEventListener('scroll', function () {
        var header = document.querySelector('.js-head-main');
        if (!header) return;
        var adbarH = adbar ? adbar.offsetHeight : 0;
        var h = header.offsetHeight;
        if (window.pageYOffset > h) {
            header.classList.add('compress');
            header.style.top = -adbarH + 'px';
        } else {
            header.classList.remove('compress');
            header.style.top = '0px';
        }
    });

    // dropdown desktop
    document.querySelectorAll('.js-item-desktop').forEach(function (el) {
        el.addEventListener('mouseenter', function (e) {
            this.classList.add('active');
        });
        el.addEventListener('mouseleave', function (e) {
            this.classList.remove('active');
        });
    });

    // foco no input de busca do modal mobile
    $(document).on('click', '.js-search-button', function (e) {
        setTimeout(function () {
            var input = document.querySelector('#nav-search .js-search-input');
            if (input) input.focus();
        }, 10);
    });

    // ------------------------------------------------------------
    // Busca com sugestões (via /search?view=ajax&type=product)
    // ------------------------------------------------------------
    $(document).on('input', '.js-search-input', function () {
        var input = this;
        var term = input.value.trim();
        var container = input.closest('.js-search-container');
        var suggest = container ? container.nextElementSibling : null;
        if (!suggest) return;

        if (!term) {
            suggest.style.display = 'none';
            suggest.innerHTML = '';
            return;
        }

        fetch('/search/?view=ajax&type=product&q=' + encodeURIComponent(term))
            .then(function (r) { return r.text(); })
            .then(function (html) {
                suggest.innerHTML = html;
                suggest.style.display = 'block';
            });
    });

    $(document).on('click', '.js-search-suggest-all-link', function (e) {
        e.preventDefault();
        var form = this.closest('.js-search-suggest').previousElementSibling;
        if (form) form.submit();
    });

    // ------------------------------------------------------------
    // Accordion do footer (mobile)
    // ------------------------------------------------------------
    $(document).on('click', '.js-accordion-toggle-mobile', function (e) {
        e.preventDefault();
        var content = this.nextElementSibling;
        var inactive = this.querySelectorAll('.js-accordion-toggle-inactive');
        var toggleContent = content ? (content.style.display === 'none') : false;
        if (content) content.style.display = toggleContent ? 'block' : 'none';
    });

    // ------------------------------------------------------------
    // Quickshop: abrir variantes (desktop) / modal (mobile)
    // ------------------------------------------------------------
    $(document).on('click', '.js-item-buy-open', function (e) {
        e.preventDefault();
        var item = this.closest('.js-item-product');
        var container = item ? item.querySelector('.js-product-container') : null;
        if (!container) return;

        if (window.innerWidth < 768) {
            modalOpen('#quickshop-modal');
            window.ecFillQuickshop(item);
        } else {
            this.style.display = 'none';
            var closeBtn = item.querySelector('.js-item-buy-close');
            if (closeBtn) closeBtn.style.display = '';
            var variants = item.querySelector('.js-item-variants');
            if (variants) {
                variants.classList.toggle('item-variants-hidden');
                variants.classList.add('item-variants-active');
            }
        }

        var elementTop = container.getBoundingClientRect().top + window.pageYOffset;
        var viewportTop = window.pageYOffset;
        if (elementTop < viewportTop) {
            window.scrollTo({
                top: elementTop - 100,
                behavior: 'smooth'
            });
        }
    });

    $(document).on('click', '.js-item-buy-close', function (e) {
        e.preventDefault();
        if (window.innerWidth > 767) {
            this.style.display = 'none';
            var item = this.closest('.js-item-product');
            var openBtn = item.querySelector('.js-item-buy-open');
            if (openBtn) openBtn.style.display = '';
            var variants = item.querySelector('.js-item-variants');
            if (variants) {
                variants.classList.toggle('item-variants-hidden');
                variants.classList.remove('item-variants-active');
            }
        }
    });

    // ------------------------------------------------------------
    // Variantes no quickshop (mesma estrutura do tema)
    // ------------------------------------------------------------
    function ecGetContainerVariants(container) {
        var raw = container.getAttribute('data-variants');
        if (!raw) return [];
        try {
            var parsed = JSON.parse(raw);
            return parsed.variants || parsed;
        } catch (e) {
            return [];
        }
    }

    function ecSelectedOptions(form) {
        var output = [];
        form.querySelectorAll('.js-variation-option').forEach(function (sel) {
            output.push(sel.value);
        });
        return output;
    }

    function ecFindVariant(container, selected) {
        var variants = ecGetContainerVariants(container);
        return variants.find(function (v) {
            var opts = (v.options || []).map(String);
            return selected.every(function (s) { return opts.indexOf(String(s)) >= 0; });
        }) || variants[0];
    }

    function ecOnVariationChange(form) {
        var container = form.closest('.js-product-container');
        var item = form.closest('.js-item-product');
        if (!container || !item) return;
        var variant = ecFindVariant(container, ecSelectedOptions(form));
        if (!variant) return;

        // preço
        var priceEl = item.querySelector('.js-price-display');
        if (priceEl) {
            priceEl.textContent = ecFormatPrice(Math.round((Number(variant.price) || 0) * 100));
            priceEl.dataset.productPrice = Math.round((Number(variant.price) || 0) * 100);
        }
        // parcelas
        var instAmount = item.querySelector('.js-installment-amount');
        var instValue = item.querySelector('.js-installment-price');
        if (instAmount && instValue) {
            var cents = Math.round((Number(variant.price) || 0) * 100);
            instValue.textContent = ecFormatPrice(Math.floor(cents / 7));
        }
        // imagem
        var centsV = Math.round((Number(variant.price) || 0) * 100);
        var img = item.querySelector('.js-item-image');
        if (img && variant.image) {
            img.setAttribute('srcset', variant.image + ' 480w, ' + variant.image + ' 640w');
        }
        // variantId para o form
        var hidden = form.querySelector('input[name="add_to_cart"]');
        if (hidden && variant.id) hidden.value = variant.id;
        form.dataset.variantId = variant.id;
    }

    $(document).on('change', '.js-variation-option', function (e) {
        var form = this.closest('form');
        if (form) window.__registerOnChangeVariant && window.__registerOnChangeVariant(ecFindVariant(
            this.closest('.js-product-container'),
            ecSelectedOptions(form)
        ));
        ecOnVariationChange(form);
    });

    // ------------------------------------------------------------
    // Adicionar ao carrinho (todos os forms js-product-form)
    // ------------------------------------------------------------
    $(document).on('submit', '.js-product-form', function (e) {
        e.preventDefault();
        var form = this;
        // A página de produto tem o próprio handler (inline) — não duplicar
        if (form.id === 'product_form') return;
        var container = form.closest('.js-product-container');
        var item = form.closest('.js-item-product');
        if (!container || !item) return;

        var productId = container.getAttribute('data-quickshop-id');
        var productData = window.__EC_PRODUCTS__ ? window.__EC_PRODUCTS__[productId] : null;
        if (!productData) return;

        var variant = ecFindVariant(container, ecSelectedOptions(form));
        var handle = item.getAttribute('data-product-handle') || productData.handle;

        // botão placeholder (tema rio)
        var button = form.querySelector('input[type="submit"].js-addtocart');
        var placeholder = form.querySelector('.js-addtocart-placeholder');
        var btnText = placeholder ? placeholder.querySelector('.js-addtocart-text') : null;
        var btnAdding = placeholder ? placeholder.querySelector('.js-addtocart-adding') : null;
        var btnSuccess = placeholder ? placeholder.querySelector('.js-addtocart-success') : null;

        if (button) button.style.display = 'none';
        if (placeholder) placeholder.style.display = 'inline-block';
        if (btnText) btnText.style.display = 'none';
        if (btnAdding) btnAdding.classList.add('active');

        YBCart.add(
            { id: String(productData.id), handle: handle, title: productData.title },
            {
                id: String(variant.id),
                title: (variant.options || []).join(', ') || variant.title || '',
                price: Number(variant.price) || 0,
                image: variant.image || productData.image || ''
            },
            1
        );

        function restoreButton() {
            if (btnAdding) btnAdding.classList.remove('active');
            if (btnText) btnText.style.display = '';
            if (placeholder) placeholder.style.display = 'none';
            if (button) button.style.display = '';
        }

        function showSuccess() {
            if (btnAdding) btnAdding.classList.remove('active');
            if (btnSuccess) btnSuccess.classList.add('active');
            setTimeout(function () {
                if (btnSuccess) btnSuccess.classList.remove('active');
                if (btnText) btnText.style.display = '';
            }, 2000);
            setTimeout(function () {
                if (placeholder) placeholder.style.display = 'none';
                if (button) button.style.display = '';
            }, 3000);
        }

        setTimeout(function () {
            showSuccess();

            // notificação do tema (notification top do body)
            var notificationImg = document.querySelector('.js-cart-notification-item-img');
            var imgSrc = (variant.image || productData.image || '');
            if (notificationImg) notificationImg.setAttribute('src', imgSrc);
            document.querySelectorAll('.js-cart-notification-item-img').forEach(function (el) {
                el.setAttribute('srcset', imgSrc);
                el.setAttribute('src', imgSrc);
            });
            document.querySelectorAll('.js-cart-notification-item-name').forEach(function (el) {
                el.textContent = productData.title;
            });
            document.querySelectorAll('.js-cart-notification-item-quantity').forEach(function (el) {
                el.textContent = 1;
            });
            document.querySelectorAll('.js-cart-notification-item-price').forEach(function (el) {
                el.textContent = ecFormatPrice(Math.round((Number(variant.price) || 0) * 100));
            });

            var opts = (variant.options || []).join(', ');
            document.querySelectorAll('.js-cart-notification-item-variant-container').forEach(function (el) {
                el.style.display = opts ? '' : 'none';
            });
            document.querySelectorAll('.js-cart-notification-item-variant').forEach(function (el) {
                el.textContent = opts;
            });

            var amount = YBCart.getCount();
            document.querySelectorAll('.js-cart-counts-plural').forEach(function (el) {
                el.style.display = amount > 1 ? '' : 'none';
            });
            document.querySelectorAll('.js-cart-counts-singular').forEach(function (el) {
                el.style.display = amount > 1 ? 'none' : '';
            });

            // abre o modal do carrinho (corvex checkout)
            modalOpen('#modal-cart');
        }, 300);
    });

    // ------------------------------------------------------------
    // Form do modal-cart: Corvex checkout
    // ------------------------------------------------------------
    var cartForm = document.querySelector('#modal-cart form');
    if (cartForm) {
        cartForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var cart = YBCart.getCart();
            var items = cart.items || [];
            if (!items.length) return;

            var submit = cartForm.querySelector('input[type="submit"][name="go_to_checkout"]');
            if (submit) {
                submit.disabled = true;
                submit.value = 'Processando...';
            }

            var loader = document.querySelector('#checkout-secure-loader');
            if (loader) loader.classList.add('active');

            try {
                var resp = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: items })
                });
                var data = await resp.json().catch(function () { return null; });
                if (!resp.ok || !data || !data.success || !data.checkoutUrl) {
                    throw new Error((data && data.error) || 'Não foi possível iniciar o pagamento.');
                }
                window.location.href = data.checkoutUrl;
            } catch (err) {
                if (loader) loader.classList.remove('active');
                if (submit) {
                    submit.disabled = false;
                    submit.value = 'Iniciar Compra';
                }
                alert('Erro ao finalizar a compra: ' + err.message);
            }
        });
    }

    // ------------------------------------------------------------
    // Quantidade e remoção no modal-cart
    // ------------------------------------------------------------
    $(document).on('click', '.js-cart-quantity-btn', function (e) {
        e.preventDefault();
        var vid = this.getAttribute('data-variant-id');
        var delta = parseInt(this.getAttribute('data-delta'), 10) || 0;
        var item = (YBCart.getCart().items || []).find(function (i) {
            return String(i.variant && i.variant.id) === String(vid);
        });
        if (!item) return;
        var qty = (parseInt(item.quantity, 10) || 0) + delta;
        if (qty <= 0) {
            YBCart.remove(vid);
        } else {
            YBCart.updateQuantity(vid, qty);
        }
    });

    $(document).on('focusout', '.js-cart-quantity-input', function (e) {
        var vid = this.getAttribute('data-variant-id');
        var qty = parseInt(this.value, 10) || 0;
        if (qty <= 0) {
            YBCart.remove(vid);
        } else {
            YBCart.updateQuantity(vid, qty);
        }
    });

    $(document).on('click', '.js-remove-item', function (e) {
        e.preventDefault();
        var vid = this.getAttribute('data-variant-id');
        YBCart.remove(vid);
    });

    $(document).on('keypress', '.js-cart-quantity-input', function (e) {
        if (e.which !== 8 && e.which !== 0 && (e.which < 48 || e.which > 57)) {
            e.preventDefault();
        }
    });

    // ------------------------------------------------------------
    // Newsletter (fallback sem backend: mailto)
    // ------------------------------------------------------------
    document.querySelectorAll('.js-newsletter form').forEach(function (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var email = form.querySelector('input[name="email"]');
            if (email && email.value) {
                alert('Obrigado! Em breve você receberá nossas novidades no e-mail ' + email.value + '.');
                email.value = '';
            }
        });
    });

    // ------------------------------------------------------------
    // Cashback modal
    // ------------------------------------------------------------
    $(document).on('click', '.js-modal-cashback-open', function (e) {
        e.preventDefault();
        modalOpen('#cashback-modal');
    });

    // ------------------------------------------------------------
    // Instagram feed lazy (visual)
    // ------------------------------------------------------------
    document.querySelectorAll('.js-instagram-feed img').forEach(function (img) {
        if (img.dataset.src) {
            img.setAttribute('src', img.dataset.src);
        }
    });

    // ------------------------------------------------------------
    // Country selector (visual: recarrega com ?country=)
    // ------------------------------------------------------------
    document.querySelectorAll('.js-lang-select').forEach(function (sel) {
        sel.addEventListener('change', function () {
            var opt = sel.options[sel.selectedIndex];
            var url = opt ? opt.getAttribute('data-country-url') : null;
            if (url && url !== 'null') {
                // Nuvemshop redireciona para a URL por país; mantemos no site
                window.location.href = url;
            }
        });
    });
});

// ============================================================
// Swipers do home (carrosséis das seções featured)
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    var width = window.innerWidth;
    var itemSwiperSpaceBetween = 15;

    var hideSwiperControls = function (elemPrev, elemNext) {
        var p = document.querySelector(elemPrev);
        var n = document.querySelector(elemNext);
        if (p && n && p.classList.contains('swiper-button-disabled') && n.classList.contains('swiper-button-disabled')) {
            p.remove();
            n.remove();
        }
    };

    // slider home (desktop + mobile)
    if (width > 767) {
        var slider_autoplay = { delay: 6000 };
    } else {
        var slider_autoplay = false;
    }

    createSwiper('.js-home-slider', {
        preloadImages: false,
        lazy: true,
        loop: true,
        autoplay: slider_autoplay,
        pagination: { el: '.js-swiper-home-pagination', clickable: true },
        navigation: { nextEl: '.js-swiper-home-next', prevEl: '.js-swiper-home-prev' }
    }, function (swiperInstance) {
        window.homeSwiper = swiperInstance;
    });

    createSwiper('.js-home-slider-mobile', {
        preloadImages: false,
        lazy: true,
        autoplay: slider_autoplay,
        pagination: { el: '.js-swiper-home-pagination-mobile', clickable: true },
        navigation: { nextEl: '.js-swiper-home-next-mobile', prevEl: '.js-swiper-home-prev-mobile' }
    }, function (swiperInstance) {
        window.homeMobileSwiper = swiperInstance;
    });

    // featured carrossel (MUST-HAVE)
    createSwiper('.js-swiper-featured', {
        lazy: true,
        watchOverflow: true,
        centerInsufficientSlides: true,
        threshold: 5,
        watchSlideProgress: true,
        watchSlidesVisibility: true,
        slideVisibleClass: 'js-swiper-slide-visible',
        spaceBetween: itemSwiperSpaceBetween,
        loop: true,
        navigation: { nextEl: '.js-swiper-featured-next', prevEl: '.js-swiper-featured-prev' },
        slidesPerView: 1.15,
        breakpoints: { 768: { slidesPerView: 4 } }
    }, function (swiperInstance) {
        window.productsFeaturedSwiper = swiperInstance;
    });

    // new carrossel (LANÇAMENTOS)
    createSwiper('.js-swiper-new', {
        lazy: true,
        watchOverflow: true,
        centerInsufficientSlides: true,
        threshold: 5,
        watchSlideProgress: true,
        watchSlidesVisibility: true,
        slideVisibleClass: 'js-swiper-slide-visible',
        spaceBetween: itemSwiperSpaceBetween,
        navigation: { nextEl: '.js-swiper-new-next', prevEl: '.js-swiper-new-prev' },
        slidesPerView: 1.15,
        breakpoints: { 768: { slidesPerView: 3 } }
    }, function (swiperInstance) {
        window.productsNewSwiper = swiperInstance;
    });

    // banners
    createSwiper('.js-swiper-banners', {
        lazy: true,
        watchOverflow: true,
        threshold: 5,
        watchSlideProgress: true,
        watchSlidesVisibility: true,
        slideVisibleClass: 'js-swiper-slide-visible',
        spaceBetween: itemSwiperSpaceBetween,
        navigation: { nextEl: '.js-swiper-banners-next', prevEl: '.js-swiper-banners-prev' },
        slidesPerView: 1.15,
        breakpoints: { 768: { slidesPerView: 3 } }
    }, function (swiperInstance) {
        window.homeBannerSwiper = swiperInstance;
    });

    // relacionados do produto ("Produtos similares")
    if (document.querySelector('.js-swiper-related')) {
        createSwiper('.js-swiper-related', {
            lazy: true,
            watchOverflow: true,
            threshold: 5,
            watchSlideProgress: true,
            watchSlidesVisibility: true,
            slideVisibleClass: 'js-swiper-slide-visible',
            spaceBetween: itemSwiperSpaceBetween,
            navigation: { nextEl: '.js-swiper-related-next', prevEl: '.js-swiper-related-prev' },
            slidesPerView: 1.15,
            breakpoints: { 768: { slidesPerView: 4 } }
        }, function (swiperInstance) {
            window.productsRelatedSwiper = swiperInstance;
        });
        hideSwiperControls('.js-swiper-related-prev', '.js-swiper-related-next');
    }

    // banner mobile da home (exclusivo canela)
    createSwiper('.js-swiper-categories', {
        lazy: true,
        preloadImages: false,
        watchOverflow: true,
        watchSlidesVisibility: true,
        slidesPerView: 'auto',
        centerInsufficientSlides: true,
        navigation: { nextEl: '.js-swiper-categories-next', prevEl: '.js-swiper-categories-prev' }
    });

    // informative banners (mobile)
    if (width < 767) {
        createSwiper('.js-informative-banners', {
            slidesPerView: 1,
            watchOverflow: true,
            centerInsufficientSlides: true,
            pagination: { el: '.js-informative-banners-pagination', clickable: true },
            breakpoints: { 640: { slidesPerView: 3 } }
        });
    }

    // esconde controles de carrosséis com uma única página
    hideSwiperControls('.js-swiper-featured-prev', '.js-swiper-featured-next');
    hideSwiperControls('.js-swiper-new-prev', '.js-swiper-new-next');
    hideSwiperControls('.js-swiper-banners-prev', '.js-swiper-banners-next');
    hideSwiperControls('.js-swiper-categories-prev', '.js-swiper-categories-next');
});

// ============================================================
// YouTube video home
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    var videoTag = document.querySelector('.js-home-video-image');
    if (!videoTag) return;

    var loadVideoFrame = function () {
        if (typeof YT === 'undefined' || !YT.Player) {
            var tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
            var checkYT = setInterval(function () {
                if (typeof YT !== 'undefined' && YT.Player) {
                    clearInterval(checkYT);
                    window.youtubeIframeService.executeOnReady(function () {
                        new YT.Player('player', {
                            width: '100%',
                            videoId: 'YwR1IWUW9ng',
                            playerVars: { 'autoplay': 1, 'playsinline': 1, 'rel': 0, 'loop': 1, 'autopause': 0, 'controls': 0, 'showinfo': 0, 'modestbranding': 1, 'branding': 0, 'fs': 0, 'iv_load_policy': 3 },
                            events: {
                                'onReady': onPlayerReady,
                                'onStateChange': onPlayerStateChange
                            }
                        });
                    });
                }
            }, 100);
        }
        if (typeof window.youtubeIframeService === 'undefined') {
            window.youtubeIframeService = {
                executeOnReady: function (cb) { cb(); }
            };
        }
    };

    window.youtubeIframeService = window.youtubeIframeService || {
        _queue: [],
        executeOnReady: function (cb) { cb(); }
    };

    function onPlayerReady(event) {
        event.target.mute();
        event.target.playVideo();
    }

    function onPlayerStateChange(event) {
        var $ = window.jQueryNuvem;
        if (event.data === YT.PlayerState.PLAYING) {
            document.querySelectorAll('.js-home-video-image').forEach(function (el) {
                el.classList.add('fade-in');
            });
        }
        if (event.data === YT.PlayerState.ENDED) {
            event.target.seekTo(0);
            event.target.playVideo();
        }
    }

    if (window.innerWidth < 768) {
        window.addEventListener('pointerdown', function () {
            loadVideoFrame();
        }, { once: true });
    } else {
        loadVideoFrame();
    }
});

// js-head-mutator do tema rio: adiciona .compress quando a página é rolada
// Também recolhe o offset da topbar: no topo o cabeçalho fica abaixo da faixa
// de anúncios; ao rolar, encosta no topo (top:0) para não deixar vão.
(function () {
    var head = document.querySelector('.js-head-main');
    if (!head) return;
    var topbar = document.querySelector('.ec-topbar');
    var ticking = false;
    function update() {
        ticking = false;
        if (window.scrollY > 60) {
            if (!head.classList.contains('compress')) head.classList.add('compress');
        } else {
            head.classList.remove('compress');
        }
        if (head.classList.contains('position-fixed')) {
            head.style.top = window.scrollY > (topbar ? topbar.offsetHeight : 0) ? '0px' : (topbar ? topbar.offsetHeight : 0) + 'px';
        }
    }
    window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
})();

// Scroll reveal do tema rio: [data-transition] recebe .is-inViewport ao entrar na viewport
// (CSS: [data-transition=fade-in-up] { opacity:0 } / .is-inViewport { opacity:1 })
document.addEventListener('DOMContentLoaded', function () {
    var revealEls = document.querySelectorAll('[data-transition]');
    if (!revealEls.length) return;

    var revealImg = function (el) {
        if (!window.lazySizes || !window.lazySizes.loader) return;
        var imgs = el.querySelectorAll('img.lazyload, img.lazyautosizes');
        for (var i = 0; i < imgs.length; i++) {
            try { window.lazySizes.loader.unveil(imgs[i]); } catch (e) { /* noop */ }
        }
    };

    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-inViewport');
                    revealImg(entry.target);
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
        revealEls.forEach(function (el) { io.observe(el); });
    } else {
        revealEls.forEach(function (el) {
            el.classList.add('is-inViewport');
            revealImg(el);
        });
    }
});

// ============================================================
// Modal CASHBACK da home: abre automaticamente após 2,5s
// (igual Nuvemshop) e não reabre depois de interagido
// ============================================================
(function () {
    var modal = document.getElementById('home-modal');
    if (!modal) return;
    var dismissed = null;
    try { dismissed = localStorage.getItem('ec-cashback-dismissed'); } catch (e) {}
    if (dismissed) return;
    // Modal promocional desativado por padrão para não travar o scroll na home.
    // Para reativar o auto-open, descomente a linha abaixo.
    // setTimeout(function () {
    //     if (typeof modalOpen === 'function') modalOpen('#home-modal');
    // }, 2500);
    document.addEventListener('click', function (e) {
        if (!e.target.closest) return;
        var inModal = e.target.closest('#home-modal .js-modal-close') || e.target.closest('#home-modal .btn');
        var onOverlay = e.target.closest && e.target.classList.contains('modal-overlay') && e.target.getAttribute('data-modal-id') === '#home-modal';
        if (inModal || onOverlay) {
            try { localStorage.setItem('ec-cashback-dismissed', '1'); } catch (err) {}
        }
    });
})();
