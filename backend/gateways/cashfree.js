import axios from "axios";
import { logger } from "../utils/logger.js";

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_APP_SECRET = process.env.CASHFREE_APP_SECRET;

const CASHFREE_API_URL =
  process.env.CASHFREE_API_URL || "https://api.cashfree.com/pg";

logger.info("Cashfree init", {
  hasId: !!CASHFREE_APP_ID,
  hasSecret: !!CASHFREE_APP_SECRET,
  url: CASHFREE_API_URL,
});

const cashfreeAPI = axios.create({
  baseURL: CASHFREE_API_URL,
  headers: {
    "Content-Type": "application/json",
    "x-api-version": "2025-01-01",
  },
});

export const createCashfreeOrder = async (params) => {
  try {
    const { amount, customer } = params;

    const orderId = `ORD_${Date.now()}`;

    const orderData = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: "INR",

      customer_details: {
        customer_id: customer.email.replace(/[^a-zA-Z0-9]/g, ""),
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
      },

      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/payment-status?orderId=${orderId}`,
      },
    };

    const response = await cashfreeAPI.post(
      "/orders",
      orderData,
      {
        headers: {
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_APP_SECRET,
          "x-idempotency-key": Date.now().toString(),
        },
      }
    );

    logger.info("Cashfree order created", response.data);

    return {
      orderId: response.data.order_id,
      paymentSessionId: response.data.payment_session_id,
    };
  } catch (err) {
    logger.error("Cashfree error", err.response?.data || err.message);

    throw new Error("Cashfree order failed");
  }
};

export const getCashfreeOrderDetails = async (orderId) => {
  const res = await cashfreeAPI.get(
    `/orders/${orderId}`,
    {
      headers: {
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_APP_SECRET,
      },
    }
  );

  return res.data;
};

export const getCashfreePaymentDetails = async (
  orderId,
  paymentId
) => {
  const res = await cashfreeAPI.get(
    `/orders/${orderId}/payments/${paymentId}`,
    {
      headers: {
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_APP_SECRET,
      },
    }
  );

  return res.data;
};

export default {
  createCashfreeOrder,
  getCashfreeOrderDetails,
  getCashfreePaymentDetails,
};