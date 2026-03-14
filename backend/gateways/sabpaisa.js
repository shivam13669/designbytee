import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * SabPaisa Payment Gateway Integration
 * Handles order creation, verification, and webhook processing
 */

// Configuration
const SABPAISA_MERCHANT_ID = process.env.SABPAISA_MERCHANT_ID;
const SABPAISA_API_KEY = process.env.SABPAISA_API_KEY;
const SABPAISA_SECRET_KEY = process.env.SABPAISA_SECRET_KEY;
const NODE_ENV = process.env.NODE_ENV || 'production';

// SabPaisa API Endpoints
const SABPAISA_ENDPOINTS = {
  production: {
    create: 'https://api.sabpaisa.in/api/payment/create',
    verify: 'https://api.sabpaisa.in/api/payment/verify',
    status: 'https://api.sabpaisa.in/api/payment/status'
  },
  sandbox: {
    create: 'https://sandbox.sabpaisa.in/api/payment/create',
    verify: 'https://sandbox.sabpaisa.in/api/payment/verify',
    status: 'https://sandbox.sabpaisa.in/api/payment/status'
  }
};

const getApiEndpoints = () => {
  return NODE_ENV === 'production' ? SABPAISA_ENDPOINTS.production : SABPAISA_ENDPOINTS.sandbox;
};

/**
 * Create SabPaisa order
 * @param {object} params - { amount, currency, customer, orderId, description }
 * @returns {Promise<object>} Order object with transaction ID and redirect URL
 */
export const createSabPaisaOrder = async (params) => {
  try {
    const { amount, currency = 'INR', customer, orderId, description } = params;

    logger.info('Creating SabPaisa order', {
      amount,
      orderId,
      customer: customer?.email,
    });

    // Validate credentials
    if (!SABPAISA_MERCHANT_ID || !SABPAISA_API_KEY || !SABPAISA_SECRET_KEY) {
      throw new Error(
        'SabPaisa credentials not configured. Set SABPAISA_MERCHANT_ID, SABPAISA_API_KEY, and SABPAISA_SECRET_KEY in .env'
      );
    }

    // Amount in paise
    const amountInPaise = Math.round(amount * 100);

    // Create transaction ID
    const transactionId = `TXN_${orderId}_${Date.now()}`;

    // Prepare payload
    const payload = {
      merchantId: SABPAISA_MERCHANT_ID,
      transactionId: transactionId,
      amount: amountInPaise,
      currency: currency,
      orderDescription: description || 'Payment for course',
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      returnUrl: `${process.env.FRONTEND_URL}/payment-success`,
      notifyUrl: `${process.env.BACKEND_URL}/api/payment/webhook/sabpaisa`,
    };

    // Generate checksum
    const checksumString = `${SABPAISA_MERCHANT_ID}|${transactionId}|${amountInPaise}|${currency}`;
    const checksum = crypto
      .createHmac('sha256', SABPAISA_SECRET_KEY)
      .update(checksumString)
      .digest('hex');

    payload.checksum = checksum;

    const endpoints = getApiEndpoints();
    logger.info('SabPaisa API request details', {
      endpoint: endpoints.create,
      transactionId,
      amount: amountInPaise,
      environment: NODE_ENV,
    });

    // Make API request
    const response = await axios.post(
      endpoints.create,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SABPAISA_API_KEY}`,
        },
      }
    );

    logger.info('SabPaisa order created successfully', {
      transactionId,
      orderId,
      redirectUrl: response.data?.redirectUrl,
      success: response.data?.success,
    });

    // Return order data with transaction ID for frontend
    return {
      orderId: orderId,
      transactionId: transactionId,
      amount: amountInPaise,
      currency: currency,
      status: response.data?.status || 'created',
      redirectUrl: response.data?.redirectUrl,
      sessionId: response.data?.sessionId,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    };

    logger.error('SabPaisa order creation failed', JSON.stringify(errorDetails, null, 2));
    throw new Error(`SabPaisa API Error: ${errorMessage} (Status: ${error.response?.status || 'Unknown'})`);
  }
};

/**
 * Verify SabPaisa payment
 * @param {object} params - { transactionId, amount, checksum }
 * @returns {Promise<boolean>} True if payment is verified
 */
export const verifySabPaisaPayment = async (params) => {
  try {
    const { transactionId, amount, checksum } = params;

    logger.info('Verifying SabPaisa payment', { transactionId });

    // Recreate checksum to verify
    const checksumString = `${transactionId}|${amount}`;
    const generatedChecksum = crypto
      .createHmac('sha256', SABPAISA_SECRET_KEY)
      .update(checksumString)
      .digest('hex');

    const isValid = generatedChecksum === checksum;

    if (!isValid) {
      logger.warn('SabPaisa checksum verification failed', {
        transactionId,
        expected: generatedChecksum,
        received: checksum,
      });
    } else {
      logger.info('SabPaisa checksum verified successfully', { transactionId });
    }

    return isValid;
  } catch (error) {
    logger.error('SabPaisa payment verification error', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get SabPaisa payment status
 * @param {string} transactionId - SabPaisa transaction ID
 * @returns {Promise<object>} Payment status details
 */
export const getSabPaisaPaymentStatus = async (transactionId) => {
  try {
    logger.info('Fetching SabPaisa payment status', { transactionId });

    if (!SABPAISA_API_KEY) {
      throw new Error('SabPaisa API key not configured');
    }

    const endpoints = getApiEndpoints();

    const response = await axios.get(
      `${endpoints.status}/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${SABPAISA_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('SabPaisa payment status retrieved', {
      transactionId,
      status: response.data?.status,
    });

    return response.data;
  } catch (error) {
    const errorDetails = {
      transactionId,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    };
    logger.error('SabPaisa payment status fetch failed', JSON.stringify(errorDetails, null, 2));
    throw new Error(`Failed to fetch SabPaisa payment status: ${error.message}`);
  }
};

/**
 * Handle SabPaisa webhook
 * @param {object} webhookData - Webhook payload from SabPaisa
 * @param {string} webhookSignature - Webhook signature header
 * @returns {Promise<object>} Webhook processing result
 */
export const handleSabPaisaWebhook = async (webhookData, webhookSignature) => {
  try {
    logger.info('Processing SabPaisa webhook', {
      transactionId: webhookData?.transactionId,
    });

    if (!webhookData) {
      logger.warn('SabPaisa webhook missing data');
      return { processed: false, message: 'Invalid webhook format' };
    }

    // Verify webhook signature if provided
    if (webhookSignature) {
      const checksumString = `${webhookData.transactionId}|${webhookData.amount}|${webhookData.status}`;
      const generatedSignature = crypto
        .createHmac('sha256', SABPAISA_SECRET_KEY)
        .update(checksumString)
        .digest('hex');

      if (generatedSignature !== webhookSignature) {
        logger.warn('SabPaisa webhook signature verification failed');
        return { processed: false, message: 'Invalid webhook signature' };
      }
    }

    logger.info('SabPaisa webhook processed successfully', {
      transactionId: webhookData.transactionId,
      status: webhookData.status,
    });

    return {
      processed: true,
      transactionId: webhookData.transactionId,
      orderId: webhookData.orderId,
      status: webhookData.status,
      amount: webhookData.amount,
      message: webhookData.message,
    };
  } catch (error) {
    logger.error('SabPaisa webhook processing error', { error: error.message });
    throw error;
  }
};

/**
 * Refund SabPaisa payment
 * @param {object} params - { transactionId, amount }
 * @returns {Promise<object>} Refund response
 */
export const refundSabPaisaPayment = async (params) => {
  try {
    const { transactionId, amount } = params;

    logger.info('Initiating SabPaisa refund', { transactionId, amount });

    if (!SABPAISA_API_KEY) {
      throw new Error('SabPaisa API key not configured');
    }

    const refundId = `REFUND_${Date.now()}`;

    const payload = {
      transactionId: transactionId,
      refundId: refundId,
      amount: Math.round(amount * 100),
    };

    const endpoints = getApiEndpoints();

    const response = await axios.post(
      `${endpoints.verify}`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${SABPAISA_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('SabPaisa refund initiated', {
      transactionId,
      refundId,
      success: response.data?.success,
    });

    return response.data;
  } catch (error) {
    logger.error('SabPaisa refund failed', {
      error: error.message,
      response: error.response?.data,
    });
    throw {
      message: 'Failed to refund SabPaisa payment',
      error: error.message,
    };
  }
};

export default {
  createSabPaisaOrder,
  verifySabPaisaPayment,
  getSabPaisaPaymentStatus,
  handleSabPaisaWebhook,
  refundSabPaisaPayment,
};
