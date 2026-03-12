import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize dotenv for environment variables
dotenv.config();

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment defaults
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL;

// Warn if FRONTEND_URL is not configured
if (!FRONTEND_URL) {
  console.warn(
    '[WARNING] FRONTEND_URL environment variable is not set. CORS will default to http://localhost:3000'
  );
}

// Import routes
import paymentRoutes from './routes/payment.js';
import webhookRoutes from './routes/webhooks.js';

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

// CORS Configuration - Allow only frontend domain in production
const corsOptions = {
  origin: FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Middleware to capture raw body for webhook signature verification
app.use((req, res, next) => {
  if (req.path.includes('/webhook')) {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk.toString();
    });
    req.on('end', () => {
      req.rawBody = rawBody;
      next();
    });
  } else {
    next();
  }
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== ROUTES ====================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Payment Gateway Backend is running',
  });
});

// Diagnostic endpoint to check Razorpay setup
app.get('/health/razorpay', (req, res) => {
  const hasKeyId = !!process.env.RAZORPAY_KEY_ID;
  const hasKeySecret = !!process.env.RAZORPAY_KEY_SECRET;

  res.status(200).json({
    razorpay_configured: hasKeyId && hasKeySecret,
    razorpay_key_id: hasKeyId ? 'SET' : 'MISSING',
    razorpay_key_secret: hasKeySecret ? 'SET' : 'MISSING',
    frontend_url: process.env.FRONTEND_URL || 'NOT SET',
    environment: NODE_ENV,
  });
});

// Diagnostic endpoint to check Cashfree setup
app.get('/health/cashfree', (req, res) => {
  const hasAppId = !!process.env.CASHFREE_APP_ID;
  const hasAppSecret = !!process.env.CASHFREE_APP_SECRET;
  const apiUrl = process.env.CASHFREE_API_URL || 'https://api.cashfree.com/pg';

  res.status(200).json({
    cashfree_configured: hasAppId && hasAppSecret,
    cashfree_app_id: hasAppId ? 'SET' : 'MISSING',
    cashfree_app_secret: hasAppSecret ? 'SET' : 'MISSING',
    cashfree_api_url: apiUrl,
    frontend_url: process.env.FRONTEND_URL || 'NOT SET',
    environment: NODE_ENV,
  });
});

// Payment routes
app.use('/api/payment', paymentRoutes);

// Webhook routes
app.use('/api/webhook', webhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} does not exist`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   Payment Gateway Backend Server Running       ║
║   Port: ${PORT}                                    ║
║   Environment: ${NODE_ENV}                         ║
║   Frontend URL: ${FRONTEND_URL || 'Not configured'} ║
╚════════════════════════════════════════════════╝
  `);
});

export default app;
