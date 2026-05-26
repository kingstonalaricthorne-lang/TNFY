const router = require('express').Router();
const { stripeWebhook } = require('../controllers/webhook.controller');

// Raw body is required for Stripe signature verification — mounted before json() in app.js
router.post('/stripe', stripeWebhook);

module.exports = router;
