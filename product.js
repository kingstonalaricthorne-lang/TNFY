// ─────────────────────────────────────────────────────────────────────────────
// Product Detail Page — fetches /api/products/:slug and binds the existing
// DOM to real backend data. Variants drive the size + colour selectors;
// ATC posts to /api/cart/items via the shared API client.
// ─────────────────────────────────────────────────────────────────────────────

const api = window.api;

// ── Scroll shadow ─────────────────────────────────────────────────────────────
const siteHeader = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  siteHeader.classList.toggle('scrolled', window.scrollY > 4);
}, { passive: true });

// ── State (populated from API) ────────────────────────────────────────────────
let PRODUCT = null;          // raw product from backend
let COLOURS = [];            // [{color, colorHex}, ...] unique
let SIZES = [];              // [size, ...] unique, in catalogue order
let currentColour = null;    // selected colour string
let selectedSize = null;     // selected size string
let currentImgIdx = 0;
let images = [];             // [{url, altText, isPrimary, sortOrder}]
let isWishlisted = false;

// ── Helpers ───────────────────────────────────────────────────────────────────
function $(sel) { return document.querySelector(sel); }

function getSlugFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return p.get('slug') || p.get('id') || null;
}

function findVariant(color, size) {
  if (!PRODUCT?.variants) return null;
  return PRODUCT.variants.find(v =>
    (v.color || null) === (color || null) &&
    (v.size  || null) === (size  || null)
  );
}

function availableSizesForColour(color) {
  if (!PRODUCT?.variants) return new Set();
  return new Set(
    PRODUCT.variants
      .filter(v => (v.color || null) === (color || null) && v.stockQty > 0)
      .map(v => v.size || null)
  );
}

// ── Render: hero / title / breadcrumb / price ─────────────────────────────────
function renderHeader(p) {
  document.title = `${p.name} — TNYF`;
  const titleEl = $('.pdp-title');
  const catEl   = $('.pdp-category');
  if (titleEl) titleEl.textContent = p.name;
  if (catEl)   catEl.textContent = p.category?.name || '';

  // Breadcrumb
  const bc = document.querySelector('.breadcrumb-inner');
  if (bc && p.category) {
    bc.innerHTML = `
      <a href="index.html">home</a>
      <span>/</span>
      <a href="shop.html">${(p.category.name || '').toLowerCase()}</a>
      <span>/</span>
      <span>${p.name}</span>
    `;
  }

  // Price
  const priceRow = $('.pdp-price-row');
  if (priceRow) {
    if (p.salePrice != null) {
      priceRow.innerHTML = `
        <span class="pdp-price">$${Number(p.salePrice).toFixed(2)}</span>
        <span class="price-original" style="margin-left:12px;text-decoration:line-through;color:#999;font-size:16px;">$${Number(p.basePrice).toFixed(2)}</span>
        <span class="sale-badge" style="position:static;margin-left:12px;">-${Math.round((1 - p.salePrice / p.basePrice) * 100)}%</span>
      `;
    } else {
      priceRow.innerHTML = `<span class="pdp-price">$${Number(p.basePrice).toFixed(2)}</span>`;
    }
  }

  // Description
  const descAccordion = document.querySelector('.accordion-item.open .accordion-body p');
  if (descAccordion) descAccordion.textContent = p.description || 'No description available.';
}

// ── Render: gallery ──────────────────────────────────────────────────────────
function renderGallery() {
  const mainImg = document.getElementById('mainImg');
  const thumbs = document.querySelectorAll('.thumb');
  const galleryThumbs = document.querySelector('.gallery-thumbs');
  const counter = document.querySelector('.gallery-counter');
  const imgCurrent = document.getElementById('imgCurrent');

  if (!mainImg) return;

  if (images.length === 0) {
    // Fallback: solid colour swatch background
    mainImg.style.background = '#eee';
    mainImg.style.backgroundSize = 'cover';
    mainImg.style.backgroundPosition = 'center';
    if (galleryThumbs) galleryThumbs.innerHTML = '';
    if (counter) counter.innerHTML = '<span id="imgCurrent">1</span> / 1';
    return;
  }

  // Replace thumbs with one per image
  if (galleryThumbs) {
    galleryThumbs.innerHTML = images.map((img, i) =>
      `<div class="thumb${i === 0 ? ' active' : ''}" data-idx="${i}" style="background:url('${img.url}') center/cover;"></div>`
    ).join('');
    galleryThumbs.querySelectorAll('.thumb').forEach(t =>
      t.addEventListener('click', () => setGalleryImg(parseInt(t.dataset.idx, 10)))
    );
  }

  const imgTotal = document.getElementById('imgTotal');
  if (imgTotal) imgTotal.textContent = images.length;
  setGalleryImg(0);
}

function setGalleryImg(idx) {
  const mainImg = document.getElementById('mainImg');
  const imgCurrent = document.getElementById('imgCurrent');
  if (!mainImg || images.length === 0) return;
  currentImgIdx = (idx + images.length) % images.length;
  mainImg.style.transition = 'opacity 0.2s';
  mainImg.style.opacity = 0;
  setTimeout(() => {
    mainImg.style.background = `url('${images[currentImgIdx].url}') center/cover, #eee`;
    mainImg.style.opacity = 1;
  }, 80);
  document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === currentImgIdx));
  if (imgCurrent) imgCurrent.textContent = currentImgIdx + 1;

  // Sync lightbox if open
  const lb = document.getElementById('lightbox');
  if (lb?.classList.contains('open')) setLightboxImg(currentImgIdx);
}

// ── Lightbox ────────────────────────────────────────────────────────────────
function setLightboxImg(idx) {
  if (images.length === 0) return;
  currentImgIdx = (idx + images.length) % images.length;
  const lbImg = document.getElementById('lightboxImg');
  const lbCur = document.getElementById('lightboxCurrent');
  const lbTot = document.getElementById('lightboxTotal');
  if (lbImg) lbImg.style.background = `url('${images[currentImgIdx].url}') center/contain no-repeat, #111`;
  if (lbCur) lbCur.textContent = currentImgIdx + 1;
  if (lbTot) lbTot.textContent = images.length;
  // Also keep the inline gallery in sync
  setGalleryImg(currentImgIdx);
}

function openLightbox() {
  if (images.length === 0) return;
  setLightboxImg(currentImgIdx);
  document.getElementById('lightbox')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox')?.classList.remove('open');
  document.body.style.overflow = '';
}

function bindLightbox() {
  document.getElementById('galleryZoom')?.addEventListener('click', openLightbox);
  document.getElementById('mainImg')?.addEventListener('click', openLightbox);
  document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev')?.addEventListener('click', () => setLightboxImg(currentImgIdx - 1));
  document.getElementById('lightboxNext')?.addEventListener('click', () => setLightboxImg(currentImgIdx + 1));

  // Click outside the image closes
  document.getElementById('lightbox')?.addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') closeLightbox();
  });

  // Keyboard: ESC closes, ← → navigates
  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('lightbox');
    if (!lb?.classList.contains('open')) return;
    if (e.key === 'Escape')    closeLightbox();
    if (e.key === 'ArrowLeft')  setLightboxImg(currentImgIdx - 1);
    if (e.key === 'ArrowRight') setLightboxImg(currentImgIdx + 1);
  });
}

// ── Render: colour swatches ──────────────────────────────────────────────────
function renderColours() {
  const wrap = document.querySelector('.colour-swatches');
  const label = document.getElementById('colourLabel');
  if (!wrap) return;

  if (COLOURS.length === 0) {
    wrap.style.display = 'none';
    if (label) label.parentElement.style.display = 'none';
    return;
  }

  wrap.innerHTML = COLOURS.map((c, i) => `
    <button class="swatch${i === 0 ? ' active' : ''}"
            data-colour="${c.color}"
            aria-label="${c.color}"
            style="background:${c.colorHex || '#ccc'};border:1px solid #ddd;"></button>
  `).join('');

  currentColour = COLOURS[0].color;
  if (label) label.textContent = currentColour;

  wrap.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      wrap.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      currentColour = sw.dataset.colour;
      if (label) label.textContent = currentColour;
      renderSizes(); // re-render to reflect availability per colour
    });
  });
}

// ── Render: size buttons (in stock per current colour) ──────────────────────
function renderSizes() {
  const grid = document.querySelector('.size-grid');
  const label = document.getElementById('sizeLabel');
  if (!grid) return;

  if (SIZES.length === 0) {
    grid.style.display = 'none';
    if (label) label.parentElement.style.display = 'none';
    return;
  }

  const inStock = availableSizesForColour(currentColour);

  grid.innerHTML = SIZES.map(size => {
    const ok = inStock.has(size);
    return `<button class="size-btn${ok ? '' : ' sold-out'}" data-size="${size}"${ok ? '' : ' disabled'}>${size}</button>`;
  }).join('');

  selectedSize = null;
  if (label) label.textContent = '—';

  grid.querySelectorAll('.size-btn:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedSize = btn.dataset.size;
      if (label) label.textContent = selectedSize;
      const err = document.getElementById('sizeError');
      if (err) err.classList.remove('visible');
    });
  });
}

// ── Cart drawer (re-rendered from backend) ───────────────────────────────────
async function refreshCart() {
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');
  const subtotalEl = document.getElementById('cartSubtotal');
  const countEl = document.querySelector('.cart-count');

  try {
    const r = await api.cart();
    const cart = r.data;
    const items = cart?.items || [];

    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    if (countEl) countEl.textContent = totalItems;

    if (items.length === 0) {
      if (body) body.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
      if (footer) footer.style.display = 'none';
      return;
    }

    let subtotal = 0;
    if (body) {
      body.innerHTML = items.map(item => {
        const p = item.variant?.product || {};
        const unit = Number(p.salePrice ?? p.basePrice ?? 0);
        const total = unit * item.quantity;
        subtotal += total;
        const img = p.images?.[0]?.url;
        const imgStyle = img ? `style="background:url('${img}') center/cover;"` : '';
        return `
          <div class="cart-item">
            <div class="cart-item-img" ${imgStyle}></div>
            <div>
              <p class="cart-item-name">${p.name || ''}</p>
              <p class="cart-item-meta">${item.variant?.color || ''}${item.variant?.size ? ' / ' + item.variant.size : ''}</p>
              <div class="cart-item-qty">
                <button class="qty-btn" data-id="${item.id}" data-action="dec">−</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" data-id="${item.id}" data-action="inc">+</button>
              </div>
            </div>
            <span class="cart-item-price">$${total.toFixed(2)}</span>
          </div>`;
      }).join('');

      body.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const item = items.find(i => i.id === id);
          if (!item) return;
          const newQty = btn.dataset.action === 'inc' ? item.quantity + 1 : item.quantity - 1;
          try {
            if (newQty <= 0) await api.cartRemove(id);
            else await api.cartUpdate(id, newQty);
            await refreshCart();
          } catch (e) { console.error(e); }
        });
      });
    }

    if (footer) footer.style.display = 'block';
    if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2);
  } catch (e) {
    console.error('Failed to load cart:', e);
  }
}

// ── ATC button ───────────────────────────────────────────────────────────────
function bindAtc() {
  const atcBtn = document.getElementById('atcBtn');
  const sizeError = document.getElementById('sizeError');
  if (!atcBtn) return;

  atcBtn.addEventListener('click', async () => {
    // Size required when sizes exist
    if (SIZES.length > 0 && !selectedSize) {
      if (sizeError) sizeError.classList.add('visible');
      document.querySelector('.size-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const variant = findVariant(currentColour, selectedSize);
    if (!variant) {
      alert('That size + colour combination is not in stock.');
      return;
    }

    const orig = atcBtn.textContent;
    atcBtn.disabled = true;
    try {
      await api.cartAdd(variant.id, 1);
      atcBtn.textContent = '✓ added to bag';
      atcBtn.style.background = '#333';
      await refreshCart();
      openCart();
    } catch (e) {
      console.error(e);
      atcBtn.textContent = 'error — try again';
    } finally {
      setTimeout(() => {
        atcBtn.textContent = orig;
        atcBtn.style.background = '';
        atcBtn.disabled = false;
      }, 1400);
    }
  });
}

// ── Wishlist (requires auth — silently no-op for guests) ─────────────────────
function bindWishlist() {
  const btn = document.getElementById('wishlistBtn');
  const icon = document.getElementById('wishlistIcon');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!api.isLoggedIn()) {
      alert('Please log in to save items to your wishlist.');
      return;
    }
    try {
      const r = await api.toggleWishlist(PRODUCT.id);
      isWishlisted = !!r.data?.wishlisted;
      icon.textContent = isWishlisted ? '♥' : '♡';
      btn.style.borderColor = isWishlisted ? '#000' : '';
    } catch (e) {
      console.error(e);
    }
  });
}

// ── Cart drawer open/close ───────────────────────────────────────────────────
const cartDrawer  = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');

function openCart() {
  cartDrawer?.classList.add('open');
  cartOverlay?.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  cartDrawer?.classList.remove('open');
  cartOverlay?.classList.remove('visible');
  document.body.style.overflow = '';
}
document.getElementById('cartClose')?.addEventListener('click', closeCart);
cartOverlay?.addEventListener('click', closeCart);
document.querySelector('[aria-label="Bag"]')?.addEventListener('click', (e) => {
  e.preventDefault();
  openCart();
  refreshCart();
});

// ── Accordion ────────────────────────────────────────────────────────────────
document.querySelectorAll('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.accordion-item');
    const isOpen = item.classList.contains('open');
    const icon = trigger.querySelector('.accordion-icon');
    item.classList.toggle('open', !isOpen);
    icon.textContent = isOpen ? '+' : '−';
  });
});

// ── You may also like — fetch a few featured / newest products ──────────────
async function renderRelated() {
  const grid = document.querySelector('.related-section .product-grid');
  if (!grid) return;
  try {
    const r = await api.products({ limit: 4, sort: 'newest' });
    const items = (r.items || []).filter(p => p.id !== PRODUCT?.id).slice(0, 4);
    if (items.length === 0) { grid.innerHTML = ''; return; }
    grid.innerHTML = items.map(p => {
      const eff = p.salePrice ?? p.basePrice;
      const priceHtml = p.salePrice != null
        ? `<span class="price-original">$${Number(p.basePrice).toFixed(2)}</span><span class="price-sale">$${Number(p.salePrice).toFixed(2)}</span>`
        : `$${Number(eff).toFixed(2)}`;
      const badge = p.salePrice != null
        ? `<span class="sale-badge">-${Math.round((1 - p.salePrice / p.basePrice) * 100)}%</span>`
        : '';
      const img = p.images?.[0]?.url;
      const imgStyle = img ? `style="background:url('${img}') center/cover;"` : '';
      return `
        <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="product-card" style="text-decoration:none;color:inherit;">
          <div class="product-img-wrap">
            <div class="product-img" ${imgStyle}></div>
            ${badge}
          </div>
          <div class="product-info">
            <p class="product-name">${p.name}</p>
            <p class="product-price">${priceHtml}</p>
          </div>
        </a>`;
    }).join('');
  } catch (e) {
    console.error('Failed to load related products:', e);
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
  const slug = getSlugFromUrl();
  const titleEl = document.querySelector('.pdp-title');
  if (titleEl) titleEl.textContent = 'Loading…';

  if (!slug) {
    if (titleEl) titleEl.textContent = 'No product specified';
    return;
  }

  try {
    const r = await api.product(slug);
    PRODUCT = r.data;
  } catch (e) {
    console.error(e);
    if (titleEl) titleEl.textContent = 'Product not found';
    return;
  }

  // Derive unique colours and sizes from variants
  const colourMap = new Map();
  for (const v of PRODUCT.variants || []) {
    if (v.color && !colourMap.has(v.color)) {
      colourMap.set(v.color, { color: v.color, colorHex: v.colorHex });
    }
  }
  COLOURS = [...colourMap.values()];
  SIZES = [...new Set((PRODUCT.variants || []).map(v => v.size).filter(Boolean))];

  images = (PRODUCT.images || []).slice().sort((a, b) => (b.isPrimary - a.isPrimary) || (a.sortOrder - b.sortOrder));

  renderHeader(PRODUCT);
  renderGallery();
  renderColours();
  renderSizes();
  bindAtc();
  bindWishlist();

  // Header arrow buttons for gallery
  document.querySelector('.gallery-prev')?.addEventListener('click', (e) => { e.stopPropagation(); setGalleryImg(currentImgIdx - 1); });
  document.querySelector('.gallery-next')?.addEventListener('click', (e) => { e.stopPropagation(); setGalleryImg(currentImgIdx + 1); });
  bindLightbox();

  await refreshCart();
  renderRelated();
})();
