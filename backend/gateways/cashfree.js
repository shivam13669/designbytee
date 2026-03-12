import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// Cashfree API configuration
const CASHFREE_API_URL = process.env.CASHFREE_API_URL || 'https://api.cashfree.com/pg';
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_APP_SECRET = process.env.CASHFREE_APP_SECRET;

/**
 * Generate Cashfree request signature (v2.1)
 * Signature: HMAC-SHA256(method + path + timestamp + body, secret) in base64
 * @param {string} path
 * @param {string} method
 * @param {string} body
 * @param {string} timestamp
 * @returns {string} Base64 encoded signature
 */
const generateCashfreeSignature = (path, method, body, timestamp) => {
  // Ensure body is a string
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

  // Create signature data: method + path + timestamp + body
  const signatureData = `${method}${path}${timestamp}${bodyStr}`;

  logger.info('Signature data being hashed', {
    method,
    path,
    timestamp,
    bodyLength: bodyStr.length,
  });

  const signature = crypto
    .createHmac('sha256', CASHFREE_APP_SECRET)
    .update(signatureData)
    .digest('base64');

  return signature;
};

/**
 * Validate Cashfree configuration
 */
if (!CASHFREE_APP_ID || !CASHFREE_APP_SECRET) {
  logger.warn('Cashfree credentials not configured', {
    hasAppId: !!CASHFREE_APP_ID,
    hasAppSecret: !!CASHFREE_APP_SECRET,
  });
}

/**
 * Create axios instance for Cashfree API
 */
const cashfreeAPI = axios.create({
  baseURL: CASHFREE_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-version': '2023-08-01',
  },
});

/**
 * Create Cashfree order
 * @param {object} params - { amount, currency, customer, orderId }
 * @returns {Promise<object>} Order details with payment link
 */
export const createCashfreeOrder = async (params) => {
  try {
    const { amount, currency = 'INR', customer, orderId } = params;

    const orderIdUnique = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Creating Cashfree order', {
      amount,
      orderId: orderIdUnique,
      customer: customer.email,
    });

    const orderData = {
      order_id: orderIdUnique,
      order_amount: parseFloat(amount),
      order_currency: currency,
      customer_details: {
        customer_id: customer.email.replace(/[^a-zA-Z0-9]/g, ''),
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/payment-status?orderId=${orderIdUnique}`,
        notify_url: `${process.env.BACKEND_URL || 'https://your-backend-url.com'}/api/webhook/cashfree`,
      },
      order_note: 'Payment for courses',
      order_tags: ['course', 'payment'],
    };

    // Create signature for request
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/orders';
    const body = JSON.stringify(orderData);
    const signature = generateCashfreeSignature(path, 'POST', body, timestamp);

    logger.info('Cashfree request details', {
      orderId: orderIdUnique,
      appId: CASHFREE_APP_ID,
      hasSecret: !!CASHFREE_APP_SECRET,
      timestamp,
      signatureLength: signature.length,
    });

    const response = await cashfreeAPI.post('/orders', orderData, {
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-api-key': CASHFREE_APP_SECRET,
        'x-request-id': `${Date.now()}`,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-idempotency-key': `${Date.now()}`,
      },
    });

    logger.info('Cashfree order created successfully', {
      orderId: response.data?.order_id,
      paymentSessionId: response.data?.payment_session_id,
    });

    // Extract payment link from response
    let paymentLink = null;

    // Try multiple methods to get payment link
    if (response.data?.payment_link) {
      paymentLink = response.data.payment_link;
    } else if (response.data?.payment_session_id) {
      // Session-based payment - construct URL
      paymentLink = `https://api.cashfree.com/pg/orders/${orderIdUnique}/pay/${response.data.payment_session_id}`;
    } else if (response.data?.payments && Array.isArray(response.data.payments)) {
      // Find payment link in payments array
      const payment = response.data.payments.find(p => p.url);
      paymentLink = payment?.url;
    }

    if (!paymentLink) {
      logger.warn('No payment link found in Cashfree response', {
        orderId: orderIdUnique,
        responseKeys: Object.keys(response.data || {}),
      });
    }

    return {
      orderId: response.data?.order_id,
      paymentSessionId: response.data?.payment_session_id,
      paymentLink,
      status: response.data?.order_status,
      amount: response.data?.order_amount,
      currency: response.data?.order_currency,
    };
  } catch (error) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      requestConfig: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        headersKeys: error.config?.headers ? Object.keys(error.config.headers) : [],
      }
    };

    logger.error('Cashfree order creation failed', {
      statusCode: error.response?.status,
      errorMessage: error.response?.data?.message,
      errorType: error.response?.data?.type,
      fullError: JSON.stringify(errorDetails, null, 2),
    });

    throw {
      message: 'Failed to create Cashfree order',
      error: error.message,
      apiError: error.response?.data?.message,
      status: error.response?.status,
      details: errorDetails,
    };
  }
};

/**
 * Get Cashfree order details
 * @param {string} orderId 
 * @returns {Promise<object>} Order details
 */
export const getCashfreeOrderDetails = async (orderId) => {
  try {
    logger.info('Fetching Cashfree order details', { orderId });

    const response = await cashfreeAPI.get(`/orders/${orderId}`, {
      headers: {
        'x-api-key': CASHFREE_APP_SECRET,
      },
    });

    logger.info('Cashfree order details retrieved', {
      orderId,
      status: response.data?.order_status,
    });

    return {
      orderId: response.data?.order_id,
      status: response.data?.order_status,
      amount: response.data?.order_amount,
      currency: response.data?.order_currency,
      paymentStatus: response.data?.order_payment_status,
      customerDetails: response.data?.customer_details,
      payments: response.data?.payments,
    };
  } catch (error) {
    logger.error('Failed to fetch Cashfree order details', {
      orderId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Verify Cashfree webhook signature (v2.1)
 * @param {string} body
 * @param {string} timestamp
 * @param {string} signature
 * @returns {boolean} True if signature is valid
 */
const verifyCashfreeWebhookSignature = (body, timestamp, signature) => {
  try {
    // Webhook signature format: HMAC-SHA256(method + path + timestamp + body, appSecret)
    const path = '/webhook';
    const expectedSignature = generateCashfreeSignature(path, 'POST', body, timestamp);
    const isValid = expectedSignature === signature;

    if (!isValid) {
      logger.warn('Cashfree webhook signature mismatch');
    }

    return isValid;
  } catch (error) {
    logger.error('Cashfree webhook signature verification error', {
      error: error.message,
    });
    return false;
  }
};

/**
 * Handle Cashfree webhook (v2.1)
 * @param {string} body - Raw request body
 * @param {string} timestamp - x-timestamp header
 * @param {string} signature - x-signature header
 * @returns {Promise<object>} Validation result
 */
export const handleCashfreeWebhook = async (body, timestamp, signature) => {
  try {
    const webhookData = typeof body === 'string' ? JSON.parse(body) : body;

    logger.info('Handling Cashfree webhook', {
      orderId: webhookData?.data?.order?.order_id,
    });

    // Verify signature
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const isValidSignature = verifyCashfreeWebhookSignature(bodyString, timestamp, signature);

    if (!isValidSignature) {
      return { valid: false, message: 'Invalid signature' };
    }

    logger.info('Cashfree webhook verified');

    const { data, type } = webhookData;

    return {
      valid: true,
      type,
      orderId: data?.order?.order_id,
      status: data?.order?.order_status,
      paymentStatus: data?.order?.order_payment_status,
      amount: data?.order?.order_amount,
      payment: data?.payment,
      timestamp: data?.order?.order_creation_time,
      success: data?.order?.order_payment_status === 'PAID',
    };
  } catch (error) {
    logger.error('Cashfree webhook handling error', { error: error.message });
    throw error;
  }
};

/**
 * Get Cashfree payment details
 * @param {string} orderId 
 * @param {string} paymentId 
 * @returns {Promise<object>} Payment details
 */
export const getCashfreePaymentDetails = async (orderId, paymentId) => {
  try {
    logger.info('Fetching Cashfree payment details', { orderId, paymentId });

    const response = await cashfreeAPI.get(
      `/orders/${orderId}/payments/${paymentId}`,
      {
        headers: {
          'x-api-key': CASHFREE_APP_SECRET,
        },
      }
    );

    return {
      paymentId: response.data?.cf_payment_id,
      status: response.data?.payment_status,
      method: response.data?.payment_method,
      amount: response.data?.payment_amount,
      timestamp: response.data?.payment_time,
    };
  } catch (error) {
    logger.error('Failed to fetch Cashfree payment details', {
      orderId,
      paymentId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Refund Cashfree payment
 * @param {object} params - { orderId, paymentId, amount }
 * @returns {Promise<object>} Refund response
 */
export const refundCashfreePayment = async (params) => {
  try {
    const { orderId, paymentId, amount } = params;

    logger.info('Initiating Cashfree refund', { orderId, paymentId, amount });

    const refundData = {
      refund_amount: parseFloat(amount),
      refund_note: 'Course refund',
    };

    const response = await cashfreeAPI.post(
      `/orders/${orderId}/payments/${paymentId}/refunds`,
      refundData,
      {
        headers: {
          'x-api-key': CASHFREE_APP_SECRET,
          'x-idempotency-key': `${Date.now()}`,
        },
      }
    );

    logger.info('Cashfree refund initiated', {
      refundId: response.data?.refund_id,
      status: response.data?.refund_status,
    });

    return {
      refundId: response.data?.refund_id,
      status: response.data?.refund_status,
      amount: response.data?.refund_amount,
      orderId,
      paymentId,
    };
  } catch (error) {
    logger.error('Cashfree refund failed', {
      orderId,
      paymentId,
      error: error.message,
    });
    throw error;
  }
};

export default {
  createCashfreeOrder,
  getCashfreeOrderDetails,
  handleCashfreeWebhook,
  getCashfreePaymentDetails,
  refundCashfreePayment,
};
