const { constructWebhookEvent } = require('../services/stripe.service');
const OrderModel = require('../models/Order');

async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = constructWebhookEvent(req.body, sig);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await OrderModel.update(orderId, {
            status: 'confirmed',
            paymentStatus: 'paid',
            stripePiId: session.payment_intent,
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const orderId = intent.metadata?.orderId;
        if (orderId) {
          await OrderModel.update(orderId, { paymentStatus: 'failed' });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const orderId = charge.metadata?.orderId;
        if (orderId) {
          await OrderModel.update(orderId, {
            status: 'refunded',
            paymentStatus: 'refunded',
          });
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

module.exports = { stripeWebhook };
