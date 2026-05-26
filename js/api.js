// ─────────────────────────────────────────────────────────────────────────────
// TNYF Frontend → Backend API client
//
// Same-origin (served from the backend), so cookies (refresh token) are
// automatic. Access tokens (15min, JWT) live in localStorage and are sent on
// every request via the Authorization header. On 401 we try /api/auth/refresh
// once, then replay the original request.
// ─────────────────────────────────────────────────────────────────────────────

(function (window) {
  'use strict';

  const BASE = ''; // same-origin
  const TOKEN_KEY = 'tnyf_access_token';
  const SESSION_KEY = 'tnyf_session_id'; // guest cart session

  // ── Token helpers ──────────────────────────────────────────────────────────
  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));
  const clearToken = () => localStorage.removeItem(TOKEN_KEY);

  // ── Guest session (UUID v4) ────────────────────────────────────────────────
  function getSessionId() {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      );
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  // ── Core fetch with auto-refresh ──────────────────────────────────────────
  let refreshingPromise = null;

  async function request(path, { method = 'GET', body, headers = {}, auth = true, retried = false } = {}) {
    const url = BASE + path;
    const finalHeaders = { 'Content-Type': 'application/json', ...headers };
    const token = getToken();
    if (auth && token) finalHeaders['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      credentials: 'include', // send/receive httpOnly refresh cookie
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // Try one refresh on 401 (token expired)
    if (res.status === 401 && !retried && token) {
      try {
        if (!refreshingPromise) {
          refreshingPromise = fetch(BASE + '/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then((j) => {
              const newToken = j.data?.accessToken;
              if (newToken) setToken(newToken);
              return newToken;
            })
            .catch(() => {
              clearToken();
              return null;
            })
            .finally(() => {
              setTimeout(() => (refreshingPromise = null), 0);
            });
        }
        const newToken = await refreshingPromise;
        if (newToken) return request(path, { method, body, headers, auth, retried: true });
      } catch (_) {
        clearToken();
      }
    }

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const err = new Error(data?.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  // ── Convenience wrappers ──────────────────────────────────────────────────
  const get = (p, opts) => request(p, { ...opts, method: 'GET' });
  const post = (p, body, opts) => request(p, { ...opts, method: 'POST', body });
  const put = (p, body, opts) => request(p, { ...opts, method: 'PUT', body });
  const patch = (p, body, opts) => request(p, { ...opts, method: 'PATCH', body });
  const del = (p, opts) => request(p, { ...opts, method: 'DELETE' });

  // ── Domain helpers ────────────────────────────────────────────────────────
  const qs = (params) => {
    const usp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      if (Array.isArray(v)) v.forEach((x) => usp.append(k, x));
      else usp.append(k, v);
    });
    const s = usp.toString();
    return s ? `?${s}` : '';
  };

  const api = {
    // raw access
    request,
    get,
    post,
    put,
    patch,
    del,

    // session helpers (exposed for cart endpoints)
    getSessionId,
    getToken,
    setToken,
    clearToken,
    isLoggedIn: () => !!getToken(),

    // ── Auth ────────────────────────────────────────────────────────────────
    async login(email, password) {
      const r = await post('/api/auth/login', { email, password }, { auth: false });
      if (r.data?.accessToken) setToken(r.data.accessToken);
      return r.data?.user;
    },
    async register(payload) {
      const r = await post('/api/auth/register', payload, { auth: false });
      if (r.data?.accessToken) setToken(r.data.accessToken);
      return r.data?.user;
    },
    async logout() {
      try {
        await post('/api/auth/logout', {});
      } finally {
        clearToken();
      }
    },
    me: () => get('/api/auth/me'),

    // ── Products ────────────────────────────────────────────────────────────
    products: (params) => get('/api/products' + qs(params)),
    product: (slugOrId) => get('/api/products/' + encodeURIComponent(slugOrId)),
    featured: (params) => get('/api/products/featured' + qs(params)),
    trending: (params) => get('/api/products/trending' + qs(params)),
    newIn: (params) => get('/api/products/new-in' + qs(params)),
    sale: (params) => get('/api/products/sale' + qs(params)),
    discountZone: (params) => get('/api/products/discount-zone' + qs(params)),
    search: (q, params) => get('/api/products/search' + qs({ q, ...params })),

    // ── Catalog ─────────────────────────────────────────────────────────────
    brands: () => get('/api/brands'),
    categories: (gender) => get('/api/categories' + qs({ gender })),

    // ── Cart (works for guest or authenticated) ────────────────────────────
    cart() {
      const opts = api.isLoggedIn() ? {} : null;
      const sid = api.isLoggedIn() ? '' : qs({ sessionId: getSessionId() });
      return get('/api/cart' + sid);
    },
    cartAdd(variantId, quantity = 1) {
      const body = api.isLoggedIn()
        ? { variantId, quantity }
        : { variantId, quantity, sessionId: getSessionId() };
      return post('/api/cart/items', body);
    },
    cartUpdate(itemId, quantity) {
      const body = api.isLoggedIn() ? { quantity } : { quantity, sessionId: getSessionId() };
      return put('/api/cart/items/' + itemId, body);
    },
    cartRemove(itemId) {
      const body = api.isLoggedIn() ? {} : { sessionId: getSessionId() };
      return del('/api/cart/items/' + itemId, { body });
    },
    cartClear() {
      const body = api.isLoggedIn() ? {} : { sessionId: getSessionId() };
      return del('/api/cart', { body });
    },
    cartMerge() {
      return post('/api/cart/merge', { sessionId: getSessionId() });
    },

    // ── Wishlist (auth-only) ────────────────────────────────────────────────
    wishlist: () => get('/api/wishlist'),
    toggleWishlist: (productId) => post('/api/wishlist/' + productId, {}),
  };

  window.api = api;
})(window);
