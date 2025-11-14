import { readFileSync, writeFileSync } from 'fs';

// Load config
const config = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n').filter(l => l).map(l => l.split('='))
);

// Rivo API call
const rivoAPI = async (endpoint) => {
  const res = await fetch(`https://developer-api.rivo.io/merchant_api/v1/${endpoint}`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': config.RIVO_API_KEY 
    }
  });
  return res.json();
};

// Main export
(async () => {
  try {
    // Get all customers with points from Rivo
    const response = await rivoAPI('customers');
    const customers = response.customers || response.data || [];
    
    // Generate CSV
    const csv = [
      'customer_email,customer_name,points_balance,last_updated',
      ...customers.map(c => 
        `${c.email},${c.first_name || ''} ${c.last_name || ''},${c.points_balance || 0},${new Date().toISOString()}`
      )
    ].join('\n');

    writeFileSync('pos_export.csv', csv);
    console.log(`✓ Exported ${customers.length} customers to pos_export.csv`);

  } catch (err) {
    console.error('Error:', err.message);
  }
})();

