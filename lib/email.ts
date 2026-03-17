import { Resend } from "resend";

// RESEND_API_KEY sourced from env only — never hardcoded
const resend = new Resend(process.env.RESEND_API_KEY);

export interface OrderEmailData {
  id: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  total: number;
  tax_amount?: number;
  tax_rate?: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  shipping_address: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

export async function sendOrderConfirmation(order: OrderEmailData): Promise<void> {
  // Validate all required fields before sending — never send a partial email
  if (
    !order.customer_email ||
    !order.id ||
    !order.customer_name ||
    !Array.isArray(order.items) ||
    order.items.length === 0
  ) {
    throw new Error("sendOrderConfirmation: missing required order fields");
  }

  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const firstName = order.customer_name.split(" ")[0] || order.customer_name;
  const orderDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const taxAmount = order.tax_amount ?? 0;
  const shipping = order.total - order.subtotal - taxAmount;

  const itemRows = order.items
    .map(
      (item, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#faf8f5"}">
      <td style="padding:12px 16px;border-bottom:1px solid #ede8e1;color:#1c1c1c;font-size:14px">${item.name}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #ede8e1;text-align:center;color:#555;font-size:14px">${item.quantity}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #ede8e1;text-align:right;color:#1c1c1c;font-size:14px">$${(item.price).toFixed(2)}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #ede8e1;text-align:right;color:#1c1c1c;font-size:14px;font-weight:500">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ece6;font-family:Georgia,'Times New Roman',serif">

  <div style="max-width:600px;margin:40px auto;background:#faf8f5;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10)">

    <!-- Header -->
    <div style="background:#1c1c1c;padding:32px;text-align:center">
      <p style="margin:0 0 6px;color:#8b6914;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif">Order Confirmed</p>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:normal;letter-spacing:1px">Amazing Home Furniture</h1>
    </div>

    <!-- Body -->
    <div style="padding:40px 36px">

      <p style="margin:0 0 6px;color:#1c1c1c;font-size:20px;font-family:Georgia,serif">Thank you for your order, ${firstName}!</p>
      <p style="margin:0 0 4px;color:#555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6">Order <strong style="color:#1c1c1c">#${orderNumber}</strong> &nbsp;·&nbsp; ${orderDate}</p>
      <p style="margin:0 0 32px;color:#555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6">
        We've received your order and it's being prepared. Your order will be delivered within <strong style="color:#1c1c1c">5–7 business days</strong>.
      </p>

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
        <thead>
          <tr style="background:#f0ece6">
            <th style="padding:10px 16px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#666;font-weight:normal;font-family:Arial,sans-serif">Item</th>
            <th style="padding:10px 16px;text-align:center;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#666;font-weight:normal;font-family:Arial,sans-serif">Qty</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#666;font-weight:normal;font-family:Arial,sans-serif">Unit</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#666;font-weight:normal;font-family:Arial,sans-serif">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- Totals -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
        <tr>
          <td style="padding:8px 16px;color:#555;font-size:14px;font-family:Arial,sans-serif">Subtotal</td>
          <td style="padding:8px 16px;text-align:right;color:#1c1c1c;font-size:14px;font-family:Arial,sans-serif">$${order.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px 16px;color:#555;font-size:14px;font-family:Arial,sans-serif">Shipping</td>
          <td style="padding:8px 16px;text-align:right;color:#1c1c1c;font-size:14px;font-family:Arial,sans-serif">${shipping === 0 ? "FREE" : "$" + shipping.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px 16px;color:#555;font-size:14px;font-family:Arial,sans-serif">Illinois Sales Tax (10.25%)</td>
          <td style="padding:8px 16px;text-align:right;color:#1c1c1c;font-size:14px;font-family:Arial,sans-serif">$${taxAmount.toFixed(2)}</td>
        </tr>
        <tr style="border-top:2px solid #1c1c1c">
          <td style="padding:12px 16px;color:#1c1c1c;font-size:16px;font-weight:bold;font-family:Arial,sans-serif">Order Total</td>
          <td style="padding:12px 16px;text-align:right;color:#1c1c1c;font-size:16px;font-weight:bold;font-family:Arial,sans-serif">$${order.total.toFixed(2)}</td>
        </tr>
      </table>

      <!-- Shipping address -->
      <div style="background:#f0ece6;border-radius:6px;padding:20px 24px;margin-bottom:32px">
        <p style="margin:0 0 10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b6914;font-weight:bold;font-family:Arial,sans-serif">Shipping To</p>
        <p style="margin:0;color:#1c1c1c;font-size:14px;line-height:1.8;font-family:Arial,sans-serif">
          ${order.customer_name}<br>
          ${order.shipping_address.address}<br>
          ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.zip}
        </p>
      </div>

      <!-- Delivery note -->
      <div style="border-left:3px solid #8b6914;padding:12px 20px;margin-bottom:32px;background:#fffdf8">
        <p style="margin:0;color:#555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6">
          Your order will be delivered within <strong style="color:#1c1c1c">5–7 business days</strong>.
          You'll receive a shipping confirmation email with tracking details once it dispatches.
        </p>
      </div>

      <p style="margin:0;color:#555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6">
        Questions about your order? Contact us at
        <a href="mailto:support@amazinghomefurniturestore.com" style="color:#8b6914;text-decoration:none">support@amazinghomefurniturestore.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#1c1c1c;padding:24px 36px;text-align:center">
      <p style="margin:0 0 6px;color:#888;font-size:12px;font-family:Arial,sans-serif">Free shipping on orders over $299</p>
      <p style="margin:0 0 6px">
        <a href="https://amazinghomefurniturestore.com" style="color:#8b6914;font-size:12px;text-decoration:none;font-family:Arial,sans-serif">amazinghomefurniturestore.com</a>
      </p>
      <p style="margin:0;color:#666;font-size:11px;font-family:Arial,sans-serif">
        Amazing Home Furniture &nbsp;·&nbsp; You received this because you placed an order
      </p>
    </div>

  </div>
</body>
</html>`;

  await resend.emails.send({
    from: "Amazing Home Furniture <orders@amazinghomefurniturestore.com>",
    to: order.customer_email,
    subject: `Your Amazing Furniture order is confirmed 🛋️ (#${orderNumber})`,
    html,
  });
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ece6;font-family:Georgia,'Times New Roman',serif">

  <div style="max-width:600px;margin:40px auto;background:#faf8f5;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10)">

    <!-- Header -->
    <div style="background:#1c1c1c;padding:32px;text-align:center">
      <p style="margin:0 0 6px;color:#8b6914;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif">Welcome</p>
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:normal;letter-spacing:1px">Amazing Home Furniture</h1>
    </div>

    <!-- Body -->
    <div style="padding:40px 36px">

      <p style="margin:0 0 16px;color:#1c1c1c;font-size:20px;font-family:Georgia,serif">You&rsquo;re on the list.</p>
      <p style="margin:0 0 24px;color:#555;font-size:14px;font-family:Arial,sans-serif;line-height:1.7">
        Thank you for subscribing to Amazing Home Furniture. We&rsquo;re glad to have you.
        Here&rsquo;s what you can look forward to:
      </p>

      <div style="background:#f0ece6;border-radius:6px;padding:24px;margin-bottom:28px">
        <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b6914;font-weight:bold;font-family:Arial,sans-serif">What to expect</p>
        <ul style="margin:0;padding:0 0 0 18px;color:#1c1c1c;font-size:14px;font-family:Arial,sans-serif;line-height:2">
          <li>Exclusive subscriber-only deals and early sale access</li>
          <li>New arrival announcements before they sell out</li>
          <li>Design inspiration and room styling ideas</li>
          <li>Seasonal collections and curated picks</li>
        </ul>
      </div>

      <div style="border-left:3px solid #8b6914;padding:12px 20px;margin-bottom:32px;background:#fffdf8">
        <p style="margin:0;color:#555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6">
          We keep our emails infrequent and genuinely useful &mdash; no noise, just the good stuff.
        </p>
      </div>

      <p style="margin:0 0 8px;color:#555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6">
        In the meantime, browse our latest collection:
      </p>
      <a href="https://www.amazinghomefurniturestore.com/collections/all"
         style="display:inline-block;background:#8b6914;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:4px;font-size:14px;font-family:Arial,sans-serif;font-weight:500;margin-bottom:32px">
        Shop Now
      </a>

      <p style="margin:0;color:#999;font-size:12px;font-family:Arial,sans-serif;line-height:1.6">
        You received this because you subscribed at amazinghomefurniturestore.com.
        To unsubscribe, reply to this email with &ldquo;unsubscribe&rdquo; in the subject line.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#1c1c1c;padding:24px 36px;text-align:center">
      <p style="margin:0 0 6px;color:#888;font-size:12px;font-family:Arial,sans-serif">Free shipping on orders over $299</p>
      <p style="margin:0">
        <a href="https://www.amazinghomefurniturestore.com" style="color:#8b6914;font-size:12px;text-decoration:none;font-family:Arial,sans-serif">amazinghomefurniturestore.com</a>
      </p>
    </div>

  </div>
</body>
</html>`;

  await resend.emails.send({
    from: "Amazing Home Furniture <orders@amazinghomefurniturestore.com>",
    to: email,
    subject: "Welcome to Amazing Furniture \u2014 you're on the list \u2728",
    html,
  });
}
