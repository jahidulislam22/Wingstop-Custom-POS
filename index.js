import express from 'express';
import { readFileSync } from 'fs';
import nodemailer from 'nodemailer';
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
  EMAIL_HOST: process.env.EMAIL_HOST || fileEnv.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT || fileEnv.EMAIL_PORT,
  EMAIL_SECURE: process.env.EMAIL_SECURE || fileEnv.EMAIL_SECURE,
  EMAIL_USER: process.env.EMAIL_USER || fileEnv.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS || fileEnv.EMAIL_PASS,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || fileEnv.EMAIL_FROM_NAME
};

let emailTransporter = null;
if (config.EMAIL_HOST && config.EMAIL_USER && config.EMAIL_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: parseInt(config.EMAIL_PORT) || 587,
    secure: config.EMAIL_SECURE === 'true',
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS
    }
  });
  console.log('Email transporter configured');
}

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
      email: !!(config.EMAIL_HOST && config.EMAIL_USER && config.EMAIL_PASS)
    }
  };
  res.status(200).json(healthcheck);
});

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
    console.log('Webhook headers x-forwarded-for:', req.headers['x-forwarded-for'] || 'n/a');
    console.log('Webhook body keys:', Object.keys(req.body || {}));

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

    console.log('event_attributes keys:', Object.keys(eventAttributes));

    console.log('Parsed webhook values:', {
      email,
      customerName,
      pointsRedeemed,
      pointsRemaining,
      rewardName,
      hasRewardCode: !!rewardCode
    });

    if (!email || !pointsRedeemed || pointsRemaining === undefined) {
      console.warn('Webhook missing required fields; refusing to send email');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields from Rivo webhook'
      });
    }

    if (!emailTransporter) {
      console.error('Email not configured', {
        hasHost: !!config.EMAIL_HOST,
        hasUser: !!config.EMAIL_USER,
        hasPass: !!config.EMAIL_PASS
      });
      return res.status(500).json({
        success: false,
        error: 'Email service not configured'
      });
    }
    
    const mailOptions = {
      from: `"${config.EMAIL_FROM_NAME || 'Rivo Loyalty'}" <${config.EMAIL_USER}>`,
      to: email,
      subject: 'Points Redeemed Successfully',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 500px; margin: 0 auto; padding: 30px; }
            h2 { color: #667eea; }
            .points-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .points-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .label { color: #666; }
            .value { font-weight: bold; color: #667eea; }
            .code-box { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #ffc107; }
            .code { font-size: 24px; font-weight: bold; color: #856404; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Congratulations ${customerName}!</h2>
            <p>You've successfully redeemed <strong>${pointsRedeemed} points</strong> for <strong>${rewardName}</strong>.</p>
            
            ${rewardCode ? `
            <div class="code-box">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #856404;">Your Reward Code:</p>
              <div class="code">${rewardCode}</div>
            </div>
            ` : ''}
            
            <div class="points-info">
              <div class="points-row">
                <span class="label">Points Redeemed:</span>
                <span class="value">${pointsRedeemed}</span>
              </div>
              <div class="points-row">
                <span class="label">Points Remaining:</span>
                <span class="value">${pointsRemaining}</span>
              </div>
            </div>
            
            <p>Thank you!</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${customerName},

        You've successfully redeemed ${pointsRedeemed} points for ${rewardName}.

        ${rewardCode ? `Your Reward Code: ${rewardCode}\n` : ''}
        Points Redeemed: ${pointsRedeemed}
        Points Remaining: ${pointsRemaining}

        Thank you!
      `
    };

    console.log('Attempting to send email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html?.length || 0
    });
    
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent successfully', {
      messageId: info?.messageId,
      accepted: info?.accepted,
      rejected: info?.rejected
    });
    
    res.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        email,
        customerName,
        pointsRedeemed,
        pointsRemaining,
        rewardName: rewardName || 'Reward',
        rewardCode,
        messageId: info.messageId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error sending notification:', {
      message: error?.message,
      code: error?.code,
      response: error?.response
    });
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

