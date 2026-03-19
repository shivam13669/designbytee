# Payment Gateway Backend - Design Byte

A production-ready Node.js + Express backend for multi-gateway payment integration.

## Supported Payment Gateways

- **Razorpay** - Official SDK
- **PhonePe** - Latest REST API with webhook Basic Auth
- **Cashfree** - Latest REST API v3

## Project Structure

```
backend/
├── server.js                 # Main Express server
├── package.json             # Dependencies
├── .env.example             # Environment variables template
├── .env                     # (Create this - keep secret!)
│
├── gateways/                # Payment gateway integrations
│   ├── razorpay.js         # Razorpay gateway
│   ├── phonepe.js          # PhonePe gateway
│   └── cashfree.js         # Cashfree gateway
│
├── routes/                  # API routes
│   ├── payment.js          # /api/payment/* endpoints
│   └── webhooks.js         # /api/webhook/* endpoints
│
├── utils/                   # Utility functions
│   ├── logger.js           # Logging utility
│   └── validators.js       # Input validation
│
└── README.md               # This file
```

## Installation & Setup

### 1. Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Payment gateway accounts (Razorpay, PhonePe, Cashfree)

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your payment gateway credentials:

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=https://shivamcodes.in
BACKEND_URL=https://your-backend-url.com  # For webhooks

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# PhonePe
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_SALT_KEY=your_salt_key
PHONEPE_SALT_INDEX=1
PHONEPE_WEBHOOK_USER=webhook_user
PHONEPE_WEBHOOK_PASS=webhook_password

# Cashfree
CASHFREE_APP_ID=your_app_id
CASHFREE_APP_SECRET=your_app_secret
```

### 4. Run Locally

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:5000`

Check health: `http://localhost:5000/health`

## API Endpoints

### 1. Create Payment Order

**POST** `/api/payment/create-order`

Creates a payment order with the selected gateway.

**Request:**
```json
{
  "amount": 499,
  "gateway": "razorpay",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210"
  },
  "description": "Full Stack Development Course"
}
```

**Response (Razorpay):**
```json
{
  "success": true,
  "gateway": "razorpay",
  "order": {
    "orderId": "order_xyz123",
    "amount": 49900,
    "currency": "INR",
    "razorpayKey": "rzp_live_xyz",
    "status": "created"
  }
}
```

**Response (PhonePe):**
```json
{
  "success": true,
  "gateway": "phonepe",
  "order": {
    "transactionId": "TXN_...",
    "redirectUrl": "https://phonepe-payment.url",
    "paymentUrl": "https://phonepe-payment.url"
  }
}
```

### 2. Verify Payment

**POST** `/api/payment/verify-payment`

Verify payment authenticity using gateway signature.

**Razorpay Request:**
```json
{
  "gateway": "razorpay",
  "orderId": "order_xyz",
  "paymentId": "pay_xyz",
  "signature": "signature_hex"
}
```

**PhonePe Request:**
```json
{
  "gateway": "phonepe",
  "transactionId": "TXN_xyz"
}
```

**Response:**
```json
{
  "success": true,
  "gateway": "razorpay",
  "orderId": "order_xyz",
  "paymentId": "pay_xyz",
  "status": "captured",
  "amount": 499,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 3. Get Payment Status

**GET** `/api/payment/status/:gateway/:id`

Fetch payment status by transaction/order ID.

**Example:**
```
GET /api/payment/status/razorpay/pay_xyz123
GET /api/payment/status/phonepe/TXN_xyz123
GET /api/payment/status/cashfree/order_xyz123
```

### 4. Webhooks

Payment gateways send webhook notifications to these endpoints:

- **Razorpay:** `POST /api/webhook/razorpay`
- **PhonePe:** `POST /api/webhook/phonepe` (requires Basic Auth)
- **Cashfree:** `POST /api/webhook/cashfree`

**Important:** Configure webhook URLs in your payment gateway dashboards:

- Razorpay: `https://your-backend-url.com/api/webhook/razorpay`
- PhonePe: `https://your-backend-url.com/api/webhook/phonepe`
- Cashfree: `https://your-backend-url.com/api/webhook/cashfree`

## Deployment to Render

### 1. Prepare Your Repository

```bash
# Initialize git if not already done
git init

# Create a .gitignore file
cat > .gitignore << EOF
node_modules/
.env
.env.local
.DS_Store
npm-debug.log
EOF

# Commit files
git add .
git commit -m "Initial payment backend"
```

### 2. Create Render Service

1. Go to [render.com](https://render.com)
2. Sign up / Log in
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure the service:

```
Name: payment-gateway-backend
Environment: Node
Build Command: npm install
Start Command: npm start
```

### 3. Add Environment Variables

In Render dashboard → Environment:

```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://shivamcodes.in
BACKEND_URL=https://payment-gateway-backend.onrender.com

RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

PHONEPE_MERCHANT_ID=...
PHONEPE_SALT_KEY=...
PHONEPE_SALT_INDEX=1
PHONEPE_WEBHOOK_USER=...
PHONEPE_WEBHOOK_PASS=...

CASHFREE_APP_ID=...
CASHFREE_APP_SECRET=...
```

### 4. Deploy

Click "Create Web Service" - Render will automatically deploy!

Your backend URL will be: `https://payment-gateway-backend.onrender.com`

## Frontend Integration

### Example: Razorpay Integration

```javascript
// 1. Create order
const response = await fetch('https://backend-url.com/api/payment/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 499,
    gateway: 'razorpay',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210'
    }
  })
});

const { order } = await response.json();

// 2. Open Razorpay checkout
const options = {
  key: order.razorpayKey,
  amount: order.amount,
  currency: 'INR',
  order_id: order.orderId,
  handler: async (response) => {
    // 3. Verify payment
    const verifyResponse = await fetch('https://backend-url.com/api/payment/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gateway: 'razorpay',
        orderId: order.orderId,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature
      })
    });

    if (verifyResponse.ok) {
      alert('Payment successful!');
    }
  }
};

const rzp1 = new Razorpay(options);
rzp1.open();
```

### Example: PhonePe Integration

```javascript
// 1. Create order
const response = await fetch('https://backend-url.com/api/payment/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 499,
    gateway: 'phonepe',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210'
    }
  })
});

const { order } = await response.json();

// 2. Redirect to PhonePe payment URL
window.location.href = order.redirectUrl;

// 3. Handle callback on payment-status page
const urlParams = new URLSearchParams(window.location.search);
const transactionId = urlParams.get('transactionId');

const verifyResponse = await fetch('https://backend-url.com/api/payment/verify-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gateway: 'phonepe',
    transactionId: transactionId
  })
});

const result = await verifyResponse.json();
if (result.success) {
  alert('Payment successful!');
}
```

## Webhook Configuration

### Razorpay

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to Settings → Webhooks
3. Add webhook:
   - URL: `https://your-backend-url.com/api/webhook/razorpay`
   - Events: Select `payment.authorized`, `payment.failed`, `payment.captured`, `refund.created`

### PhonePe

1. Log in to [PhonePe Business](https://business.phonepe.com)
2. Go to Settings → Webhooks
3. Add webhook:
   - URL: `https://your-backend-url.com/api/webhook/phonepe`
   - Authentication Type: Basic Auth
   - Username: `PHONEPE_WEBHOOK_USER` value
   - Password: `PHONEPE_WEBHOOK_PASS` value

### Cashfree

1. Log in to [Cashfree Dashboard](https://dashboard.cashfree.com)
2. Go to Settings → Webhooks
3. Add webhook:
   - URL: `https://your-backend-url.com/api/webhook/cashfree`
   - Events: Select payment events

## Testing Payment Flow

### Test Mode Credentials

**Razorpay Test:**
- Key ID: `rzp_test_xxxxx`
- Key Secret: `xxxxx`
- Test Card: `4111111111111111` with any future date and CVV

**PhonePe Test:**
- Use sandbox API: `https://api-sandbox.phonepe.com/apis/hermes`

**Cashfree Test:**
- Use test credentials from dashboard

### Local Testing with Webhooks

For local development, use [ngrok](https://ngrok.com) to expose your local server:

```bash
# Start your backend
npm run dev

# In another terminal, expose with ngrok
ngrok http 5000

# Use ngrok URL: https://xxx.ngrok.io/api/webhook/...
```

## Error Handling

The backend includes error handling for:

- Invalid input validation
- Gateway API failures
- Webhook signature mismatches
- Network timeouts
- Invalid gateway selections

All errors are logged with timestamp and context for debugging.

## Logging

Logs are printed to console with format:
```
[2024-01-01T12:00:00Z] [INFO] Creating Razorpay order
```

For production, consider adding:
- File-based logging
- Cloud logging (Google Cloud Logging, DataDog, etc.)
- Error tracking (Sentry)

## Security Notes

1. **Always use HTTPS** in production
2. **Keep .env secret** - never commit it to git
3. **Rotate API keys regularly**
4. **Validate all inputs** on frontend and backend
5. **Use CORS** only for your domain
6. **Implement rate limiting** for production
7. **Store payment data** securely (encrypt sensitive fields)
8. **Use webhooks** for payment status updates, not client-side verification

## Database Integration (TODO)

Currently, the backend doesn't store payment data. To complete integration:

1. Choose a database (PostgreSQL, MongoDB, etc.)
2. Create tables/schemas:
   ```sql
   CREATE TABLE payments (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL,
     gateway VARCHAR(50),
     order_id VARCHAR(100),
     transaction_id VARCHAR(100),
     amount DECIMAL(10, 2),
     status VARCHAR(50),
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );
   ```
3. Update webhook handlers to save payment data
4. Implement enrollment logic after successful payment

## Support & Troubleshooting

### Common Issues

1. **CORS Error**: Ensure `FRONTEND_URL` is set correctly in `.env`
2. **Webhook not working**: Verify webhook URL in gateway dashboard
3. **Signature mismatch**: Check that secrets in `.env` match gateway settings
4. **Amount issues**: Remember Razorpay uses paise (multiply by 100)

## License

ISC

## Author

Shivam Anand
