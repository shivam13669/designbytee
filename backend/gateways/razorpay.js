import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Lazy initialize Razorpay client (only when needed)
 */
let razorpayClient = null;

const getRazorpayClient = () => {
  if (!razorpayClient) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        'Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env'
      );
    }
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
};

/**
 * Create Razorpay order
 * @param {object} params - { amount, currency, customer }
 * @returns {Promise<object>} Order object with order ID
 */
export const createRazorpayOrder = async (params) => {
  try {
    const { amount, currency = 'INR', customer, description } = params;

    logger.info('Creating Razorpay order', { amount, customer: customer.email });

    // Verify Razorpay client is initialized
    const client = getRazorpayClient();
    logger.info('Razorpay client initialized successfully');

    // Amount in paise (multiply by 100 for INR) - MUST BE INTEGER
    const orderAmount = Math.round(parseFloat(amount) * 100);

    // Validate amount
    if (!Number.isInteger(orderAmount) || orderAmount < 1) {
      throw new Error(`Invalid amount: ${amount}. Must be >= ₹1 (paise: ${orderAmount})`);
    }

    const orderData = {
      amount: orderAmount,  // Integer in paise
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      description: description || 'Payment for courses',
      notes: {
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_name: customer.name,
      },
    };

    logger.info('Calling Razorpay API with order data', {
      originalAmount: amount,
      amountInPaise: orderAmount,
      currency,
      receipt: orderData.receipt,
      orderData: JSON.stringify(orderData)
    });

    const order = await client.orders.create(orderData);

    logger.info('Razorpay order created successfully', { orderId: order.id });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      createdAt: new Date(order.created_at * 1000).toISOString(),
      // Return key for frontend to use
      razorpayKey: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error) {
    const razorpayError = error.error || error.response?.data || error;
    const errorMsg = error.message || JSON.stringify(razorpayError);

    logger.error('Razorpay order creation failed', {
      error: error.message,
      razorpayError: razorpayError,
      statusCode: error.statusCode,
      status: error.status,
      stack: error.stack,
      fullError: JSON.stringify(error, null, 2)
    });
    throw new Error(`Razorpay API Error: ${errorMsg} (Status: ${error.statusCode || error.status || 'Unknown'})`);
  }
};

/**
 * Verify Razorpay payment signature
 * @param {object} params - { orderId, paymentId, signature }
 * @returns {Promise<boolean>} True if signature is valid
 */
export const verifyRazorpaySignature = async (params) => {
  try {
    const { orderId, paymentId, signature } = params;

    logger.info('Verifying Razorpay signature', { orderId, paymentId });

    // Create the string to be verified
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = generated_signature === signature;

    if (!isValid) {
      logger.warn('Razorpay signature verification failed', {
        expected: generated_signature,
        received: signature,
      });
    } else {
      logger.info('Razorpay signature verified successfully');
    }

    return isValid;
  } catch (error) {
    logger.error('Razorpay signature verification error', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId 
 * @returns {Promise<object>} Payment details
 */
export const getRazorpayPaymentDetails = async (paymentId) => {
  try {
    const payment = await getRazorpayClient().payments.fetch(paymentId);
    return payment;
  } catch (error) {
    logger.error('Failed to fetch Razorpay payment details', {
      paymentId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Handle Razorpay webhook
 * @param {object} webhookData 
 * @param {string} webhookSignature 
 * @returns {Promise<object>} Validation result
 */
export const handleRazorpayWebhook = async (webhookData, webhookSignature) => {
  try {
    logger.info('Handling Razorpay webhook', { event: webhookData.event });

    // Verify webhook signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(JSON.stringify(webhookData));
    const digest = shasum.digest('hex');

    if (digest !== webhookSignature) {
      logger.warn('Razorpay webhook signature mismatch');
      return { valid: false, message: 'Invalid signature' };
    }

    logger.info('Razorpay webhook verified');

    // Handle different events
    const { event, payload } = webhookData;

    switch (event) {
      case 'payment.authorized':
        logger.info('Payment authorized', {
          paymentId: payload.payment.entity.id,
        });
        return {
          valid: true,
          event,
          paymentId: payload.payment.entity.id,
          status: 'success',
        };

      case 'payment.failed':
        logger.warn('Payment failed', {
          paymentId: payload.payment.entity.id,
          reason: payload.payment.entity.error_description,
        });
        return {
          valid: true,
          event,
          paymentId: payload.payment.entity.id,
          status: 'failed',
          reason: payload.payment.entity.error_description,
        };

      case 'payment.captured':
        logger.info('Payment captured', {
          paymentId: payload.payment.entity.id,
        });
        return {
          valid: true,
          event,
          paymentId: payload.payment.entity.id,
          status: 'captured',
        };

      case 'refund.created':
        logger.info('Refund created', {
          refundId: payload.refund.entity.id,
          paymentId: payload.refund.entity.payment_id,
        });
        return {
          valid: true,
          event,
          refundId: payload.refund.entity.id,
          status: 'refunded',
        };

      default:
        logger.debug('Unknown Razorpay event', { event });
        return { valid: true, event, processed: false };
    }
  } catch (error) {
    logger.error('Razorpay webhook handling error', { error: error.message });
    throw error;
  }
};

export default {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayPaymentDetails,
  handleRazorpayWebhook,
};
