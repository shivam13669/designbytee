import axios from 'axios';
import { logger } from '../utils/logger.js';

// Cashfree API configuration
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_APP_SECRET = process.env.CASHFREE_APP_SECRET;

/**
 * Validate Cashfree configuration
 */
logger.info('Cashfree Gateway Initialization', {
  appIdPresent: !!CASHFREE_APP_ID,
  appIdLength: CASHFREE_APP_ID?.length || 0,
  appSecretPresent: !!CASHFREE_APP_SECRET,
  appSecretLength: CASHFREE_APP_SECRET?.length || 0,
  apiUrl: CASHFREE_API_URL,
});

if (!CASHFREE_APP_ID || !CASHFREE_APP_SECRET) {
  logger.warn('Cashfree credentials not fully configured', {
    hasAppId: !!CASHFREE_APP_ID,
    hasAppSecret: !!CASHFREE_APP_SECRET,
  });
}

/**
 * Create axios instance for Cashfree API
 * Using latest 2025-01-01 API version
 */
const cashfreeAPI = axios.create({
  baseURL: 'https://api.cashfree.com/pg',
  headers: {
    'Content-Type': 'application/json',
    'x-api-version': '2025-01-01',
    'x-client-id': CASHFREE_APP_ID,
    'x-client-secret': CASHFREE_APP_SECRET,
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

    logger.info('Creating Cashfree order request', {
      orderId: orderIdUnique,
      amount,
      customer: customer.email,
    });

    // Make request - client id and secret already in axios headers
    const response = await cashfreeAPI.post('/orders', orderData, {
      headers: {
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

    const response = await cashfreeAPI.get(`/orders/${orderId}`);

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
 * Handle Cashfree webhook (2025-01-01 API)
 * With x-client-id and x-client-secret headers, no manual signature verification needed
 * @param {object} webhookData - Parsed webhook body
 * @returns {Promise<object>} Validation result
 */
export const handleCashfreeWebhook = async (webhookData) => {
  try {
    logger.info('Handling Cashfree webhook', {
      orderId: webhookData?.data?.order?.order_id,
      type: webhookData?.type,
    });

    const { data, type } = webhookData;

    // Check if webhook has required data
    if (!data || !type) {
      return { valid: false, message: 'Invalid webhook data' };
    }

    logger.info('Cashfree webhook processed successfully', {
      orderId: data?.order?.order_id,
      type,
      paymentStatus: data?.order?.order_payment_status,
    });

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
    return { valid: false, message: error.message };
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
      `/orders/${orderId}/payments/${paymentId}`
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
