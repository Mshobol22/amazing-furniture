import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface OrderEmailData {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  shipping_address: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

export async function sendOrderConfirmation(order: OrderEmailData) {
  const orderNumber = order.id.slice(0, 8).toUpperCase();

  const itemRows = order.items
    .map(
      (item, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#faf8f5"}">
      <td style="padding:10px 12px;border-bottom:1px solid #ede8e1">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #ede8e1;text-align:center">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #ede8e1;text-align:right">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f0ece6;font-family:Georgia,serif">
      <div style="max-width:600px;margin:40px auto;background:#faf8f5;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        
        <!-- Header -->
        <div style="background:#1c1c1c;padding:28px 32px;text-align:center">
          <p style="margin:0;color:#8b6914;font-size:13px;letter-spacing:3px;text-transform:uppercase">Order Confirmed</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:normal;letter-spacing:1px">Amazing Home Furniture</h1>
        </div>

        <!-- Body -->
        <div style="padding:36px 32px">
          <p style="margin:0 0 8px;color:#1c1c1c;font-size:18px">Hi ${order.customer_name},</p>
          <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.6">
            Your order <strong style="color:#1c1c1c">#${orderNumber}</strong> has been confirmed and is being prepared. 
            We'll send you another email when it ships.
          </p>

          <!-- Order Table -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <thead>
              <tr style="background:#f0ece6">
                <th style="padding:10px 12px;text-align:left;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#666;font-weight:normal">Item</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#666;font-weight:normal">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#666;font-weight:normal">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr style="background:#faf8f5">
                <td colspan="2" style="padding:12px;font-weight:bold;color:#1c1c1c;border-top:2px solid #1c1c1c">Order Total</td>
                <td style="padding:12px;font-weight:bold;color:#1c1c1c;text-align:right;border-top:2px solid #1c1c1c">$${order.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Shipping Address -->
          <div style="background:#f0ece6;border-radius:6px;padding:16px 20px;margin-bottom:28px">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b6914;font-weight:bold">Shipping To</p>
            <p style="margin:0;color:#1c1c1c;font-size:14px;line-height:1.7">
              ${order.customer_name}<br>
              ${order.shipping_address.address}<br>
              ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.zip}
            </p>
          </div>

          <p style="margin:0;color:#555;font-size:14px;line-height:1.6">
            Questions about your order? Reply to this email or contact us at 
            <a href="mailto:support@amazinghomefurniturestore.com" style="color:#8b6914">support@amazinghomefurniturestore.com</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#1c1c1c;padding:20px 32px;text-align:center">
          <p style="margin:0;color:#888;font-size:12px">Free shipping on orders over $299</p>
          <p style="margin:6px 0 0">
            <a href="https://amazinghomefurniturestore.com" style="color:#8b6914;font-size:12px;text-decoration:none">amazinghomefurniturestore.com</a>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  return resend.emails.send({
    from: "Amazing Home Furniture <orders@amazinghomefurniturestore.com>",
    to: order.customer_email,
    subject: `Order Confirmed — Amazing Home Furniture (#${orderNumber})`,
    html,
  });
}
