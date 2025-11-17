import express from 'express';
import { readFileSync } from 'fs';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load configuration from process.env with optional .env fallback for local dev.
let fileEnv = {};
try {
  fileEnv = Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split('\n')
      .filter(l => l && !l.startsWith('#'))
      .map(l => l.split('=').map(s => s.trim()))
  );
  console.log('Loaded .env configuration file');
} catch (err) {
  console.log('No .env file found; using environment variables');
}

const config = {
  SHOPIFY_STORE: process.env.SHOPIFY_STORE || fileEnv.SHOPIFY_STORE,
  SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN || fileEnv.SHOPIFY_ACCESS_TOKEN,
  RIVO_API_KEY: process.env.RIVO_API_KEY || fileEnv.RIVO_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY || fileEnv.RESEND_API_KEY,
  RESEND_FROM: process.env.RESEND_FROM || fileEnv.RESEND_FROM,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || fileEnv.EMAIL_FROM_NAME
};

// SMTP removed; using Resend API only

const shopifyAPI = async (query, variables = {}) => {
  try {
    const response = await fetch(
      `https://${config.SHOPIFY_STORE}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': config.SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify({ query, variables })
      }
    );

    const data = await response.json();

    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }

    return data;
  } catch (error) {
    throw new Error(`Shopify API Error: ${error.message}`);
  }
};

const rivoAPI = async (endpoint, method = 'GET', data = null) => {
  try {
    const url = `https://developer-api.rivo.io/merchant_api/v1/${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': config.RIVO_API_KEY
    };
    
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await response.text();
      throw new Error(`API returned non-JSON response (${response.status})`);
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Rivo API Error: ${error.message}`);
  }
};

app.get('/', (req, res) => {
  res.json({
    message: 'Rivo Middleware API',
    version: '1.0.0',
    endpoints: {
      collections: 'GET /collections',
      customers: 'GET /customers',
      rewards: 'GET /rewards',
      points: 'GET /points/:email',
      redeemPoints: 'POST /redeem-points',
      notifyRedemption: 'POST /notify-point-redemption',
      health: 'GET /health'
    }
  });
});

app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    configured: {
      shopify: !!(config.SHOPIFY_STORE && config.SHOPIFY_ACCESS_TOKEN),
      rivo: !!config.RIVO_API_KEY,
      email: !!config.RESEND_API_KEY
    }
  };
  res.status(200).json(healthcheck);
});

// Fallback email sender using Resend HTTP API
async function sendEmailViaResend({ from, to, subject, html, text }) {
  if (!config.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to, subject, html, text })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Resend API Error ${response.status}: ${errText}`);
  }

  return await response.json(); // { id: '...' }
}

app.get('/customers', async (req, res) => {
  try {
    const response = await rivoAPI('customers');
    const customers = response.customers || response.data || response;

    res.json({
      success: true,
      count: Array.isArray(customers) ? customers.length : 0,
      data: customers
    });
  } catch (error) {
    console.error('Error fetching customers:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/points/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const response = await rivoAPI(`customers/${email}`);
    
    res.json({
      success: true,
      customer: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/rewards', async (req, res) => {
  try {
    const response = await rivoAPI('rewards');
    
    res.json({
      success: true,
      count: Array.isArray(response.rewards) ? response.rewards.length : 0,
      rewards: response.rewards || response
    });
  } catch (error) {
    console.error('Error fetching rewards:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/redeem-points', async (req, res) => {
  try {
    const { email, rewardId, rewardName, points, credits } = req.body;

    console.log(`Points redemption: ${email} - Reward ID: ${rewardId}`);

    if (!email || !rewardId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email and rewardId'
      });
    }

    const formData = new URLSearchParams();
    formData.append('customer_identifier', email);
    formData.append('reward_id', rewardId);
    
    if (points) {
      formData.append('points_amount', points);
    }
    if (credits) {
      formData.append('credits_amount', credits);
    }

    const url = 'https://developer-api.rivo.io/merchant_api/v1/points_redemptions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': config.RIVO_API_KEY
      },
      body: formData.toString()
    });

    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const textData = await response.text();
      responseData = { message: textData };
    }

    if (!response.ok) {
      console.error('Redemption failed:', responseData);
      return res.status(response.status).json({
        success: false,
        error: responseData.error || responseData.message || 'Points redemption failed',
        details: responseData
      });
    }

    const redemptionData = responseData.data?.attributes || {};
    const customerData = redemptionData.customer || {};
    const rewardData = redemptionData.reward || {};

    res.json({
      success: true,
      message: 'Points redeemed successfully!',
      redemption: {
        id: redemptionData.id,
        pointsRedeemed: redemptionData.points_amount,
        creditsRedeemed: redemptionData.credits_amount,
        appliedAt: redemptionData.applied_at,
        discountCode: redemptionData.code,
        expiresAt: redemptionData.expires_at,
        usedAt: redemptionData.used_at
      },
      reward: {
        id: rewardData.id,
        name: redemptionData.name || rewardData.name,
        type: rewardData.reward_type,
        value: rewardData.reward_value,
        displayText: rewardData.pretty_display_rewards
      },
      customer: {
        email: customerData.email,
        firstName: customerData.first_name,
        lastName: customerData.last_name,
        pointsRemaining: customerData.points_tally,
        creditsRemaining: customerData.credits_tally,
        vipTier: customerData.vip_tier?.name || null,
        loyaltyStatus: customerData.loyalty_status
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Redemption error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/notify-point-redemption', async (req, res) => {
  try {
    console.log('Webhook received from Rivo');

    const email = req.body.customer?.email;
    const firstName = req.body.customer?.first_name || '';
    const lastName = req.body.customer?.last_name || '';
    const customerName = `${firstName} ${lastName}`.trim() || 'Valued Customer';
    const pointsRedeemed = req.body.points_amount;
    const pointsRemaining = req.body.customer?.points_tally;
    const eventAttributes = req.body.event_attributes || {};
    const rewardName =
      req.body.name ||
      req.body.title ||
      eventAttributes.name ||
      eventAttributes.reward_name ||
      eventAttributes.title ||
      null;
    const rewardCode =
      req.body.code ||
      eventAttributes.code ||
      eventAttributes.discount_code ||
      eventAttributes.reward_code ||
      null;

    if (!email || !pointsRedeemed || pointsRemaining === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields from Rivo webhook'
      });
    }

    if (!config.RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Email service not configured'
      });
    }
    
    const subject = 'Your Wingstop Reward - Confirmation';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background: #2563eb;
            padding: 30px;
            text-align: center;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 24px;
            color: #333;
          }
          .info-box {
            background: #f9fafb;
            border-left: 4px solid #2563eb;
            padding: 20px;
            margin: 24px 0;
          }
          .info-row {
            margin: 12px 0;
          }
          .info-label {
            font-weight: 600;
            color: #555;
          }
          .info-value {
            color: #2563eb;
            font-weight: 600;
            font-size: 16px;
          }
          .code-box {
            background: #fff9e6;
            border: 2px dashed #fbbf24;
            padding: 20px;
            text-align: center;
            border-radius: 6px;
            margin: 20px 0;
          }
          .code {
            font-size: 24px;
            font-weight: 700;
            color: #92400e;
            letter-spacing: 2px;
            font-family: 'Courier New', monospace;
          }
          .footer {
            background: #f9fafb;
            padding: 24px 30px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
          }
          @media only screen and (max-width: 600px) {
            .container { margin: 20px; }
            .content { padding: 30px 20px; }
            .code { font-size: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reward Confirmation</h1>
          </div>
          
          <div class="content">
            <p class="greeting">Hello ${customerName},</p>
            <p>Your reward has been successfully redeemed!</p>
            
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Reward:</span>
          <span class="info-value">${rewardName || 'Reward'}</span>
        </div>
        ${rewardCode ? `
        <div class="code-box">
          <div style="font-size: 12px; color: #92400e; margin-bottom: 8px; font-weight: 600;">DISCOUNT CODE</div>
          <div class="code">${rewardCode}</div>
        </div>
        ` : `
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span class="info-value">Active</span>
        </div>
        `}
        <div class="info-row">
          <span class="info-label">Points Redeemed:</span>
          <span class="info-value">${pointsRedeemed}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Points Remaining:</span>
          <span class="info-value">${pointsRemaining}</span>
        </div>
      </div>
            
            <p style="color: #555; font-size: 14px;">
              ${rewardCode ? 'Please use this code at checkout to redeem your reward.' : 'Your reward has been applied to your account.'}
            </p>
            
            <p style="margin-top: 30px;">Thank you for choosing Wingstop.</p>
          </div>
          
          <div class="footer">
            <p style="margin: 0; font-weight: 600; color: #333;">Wingstop Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
      Hello ${customerName},

      Your reward has been successfully redeemed!

      Reward: ${rewardName || 'Reward'}
      ${rewardCode ? `Discount Code: ${rewardCode}` : 'Status: Active'}

      ${rewardCode ? 'Please use this code at checkout to redeem your reward.' : 'Your reward has been applied to your account.'}

      Points Redeemed: ${pointsRedeemed}
      Points Remaining: ${pointsRemaining}

      Thank you for choosing Wingstop.

      Best regards,
      Wingstop Team
    `;

    const resendFrom = `${config.EMAIL_FROM_NAME || 'Rivo Loyalty'} <${config.RESEND_FROM || 'onboarding@resend.dev'}>`;
    const resendResp = await sendEmailViaResend({ from: resendFrom, to: email, subject, html, text });
    console.log(`Email sent via Resend to ${email}`, { messageId: resendResp?.id || null });

    return res.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        email,
        customerName,
        pointsRedeemed,
        pointsRemaining,
        rewardName: rewardName || 'Reward',
        rewardCode,
        messageId: resendResp.id || null,
        timestamp: new Date().toISOString(),
        provider: 'resend'
      }
    });
  } catch (error) {
    console.error('Email send failed', { to: req?.body?.customer?.email, error: error?.message || String(error) });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong',
    message: err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /collections',
      'GET /customers',
      'GET /rewards',
      'GET /points/:email',
      'POST /redeem-points',
      'POST /notify-point-redemption'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Rivo Middleware Server started on http://localhost:${PORT}`);
});

export default app;

