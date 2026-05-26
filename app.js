// ── Hero Slider ──
(function () {
  const slider  = document.getElementById('heroSlider');
  if (!slider) return;

  const slides  = slider.querySelectorAll('.slide');
  const dots    = slider.querySelectorAll('.dot');
  const total   = slides.length;
  let current   = 0;
  let timer;

  function goTo(n) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (n + total) % total;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    slider.dataset.current = current;
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 5000);
  }

  document.getElementById('sliderPrev').addEventListener('click', () => { goTo(current - 1); startTimer(); });
  document.getElementById('sliderNext').addEventListener('click', () => { goTo(current + 1); startTimer(); });
  dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.dot); startTimer(); }));

  slider.dataset.current = 0;
  startTimer();
})();

// Scroll shadow
const siteHeader = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  siteHeader.classList.toggle('scrolled', window.scrollY > 4);
}, { passive: true });

// ── SecondSkin scroll carousel ──
(function () {
  const wrap   = document.getElementById('ssTrackWrap');
  const track  = document.getElementById('ssTrack');
  const dots   = document.querySelectorAll('.ss-dot');
  if (!wrap || !track) return;

  const panels = track.querySelectorAll('.ss-panel');

  function activeDot(idx) {
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  // Scroll → update dots
  wrap.addEventListener('scroll', () => {
    const scrollLeft  = wrap.scrollLeft;
    const panelWidth  = panels[0].offsetWidth;
    const idx         = Math.round(scrollLeft / panelWidth);
    activeDot(Math.min(idx, panels.length - 1));
  }, { passive: true });

  // Dot click → scroll to panel
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = +dot.dataset.idx;
      wrap.scrollTo({ left: panels[idx].offsetLeft, behavior: 'smooth' });
    });
  });

  // Panel click → scroll to next
  panels.forEach((panel, i) => {
    panel.addEventListener('click', () => {
      const next = panels[i + 1];
      if (next) wrap.scrollTo({ left: next.offsetLeft, behavior: 'smooth' });
    });
  });
})();

// ── Discount Zone ──
(function () {
  const grid    = document.getElementById('dzGrid');
  const filters = document.querySelectorAll('.dz-filter');
  const copyBtn = document.getElementById('copyCodeBtn');
  if (!grid) return;

  const DZ = {
    all:         [
      { name: 'Pleated Midi Dress',         cat: 'dresses',     price: '$31.50', orig: '$63.00',  disc: '-50%', bg: 'dark',  sw: 'bwg' },
      { name: 'Oversized Graphic Tee',      cat: 'tops',        price: '$18.00', orig: '$36.00',  disc: '-50%', bg: 'light', sw: 'bw'  },
      { name: 'Wide-Leg Tailored Trouser',  cat: 'trousers',    price: '$34.00', orig: '$68.00',  disc: '-50%', bg: 'dark',  sw: 'bg'  },
      { name: 'Linen Co-Ord Set',           cat: 'co-ords',     price: '$47.00', orig: '$94.00',  disc: '-50%', bg: 'light', sw: 'wg'  },
      { name: 'Structured Blazer',          cat: 'jackets',     price: '$52.00', orig: '$104.00', disc: '-50%', bg: 'dark',  sw: 'bw'  },
      { name: 'Mini Chain Bag',             cat: 'accessories', price: '$22.50', orig: '$45.00',  disc: '-50%', bg: 'light', sw: 'bg'  },
      { name: 'Platform Chelsea Boots',     cat: 'shoes',       price: '$44.00', orig: '$88.00',  disc: '-50%', bg: 'dark',  sw: 'bwg' },
      { name: 'Ruched Satin Dress',         cat: 'dresses',     price: '$39.00', orig: '$78.00',  disc: '-50%', bg: 'light', sw: 'bw'  },
      { name: 'Cropped Knit Tank',          cat: 'tops',        price: '$16.50', orig: '$33.00',  disc: '-50%', bg: 'dark',  sw: 'wg'  },
      { name: 'Slim Straight Jeans',        cat: 'trousers',    price: '$41.00', orig: '$82.00',  disc: '-50%', bg: 'light', sw: 'bg'  },
    ],
    dresses:     [
      { name: 'Pleated Midi Dress',         price: '$31.50', orig: '$63.00',  disc: '-50%', bg: 'dark',  sw: 'bwg' },
      { name: 'Ruched Satin Dress',         price: '$39.00', orig: '$78.00',  disc: '-50%', bg: 'light', sw: 'bw'  },
      { name: 'Asymmetric Hem Dress',       price: '$27.00', orig: '$54.00',  disc: '-50%', bg: 'dark',  sw: 'bg'  },
      { name: 'Slip Maxi Dress',            price: '$35.50', orig: '$71.00',  disc: '-50%', bg: 'light', sw: 'wg'  },
      { name: 'Off-Shoulder Midi',          price: '$44.00', orig: '$88.00',  disc: '-50%', bg: 'dark',  sw: 'bw'  },
    ],
    tops:        [
      { name: 'Oversized Graphic Tee',      price: '$18.00', orig: '$36.00',  disc: '-50%', bg: 'light', sw: 'bw'  },
      { name: 'Cropped Knit Tank',          price: '$16.50', orig: '$33.00',  disc: '-50%', bg: 'dark',  sw: 'wg'  },
      { name: 'Ribbed Long Sleeve',         price: '$22.00', orig: '$44.00',  disc: '-50%', bg: 'light', sw: 'bwg' },
      { name: 'Button-Up Linen Shirt',      price: '$28.00', orig: '$56.00',  disc: '-50%', bg: 'dark',  sw: 'bw'  },
      { name: 'Corset-Style Top',           price: '$19.50', orig: '$39.00',  disc: '-50%', bg: 'light', sw: 'bg'  },
    ],
    trousers:    [
      { name: 'Wide-Leg Tailored Trouser',  price: '$34.00', orig: '$68.00',  disc: '-50%', bg: 'dark',  sw: 'bg'  },
      { name: 'Slim Straight Jeans',        price: '$41.00', orig: '$82.00',  disc: '-50%', bg: 'light', sw: 'bw'  },
      { name: 'Pleated Satin Trousers',     price: '$37.50', orig: '$75.00',  disc: '-50%', bg: 'dark',  sw: 'wg'  },
      { name: 'Cargo Combat Trousers',      price: '$43.00', orig: '$86.00',  disc: '-50%', bg: 'light', sw: 'bg'  },
      { name: 'Knit Jogger',                price: '$24.00', orig: '$48.00',  disc: '-50%', bg: 'dark',  sw: 'bwg' },
    ],
    'co-ords':   [
      { name: 'Linen Co-Ord Set',           price: '$47.00', orig: '$94.00',  disc: '-50%', bg: 'light', sw: 'wg'  },
      { name: 'Satin Blazer Set',           price: '$54.00', orig: '$108.00', disc: '-50%', bg: 'dark',  sw: 'bw'  },
      { name: 'Knit Two-Piece',             price: '$38.00', orig: '$76.00',  disc: '-50%', bg: 'light', sw: 'bg'  },
      { name: 'Tailored Trouser Set',       price: '$62.00', orig: '$124.00', disc: '-50%', bg: 'dark',  sw: 'bwg' },
      { name: 'Ribbed Lounge Set',          price: '$32.00', orig: '$64.00',  disc: '-50%', bg: 'light', sw: 'bw'  },
    ],
    jackets:     [
      { name: 'Structured Blazer',          price: '$52.00', orig: '$104.00', disc: '-50%', bg: 'dark',  sw: 'bw'  },
      { name: 'Oversized Coach Jacket',     price: '$48.50', orig: '$97.00',  disc: '-50%', bg: 'light', sw: 'bg'  },
      { name: 'Leather-Look Biker Jacket',  price: '$67.00', orig: '$134.00', disc: '-50%', bg: 'dark',  sw: 'bwg' },
      { name: 'Cropped Puffer Jacket',      price: '$55.00', orig: '$110.00', disc: '-50%', bg: 'light', sw: 'bw'  },
      { name: 'Utility Trench Coat',        price: '$72.00', orig: '$144.00', disc: '-50%', bg: 'dark',  sw: 'bg'  },
    ],
    accessories: [
      { name: 'Mini Chain Bag',             price: '$22.50', orig: '$45.00',  disc: '-50%', bg: 'light', sw: 'bg'  },
      { name: 'Wide-Brim Bucket Hat',       price: '$17.00', orig: '$34.00',  disc: '-50%', bg: 'dark',  sw: 'bwg' },
      { name: 'Tortoise Hoop Earrings',     price: '$12.00', orig: '$24.00',  disc: '-50%', bg: 'light', sw: 'bw'  },
      { name: 'Knot-Detail Belt Bag',       price: '$28.50', orig: '$57.00',  disc: '-50%', bg: 'dark',  sw: 'bg'  },
      { name: 'Oversized Sunglasses',       price: '$14.00', orig: '$28.00',  disc: '-50%', bg: 'light', sw: 'wg'  },
    ],
    shoes:       [
      { name: 'Platform Chelsea Boots',     price: '$44.00', orig: '$88.00',  disc: '-50%', bg: 'dark',  sw: 'bwg' },
      { name: 'Square-Toe Mules',           price: '$31.00', orig: '$62.00',  disc: '-50%', bg: 'light', sw: 'bw'  },
      { name: 'Chunky Sneakers',            price: '$38.50', orig: '$77.00',  disc: '-50%', bg: 'dark',  sw: 'bg'  },
      { name: 'Block-Heel Sandals',         price: '$27.00', orig: '$54.00',  disc: '-50%', bg: 'light', sw: 'wg'  },
      { name: 'Pointed-Toe Kitten Heels',   price: '$42.00', orig: '$84.00',  disc: '-50%', bg: 'dark',  sw: 'bw'  },
    ],
  };

  const SWATCHES = { bwg: ['sd-black','sd-white','sd-grey'], bw: ['sd-black','sd-white'], bg: ['sd-black','sd-grey'], wg: ['sd-white','sd-grey'] };

  function dzCard(p) {
    const sw = SWATCHES[p.sw].map(s => `<span class="swatch-dot ${s}"></span>`).join('');
    return `
      <div class="tcard">
        <div class="tcard-img-wrap">
          <div class="tcard-img ${p.bg}"></div>
          <button class="tcard-wishlist" aria-label="Wishlist">♡</button>
        </div>
        <p class="tcard-brand">TNYF</p>
        <p class="tcard-name">${p.name}</p>
        <div class="tcard-pricing">
          <span class="tcard-price">${p.price}</span>
          <span class="tcard-original">${p.orig}</span>
          <span class="tcard-discount">${p.disc}</span>
        </div>
        <div class="tcard-swatches">${sw}</div>
      </div>`;
  }

  function renderDZ(key) {
    grid.innerHTML = (DZ[key] || DZ.all).map(dzCard).join('');
    grid.querySelectorAll('.tcard-wishlist').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const w = btn.classList.toggle('wished');
        btn.textContent = w ? '♥' : '♡';
      });
    });
    grid.querySelectorAll('.tcard').forEach(card => {
      card.addEventListener('click', () => { window.location.href = 'product.html'; });
    });
  }

  filters.forEach(f => {
    f.addEventListener('click', () => {
      filters.forEach(x => x.classList.remove('active'));
      f.classList.add('active');
      renderDZ(f.dataset.dz);
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('EXTRA10').catch(() => {});
      copyBtn.textContent = '✓ COPIED!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'COPY CODE';
        copyBtn.classList.remove('copied');
      }, 2000);
    });
  }

  renderDZ('all');
})();

// ── Trending Now ──
(function () {
  const grid = document.getElementById('trendingGrid');
  const tabs = document.querySelectorAll('.trend-tab');
  if (!grid) return;

  const SWATCHES = {
    bwg: ['sd-black', 'sd-white', 'sd-grey'],
    bw:  ['sd-black', 'sd-white'],
    bg:  ['sd-black', 'sd-grey'],
    wg:  ['sd-white', 'sd-grey'],
  };

  const PRODUCTS = {
    'new-in': [
      { brand: 'TNYF', name: 'Tailored Midi Blazer Dress',  price: '$43.50', orig: '$87.00', disc: '-50%', bg: 'dark',  sw: 'bwg' },
      { brand: 'TNYF', name: 'Plisse Pleated Midi Dress',   price: '$34.00', orig: '$68.00', disc: '-50%', bg: 'light', sw: 'bw' },
      { brand: 'TNYF', name: 'Open-Back Maxi Dress',        price: '$52.00', orig: '$89.00', disc: '-42%', bg: 'dark',  sw: 'bg' },
      { brand: 'TNYF', name: 'Wrap Front Mini Dress',       price: '$27.50', orig: '$55.00', disc: '-50%', bg: 'light', sw: 'bwg' },
      { brand: 'TNYF', name: 'Linen Shirt Dress',           price: '$44.00', orig: '$88.00', disc: '-50%', bg: 'dark',  sw: 'wg' },
    ],
    'vacation': [
      { brand: 'TNYF', name: 'Flowy Halter Beach Dress',    price: '$29.00', orig: '$58.00', disc: '-50%', bg: 'light', sw: 'bwg' },
      { brand: 'TNYF', name: 'Resort Linen Co-ord',         price: '$48.00', orig: '$96.00', disc: '-50%', bg: 'dark',  sw: 'wg' },
      { brand: 'TNYF', name: 'Crochet Cover-Up',            price: '$31.50', orig: '$63.00', disc: '-50%', bg: 'light', sw: 'bw' },
      { brand: 'TNYF', name: 'Printed Wrap Skirt',          price: '$22.00', orig: '$44.00', disc: '-50%', bg: 'dark',  sw: 'bg' },
      { brand: 'TNYF', name: 'Strappy Maxi Dress',          price: '$38.00', orig: '$76.00', disc: '-50%', bg: 'light', sw: 'bwg' },
    ],
    'mens': [
      { brand: 'TNYF', name: 'Tailored Wide-Leg Trousers',  price: '$49.00', orig: '$98.00', disc: '-50%', bg: 'dark',  sw: 'bg' },
      { brand: 'TNYF', name: 'Oversized Oxford Shirt',      price: '$33.50', orig: '$67.00', disc: '-50%', bg: 'light', sw: 'bw' },
      { brand: 'TNYF', name: 'Smart-Casual Linen Set',      price: '$62.00', orig: '$110.00', disc: '-44%', bg: 'dark', sw: 'wg' },
      { brand: 'TNYF', name: 'Relaxed Pleated Chinos',      price: '$41.00', orig: '$82.00', disc: '-50%', bg: 'light', sw: 'bg' },
      { brand: 'TNYF', name: 'Unstructured Blazer',         price: '$57.50', orig: '$115.00', disc: '-50%', bg: 'dark', sw: 'bwg' },
    ],
    'sets': [
      { brand: 'TNYF', name: 'Satin Bias Co-ord Set',       price: '$54.00', orig: '$108.00', disc: '-50%', bg: 'dark',  sw: 'bwg' },
      { brand: 'TNYF', name: 'Ribbed Matching Set',         price: '$38.00', orig: '$72.00',  disc: '-47%', bg: 'light', sw: 'bg' },
      { brand: 'TNYF', name: 'Linen Two-Piece Set',         price: '$46.00', orig: '$92.00',  disc: '-50%', bg: 'dark',  sw: 'wg' },
      { brand: 'TNYF', name: 'Blazer & Trouser Set',        price: '$68.00', orig: '$136.00', disc: '-50%', bg: 'light', sw: 'bw' },
      { brand: 'TNYF', name: 'Loungewear Matching Set',     price: '$42.00', orig: '$84.00',  disc: '-50%', bg: 'dark',  sw: 'bwg' },
    ],
    'occasion': [
      { brand: 'TNYF', name: 'Sequin Column Midi Dress',    price: '$64.00', orig: '$128.00', disc: '-50%', bg: 'dark',  sw: 'bw' },
      { brand: 'TNYF', name: 'Formal Blazer Dress',         price: '$58.50', orig: '$117.00', disc: '-50%', bg: 'light', sw: 'bwg' },
      { brand: 'TNYF', name: 'Ruched Evening Gown',         price: '$72.00', orig: '$144.00', disc: '-50%', bg: 'dark',  sw: 'bg' },
      { brand: 'TNYF', name: 'Structured Pencil Dress',     price: '$47.00', orig: '$94.00',  disc: '-50%', bg: 'light', sw: 'bw' },
      { brand: 'TNYF', name: 'Statement Asymmetric Maxi',   price: '$59.00', orig: '$118.00', disc: '-50%', bg: 'dark',  sw: 'wg' },
    ],
  };

  function cardHTML(p) {
    const swatches = SWATCHES[p.sw].map(s =>
      `<span class="swatch-dot ${s}"></span>`
    ).join('');
    return `
      <div class="tcard">
        <div class="tcard-img-wrap">
          <div class="tcard-img ${p.bg}"></div>
          <button class="tcard-wishlist" aria-label="Save to wishlist">♡</button>
        </div>
        <p class="tcard-brand">${p.brand}</p>
        <p class="tcard-name">${p.name}</p>
        <div class="tcard-pricing">
          <span class="tcard-price">${p.price}</span>
          <span class="tcard-original">${p.orig}</span>
          <span class="tcard-discount">${p.disc}</span>
        </div>
        <div class="tcard-swatches">${swatches}</div>
      </div>`;
  }

  function renderTab(tabKey) {
    grid.innerHTML = (PRODUCTS[tabKey] || []).map(cardHTML).join('');
    grid.querySelectorAll('.tcard-wishlist').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const wished = btn.classList.toggle('wished');
        btn.textContent = wished ? '♥' : '♡';
      });
    });
    grid.querySelectorAll('.tcard').forEach(card => {
      card.addEventListener('click', () => { window.location.href = 'product.html'; });
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderTab(tab.dataset.tab);
    });
  });

  renderTab('new-in');
})();

// Cart state
let cartCount = 0;

function updateCartCount(n) {
  cartCount += n;
  document.querySelector('.cart-count').textContent = cartCount;
}

// Quick add buttons
document.querySelectorAll('.quick-add').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    updateCartCount(1);
    const original = btn.textContent;
    btn.textContent = '✓ added';
    btn.style.background = '#333';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
    }, 1200);
  });
});

// Newsletter form
const nlForm = document.getElementById('nlForm');
if (nlForm) {
  nlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = nlForm.querySelector('.nl-input');
    const btn   = nlForm.querySelector('.nl-btn');
    if (!input.value.includes('@')) return;
    btn.textContent  = 'SUBSCRIBED ✓';
    btn.style.background = '#333';
    input.value      = '';
    input.placeholder = 'You\'re on the list.';
    btn.disabled     = true;
  });
}
