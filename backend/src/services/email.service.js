const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
    text,
  });
}

async function sendVerificationEmail(email, token) {
  const url = `${process.env.API_URL}/api/auth/verify-email/${token}`;
  return sendMail({
    to: email,
    subject: 'Verify your TNYF account',
    html: `
      <h2>Verify your email</h2>
      <p>Click the button below to verify your account. This link expires in 24 hours.</p>
      <a href="${url}" style="display:inline-block;background:#000;color:#fff;padding:12px 28px;text-decoration:none;font-weight:600;">Verify Email</a>
      <p style="margin-top:16px;font-size:12px;color:#888;">If you didn't create a TNYF account, you can ignore this email.</p>
    `,
    text: `Verify your TNYF account: ${url}`,
  });
}

async function sendPasswordResetEmail(email, token) {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  return sendMail({
    to: email,
    subject: 'Reset your TNYF password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${url}" style="display:inline-block;background:#000;color:#fff;padding:12px 28px;text-decoration:none;font-weight:600;">Reset Password</a>
      <p style="margin-top:16px;font-size:12px;color:#888;">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
    `,
    text: `Reset your TNYF password: ${url}`,
  });
}

async function sendWelcomeEmail(user) {
  return sendMail({
    to: user.email,
    subject: 'Welcome to TNYF',
    html: `
      <h1>Welcome, ${user.name}!</h1>
      <p>Thank you for joining TNYF. Start exploring our latest collections.</p>
      <a href="${process.env.CLIENT_URL}/shop" style="display:inline-block;background:#000;color:#fff;padding:12px 28px;text-decoration:none;font-weight:600;">Shop Now</a>
    `,
    text: `Welcome ${user.name}! Visit ${process.env.CLIENT_URL}/shop to start shopping.`,
  });
}

async function sendOrderConfirmation(user, order) {
  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr><td>${i.productName}</td><td>${[i.size, i.color].filter(Boolean).join(' / ') || '—'}</td><td>${i.quantity}</td><td>$${Number(i.unitPrice).toFixed(2)}</td></tr>`
    )
    .join('');

  return sendMail({
    to: user.email,
    subject: `Order Confirmed — #${order.id.slice(0, 8).toUpperCase()}`,
    html: `
      <h2>Your order is confirmed</h2>
      <p>Order ID: <strong>${order.id}</strong></p>
      <table cellpadding="8" style="border-collapse:collapse;width:100%">
        <thead style="background:#f5f5f5"><tr><th align="left">Item</th><th align="left">Variant</th><th>Qty</th><th align="right">Price</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p>Subtotal: $${Number(order.subtotal).toFixed(2)}</p>
      ${Number(order.discountAmount) > 0 ? `<p>Discount: −$${Number(order.discountAmount).toFixed(2)}</p>` : ''}
      <p>Shipping: $${Number(order.shippingFee).toFixed(2)}</p>
      <p><strong>Total: $${Number(order.total).toFixed(2)}</strong></p>
    `,
    text: `Order ${order.id} confirmed. Total: $${Number(order.total).toFixed(2)}`,
  });
}

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOrderConfirmation,
};
