// Proteção contra execução múltipla
if (window.corvexRedirectInitialized) {
    console.warn('Corvex Redirect já foi inicializado, evitando execução duplicada.');
} else {
    window.corvexRedirectInitialized = true;

    var isLoadingSecureCheckout = false;

    function showSecureLoader() {
        isLoadingSecureCheckout = true;
        const loader = document.getElementById('checkout-secure-loader');
        if (!loader) return;
        loader.style.display = "block";
        // Força um reflow para garantir que a transição funcione
        loader.offsetHeight;
        loader.classList.add('active');
    }

    function hideSecureLoader() {
        isLoadingSecureCheckout = false;
        const loader = document.getElementById('checkout-secure-loader');
        if (!loader) return;
        loader.classList.remove('active');
        // Espera a transição terminar antes de esconder o elemento
        setTimeout(() => {
            if (!isLoadingSecureCheckout) {
                const loaderCheck = document.getElementById('checkout-secure-loader');
                if (loaderCheck) {
                    loaderCheck.style.display = "none";
                }
            }
        }, 300); // Mesmo tempo da transição CSS
    }

    function ckGetAjax(url) {
        return new Promise((resolve, reject) => {
            var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
            xhr.open('GET', url);
            xhr.onreadystatechange = function () {
                if (xhr.readyState > 3 && xhr.status == 200) resolve(xhr.responseText);
            };
            xhr.send();
        })
    }

    function ckPostAjax(url, data) {
        console.log("ckPostAjax()");

        return new Promise((resolve, reject) => {
            var xhr;


            if (window.XMLHttpRequest) {
                console.log("new XMLHttpRequest()")
                xhr = new XMLHttpRequest();
            } else {
                console.log(`new ActiveXObject("Microsoft.XMLHTTP")`);
                console.log("here we are...");
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }

            xhr.open('POST', url);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.onreadystatechange = function () {
                if (xhr.readyState > 3 && xhr.status == 200) {
                    resolve(xhr.responseText);
                } else if (xhr.status != 200) {
                    hideSecureLoader();
                }
            };
            xhr.send(data);
            return xhr;
        })
    }

    async function navigateToCheckout() {
        try {
            var cart = await getCart();
            var checkout = await createCheckout(cart);

            // Validação adicional antes de redirecionar
            if (!checkout || !checkout.checkoutUrl) {
                console.error('Checkout inválido retornado:', checkout);
                throw new Error('Checkout inválido retornado');
            }

            var checkoutUrlBase = `${checkout.checkoutUrl}`;
            console.log('URL base do checkout:', checkoutUrlBase);

            // Validação final rigorosa do URL antes de redirecionar
            if (!isValidCheckoutUrl(checkoutUrlBase)) {
                console.error('URL de checkout falhou na validação final:', checkoutUrlBase);
                throw new Error('URL de checkout inválida - não será redirecionado');
            }

            // Só limpa o carrinho se a URL for válida
            await clearCart();

            // Pega os parâmetros de busca da URL atual
            var search = window.location.search;

            // Remove o '?' inicial se existir
            if (search.startsWith('?')) {
                search = search.substring(1);
            }

            // Monta a URL final
            var finalUrl = checkoutUrlBase;

            // Adiciona os parâmetros de busca se existirem
            if (search) {
                finalUrl += `?${search}`;
            }

            // Validação final antes de redirecionar
            if (!isValidCheckoutUrl(finalUrl)) {
                console.error('URL final falhou na validação:', finalUrl);
                throw new Error('URL final inválida - não será redirecionado');
            }

            console.log('Redirecionando para:', finalUrl);
            window.location.href = finalUrl;
        } catch (error) {
            console.error('Erro ao navegar para checkout:', error);
            hideSecureLoader();
            alert('Erro ao processar o checkout. Por favor, tente novamente.');
        }
    }

    async function addToCart(formSerialize) {
        console.log("formSerialize: ", formSerialize)

        try {
            var response = await ckPostAjax("/cart/add.js", formSerialize);

            if (!response) {
                throw new Error('Resposta vazia ao adicionar ao carrinho');
            }

            console.log("addCart response: ", response)

            var payload;
            try {
                payload = JSON.parse(response);
            } catch (e) {
                console.error('Erro ao fazer parse da resposta:', e);
                hideSecureLoader();
                throw new Error('Resposta inválida do servidor');
            }

            if (!payload) {
                throw new Error('Payload vazio após adicionar ao carrinho');
            }

            return payload;
        } catch (error) {
            console.error('Erro ao adicionar ao carrinho:', error);
            hideSecureLoader();
            throw error;
        }
    }

    async function getCart() {
        var response = await ckGetAjax('/cart.json');
        var cartPayload = JSON.parse(response);
        return cartPayload;
    }

    async function clearCart() {
        await ckPostAjax("/cart/clear.js");
    }

    function isValidCheckoutUrl(url) {
        if (!url || typeof url !== 'string') {
            console.error('URL inválida: não é uma string válida');
            return false;
        }

        // Verifica se contém "erro-dominio"
        if (url.includes('erro-dominio')) {
            console.error('URL inválida: contém erro-dominio');
            return false;
        }

        // Verifica se é uma URL válida
        try {
            const urlObj = new URL(url);

            // Lista de subdomínios válidos
            const validSubdomains = [
                'pay',
                'checkout',
                'pagamento',
                'payment',
                'seguro',
                'secure',
                'comprar',
                'compra',
                'buy',
                'shop',
                'loja',
                'store',
                'pedido',
                'order'
            ];

            // Verifica se o hostname começa com um dos subdomínios válidos
            if (!urlObj.hostname) {
                console.error('URL inválida: hostname não encontrado');
                return false;
            }

            // Verifica se o hostname começa com algum dos subdomínios válidos seguido de ponto
            const hostnameContainsValidSubdomain = validSubdomains.some(validSub =>
                urlObj.hostname.startsWith(validSub + '.')
            );

            if (!hostnameContainsValidSubdomain) {
                console.error('URL inválida: domínio não contém um subdomínio válido. Hostname:', urlObj.hostname);
                return false;
            }

            // Verifica se o pathname contém um ID válido (não "erro-dominio")
            const pathParts = urlObj.pathname.split('/');
            const checkoutId = pathParts[pathParts.length - 1];

            if (!checkoutId || checkoutId === 'erro-dominio' || checkoutId.length < 10) {
                console.error('URL inválida: ID de checkout inválido:', checkoutId);
                return false;
            }

            return true;
        } catch (e) {
            console.error('URL inválida: erro ao parsear URL:', e);
            return false;
        }
    }

    async function createCheckout(cart) {
        console.log("shopUUID: ", shopUUID)

        try {
            const response = await fetch(`https://apiv3.usecorvex.com.br/stores/shopify/checkout`, {
                body: JSON.stringify({ cart, storeId: shopUUID }),
                method: "post",
                headers: {
                    'Content-type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Resposta da API não OK:', response.status, errorText);
                throw new Error('Falha ao criar checkout: ' + response.status);
            }

            const data = await response.json();
            console.log('Resposta da API:', data);

            // Valida se o checkoutUrl existe
            if (!data.checkoutUrl || typeof data.checkoutUrl !== 'string') {
                console.error('CheckoutUrl inválido na resposta:', data);
                throw new Error('CheckoutUrl inválido na resposta da API');
            }

            // Validação rigorosa da URL
            if (!isValidCheckoutUrl(data.checkoutUrl)) {
                console.error('URL de checkout inválida recebida:', data.checkoutUrl);
                throw new Error('URL de checkout inválida retornada pela API');
            }

            console.log('URL de checkout válida:', data.checkoutUrl);
            return {
                checkoutUrl: data.checkoutUrl
            };
        } catch (error) {
            console.error('Erro ao criar checkout:', error);
            hideSecureLoader();
            throw error;
        }
    }

    // Função para processar botões de checkout (carrinho e drawer)
    function processCheckoutButtons() {
        // Seletores para botões de checkout no carrinho
        var checkoutSelectors = [
            "[name=checkout]",
            "button[name='checkout']",
            "input[name='checkout']",
            ".cart__checkout-button",
            ".cart__checkout",
            "a.cart__checkout-button",
            "a[href='/checkout']",
            "button.checkout-button",
            ".checkout-button",
            ".cart-drawer__checkout-button"
        ];

        var submitBtns = document.querySelectorAll(checkoutSelectors.join(", "));
        var processedCount = 0;

        submitBtns.forEach(submitBtn => {
            // Marca para evitar processamento duplicado
            if (submitBtn.dataset.corvexCheckoutProcessed) {
                return;
            }
            submitBtn.dataset.corvexCheckoutProcessed = 'true';
            processedCount++;

            // Se for um link, previne o comportamento padrão
            if (submitBtn.tagName === 'A') {
                submitBtn.href = 'javascript:void(0);';
            }

            // Se for input ou button com type submit, muda para button
            if (submitBtn.type === 'submit') {
                submitBtn.type = "button";
            }

            submitBtn.style.userSelect = "none";

            submitBtn.addEventListener("click", async function (event) {
                console.log('Botão de checkout clicado:', submitBtn);
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                if (isLoadingSecureCheckout) {
                    console.log('Já está processando checkout, ignorando clique');
                    return;
                }

                console.log('Iniciando processo de checkout...');
                showSecureLoader();
                navigateToCheckout();
            }, { capture: true, passive: false });
        });

        if (processedCount > 0) {
            console.log('Corvex: ' + processedCount + ' novos botões de checkout processados');
        }
    }

    if (shopTemplateName === "cart") {
        // Processa botões iniciais
        processCheckoutButtons();
    }

    // Observer para cart drawer e elementos dinâmicos (funciona em qualquer página)
    if (!window.corvexCartDrawerObserver) {
        console.log('Corvex: Iniciando observador de cart drawer');

        window.corvexCartDrawerObserver = new MutationObserver(function (mutations) {
            var shouldProcessCheckout = false;

            mutations.forEach(function (mutation) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1) { // Element node
                            // Verifica se é um drawer de carrinho ou contém botões de checkout
                            if (node.matches && (
                                node.matches('.cart-drawer') ||
                                node.matches('.cart__checkout-button') ||
                                node.matches('[class*="cart"]') ||
                                node.querySelector('.cart__checkout-button') ||
                                node.querySelector('.cart-drawer') ||
                                node.querySelector('[name="checkout"]')
                            )) {
                                shouldProcessCheckout = true;
                                console.log('Corvex: Drawer/carrinho detectado, processando botões...');
                            }
                        }
                    });
                }

                // Também verifica mudanças de atributos (como quando drawer fica visível)
                if (mutation.type === 'attributes' && mutation.target.nodeType === 1) {
                    var target = mutation.target;
                    if (target.matches && (
                        target.matches('.cart-drawer') ||
                        target.matches('[class*="drawer"]') ||
                        target.matches('[class*="cart"]')
                    )) {
                        // Verifica se o drawer ficou visível
                        var isVisible = target.style.display !== 'none' &&
                            target.style.visibility !== 'hidden' &&
                            !target.classList.contains('hidden');

                        if (isVisible) {
                            shouldProcessCheckout = true;
                            console.log('Corvex: Drawer ficou visível, processando botões...');
                        }
                    }
                }
            });

            if (shouldProcessCheckout) {
                setTimeout(function () {
                    processCheckoutButtons();
                }, 100);
            }
        });

        // Inicia observação no body inteiro
        window.corvexCartDrawerObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }

    if ((shopTemplateName === "product" || shopTemplateName === "index") && checkoutSkipCart) {
        insertClickListenerToButtons();

        // Observa mudanças no DOM para capturar botões adicionados dinamicamente
        // Verifica se já existe um observer para evitar redeclaração
        if (!window.corvexObserver) {
            window.corvexObserver = new MutationObserver(function (mutations) {
                var shouldRetry = false;
                mutations.forEach(function (mutation) {
                    if (mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach(function (node) {
                            if (node.nodeType === 1) { // Element node
                                // Verifica se o nó adicionado é um botão ou contém botões
                                if (node.matches && (
                                    node.matches('button.product-form__add-button') ||
                                    node.matches('button[data-action="add-to-cart"]') ||
                                    node.matches('button[data-essential-cart-element="add-to-cart-button"]') ||
                                    node.matches('button#stickyatc') ||
                                    node.querySelector('button.product-form__add-button') ||
                                    node.querySelector('button[data-action="add-to-cart"]') ||
                                    node.querySelector('button[data-essential-cart-element="add-to-cart-button"]') ||
                                    node.querySelector('button#stickyatc')
                                )) {
                                    shouldRetry = true;
                                }
                            }
                        });
                    }
                });
                if (shouldRetry) {
                    console.log('Novos botões detectados, tentando adicionar listeners...');
                    setTimeout(function () {
                        insertClickListenerToButtons();
                    }, 100);
                }
            });

            // Inicia observação
            window.corvexObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    function preventFormSubmit() {
        // Previne submit padrão de formulários de adicionar ao carrinho
        var forms = document.querySelectorAll('form[action="/cart/add"]');
        forms.forEach(function (form) {
            if (!form.dataset.corvexProcessed) {
                form.dataset.corvexProcessed = 'true';
                form.addEventListener('submit', function (event) {
                    console.log('Submit do formulário prevenido');
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                }, true);
            }
        });
    }

    function insertClickListenerToButtons() {
        // Previne submits de formulários primeiro
        preventFormSubmit();

        var sellButtons = [
            `button.button--addToCart`,
            `button.ProductForm__AddToCart`,
            `button.product-form__add-button`,
            `button#add-to-cart`,
            `button.add-to-cart-btn`,
            `button.add-to-cart`,
            `button.button-buy`,
            `button#buttonBuy`,
            `button#AddToCartText`,
            `button#AddToCart`,
            `input[name="add"]`,
            `button[name=\'add\']`,
            `button.single_add_to_cart_button`,
            `button.buttonBuyNow`,
            `.product-form__add-button`,
            `button[data-action=add-to-cart]`,
            `button[data-essential-cart-element="add-to-cart-button"]`,
            `button.essential-preorder-extra-add-to-cart-button`,
            `button#stickyatc`,
            `button#StickyAddToCart`,
            `button.shopify-payment-button`,
            `button.btn_checkout`,
        ];

        var buttonsString = sellButtons.join(", ");

        var addCartBtns = document.querySelectorAll(buttonsString);

        if (!addCartBtns || !addCartBtns.length) {
            timeoutAndRetryInsertingClickListeners()
            return
        } else {
            console.log("addCartBtns encontrados: ", addCartBtns.length)
        }

        if (addCartBtns && addCartBtns.length > 0) {
            addCartBtns.forEach(btn => {
                // Marca o botão para evitar processamento duplicado
                if (btn.dataset.corvexProcessed) {
                    console.log('Botão já processado, pulando:', btn);
                    return; // Já foi processado
                }
                btn.dataset.corvexProcessed = 'true';

                // Remove href ou action que possam causar redirecionamento
                if (btn.tagName === 'A' && btn.href) {
                    btn.href = 'javascript:void(0);';
                }
                if (btn.type === 'submit') {
                    btn.type = 'button';
                }

                // Remove qualquer atributo onclick que possa interferir
                if (btn.onclick) {
                    btn.onclick = null;
                }
                if (btn.getAttribute('onclick')) {
                    btn.removeAttribute('onclick');
                }

                console.log('Adicionando listener ao botão:', btn);

                // Salva referência do botão para usar dentro da função async
                var buttonRef = btn;

                // Função handler do clique
                var clickHandler = async function (event) {
                    console.log('Evento de clique capturado no botão!', event, buttonRef);

                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    console.log('Botão clicado, iniciando processo de checkout');

                    if (isLoadingSecureCheckout) {
                        console.log('Já está processando checkout, ignorando clique');
                        return;
                    }

                    showSecureLoader();

                    // Aguarda um pouco para garantir que jQuery está disponível
                    var form = null;
                    var maxRetries = 10;
                    var retryCount = 0;

                    // Verifica se o botão tem atributo 'form' que referencia um formulário externo
                    var formId = buttonRef.getAttribute('form');
                    if (formId) {
                        var formByAttribute = document.getElementById(formId);
                        if (formByAttribute && formByAttribute.tagName === 'FORM') {
                            // Verifica se é um formulário de adicionar ao carrinho (action ou seletor)
                            var isCartForm = (formByAttribute.action && formByAttribute.action.includes('/cart/add')) ||
                                formByAttribute.querySelector('[name="id"], [name*="id"]');
                            if (isCartForm) {
                                form = formByAttribute;
                                console.log("Formulário encontrado via atributo 'form':", formId);
                            }
                        }
                    }

                    // Se não encontrou pelo atributo form, busca usando métodos tradicionais
                    while (!form && retryCount < maxRetries) {
                        if (typeof $ !== 'undefined' && $) {
                            var form_count = $('form[action="/cart/add"]').length;
                            if (typeof form_count != 'undefined' && form_count <= 1) {
                                form = $('form[action="/cart/add"]');
                                console.log("form 1 encontrado")
                            } else {
                                form = $(buttonRef).closest('form[action="/cart/add"]');
                                if (!form.length) {
                                    form = $(buttonRef).parents('form[action="/cart/add"]');
                                }
                                // Se ainda não encontrou e tem formId, tenta buscar pelo ID
                                if (!form.length && formId) {
                                    form = $('#' + formId);
                                }
                                console.log("form 2 encontrado")
                            }
                        } else {
                            // Se jQuery não estiver disponível, usa querySelector
                            var formElement = buttonRef.closest('form[action="/cart/add"]');
                            if (!formElement) {
                                formElement = document.querySelector('form[action="/cart/add"]');
                            }
                            // Se ainda não encontrou e tem formId, tenta buscar pelo ID
                            if (!formElement && formId) {
                                formElement = document.getElementById(formId);
                            }
                            if (formElement) {
                                form = formElement;
                                console.log("form encontrado via querySelector")
                            }
                        }

                        if (!form || (typeof $ !== 'undefined' && $ && form && !form.length)) {
                            retryCount++;
                            await new Promise(resolve => setTimeout(resolve, 100));
                        } else {
                            break;
                        }
                    }

                    // Converte para jQuery se necessário e se jQuery estiver disponível
                    if (form && typeof $ !== 'undefined' && $ && !form.jquery && form.tagName === 'FORM') {
                        form = $(form);
                        console.log("Formulário convertido para jQuery");
                    }

                    if (!form) {
                        console.error('Formulário não encontrado');
                        hideSecureLoader();
                        alert('Erro: formulário não encontrado. Por favor, tente novamente.');
                        return;
                    }

                    try {
                        // Serializa o form
                        var formData;
                        if (typeof $ !== 'undefined' && $) {
                            // Se form já é um objeto jQuery, usa diretamente, senão converte
                            if (form.jquery) {
                                formData = $(form).serialize();
                            } else {
                                formData = $(form).serialize();
                            }
                        } else {
                            // Serialização manual se jQuery não estiver disponível
                            var formDataObj = new FormData(form);
                            var params = new URLSearchParams();
                            for (var pair of formDataObj.entries()) {
                                params.append(pair[0], pair[1]);
                            }
                            formData = params.toString();
                        }

                        // Valida se formData não está vazio
                        if (!formData || formData.trim() === '') {
                            console.error('Formulário serializado está vazio');
                            hideSecureLoader();
                            alert('Erro: dados do formulário inválidos. Por favor, tente novamente.');
                            return;
                        }

                        console.log('Dados serializados do formulário:', formData);
                        await addToCart(formData);
                        await navigateToCheckout();
                    } catch (error) {
                        console.error('Erro ao processar checkout:', error);
                        hideSecureLoader();
                        alert('Erro ao processar o checkout. Por favor, tente novamente.');
                    }
                };

                // Adiciona listener com capture para executar primeiro (captura na fase de captura)
                btn.addEventListener("click", clickHandler, { capture: true, passive: false });

                // Também adiciona na fase de bubbling como fallback
                btn.addEventListener("click", clickHandler, { capture: false, passive: false });

                console.log('Listeners adicionados ao botão:', btn);
            })
        }
    }

    function timeoutAndRetryInsertingClickListeners() {
        console.log("timeoutAndRetryInsertingClickListeners()")

        setTimeout(() => {
            insertClickListenerToButtons()
        }, 500);
    }

} // Fim da proteção contra execução múltipla