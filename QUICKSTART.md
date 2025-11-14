# 🚀 Quick Start Guide

Get your Rivo Rewards UI up and running in 5 minutes!

## Step 1: Configure Environment

Create a `.env` file in the root directory and add your credentials:

```env
RIVO_API_KEY=your_32_character_api_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM_NAME=Rivo Loyalty
```

**Note:** Get your Gmail App Password from https://myaccount.google.com/apppasswords

## Step 2: Start the Backend

```bash
npm run dev
```

You should see:
```
✅ Email transporter configured successfully!
🚀 Server running on: http://localhost:5000
```

## Step 3: Start the Frontend

Open a new terminal:

```bash
cd client
npm start
```

The React app will open at `http://localhost:3000`

## Step 4: Test the App!

1. **Open:** http://localhost:3000
2. **Enter email:** `jahidul.islam+12@ecomexperts.io` (or any email in your Rivo system)
3. **Select reward:** Click on "$5 off coupon" (100 points)
4. **Click:** "Redeem Now"
5. **Success!** You'll see your discount code

## What Happens Behind the Scenes?

1. ✅ Frontend sends redemption request to backend
2. ✅ Backend checks customer's point balance via Rivo API
3. ✅ Backend processes redemption
4. ✅ Customer receives reward code
5. ✅ Email notification sent automatically
6. ✅ Points deducted from customer's balance

## Webhook Setup (Optional)

To receive automatic notifications when customers redeem points via Rivo:

1. **Get ngrok URL:**
```bash
ngrok http 5000
# Copy the https URL
```

2. **Configure in Rivo:**
- Go to Rivo Dashboard → Settings → Webhooks
- Event: "Points Redemption Created"
- URL: `https://your-ngrok-url.ngrok-free.app/notify-point-redemption`
- Save

3. **Test it:**
- Redeem points through Rivo
- Check your email!

## Troubleshooting

### Backend won't start?
```bash
npm install
npm run dev
```

### Frontend shows error?
```bash
cd client
npm install
npm start
```

### Email not sending?
- Check Gmail App Password
- Restart backend after updating `.env`
- Check console for detailed errors

### Can't redeem points?
- Verify RIVO_API_KEY in `.env`
- Check customer has enough points
- Check backend console logs

## Project Structure

```
Rivo-Middleware/
├── index.js          # Backend server
├── .env              # Your secrets (not committed)
├── package.json      # Backend dependencies
└── client/           # React frontend
    ├── src/
    │   ├── App.js    # Main React component
    │   └── App.css   # Styling
    └── package.json  # Frontend dependencies
```

## Next Steps

- ✅ Customize rewards in `client/src/App.js`
- ✅ Update email template in `index.js`
- ✅ Deploy to production
- ✅ Configure production webhooks

## Support

Check console logs for detailed error messages:
- Backend: Terminal running `npm run dev`
- Frontend: Browser developer console (F12)

---

🎉 **You're all set!** Enjoy your Rivo Rewards UI!

