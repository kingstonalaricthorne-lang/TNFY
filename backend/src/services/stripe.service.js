const stripe = require('../config/stripe');

async function createCheckoutSession({ order, successUrl, cancelUrl }) {
  const lineItems = order.items.map((item) => ({
    price_data: {
      currency: 'aud',
      product_data: {
        name: item.productName,
        metadata: {
          variantId: item.variantId || '',
          size: item.size || '',
          color: item.color || '',
        },
      },
      unit_amount: Math.round(Number(item.unitPrice) * 100),
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orderId: order.id },
    payment_intent_data: {
      metadata: { orderId: order.id },
    },
  });

  return session;
}

async function createPaymentIntent(amountCents, metadata = {}) {
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'aud',
    metadata,
    automatic_payment_methods: { enabled: true },
  });
}

function constructWebhookEvent(payload, sig) {
  return stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = { createCheckoutSession, createPaymentIntent, constructWebhookEvent };
