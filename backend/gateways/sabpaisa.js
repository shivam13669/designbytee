import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * SabPaisa Payment Gateway Integration
 * Handles order creation, verification, and webhook processing
 */

// Configuration - SabPaisa credentials
const SABPAISA_CLIENT_CODE = process.env.SABPAISA_CLIENT_CODE;
const SABPAISA_USERNAME = process.env.SABPAISA_USERNAME;
const SABPAISA_PASSWORD = process.env.SABPAISA_PASSWORD;
const SABPAISA_AUTH_KEY = process.env.SABPAISA_AUTH_KEY;
const SABPAISA_AUTH_IV = process.env.SABPAISA_AUTH_IV;
const SABPAISA_URL =
  process.env.SABPAISA_URL ||
  "https://encrypted.sabpaisa.in/SabPaisa/api/Paisa";
const NODE_ENV = process.env.NODE_ENV || 'production';

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
    if (!SABPAISA_CLIENT_CODE || !SABPAISA_USERNAME || !SABPAISA_PASSWORD || !SABPAISA_AUTH_KEY || !SABPAISA_AUTH_IV) {
      throw new Error(
        'SabPaisa credentials not configured. Set SABPAISA_CLIENT_CODE, SABPAISA_USERNAME, SABPAISA_PASSWORD, SABPAISA_AUTH_KEY, and SABPAISA_AUTH_IV in .env'
      );
    }

    // Amount in paise
    const amountInPaise = Math.round(amount * 100);

    // Create transaction ID
    const transactionId = `TXN_${orderId}_${Date.now()}`;

    // Prepare payload according to SabPaisa API format
    const payload = {
      clientCode: SABPAISA_CLIENT_CODE,
      userName: SABPAISA_USERNAME,
      password: SABPAISA_PASSWORD,
      transactionId: transactionId,
      amount: amount, // SabPaisa might expect amount in rupees, not paise
      currency: currency,
      orderDescription: description || 'Payment for course',
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      returnUrl: `${process.env.FRONTEND_URL}/payment-success`,
      notifyUrl: `${process.env.BACKEND_URL}/api/payment/webhook/sabpaisa`,
    };

    logger.info('SabPaisa API request details', {
      endpoint: SABPAISA_URL,
      transactionId,
      amount,
      clientCode: SABPAISA_CLIENT_CODE,
    });

    // Make API request with authentication headers
    const response = await axios.post(
      SABPAISA_URL,
        payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Key': SABPAISA_AUTH_KEY,
          'X-Auth-IV': SABPAISA_AUTH_IV,
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
      amount: amount,
      currency: currency,
      status: "created",
      redirectUrl: SABPAISA_URL,
      payload: payload,
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
 * @param {object} params - { transactionId }
 * @returns {Promise<object>} Payment verification result
 */
export const verifySabPaisaPayment = async (params) => {
  try {
    const { transactionId } = params;

    logger.info('Verifying SabPaisa payment', { transactionId });

    // Prepare verification payload
    const verifyPayload = {
      clientCode: SABPAISA_CLIENT_CODE,
      userName: SABPAISA_USERNAME,
      password: SABPAISA_PASSWORD,
      transactionId: transactionId,
    };

    const response = await axios.post(
      `${SABPAISA_URL}/GetTransactionStatus`,
      verifyPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Key': SABPAISA_AUTH_KEY,
          'X-Auth-IV': SABPAISA_AUTH_IV,
        },
      }
    );

    if (response.data?.success) {
      logger.info('SabPaisa payment verified successfully', { transactionId });
      return { success: true, ...response.data };
    } else {
      logger.warn('SabPaisa payment verification failed', {
        transactionId,
        response: response.data,
      });
      return { success: false, ...response.data };
    }
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

    if (!SABPAISA_CLIENT_CODE || !SABPAISA_USERNAME || !SABPAISA_PASSWORD) {
      throw new Error('SabPaisa credentials not configured');
    }

    const statusPayload = {
      clientCode: SABPAISA_CLIENT_CODE,
      userName: SABPAISA_USERNAME,
      password: SABPAISA_PASSWORD,
      transactionId: transactionId,
    };

    const response = await axios.post(
      `${SABPAISA_URL}/GetTransactionStatus`,
      statusPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Key': SABPAISA_AUTH_KEY,
          'X-Auth-IV': SABPAISA_AUTH_IV,
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
 * @returns {Promise<object>} Webhook processing result
 */
export const handleSabPaisaWebhook = async (webhookData) => {
  try {
    logger.info('Processing SabPaisa webhook', {
      transactionId: webhookData?.transactionId,
    });

    if (!webhookData) {
      logger.warn('SabPaisa webhook missing data');
      return { processed: false, message: 'Invalid webhook format' };
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

    if (!SABPAISA_CLIENT_CODE || !SABPAISA_USERNAME || !SABPAISA_PASSWORD) {
      throw new Error('SabPaisa credentials not configured');
    }

    const refundId = `REFUND_${Date.now()}`;

    const payload = {
      clientCode: SABPAISA_CLIENT_CODE,
      userName: SABPAISA_USERNAME,
      password: SABPAISA_PASSWORD,
      transactionId: transactionId,
      refundId: refundId,
      amount: amount,
    };

    const response = await axios.post(
      `${SABPAISA_URL}/ProcessRefund`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Key': SABPAISA_AUTH_KEY,
          'X-Auth-IV': SABPAISA_AUTH_IV,
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
