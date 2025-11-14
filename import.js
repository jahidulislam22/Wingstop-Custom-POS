import { readFileSync, writeFileSync } from 'fs';

// Load config
const config = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter(l => l).map(l => l.split('='))
);

// Parse CSV (simple parser)
const parseCSV = (text) => {
  const [header, ...rows] = text.trim().split('\n').map(r => r.split(','));
  return rows.map(row => Object.fromEntries(header.map((h, i) => [h.trim(), row[i]?.trim()])));
};

// Shopify API call
const shopifyAPI = async (endpoint, data) => {
  const res = await fetch(`https://${config.SHOPIFY_STORE}/admin/api/2024-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.SHOPIFY_ACCESS_TOKEN
    },
    body: JSON.stringify({ query: endpoint, variables: data })
  });
  return res.json();
};

// Rivo API call
const rivoAPI = async (endpoint, method, data) => {
  const res = await fetch(`https://developer-api.rivo.io/merchant_api/v1/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': config.RIVO_API_KEY
    },
    body: data ? JSON.stringify(data) : undefined
  });
  return res.json();
};

// Main import
(async () => {
  try {
    const orders = parseCSV(readFileSync('pos_orders.csv', 'utf8'));
    const results = [];

    for (const order of orders) {
      console.log(`Processing order ${order.order_id} for ${order.customer_email}...`);

      // 1. Create Shopify order
      const mutation = `
        mutation draftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder { id }
          }
        }
      `;

      const shopifyRes = await shopifyAPI(mutation, {
        input: {
          email: order.customer_email,
          lineItems: [{ title: order.product, quantity: parseInt(order.quantity), price: order.price }],
          billingAddress: { firstName: order.customer_name.split(' ')[0], lastName: order.customer_name.split(' ')[1] || '' }
        }
      });

      // 2. Sync points to Rivo (create points event)
      const rivoRes = await rivoAPI('points_events', 'POST', {
        customer_identifier: order.customer_email,
        points: parseInt(order.points_earned),
        reason: `POS Order ${order.order_id}`
      });

      results.push({ order_id: order.order_id, status: 'success', points_added: order.points_earned });
      console.log(`✓ Order ${order.order_id} imported. Points: ${order.points_earned}`);
    }

    // Save results
    writeFileSync('import_results.json', JSON.stringify(results, null, 2));
    console.log('\n✓ Import complete! Results saved to import_results.json');

  } catch (err) {
    console.error('Error:', err.message);
  }
})();

