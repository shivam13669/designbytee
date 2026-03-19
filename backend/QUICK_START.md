# Quick Start Guide

Get the payment backend running in 5 minutes!

## 1. Install Dependencies

```bash
cd backend
npm install
```

## 2. Create Environment File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your payment gateway credentials in `.env`

## 3. Run Locally

```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════════════╗
║   Payment Gateway Backend Server Running       ║
║   Port: 5000                                   ║
║   Environment: development                      ║
╚════════════════════════════════════════════════╝
```

## 4. Test Health Endpoint

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "message": "Payment Gateway Backend is running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 5. Test Create Order

```bash
curl -X POST http://localhost:5000/api/payment/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 499,
    "gateway": "razorpay",
    "customer": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210"
    }
  }'
```

## 6. Deploy to Render

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Select your repository
5. Build: `npm install`
6. Start: `npm start`
7. Add environment variables
8. Deploy!

Your backend URL: `https://your-service-name.onrender.com`

## Frontend Integration

Add to your frontend JavaScript:

```javascript
const API_BASE_URL = 'http://localhost:5000'; // or production URL

// Create payment order
const response = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 499,
    gateway: 'razorpay',
    customer: {
      name: 'John',
      email: 'john@example.com',
      phone: '9876543210'
    }
  })
});

const { order } = await response.json();
console.log('Order created:', order);
```

See `FRONTEND_INTEGRATION.md` for complete examples.

## Files Created

```
backend/
├── server.js                 ← Main server
├── package.json             ← Dependencies
├── .env                     ← Your secrets
├── .env.example             ← Template
│
├── gateways/
│   ├── razorpay.js
│   ├── phonepe.js
│   └── cashfree.js
│
├── routes/
│   ├── payment.js           ← /api/payment/*
│   └── webhooks.js          ← /api/webhook/*
│
├── utils/
│   ├── logger.js
│   └── validators.js
│
├── README.md                ← Full documentation
├── FRONTEND_INTEGRATION.md  ← Frontend guide
├── DEPLOYMENT_CHECKLIST.md  ← Pre-deploy checklist
└── QUICK_START.md           ← This file
```

## Available Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Server health check |
| POST | `/api/payment/create-order` | Create payment order |
| POST | `/api/payment/verify-payment` | Verify payment |
| GET | `/api/payment/status/:gateway/:id` | Get payment status |
| POST | `/api/webhook/razorpay` | Razorpay webhook |
| POST | `/api/webhook/phonepe` | PhonePe webhook |
| POST | `/api/webhook/cashfree` | Cashfree webhook |

## Supported Gateways

✅ **Razorpay** - Implemented fully with SDK  
✅ **PhonePe** - Implemented with Basic Auth for webhooks  
✅ **Cashfree** - Implemented with latest REST API  

## Environment Variables Needed

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Razorpay (get from https://dashboard.razorpay.com/keys)
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# PhonePe (get from business.phonepe.com)
PHONEPE_MERCHANT_ID=...
PHONEPE_SALT_KEY=...
PHONEPE_SALT_INDEX=1
PHONEPE_WEBHOOK_USER=...
PHONEPE_WEBHOOK_PASS=...

# Cashfree (get from dashboard.cashfree.com)
CASHFREE_APP_ID=...
CASHFREE_APP_SECRET=...
```

## Next Steps

1. **Get API Keys**: Register with Razorpay, PhonePe, and Cashfree
2. **Update .env**: Fill in all credentials
3. **Test Locally**: Run `npm run dev` and test endpoints
4. **Deploy**: Push to GitHub and deploy on Render
5. **Configure Webhooks**: Set webhook URLs in each gateway dashboard
6. **Integrate Frontend**: Use `FRONTEND_INTEGRATION.md` guide
7. **Test Payments**: Test with each gateway's test cards

## Troubleshooting

**Port already in use?**
```bash
# Kill process on port 5000 and try again
# Or change PORT in .env
```

**CORS errors?**
```bash
# Make sure FRONTEND_URL is set correctly in .env
# Should be: https://shivamcodes.in (in production)
```

**Environment variables not loading?**
```bash
# Make sure .env file is in backend/ directory
# Not in root, not in .env.local
```

**Webhooks not working?**
```bash
# Use ngrok to test locally: ngrok http 5000
# Update webhook URLs in payment gateway dashboards
```

## Getting Help

- **Full documentation**: See `README.md`
- **Frontend integration**: See `FRONTEND_INTEGRATION.md`
- **Deployment help**: See `DEPLOYMENT_CHECKLIST.md`
- **Gateway docs**:
  - Razorpay: https://razorpay.com/docs/
  - PhonePe: https://developer.phonepe.com/
  - Cashfree: https://docs.cashfree.com/

## That's It! 🚀

Your payment backend is ready. Start testing!

```bash
npm run dev
```

Questions? Check the full README.md
