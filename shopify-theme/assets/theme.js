(function () {
  'use strict';

  /* ── Mobile nav toggle ────────────────────────────────── */
  var navToggle = document.querySelector('[data-nav-toggle]');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      document.documentElement.toggleAttribute('data-nav-open');
    });
  }

  /* ── Cart drawer ──────────────────────────────────────── */
  var Cart = (function () {
    var drawer = document.querySelector('[data-cart-drawer]');
    var itemsEl = drawer && drawer.querySelector('[data-cart-items]');
    var footerEl = drawer && drawer.querySelector('[data-cart-footer]');
    var badgeEls = document.querySelectorAll('[data-cart-count]');
    var lineTemplate = drawer && drawer.querySelector('template[data-cart-line-template]');

    function open() { document.documentElement.setAttribute('data-cart-open', ''); }
    function close() { document.documentElement.removeAttribute('data-cart-open'); }

    function updateBadge(count) {
      badgeEls.forEach(function (el) { el.textContent = String(count); });
    }

    function render(cart) {
      if (!drawer) return;
      updateBadge(cart.item_count);
      if (!cart.items.length) {
        itemsEl.innerHTML = '<p class="cart-drawer-empty">Your bag is empty.</p>';
        footerEl.hidden = true;
        return;
      }
      footerEl.hidden = false;
      itemsEl.innerHTML = '';
      cart.items.forEach(function (item) {
        var node = lineTemplate.content.cloneNode(true);
        var root = node.querySelector('[data-line]');
        root.setAttribute('data-key', item.key);
        var img = node.querySelector('[data-line-image]');
        if (item.image) { img.src = item.image; img.alt = item.product_title; }
        else { img.remove(); }
        node.querySelector('[data-line-title]').textContent = item.product_title;
        var variantEl = node.querySelector('[data-line-variant]');
        if (item.variant_title && item.variant_title !== 'Default Title') {
          variantEl.textContent = item.variant_title;
        } else {
          variantEl.remove();
        }
        node.querySelector('[data-line-price]').textContent = formatMoney(item.final_line_price);
        node.querySelector('[data-line-qty]').textContent = item.quantity;
        node.querySelector('[data-line-decrease]').addEventListener('click', function () {
          changeQuantity(item.key, item.quantity - 1);
        });
        node.querySelector('[data-line-increase]').addEventListener('click', function () {
          changeQuantity(item.key, item.quantity + 1);
        });
        node.querySelector('[data-line-remove]').addEventListener('click', function () {
          changeQuantity(item.key, 0);
        });
        itemsEl.appendChild(node);
      });
      var subtotalEl = drawer.querySelector('[data-cart-subtotal]');
      if (subtotalEl) subtotalEl.textContent = formatMoney(cart.items_subtotal_price);
    }

    function formatMoney(cents) {
      var amount = (cents / 100).toFixed(2);
      return (window.Shopify && window.Shopify.currency && window.Shopify.currency.active
        ? amount + ' ' + window.Shopify.currency.active
        : '$' + amount);
    }

    function refresh() {
      return fetch('/cart.js', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (cart) { render(cart); return cart; });
    }

    function add(variantId, quantity) {
      return fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: variantId, quantity: quantity || 1 }] })
      }).then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw e; });
        return refresh();
      });
    }

    function changeQuantity(key, quantity) {
      return fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: quantity })
      }).then(function (r) { return r.json(); }).then(render);
    }

    if (drawer) {
      drawer.querySelector('[data-cart-close]').addEventListener('click', close);
      var overlay = document.querySelector('[data-cart-overlay]');
      if (overlay) overlay.addEventListener('click', close);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
      });
      refresh();
    }

    return { open: open, close: close, add: add, refresh: refresh };
  })();

  /* Bag icon opens the drawer when JS is available; it's a real link to
     /cart otherwise, so cart access still works without JS. */
  document.querySelectorAll('[data-cart-open-trigger]').forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      if (document.querySelector('[data-cart-drawer]')) {
        e.preventDefault();
        Cart.open();
      }
    });
  });

  /* ── Add-to-cart buttons (product cards + product page) ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add-to-cart]');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    var variantId = btn.getAttribute('data-variant-id');
    if (!variantId) return;
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Adding…';
    Cart.add(variantId, 1)
      .then(function () {
        btn.textContent = originalText;
        btn.disabled = false;
        Cart.open();
      })
      .catch(function () {
        btn.textContent = 'Couldn’t add — try again';
        btn.disabled = false;
        setTimeout(function () { btn.textContent = originalText; }, 2000);
      });
  });

  /* ── Product variant (size) picker ───────────────────── */
  document.querySelectorAll('[data-product-form]').forEach(function (form) {
    var variantsJson = form.querySelector('[data-variants-json]');
    if (!variantsJson) return;
    var variants = JSON.parse(variantsJson.textContent);
    var sizeButtons = form.querySelectorAll('[data-size-opt]');
    var addBtn = form.querySelector('[data-add-to-cart]');
    var priceEl = form.querySelector('[data-product-price]');
    var compareEl = form.querySelector('[data-product-compare-price]');

    function formatMoney(cents) {
      return '$' + (cents / 100).toFixed(2);
    }

    function selectVariant(variant) {
      if (!variant) {
        addBtn.disabled = true;
        addBtn.textContent = 'Unavailable';
        return;
      }
      addBtn.setAttribute('data-variant-id', variant.id);
      if (variant.available) {
        addBtn.disabled = false;
        addBtn.textContent = 'Add to Bag';
      } else {
        addBtn.disabled = true;
        addBtn.textContent = 'Sold Out';
      }
      if (priceEl) priceEl.textContent = formatMoney(variant.price);
      if (compareEl) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          compareEl.textContent = formatMoney(variant.compare_at_price);
          compareEl.hidden = false;
        } else {
          compareEl.hidden = true;
        }
      }
    }

    sizeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        sizeButtons.forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        var optionValue = btn.getAttribute('data-size-opt');
        var match = variants.find(function (v) { return v.option_value === optionValue; });
        selectVariant(match);
      });
    });

    var preselected = form.querySelector('[data-size-opt].selected');
    if (preselected) {
      var initial = variants.find(function (v) { return v.option_value === preselected.getAttribute('data-size-opt'); });
      selectVariant(initial);
    }
  });

  /* ── Product gallery thumbnails ───────────────────────── */
  document.querySelectorAll('[data-gallery]').forEach(function (gallery) {
    var mainImg = gallery.querySelector('[data-gallery-main] img');
    gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        if (!mainImg) return;
        var full = thumb.getAttribute('data-full-src');
        if (!full) return;
        mainImg.src = full;
        gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (t) { t.classList.remove('active'); });
        thumb.classList.add('active');
      });
    });
  });

  /* ── Related products (Shopify product recommendations API) ── */
  document.querySelectorAll('[data-related-products]').forEach(function (el) {
    var url = el.getAttribute('data-url');
    if (!url) return;
    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newGrid = doc.querySelector('[data-related-grid]');
        var currentGrid = el.querySelector('[data-related-grid]');
        if (newGrid && currentGrid && newGrid.children.length) {
          currentGrid.innerHTML = newGrid.innerHTML;
        } else {
          el.hidden = true;
        }
      })
      .catch(function () { el.hidden = true; });
  });

  /* ── Shop / collection tag filters (client-side) ─────── */
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var grid = document.querySelector(group.getAttribute('data-filter-group'));
    if (!grid) return;
    var cards = grid.querySelectorAll('[data-tags]');
    var emptyState = grid.parentElement.querySelector('[data-empty-state]');
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      group.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.getAttribute('data-filter');
      var visibleCount = 0;
      cards.forEach(function (card) {
        var tags = (card.getAttribute('data-tags') || '').split(' ');
        var show = filter === 'all' || tags.indexOf(filter) !== -1;
        card.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });
      if (emptyState) emptyState.hidden = visibleCount !== 0;
    });
  });

  /* Newsletter and contact forms use Shopify's native {% form %} POST/redirect
     flow (form.posted_successfully? / form.errors rendered server-side by
     Liquid) rather than fetch — Shopify's customer/contact form endpoints
     redirect back to the page rather than returning JSON, so no JS is
     needed or reliable here. */
})();
