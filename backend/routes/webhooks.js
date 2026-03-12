import express from 'express';
import { logger } from '../utils/logger.js';
import * as razorpay from '../gateways/razorpay.js';
import * as phonepe from '../gateways/phonepe.js';
import * as cashfree from '../gateways/cashfree.js';

const router = express.Router();

/**
 * POST /api/webhook/razorpay
 * Webhook endpoint for Razorpay payment notifications
 * 
 * Razorpay sends signed webhook data
 * Events: payment.authorized, payment.failed, payment.captured, refund.created, etc.
 */
router.post('/razorpay', async (req, res) => {
  try {
    const webhookData = req.body;
    const webhookSignature = req.headers['x-razorpay-signature'];

    logger.info('Received Razorpay webhook', { event: webhookData.event });

    if (!webhookSignature) {
      logger.warn('Missing Razorpay webhook signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Handle webhook
    const result = await razorpay.handleRazorpayWebhook(webhookData, webhookSignature);

    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }

    // TODO: Here you would update your database with payment status
    // Example:
    // if (result.status === 'success') {
    //   await updatePaymentInDatabase(result.paymentId, 'completed');
    //   await sendConfirmationEmail(customer);
    //   await enrollUserInCourse(userId);
    // }

    logger.info('Razorpay webhook processed', result);

    // Always return 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      data: result,
    });
  } catch (error) {
    logger.error('Error processing Razorpay webhook', { error: error.message });
    // Return 200 even on error to prevent Razorpay from retrying
    res.status(200).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/webhook/phonepe
 * Webhook endpoint for PhonePe OAuth API payment notifications
 */
router.post('/phonepe', async (req, res) => {
  try {
    const result = await phonepe.handlePhonePeWebhook(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (e) {
    res.status(200).json({ success: false });
  }
});

/**
 * POST /api/webhook/cashfree
 * Webhook endpoint for Cashfree payment notifications (v2.1 API)
 *
 * Cashfree v2.1 sends X-WEBHOOK-SIGNATURE and X-WEBHOOK-TIMESTAMP headers
 * Events: PAYMENT_SUCCESS, PAYMENT_FAILED, PAYMENT_USER_DROPPED, REFUND_FORWARD, etc.
 */
router.post('/cashfree', async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    logger.info('Received Cashfree webhook', {
      type: webhookData.type,
      timestamp
    });

    if (!signature) {
      logger.warn('Missing Cashfree webhook signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    if (!timestamp) {
      logger.warn('Missing Cashfree webhook timestamp');
      return res.status(400).json({ error: 'Missing timestamp' });
    }

    // Use raw body for signature verification if available, otherwise stringify parsed body
    const rawBody = req.rawBody || JSON.stringify(webhookData);

    // Handle webhook
    const result = await cashfree.handleCashfreeWebhook(rawBody, timestamp, signature);

    if (!result.valid) {
      return res.status(400).json({ error: result.message });
    }

    // TODO: Update database with payment status
    // Example:
    // if (result.success) {
    //   await updatePaymentInDatabase(result.orderId, 'completed');
    //   await sendConfirmationEmail(customer);
    //   await enrollUserInCourse(userId);
    // }

    logger.info('Cashfree webhook processed', result);

    res.status(200).json({
      success: true,
      message: 'Webhook received',
      data: result,
    });
  } catch (error) {
    logger.error('Error processing Cashfree webhook', { error: error.message });
    res.status(200).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
