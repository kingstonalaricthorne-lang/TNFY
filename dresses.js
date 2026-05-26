// ── Scroll shadow ──
const siteHeader = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  siteHeader.classList.toggle('scrolled', window.scrollY > 4);
}, { passive: true });

// ── Product data (fetched from backend) ──────────────────────────────────────
let DRESSES = [];
const PAGE_SIZE = 8;
let shown = 0;

const grid        = document.getElementById('lpGrid');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const shownCount  = document.getElementById('shownCount');

// Map backend product → card data the existing renderer expects.
function normalizeProduct(p) {
  const base = Number(p.basePrice);
  const sale = p.salePrice != null ? Number(p.salePrice) : null;
  const disc = sale != null ? `-${Math.round((1 - sale / base) * 100)}%` : '';
  const colours = [...new Set((p.variants || []).map(v => (v.color || '').toLowerCase()).filter(Boolean))];
  // Map first 3 colour names to existing swatch classes (sd-black, sd-white, sd-grey, etc.)
  const sw = colours.slice(0, 3).map(c => `sd-${c.replace(/\s+/g, '-')}`);
  const img = p.images?.[0]?.url || null;
  return {
    id: p.id,
    slug: p.slug,
    brand: p.brand?.name || 'TNYF',
    name: p.name,
    price: sale != null ? `$${sale.toFixed(2)}` : `$${base.toFixed(2)}`,
    orig: sale != null ? `$${base.toFixed(2)}` : '',
    disc,
    bg: 'light',
    sw,
    img,
  };
}

async function loadDresses() {
  try {
    // Try category=dresses first; fall back to all womens products if no
    // matching category exists.
    let res;
    try {
      res = await window.api.products({ category: 'dresses', limit: 100 });
      if ((res.items || []).length === 0) {
        res = await window.api.products({ gender: 'womens', limit: 100 });
      }
    } catch {
      res = await window.api.products({ gender: 'womens', limit: 100 });
    }
    DRESSES = (res.items || []).map(normalizeProduct);
  } catch (err) {
    console.error('Failed to load dresses:', err);
    DRESSES = [];
  }
}

function cardHTML(p) {
  const sw = (p.sw || []).map(s => `<span class="swatch-dot ${s}"></span>`).join('');
  const imgStyle = p.img ? `style="background:url('${p.img}') center/cover;"` : '';
  return `
    <div class="tcard lp-card" data-slug="${p.slug || ''}">
      <div class="tcard-img-wrap">
        <div class="tcard-img ${p.bg}" ${imgStyle}></div>
        <button class="tcard-wishlist" aria-label="Save to wishlist">♡</button>
      </div>
      <p class="tcard-brand">${p.brand}</p>
      <p class="tcard-name">${p.name}</p>
      <div class="tcard-pricing">
        <span class="tcard-price">${p.price}</span>
        ${p.orig ? `<span class="tcard-original">${p.orig}</span>` : ''}
        ${p.disc ? `<span class="tcard-discount">${p.disc}</span>` : ''}
      </div>
      <div class="tcard-swatches">${sw}</div>
    </div>`;
}

function attachCardEvents(container) {
  container.querySelectorAll('.tcard-wishlist').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const w = btn.classList.toggle('wished');
      btn.textContent = w ? '♥' : '♡';
    });
  });
  container.querySelectorAll('.lp-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('tcard-wishlist')) return;
      const slug = card.dataset.slug;
      window.location.href = slug ? `product.html?slug=${encodeURIComponent(slug)}` : 'product.html';
    });
  });
}

function loadMore() {
  const batch = DRESSES.slice(shown, shown + PAGE_SIZE);
  const frag  = document.createDocumentFragment();
  const tmp   = document.createElement('div');
  tmp.innerHTML = batch.map(cardHTML).join('');
  while (tmp.firstChild) frag.appendChild(tmp.firstChild);
  grid.appendChild(frag);
  attachCardEvents(grid);

  shown += batch.length;
  if (shownCount) shownCount.textContent = shown;

  if (shown >= DRESSES.length) {
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = DRESSES.length === 0 ? 'No products yet' : 'All products loaded';
    }
  }
}

if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMore);

// ── Init ─────────────────────────────────────────────────────────────────────
(async function init() {
  if (grid) grid.innerHTML = '<p style="grid-column:1/-1;padding:48px;text-align:center;color:#888;font-size:13px;">LOADING…</p>';
  await loadDresses();
  if (grid) grid.innerHTML = '';
  shown = 0;
  loadMore();
})();

// ── Filter panels ──
const allPills  = document.querySelectorAll('.fp-pill[data-toggle]');
const allPanels = document.querySelectorAll('.fp-panel');

function closeAll() {
  allPills.forEach(p  => p.classList.remove('open'));
  allPanels.forEach(p => p.classList.remove('open'));
}

allPills.forEach(pill => {
  pill.addEventListener('click', e => {
    e.stopPropagation();
    const key   = pill.dataset.toggle;
    const panel = document.getElementById('panel-' + key);
    const isOpen = panel.classList.contains('open');
    closeAll();
    if (!isOpen) {
      panel.classList.add('open');
      pill.classList.add('open');
    }
  });
});

document.addEventListener('click', closeAll);
allPanels.forEach(p => p.addEventListener('click', e => e.stopPropagation()));

// Clear / Apply buttons
document.querySelectorAll('.fp-clear').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = btn.closest('.fp-panel');
    panel.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    panel.querySelectorAll('.fp-size-btn').forEach(b => b.classList.remove('active'));
  });
});

document.querySelectorAll('.fp-apply').forEach(btn => {
  btn.addEventListener('click', () => {
    const wrap  = btn.closest('.fp-wrap');
    const pill  = wrap.querySelector('.fp-pill');
    const panel = btn.closest('.fp-panel');
    const checked = [...panel.querySelectorAll('input:checked, .fp-size-btn.active')];
    pill.classList.toggle('active-filter', checked.length > 0);
    closeAll();
  });
});

// Size buttons inside panel
document.querySelectorAll('.fp-size-btn').forEach(btn => {
  btn.addEventListener('click', () => btn.classList.toggle('active'));
});

// Sort options
document.querySelectorAll('.fp-sort-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.fp-sort-opt').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    const sortPill = document.querySelector('.fp-sort-pill');
    sortPill.innerHTML = `Sort: ${opt.textContent} <span class="fp-arrow">▾</span>`;
    closeAll();
  });
});
