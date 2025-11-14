# Rivo POS System

A simple POS-style interface for submitting customer email and points amount to the backend.

## Features

- 🛒 Clean POS-style interface
- 📧 Email input field
- 🔢 Three points options: 100, 200, 500
- ✅ Submit button
- 📤 Sends data to backend
- ✨ Visual feedback and validation

## Getting Started

### 1. Start the Backend Server

Make sure the backend is running on port 5000:

```bash
# From the root directory
npm run dev
```

The backend should show:
```
🚀 Server running on: http://localhost:5000
```

### 2. Start the React App

```bash
# From the client directory
cd client
npm start
```

The app will open at `http://localhost:3000`

## How to Use

1. **Enter customer email** - Type or paste the customer's email address
2. **Select points amount** - Click on 100, 200, or 500 points
3. **Click Submit** - Send the data to the backend
4. **Check backend console** - View the received data in your backend terminal

## What It Does

When you submit the form:
1. ✅ Data is sent to `http://localhost:5000/redeem-points`
2. ✅ Backend logs the email and points to console
3. ✅ Success message appears in the UI
4. ✅ Form resets automatically after 2 seconds

## Backend Console Output

You'll see something like:
```
============================================================
📥 POS Request Received:
============================================================
Customer Email: customer@example.com
Points Amount: 100
Timestamp: 2025-11-13T...
Full Request Body: {
  "email": "customer@example.com",
  "points": 100
}
============================================================
```

## API Request Format

**POST** `http://localhost:5000/redeem-points`

```json
{
  "email": "customer@example.com",
  "points": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data received successfully",
  "data": {
    "email": "customer@example.com",
    "points": 100,
    "receivedAt": "2025-11-13T14:30:00.000Z"
  }
}
```

## Tech Stack

- React 18
- Pure CSS (no external UI libraries)
- Fetch API for HTTP requests
- Modern, responsive design

## Customization

### Change Points Options

Edit `client/src/App.js`:

```javascript
const pointsOptions = [100, 200, 500]; // Change these values
```

### Change Backend URL

Edit `client/src/App.js` line 27:

```javascript
const response = await fetch('http://localhost:5000/redeem-points', {
```

### Modify Styling

Edit `client/src/App.css` to change colors, fonts, or layout.

## Troubleshooting

**Form won't submit?**
- Check that backend is running on port 5000
- Verify email is valid format
- Make sure a points amount is selected

**Backend not receiving data?**
- Check browser console (F12) for errors
- Verify CORS is enabled in backend (`cors` package)
- Check network tab in dev tools

**Styling issues?**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)

---

Built with ❤️ for Rivo POS integration
