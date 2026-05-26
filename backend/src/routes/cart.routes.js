const router = require('express').Router();
const { getCart, addItem, updateItem, removeItem, clearCart, mergeCart } = require('../controllers/cart.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

// ─── Cart operations — work for both authenticated users and guest sessions ───
// optionalAuthenticate populates req.user when a valid token is present,
// otherwise the controller falls back to ?sessionId / body.sessionId.
router.use(optionalAuthenticate);

router.get('/', getCart);
router.post('/items', addItem);
router.put('/items/:itemId', updateItem);
router.delete('/items/:itemId', removeItem);
router.delete('/', clearCart);

// ─── Guest-to-user cart merge — strict authentication required ────────────────
router.post('/merge', authenticate, mergeCart);

module.exports = router;
