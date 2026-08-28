// Galeria + seleção de variantes da página de produto
(function () {
  const data = window.__YB_PRODUCT__;
  if (!data) return;

  const fmt = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

  // --- Galeria ---
  const mainImg = document.getElementById('yb-main-image');
  const thumbs = document.querySelectorAll('.yb-gallery__thumb');
  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      if (mainImg) mainImg.src = thumb.dataset.src;
      thumbs.forEach(t => t.classList.remove('is-active'));
      thumb.classList.add('is-active');
    });
  });

  // --- Variantes ---
  const selectors = Array.from(document.querySelectorAll('.yb-option-selector'));
  const variantInput = document.getElementById('yb-variant-id');
  const priceEl = document.getElementById('yb-current-price');
  const compareEl = document.getElementById('yb-compare-price');
  const discountEl = document.getElementById('yb-discount');
  const installmentEl = document.getElementById('yb-installment');

  function selectedOptions() {
    const chosen = {};
    selectors.forEach((input) => {
      if (input.checked) chosen[input.dataset.optionPosition] = input.value;
    });
    return chosen;
  }

  function findVariant(chosen) {
    return data.variants.find((v) =>
      ['1', '2', '3'].every((pos) => {
        const opt = v['option' + pos];
        return opt == null || opt === chosen[pos];
      })
    ) || data.variants[0];
  }

  function updateUI(variant) {
    if (variantInput) variantInput.value = variant.id;
    const price = variant.price;
    const compare = variant.compareAtPrice;

    if (priceEl) priceEl.textContent = fmt(price);
    if (compareEl) {
      if (compare && compare > price) {
        compareEl.textContent = fmt(compare);
        compareEl.style.display = '';
      } else {
        compareEl.style.display = 'none';
      }
    }
    if (discountEl) {
      if (compare && compare > price) {
        discountEl.textContent = '-' + Math.round((1 - price / compare) * 100) + '%';
        discountEl.style.display = 'block';
      } else {
        discountEl.style.display = 'none';
      }
    }
    if (installmentEl) installmentEl.innerHTML = 'ou até <strong>12x</strong> de <strong>' + fmt(price / 12) + '</strong>';

    if (variant.image && mainImg) {
      mainImg.src = variant.image;
      thumbs.forEach(t => t.classList.toggle('is-active', t.dataset.src === variant.image));
    }

    selectors.forEach((input) => {
      const label = document.getElementById('yb-selected-' + input.dataset.optionPosition);
      if (input.checked && label) label.textContent = input.value;
    });
  }

  selectors.forEach((input) => {
    input.addEventListener('change', () => updateUI(findVariant(selectedOptions())));
  });

  // Pré-selecionar variante da URL (?variant=ID)
  const params = new URLSearchParams(window.location.search);
  const urlVariant = params.get('variant');
  let initial = data.variants[0];
  if (urlVariant) {
    const found = data.variants.find(v => String(v.id) === String(urlVariant));
    if (found) initial = found;
  }

  // Marcar radios da variante inicial
  ['1', '2', '3'].forEach((pos) => {
    const val = initial['option' + pos];
    if (val == null) return;
    const radio = selectors.find(i => i.dataset.optionPosition === pos && i.value === val);
    if (radio) radio.checked = true;
  });

  updateUI(initial);
})();
