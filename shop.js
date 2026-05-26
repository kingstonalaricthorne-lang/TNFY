// Scroll shadow
const siteHeader = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  siteHeader.classList.toggle('scrolled', window.scrollY > 4);
}, { passive: true });

// ── Product Data ──
// Filled in by loadProducts() from /api/products on page load.
let PRODUCTS = [];

// Map a backend product (raw SQL row from /api/products) into the shape this
// page's existing render/filter code expects. Variants are aggregated into
// sizes/colours; effective price uses salePrice when set.
function normalizeProduct(p) {
  const variants = p.variants || []; // /api/products listing doesn't include variants — that's OK
  const sizes  = [...new Set(variants.map(v => v.size).filter(Boolean))];
  const colours = [...new Set(variants.map(v => (v.color || '').toLowerCase()).filter(Boolean))];

  // Map backend category slug to one of the UI's known categories. If unknown,
  // bucket as 'tops' so it still appears.
  const KNOWN = ['tops','bottoms','outerwear','accessories','dresses','sets'];
  const slug = p.category?.slug || '';
  const category = KNOWN.includes(slug) ? slug : (KNOWN.find(k => slug.includes(k)) || 'tops');

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category,
    sizes,
    colours,
    price: Number(p.basePrice),
    sale: p.salePrice != null ? Number(p.salePrice) : null,
    isNew: !!p.isNew,
    imageUrl: p.images?.[0]?.url || null,
  };
}

async function loadProducts() {
  try {
    const res = await window.api.products({ limit: 100 });
    PRODUCTS = (res.items || []).map(normalizeProduct);
  } catch (err) {
    console.error('Failed to load products from /api/products:', err);
    PRODUCTS = [];
  }
}

// ── State ──
let activeFilters = { category: [], size: [], colour: [], price: [], availability: [] };
let activeSort = 'featured';

// ── DOM refs ──
const grid          = document.getElementById('shopGrid');
const resultCount   = document.getElementById('resultCount');
const activeBar     = document.getElementById('activeFiltersBar');
const chipsWrap     = document.getElementById('activeFilterChips');
const filterBadge   = document.getElementById('filterBadge');
const shopEmpty     = document.getElementById('shopEmpty');
const sortSelect    = document.getElementById('sortSelect');
const sidebar       = document.getElementById('shopSidebar');
const filterOverlay = document.getElementById('filterOverlay');

// ── Render product card ──
function productCard(p) {
  const displayPrice = p.sale
    ? `<span class="price-original">$${p.price.toFixed(2)}</span><span class="price-sale">$${p.sale.toFixed(2)}</span>`
    : `$${p.price.toFixed(2)}`;
  const badge = p.sale
    ? `<span class="sale-badge">-${Math.round((1 - p.sale / p.price) * 100)}%</span>`
    : '';
  const imgStyle = p.imageUrl
    ? `style="background-image:url('${p.imageUrl}');background-size:cover;background-position:center;"`
    : '';
  return `
    <div class="product-card" data-id="${p.id}" data-slug="${p.slug || ''}">
      <div class="product-img-wrap">
        <div class="product-img" ${imgStyle}></div>
        ${badge}
        <button class="quick-add">+ quick add</button>
      </div>
      <div class="product-info">
        <p class="product-name">${p.name}</p>
        <p class="product-price">${displayPrice}</p>
      </div>
    </div>`;
}

// ── Filter & sort ──
function getFiltered() {
  let list = [...PRODUCTS];

  if (activeFilters.category.length)
    list = list.filter(p => activeFilters.category.includes(p.category));

  if (activeFilters.size.length)
    list = list.filter(p => activeFilters.size.some(s => p.sizes.includes(s)));

  if (activeFilters.colour.length)
    list = list.filter(p => activeFilters.colour.some(c => p.colours.includes(c)));

  if (activeFilters.price.length) {
    list = list.filter(p => activeFilters.price.some(range => {
      const [lo, hi] = range.split('-').map(Number);
      const eff = p.sale ?? p.price;
      return eff >= lo && eff <= hi;
    }));
  }

  if (activeFilters.availability.includes('sale'))
    list = list.filter(p => p.sale !== null);

  switch (activeSort) {
    case 'newest':     list.sort((a, b) => b.isNew - a.isNew); break;
    case 'price-asc':  list.sort((a, b) => (a.sale ?? a.price) - (b.sale ?? b.price)); break;
    case 'price-desc': list.sort((a, b) => (b.sale ?? b.price) - (a.sale ?? a.price)); break;
    case 'sale':       list.sort((a, b) => (b.sale !== null) - (a.sale !== null)); break;
  }
  return list;
}

// ── Render ──
function render() {
  const filtered = getFiltered();
  resultCount.textContent = filtered.length;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    shopEmpty.style.display = 'block';
  } else {
    shopEmpty.style.display = 'none';
    grid.innerHTML = filtered.map(productCard).join('');
    grid.querySelectorAll('.quick-add').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const orig = btn.textContent;
        btn.textContent = '✓ added';
        btn.style.background = '#333';
        setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 1200);
      });
    });
    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.classList.contains('quick-add')) return;
        const slug = card.dataset.slug;
        window.location.href = slug ? `product.html?slug=${encodeURIComponent(slug)}` : 'product.html';
      });
    });
  }

  renderActiveFilters();
}

// ── Active filter chips ──
const LABEL_MAP = {
  category: { tops: 'Tops', bottoms: 'Bottoms', outerwear: 'Outerwear', accessories: 'Accessories' },
  size: {},
  colour: { black: 'Black', white: 'White', grey: 'Stone Grey' },
  price: { '0-50': 'Under $50', '50-100': '$50–$100', '100-200': '$100–$200' },
  availability: { sale: 'On Sale', instock: 'In Stock' },
};

function renderActiveFilters() {
  const allActive = Object.entries(activeFilters).flatMap(([type, vals]) =>
    vals.map(v => ({ type, value: v }))
  );

  const totalCount = allActive.length;
  filterBadge.textContent = totalCount;
  filterBadge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
  activeBar.style.display = totalCount > 0 ? 'block' : 'none';

  chipsWrap.innerHTML = allActive.map(({ type, value }) => {
    const label = (LABEL_MAP[type] && LABEL_MAP[type][value]) || value.toUpperCase();
    return `<span class="filter-chip">${label}<button class="filter-chip-remove" data-type="${type}" data-value="${value}">✕</button></span>`;
  }).join('');

  chipsWrap.querySelectorAll('.filter-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFilter(btn.dataset.type, btn.dataset.value));
  });
}

function removeFilter(type, value) {
  activeFilters[type] = activeFilters[type].filter(v => v !== value);
  // Uncheck checkbox
  const cb = document.querySelector(`input[data-filter="${type}"][value="${value}"]`);
  if (cb) cb.checked = false;
  // Deactivate size btn
  const sb = document.querySelector(`.size-filter-btn[data-value="${value}"]`);
  if (sb) sb.classList.remove('active');
  render();
}

// ── Filter group toggles ──
document.querySelectorAll('.filter-group-trigger').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
  });
});

// ── Checkbox filters ──
document.querySelectorAll('input[data-filter]').forEach(cb => {
  cb.addEventListener('change', () => {
    const { filter, value } = cb.dataset; // data-filter and data-value? no: value from value attr
    // data-filter is the type, cb.value is the value
    const type = cb.dataset.filter;
    const val = cb.value;
    if (cb.checked) {
      if (!activeFilters[type].includes(val)) activeFilters[type].push(val);
    } else {
      activeFilters[type] = activeFilters[type].filter(v => v !== val);
    }
    render();
  });
});

// ── Size filter buttons ──
document.querySelectorAll('.size-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.value;
    const active = btn.classList.toggle('active');
    if (active) {
      if (!activeFilters.size.includes(val)) activeFilters.size.push(val);
    } else {
      activeFilters.size = activeFilters.size.filter(v => v !== val);
    }
    render();
  });
});

// ── Sort ──
sortSelect.addEventListener('change', () => {
  activeSort = sortSelect.value;
  render();
});

// ── Clear all ──
function clearAll() {
  activeFilters = { category: [], size: [], colour: [], price: [], availability: [] };
  document.querySelectorAll('input[data-filter]').forEach(cb => cb.checked = false);
  document.querySelectorAll('.size-filter-btn').forEach(btn => btn.classList.remove('active'));
  render();
}
document.getElementById('clearAllBtn').addEventListener('click', clearAll);
document.getElementById('emptyReset').addEventListener('click', clearAll);

// ── Mobile sidebar ──
document.getElementById('filterToggleBtn').addEventListener('click', () => {
  sidebar.classList.add('open');
  filterOverlay.classList.add('visible');
});
document.getElementById('sidebarClose').addEventListener('click', () => {
  sidebar.classList.remove('open');
  filterOverlay.classList.remove('visible');
});
filterOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  filterOverlay.classList.remove('visible');
});

// ── Pagination (UI only) ──
document.querySelectorAll('.page-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
    if (!btn.classList.contains('page-next')) btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ── Init ──
(async function init() {
  if (grid) grid.innerHTML = '<p style="grid-column:1/-1;padding:48px;text-align:center;color:#888;font-size:13px;letter-spacing:0.04em;">LOADING PRODUCTS…</p>';
  await loadProducts();
  render();

  if (PRODUCTS.length === 0 && shopEmpty) {
    grid.innerHTML = '';
    shopEmpty.style.display = 'block';
    const heading = shopEmpty.querySelector('h2, p, span');
    if (heading) heading.textContent = 'No products yet. Add some via the admin API.';
  }
})();
