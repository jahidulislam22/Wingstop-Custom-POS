# Deployment Guide

## 🚀 Deploy Backend to Render

1. **Push code to GitHub** (if not already done)

2. **Go to Render Dashboard**: https://dashboard.render.com/

3. **Create New Web Service**
   - Click "New +" → "Blueprint" (automatically uses `render.yaml`)
   - OR Click "New +" → "Web Service" (manual setup)
   - Connect your GitHub repository

4. **Configure** (if manual setup):
   - Build Command: `npm install`
   - Start Command: `npm start`

5. **Add Environment Variables** (in Render Dashboard):
   ```
   SHOPIFY_STORE=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
   RIVO_API_KEY=your_rivo_merchant_api_key
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM_NAME=Rivo Loyalty
   ```

6. **Deploy & Copy Backend URL**
   - Example: `https://rivo-middleware-backend.onrender.com`

---

## 🌐 Deploy Frontend to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard

2. **Create New Project**
   - Click "Add New" → "Project"
   - Connect your GitHub repository

3. **Configure Build Settings**:
   - **Root Directory**: `client`
   - **Framework Preset**: Create React App (auto-detected)

4. **Add Environment Variable** (in Vercel Dashboard):
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com
   ```
   *(Replace with your actual Render backend URL)*

5. **Deploy & Redeploy**
   - After adding the environment variable, redeploy for it to take effect

---

## ✅ Test Deployment

**Backend**: Visit `https://your-backend.onrender.com/health`  
**Frontend**: Visit `https://your-app.vercel.app`

Try redeeming points to verify everything works.

---

## 🔧 Troubleshooting

### CORS Errors
If frontend can't connect to backend, update `index.js` line 9:
```javascript
app.use(cors({
  origin: ['https://your-app.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
```
Then redeploy backend.

### Backend Issues
- Check Render logs in dashboard
- Verify all environment variables are set
- Test `/health` endpoint

### Frontend Issues
- Verify `REACT_APP_API_URL` is set correctly
- Check browser console for errors
- Ensure backend is running

---

## 📝 Important Notes

- **Auto-Deploy**: Both platforms automatically redeploy when you push to GitHub
- **Free Tier**: Render service sleeps after 15 min inactivity (first request takes ~30-60s)
- **Environment Variables**: Never commit `.env` files - always set in platform dashboards
- **Changes**: After updating environment variables, redeploy for changes to take effect

---

## 🔗 URLs to Save

- **Render Dashboard**: https://dashboard.render.com/
- **Vercel Dashboard**: https://vercel.com/dashboard/
- **Backend URL**: `___________________________`
- **Frontend URL**: `___________________________`

