import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * PhonePe v2 API Implementation
 * Uses OAuth token-based authentication
 */

// Configuration - OAuth Credentials
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || '1';
const NODE_ENV = process.env.NODE_ENV || 'production';

// PhonePe v2 API Base URLs
const PHONEPE_ENDPOINTS = {
  production: {
    oauth: 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
    pay: 'https://api.phonepe.com/apis/pg/checkout/v2/pay',
    status: 'https://api.phonepe.com/apis/pg/checkout/v2/order'
  },
  sandbox: {
    oauth: 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
    pay: 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay',
    status: 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order'
  }
};

// Get base URL based on environment
const getApiEndpoints = () => {
  return NODE_ENV === 'production' ? PHONEPE_ENDPOINTS.production : PHONEPE_ENDPOINTS.sandbox;
};

// OAuth Token Cache
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Get valid OAuth access token
 * Uses identity-manager endpoint with form-body (not Basic Auth)
 * Caches token in memory and refreshes only when expired
 * @returns {Promise<string>} Valid access token
 */
const getAccessToken = async () => {
  try {
    // Check if cached token is still valid
    if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
      logger.debug('Using cached PhonePe access token');
      return tokenCache.accessToken;
    }

    logger.info('Generating new PhonePe v2 OAuth access token');

    // Validate credentials exist
    if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET) {
      const error = 'PhonePe credentials not configured. Set PHONEPE_CLIENT_ID and PHONEPE_CLIENT_SECRET in .env';
      logger.error('PhonePe credentials check', {
        has_client_id: !!PHONEPE_CLIENT_ID,
        has_client_secret: !!PHONEPE_CLIENT_SECRET,
        error: error
      });
      throw new Error(error);
    }

    const endpoints = getApiEndpoints();
    logger.info('PhonePe v2 credentials validated', {
      has_client_id: !!PHONEPE_CLIENT_ID,
      has_client_secret: !!PHONEPE_CLIENT_SECRET,
      environment: NODE_ENV,
      oauth_endpoint: endpoints.oauth
    });

    // Request new token using form-body (v2 format)
    logger.info('Requesting PhonePe v2 OAuth token', {
      endpoint: endpoints.oauth,
      environment: NODE_ENV
    });

    const response = await axios.post(
      endpoints.oauth,
      new URLSearchParams({
        client_id: PHONEPE_CLIENT_ID,
        client_secret: PHONEPE_CLIENT_SECRET,
        client_version: PHONEPE_CLIENT_VERSION,
        grant_type: 'client_credentials',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    logger.info('PhonePe v2 OAuth token response received', {
      status: response.status,
      hasAccessToken: !!response.data?.access_token,
      expiresAt: response.data?.expires_at
    });

    const { access_token, expires_at } = response.data;

    if (!access_token) {
      logger.error('No access token in PhonePe response', { response: response.data });
      throw new Error('No access token in response');
    }

    // Calculate expiry time (expires_at is usually a timestamp in milliseconds)
    let expiryTime = expires_at;
    if (expires_at < 9999999999) {
      // If it's in seconds, convert to milliseconds
      expiryTime = expires_at * 1000;
    }
    // Subtract 60 seconds for safety margin
    expiryTime = expiryTime - 60000;

    tokenCache = {
      accessToken: access_token,
      expiresAt: expiryTime,
    };

    logger.info('PhonePe v2 OAuth token generated successfully', {
      expiresAt: new Date(expiryTime).toISOString()
    });

    return access_token;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
      }
    };

    logger.error('Failed to generate PhonePe v2 OAuth token', JSON.stringify(errorDetails, null, 2));

    throw new Error(`PhonePe v2 OAuth Error: ${errorMessage} (Status: ${error.response?.status || 'Unknown'})`);
  }
};

/**
 * Create PhonePe order using v2 Checkout API
 * @param {object} params - { amount, customer, orderId }
 * @returns {Promise<object>} PhonePe response with redirect URL
 */
export const createPhonePeOrder = async (params) => {
  try {
    const { amount, orderId, customer, description } = params;

    logger.info('Creating PhonePe v2 order', {
      amount,
      orderId,
      customer: customer?.email,
    });

    // Get valid access token
    const accessToken = await getAccessToken();

    // Amount in paise
    const amountInPaise = Math.round(amount * 100);

    // PhonePe v2 payload format
    const redirectUrl = `${process.env.FRONTEND_URL}/payment-success`;
    const payload = {
      merchantOrderId: orderId,
      amount: amountInPaise,
      currency: 'INR',
      redirectUrl: redirectUrl,
      message: description || 'Payment for course',
      paymentFlow: {
        type: 'PG_CHECKOUT'
      }
    };

    const endpoints = getApiEndpoints();
    logger.info('PhonePe v2 API request details', {
      endpoint: endpoints.pay,
      method: 'POST',
      environment: NODE_ENV,
      payload: payload
    });

    // Make API request with O-Bearer token (PhonePe v2 format)
    const response = await axios.post(
      endpoints.pay,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`,
        },
      }
    );

    logger.info('PhonePe v2 order created successfully', {
      orderId,
      success: response.data?.success,
      redirectUrl: response.data?.redirectUrl
    });

    // Return PhonePe response directly
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
      }
    };

    logger.error('PhonePe v2 order creation failed', JSON.stringify(errorDetails, null, 2));

    throw new Error(`PhonePe v2 API Error: ${errorMessage} (Status: ${error.response?.status || 'Unknown'})`);
  }
};

/**
 * Check PhonePe transaction status using v2 API
 * @param {string} orderId - Merchant's order ID
 * @returns {Promise<object>} PhonePe transaction status
 */
export const checkPhonePeTransactionStatus = async (orderId) => {
  try {
    logger.info('Checking PhonePe v2 transaction status', { orderId });

    // Get valid access token
    const accessToken = await getAccessToken();

    const endpoints = getApiEndpoints();
    const statusUrl = `${endpoints.status}/${orderId}/status`;

    // Make API request with O-Bearer token (v2 format)
    const response = await axios.get(
      statusUrl,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`,
        },
      }
    );

    logger.info('PhonePe v2 transaction status retrieved', {
      orderId,
      success: response.data?.success,
      state: response.data?.state,
    });

    // Return PhonePe response directly
    return response.data;
  } catch (error) {
    const errorDetails = {
      orderId,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    };
    logger.error('PhonePe v2 transaction status check failed', JSON.stringify(errorDetails, null, 2));
    throw new Error(`Failed to check PhonePe transaction status: ${error.message}`);
  }
};

/**
 * Refund PhonePe payment using OAuth
 * @param {object} params - { transactionId, amount }
 * @returns {Promise<object>} Refund response
 */
export const refundPhonePePayment = async (params) => {
  try {
    const { transactionId, amount } = params;

    logger.info('Initiating PhonePe refund', { transactionId, amount });

    // Get valid access token
    const accessToken = await getAccessToken();

    // Amount in paise
    const amountInPaise = Math.round(amount * 100);

    // Create unique refund ID
    const refundId = `REFUND_${Date.now()}`;

    // Prepare refund request
    const payload = {
      transactionId: transactionId,
      amount: amountInPaise,
      refundId: refundId,
    };

    // Make API request with Bearer token
    const response = await axios.post(
      'https://api.phonepe.com/apis/hermes/pg/v1/refund',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Client-Version': PHONEPE_CLIENT_VERSION,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('PhonePe refund initiated', {
      transactionId,
      refundId,
      success: response.data?.success,
    });

    // Return PhonePe response directly
    return response.data;
  } catch (error) {
    logger.error('PhonePe refund failed', {
      error: error.message,
      response: error.response?.data,
    });
    throw {
      message: 'Failed to refund PhonePe payment',
      error: error.message,
    };
  }
};

/**
 * Handle PhonePe webhook
 * PhonePe OAuth webhooks send payment status events
 * No authorization validation needed - just process the payload
 * @param {object} webhookData - Webhook payload from PhonePe
 * @returns {Promise<object>} Webhook processing result
 */
export const handlePhonePeWebhook = async (webhookData) => {
  try {
    logger.info('Processing PhonePe webhook', {
      orderId: webhookData?.data?.merchantOrderId,
    });

    const { data, success } = webhookData || {};

    if (!webhookData || !data) {
      logger.warn('PhonePe webhook missing data field');
      return { processed: false, message: 'Invalid webhook format' };
    }

    logger.info('PhonePe webhook processed', {
      orderId: data?.merchantOrderId,
      status: data?.state,
      success,
    });

    // Return webhook data for processing by application
    return {
      processed: true,
      orderId: data?.merchantOrderId,
      status: data?.state,
      amount: data?.amount,
      success: success,
    };
  } catch (error) {
    logger.error('PhonePe webhook processing error', { error: error.message });
    throw error;
  }
};

/**
 * Clear token cache (useful for testing or manual reset)
 */
export const clearTokenCache = () => {
  tokenCache = {
    accessToken: null,
    expiresAt: null,
  };
  logger.info('PhonePe token cache cleared');
};

export default {
  createPhonePeOrder,
  checkPhonePeTransactionStatus,
  refundPhonePePayment,
  handlePhonePeWebhook,
  clearTokenCache,
};
