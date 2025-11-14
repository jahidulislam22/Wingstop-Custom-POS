# Rivo Middleware & Rewards UI

A complete Node.js + React application for integrating with Rivo Loyalty API and providing a beautiful redemption interface.

## 🚀 Features

### Backend (Express.js)
- ✅ Rivo API integration (customers, points, redemptions)
- ✅ Shopify GraphQL API integration
- ✅ Email notifications with Nodemailer
- ✅ Webhook receiver for Rivo events
- ✅ Points redemption endpoint
- ✅ CORS enabled for frontend communication

### Frontend (React)
- ✅ Beautiful, modern UI for redeeming points
- ✅ Real-time points balance checking
- ✅ Instant reward code generation
- ✅ Fully responsive design
- ✅ Smooth animations and transitions

## 📦 Installation

### Prerequisites
- Node.js 16+ installed
- Rivo account with API key
- Shopify store (optional)
- Gmail account for email notifications

### Setup

1. **Clone and install dependencies:**
```bash
npm install
cd client
npm install
cd ..
```

2. **Configure environment variables:**

Create a `.env` file in the root directory:

```env
# Shopify Configuration
SHOPIFY_STORE=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx

# Rivo API Configuration
RIVO_API_KEY=your_32_character_api_key

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM_NAME=Rivo Loyalty
```

## 🎯 Running the Application

### Start Backend Server

```bash
npm run dev
```

Server runs on: `http://localhost:5000`

### Start React Frontend

```bash
cd client
npm start
```

Frontend runs on: `http://localhost:3000`

## 🌐 API Endpoints

### Backend API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API information |
| `/health` | GET | Health check |
| `/collections` | GET | Get Shopify collections |
| `/customers` | GET | Get all Rivo customers |
| `/points/:email` | GET | Get customer points balance |
| `/redeem-points` | POST | Redeem points (Frontend UI) |
| `/notify-point-redemption` | POST | Rivo webhook receiver |

### Redeem Points API

**POST** `/redeem-points`

Request:
```json
{
  "email": "customer@example.com",
  "rewardId": 1,
  "rewardName": "$5 off coupon",
  "pointsAmount": 100
}
```

Response:
```json
{
  "success": true,
  "message": "Points redeemed successfully",
  "data": {
    "rewardCode": "BAL-abc123",
    "pointsRemaining": 2600,
    "pointsRedeemed": 100,
    "rewardName": "$5 off coupon",
    "customerEmail": "customer@example.com"
  }
}
```

## 🔗 Webhook Configuration

Configure Rivo webhook for "Points Redemption Created" event:

**Webhook URL:**
```
https://your-domain.com/notify-point-redemption
```

Or use ngrok for testing:
```bash
ngrok http 5000
# Use: https://xxxx.ngrok-free.app/notify-point-redemption
```

## 📧 Email Notifications

Automatic emails are sent when points are redeemed via webhook.

**Email includes:**
- Customer name
- Points redeemed
- Points remaining
- Reward code
- Reward name

## 🎨 Frontend UI

### Features
- Clean, modern gradient design
- Card-based reward selection
- Real-time validation
- Success animations
- Error handling with friendly messages
- Mobile responsive

### Testing the UI

1. Open `http://localhost:3000`
2. Enter email: `jahidul.islam+12@ecomexperts.io`
3. Select a reward (100, 150, or 200 points)
4. Click "Redeem Now"
5. View your reward code!

## 🛠️ Tech Stack

**Backend:**
- Express.js
- Node.js
- Nodemailer
- CORS

**Frontend:**
- React 18
- Pure CSS (no UI frameworks)
- Fetch API

**APIs:**
- Rivo Merchant API
- Shopify Admin GraphQL API

## 📝 Configuration Guide

### Gmail App Password Setup

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Generate App Password at https://myaccount.google.com/apppasswords
4. Copy the 16-character password
5. Add to `.env` file (no spaces)

### Rivo API Key

1. Log in to Rivo Dashboard
2. Go to Settings → API Keys
3. Copy your Merchant API Key (32 characters)
4. Add to `.env` file

## 🔒 Security Notes

- `.env` is gitignored
- Never commit API keys
- Use environment variables for all secrets
- HTTPS required for production webhooks

## 📱 Production Deployment

### Backend
1. Deploy to Heroku, Railway, or VPS
2. Set environment variables
3. Use production domain for webhooks

### Frontend
1. Build: `cd client && npm run build`
2. Deploy to Netlify, Vercel, or static hosting
3. Update API URL in production

## 🐛 Troubleshooting

**Email not sending?**
- Check Gmail App Password
- Verify EMAIL_USER and EMAIL_PASS in `.env`
- Restart server after `.env` changes

**Rivo API 401 error?**
- Verify RIVO_API_KEY in `.env`
- Make sure key doesn't have "Bearer" prefix
- Check key is 32 characters

**Frontend can't connect to backend?**
- Ensure backend is running on port 5000
- Check CORS is enabled
- Verify fetch URL is `http://localhost:5000`

## 📄 License

MIT

## 🤝 Support

For issues, please check the console logs for detailed error messages.

---

Built with ❤️ for Rivo Loyalty integration
